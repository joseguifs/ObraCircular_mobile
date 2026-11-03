from fastapi import APIRouter # type: ignore


router = APIRouter(tags=["Sistema"])


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
