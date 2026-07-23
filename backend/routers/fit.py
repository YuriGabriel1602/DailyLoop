import logging
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from database import User, get_session
from services import google_oauth_service
from services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/fit", tags=["fit"])


@router.get("/today")
def today_summary(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    token = google_oauth_service.get_valid_access_token(session, current_user)
    if not token:
        raise HTTPException(status_code=400, detail="Google Fit não conectado (conecte o Google em Integrações).")

    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    body = {
        "aggregateBy": [{"dataTypeName": "com.google.step_count.delta"}],
        "bucketByTime": {"durationMillis": 86_400_000},
        "startTimeMillis": int(start_of_day.timestamp() * 1000),
        "endTimeMillis": int(now.timestamp() * 1000),
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=body,
            )
            if response.status_code >= 400:
                logger.error("Google Fit recusou o agregado: %s", response.text)
                return {"steps": None}

            steps = 0
            for bucket in response.json().get("bucket", []):
                for dataset in bucket.get("dataset", []):
                    for point in dataset.get("point", []):
                        for value in point.get("value", []):
                            steps += value.get("intVal", 0)
            return {"steps": steps, "date": start_of_day.date().isoformat()}
    except Exception:
        logger.exception("Falha ao buscar resumo do Google Fit")
        return {"steps": None}
