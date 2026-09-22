from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.endereco import Endereco
from app.models.usuario import Usuario
from app.schemas.endereco import EnderecoCreate, EnderecoRead, EnderecoUpdate

router = APIRouter()


def obter_endereco(endereco_id: uuid.UUID, db: Session) -> Endereco:
    endereco = db.get(Endereco, endereco_id)
    if endereco is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endereço não encontrado",
        )
    return endereco


def salvar(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as erro:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível salvar o endereço. Verifique os dados enviados.",
        ) from erro


@router.post(
    "",
    response_model=EnderecoRead,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar endereço",
)
def cadastrar_endereco(
    dados: EnderecoCreate,
    db: Session = Depends(get_db),
) -> Endereco:
  
    usuario = db.get(Usuario, dados.usuario_id)
    if usuario is None or usuario.deletado_em is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    endereco = Endereco(**dados.model_dump())
    db.add(endereco)

    salvar(db)

    db.refresh(endereco)
    return endereco


@router.get(
    "/{endereco_id}",
    response_model=EnderecoRead,
    summary="Buscar endereço por ID",
)
def buscar_endereco(
    endereco_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Endereco:
    return obter_endereco(endereco_id, db)


@router.patch(
    "/{endereco_id}",
    response_model=EnderecoRead,
    summary="Editar endereço",
)
def editar_endereco(
    endereco_id: uuid.UUID,
    dados: EnderecoUpdate,
    db: Session = Depends(get_db),
) -> Endereco:
    endereco = obter_endereco(endereco_id, db)

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(endereco, campo, valor)

    salvar(db)
    db.refresh(endereco)
    return endereco


@router.get(
    "/usuario/{usuario_id}",
    response_model=list[EnderecoRead],
    summary="Listar endereços de um usuário",
)
def listar_enderecos_por_usuario(
    usuario_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> list[Endereco]:
    stmt = select(Endereco).where(Endereco.usuario_id == usuario_id)
    return list(db.scalars(stmt).all())
