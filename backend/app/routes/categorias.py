from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.categoria import Categoria
from app.models.enums import StatusCategoria
from app.schemas.categoria import CategoriaResponse


router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[CategoriaResponse])
def listar_categorias(db: DbSession) -> list[Categoria]:
    """Lista as categorias ativas em ordem alfabética."""

    consulta = (
        select(Categoria)
        .where(Categoria.status == StatusCategoria.ATIVA)
        .order_by(Categoria.nome)
    )
    return list(db.scalars(consulta).all())
