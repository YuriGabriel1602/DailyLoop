from sqlmodel import Session

from database import ActivityLog


def log(session: Session, owner_id: int, realm: str, action: str, description: str) -> None:
    session.add(ActivityLog(owner_id=owner_id, realm=realm, action=action, description=description))
    session.commit()
