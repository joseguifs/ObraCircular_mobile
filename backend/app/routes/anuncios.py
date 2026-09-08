from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.anuncio import Anuncio
from app.schemas.anuncio import AnuncioResponse


router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[AnuncioResponse])
def listar_anuncios(db: DbSession) -> list[Anuncio]:
    """Lista os anuncios nao excluidos, dos mais recentes aos mais antigos."""

    consulta = (
        select(Anuncio)
        .where(Anuncio.deletado_em.is_(None))
        .order_by(Anuncio.postado_em.desc())
    )
    return list(db.scalars(consulta).all())
