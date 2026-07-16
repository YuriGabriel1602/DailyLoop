from fastapi import APIRouter

router = APIRouter(tags=["meta"])


@router.get("/")
def health():
    return {"status": "online", "system": "DailyLoop v3.0"}
