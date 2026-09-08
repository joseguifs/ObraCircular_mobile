from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.categoria import Categoria
from app.schemas.categoria import (
    CategoriaCreate,
    CategoriaResponse,
    CategoriaUpdate,
)


router = APIRouter(tags=["Categorias"])


@router.get("", response_model=list[CategoriaResponse])
def listar_categorias(db: Session = Depends(get_db)) -> list[Categoria]:
    return list(db.scalars(select(Categoria).order_by(Categoria.nome)).all())


@router.get("/{categoria_id}", response_model=CategoriaResponse)
def obter_categoria(
    categoria_id: UUID,
    db: Session = Depends(get_db),
) -> Categoria:
    categoria = db.get(Categoria, categoria_id)
    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada.",
        )

    return categoria


@router.post("", response_model=CategoriaResponse, status_code=status.HTTP_201_CREATED)
def criar_categoria(
    payload: CategoriaCreate,
    db: Session = Depends(get_db),
) -> Categoria:
    existente = db.scalar(
        select(Categoria).where(func.lower(Categoria.nome) == payload.nome.lower())
    )
    if existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Categoria já cadastrada.",
        )

    categoria = Categoria(
        nome=payload.nome,
        descricao=payload.descricao,
    )
    db.add(categoria)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Categoria já cadastrada.",
        ) from None

    db.refresh(categoria)
    return categoria


@router.put("/{categoria_id}", response_model=CategoriaResponse)
def editar_categoria(
    categoria_id: UUID,
    payload: CategoriaUpdate,
    db: Session = Depends(get_db),
) -> Categoria:
    categoria = db.get(Categoria, categoria_id)
    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada.",
        )

    dados = payload.model_dump(exclude_unset=True)
    if "nome" in dados:
        existente = db.scalar(
            select(Categoria).where(
                func.lower(Categoria.nome) == dados["nome"].lower(),
                Categoria.id != categoria_id,
            )
        )
        if existente is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Categoria já cadastrada.",
            )

    for campo, valor in dados.items():
        setattr(categoria, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Categoria já cadastrada.",
        ) from None

    db.refresh(categoria)
    return categoria


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_categoria(
    categoria_id: UUID,
    db: Session = Depends(get_db),
) -> None:
    categoria = db.get(Categoria, categoria_id)
    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria não encontrada.",
        )

    db.delete(categoria)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir uma categoria vinculada a anúncios.",
        ) from None
