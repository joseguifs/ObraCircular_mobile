from fastapi import FastAPI # pyright: ignore[reportMissingImports]

from app.core.config import settings
from app.routes.router import api_router


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    version="0.1.0",
)

app.include_router(api_router)
