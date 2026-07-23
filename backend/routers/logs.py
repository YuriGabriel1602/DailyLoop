from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database import ActivityLog, User, get_session
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("")
def list_logs(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Torre de controle: todo evento do usuário, dos dois mundos (pessoal e
    empresarial) — a tela que consome isso só aparece no lado Empresarial, mas o dado
    aqui é do usuário inteiro, não filtrado por realm."""
    statement = (
        select(ActivityLog).where(ActivityLog.owner_id == current_user.id).order_by(ActivityLog.created_at.desc()).limit(200)
    )
    return session.exec(statement).all()
