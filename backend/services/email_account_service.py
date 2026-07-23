import email as email_lib
import imaplib
import logging
import smtplib
from datetime import datetime, timedelta
from email.header import decode_header
from email.mime.text import MIMEText

from sqlmodel import Session, select

from database import Contact, Conversation, ConversationMessage, EmailAccount
from services import crypto_service

logger = logging.getLogger(__name__)


class EmailConnectionError(Exception):
    pass


def _decode(value: str | None) -> str:
    if not value:
        return ""
    parts = decode_header(value)
    return "".join(
        part.decode(encoding or "utf-8", errors="replace") if isinstance(part, bytes) else part
        for part, encoding in parts
    )


def test_connection(imap_host: str, imap_port: int, email_address: str, password: str) -> None:
    """Só valida o login IMAP antes de salvar a conta — levanta EmailConnectionError com
    uma mensagem legível se falhar."""
    try:
        with imaplib.IMAP4_SSL(imap_host, imap_port, timeout=10) as imap:
            imap.login(email_address, password)
    except imaplib.IMAP4.error as exc:
        raise EmailConnectionError(f"Login IMAP recusado: {exc}") from exc
    except Exception as exc:
        raise EmailConnectionError(f"Não foi possível conectar em {imap_host}:{imap_port} — {exc}") from exc


def _get_or_create_contact(owner_id: int, sender_email: str, sender_name: str, session: Session) -> Contact:
    contact = session.exec(
        select(Contact).where(Contact.owner_id == owner_id, Contact.channel == "email", Contact.external_id == sender_email)
    ).first()
    if contact:
        return contact
    contact = Contact(owner_id=owner_id, channel="email", external_id=sender_email, name=sender_name or sender_email)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


def _get_or_create_conversation(owner_id: int, contact: Contact, session: Session) -> Conversation:
    conversation = session.exec(
        select(Conversation).where(Conversation.owner_id == owner_id, Conversation.contact_id == contact.id, Conversation.status == "open")
    ).first()
    if conversation:
        return conversation
    # Emails nunca são respondidos pela IA nesta fase — ai_enabled sempre False,
    # independente de qualquer configuração de canal (diferente de whatsapp/instagram/facebook).
    conversation = Conversation(owner_id=owner_id, contact_id=contact.id, channel="email", ai_enabled=False)
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation


def poll_inbox(account: EmailAccount, session: Session) -> int:
    """Busca emails não vistos desde a última sincronização e cria
    Contact/Conversation/ConversationMessage — mesmo formato do Inbox de
    WhatsApp/Instagram/Facebook, só que sem disparar resposta automática."""
    password = crypto_service.decrypt(account.password_encrypted)
    imported = 0
    try:
        with imaplib.IMAP4_SSL(account.imap_host, account.imap_port, timeout=15) as imap:
            imap.login(account.email_address, password)
            imap.select("INBOX")
            since = account.last_synced_at or (datetime.utcnow() - timedelta(days=1))
            date_str = since.strftime("%d-%b-%Y")
            status, data = imap.search(None, f'(SINCE "{date_str}")')
            if status != "OK":
                return 0
            message_ids = data[0].split()

            for msg_id in message_ids:
                status, msg_data = imap.fetch(msg_id, "(RFC822)")
                if status != "OK" or not msg_data or not msg_data[0]:
                    continue
                parsed = email_lib.message_from_bytes(msg_data[0][1])
                message_id_header = parsed.get("Message-ID", "").strip()
                if message_id_header and session.exec(
                    select(ConversationMessage).where(ConversationMessage.external_message_id == message_id_header)
                ).first():
                    continue  # já importado antes

                from_header = _decode(parsed.get("From", ""))
                sender_name, sender_email = email_lib.utils.parseaddr(from_header)
                if not sender_email:
                    continue

                body = ""
                if parsed.is_multipart():
                    for part in parsed.walk():
                        if part.get_content_type() == "text/plain" and not part.get("Content-Disposition"):
                            part_payload = part.get_payload(decode=True)
                            if part_payload:
                                body = part_payload.decode(part.get_content_charset() or "utf-8", errors="replace")
                            break
                else:
                    payload = parsed.get_payload(decode=True)
                    if payload:
                        body = payload.decode(parsed.get_content_charset() or "utf-8", errors="replace")

                contact = _get_or_create_contact(account.owner_id, sender_email, sender_name, session)
                conversation = _get_or_create_conversation(account.owner_id, contact, session)

                inbound = ConversationMessage(
                    conversation_id=conversation.id,
                    direction="inbound",
                    sender="contact",
                    content=body.strip()[:5000] or "(sem conteúdo de texto)",
                    external_message_id=message_id_header or None,
                )
                session.add(inbound)
                conversation.last_message_at = datetime.utcnow()
                session.add(conversation)
                session.commit()
                imported += 1

        account.last_synced_at = datetime.utcnow()
        session.add(account)
        session.commit()
    except Exception:
        logger.exception("Falha ao sincronizar email de %s", account.email_address)
    return imported


def send_email(account: EmailAccount, to: str, body: str, subject: str = "Re: Atendimento") -> bool:
    password = crypto_service.decrypt(account.password_encrypted)
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = account.email_address
    msg["To"] = to
    try:
        with smtplib.SMTP(account.smtp_host, account.smtp_port, timeout=10) as server:
            server.starttls()
            server.login(account.email_address, password)
            server.sendmail(account.email_address, [to], msg.as_string())
        return True
    except Exception:
        logger.exception("Falha ao enviar email pra %s via %s", to, account.email_address)
        return False
