from typing import Annotated
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import gerar_hash_senha
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioAtualizacao, UsuarioCriacao, UsuarioResposta

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "",
    response_model=UsuarioResposta,
    status_code=status.HTTP_201_CREATED,
)
def cadastrar_usuario(
    dados: UsuarioCriacao,
    db: DbSession,
) -> Usuario:
    """
    Cadastra um novo usuário no ObraCircular.
    """

    usuario_existente = db.scalar(
        select(Usuario.id).where(
            func.lower(Usuario.email) == str(dados.email).lower()
        )
    )

    if usuario_existente is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário cadastrado com este e-mail.",
        )

    usuario = Usuario(
        nome=dados.nome,
        email=str(dados.email).lower(),
        senha_hash=gerar_hash_senha(dados.senha),
        telefone=dados.telefone,
    )

    db.add(usuario)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

        # Também protege contra duas requisições tentando
        # cadastrar o mesmo e-mail simultaneamente.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário cadastrado com este e-mail.",
        ) from None

    db.refresh(usuario)

    return usuario


@router.get(
    "",
    response_model=list[UsuarioResposta],
    status_code=status.HTTP_200_OK,
)
def listar_usuarios(
    db: DbSession,
) -> list[Usuario]:
    """
    Retorna todos os usuários que não foram excluídos.
    """

    consulta = (
        select(Usuario)
        .where(Usuario.deletado_em.is_(None))
        .order_by(Usuario.criado_em.desc())
    )

    usuarios = db.scalars(consulta).all()

    return list(usuarios)


def buscar_usuario_ativo(usuario_id: UUID, db: Session) -> Usuario:
    usuario = db.scalar(
        select(Usuario).where(
            Usuario.id == usuario_id,
            Usuario.deletado_em.is_(None),
        )
    )
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )
    return usuario


@router.get("/{usuario_id}", response_model=UsuarioResposta)
def obter_usuario(usuario_id: UUID, db: DbSession) -> Usuario:
    """Retorna um usuário não excluído pelo UUID."""
    return buscar_usuario_ativo(usuario_id, db)


@router.patch("/{usuario_id}", response_model=UsuarioResposta)
def editar_usuario(
    usuario_id: UUID, dados: UsuarioAtualizacao, db: DbSession
) -> Usuario:
    """Atualiza somente os campos informados de um usuário não excluído."""
    usuario = buscar_usuario_ativo(usuario_id, db)
    alteracoes = dados.model_dump(exclude_unset=True)

    if "email" in alteracoes:
        usuario_existente = db.scalar(
            select(Usuario.id).where(
                func.lower(Usuario.email) == str(dados.email).lower(),
                Usuario.id != usuario_id,
            )
        )
        if usuario_existente is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um usuário cadastrado com este e-mail.",
            )

    if "senha" in alteracoes:
        alteracoes["senha_hash"] = gerar_hash_senha(alteracoes.pop("senha"))

    for campo, valor in alteracoes.items():
        setattr(usuario, campo, valor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário cadastrado com este e-mail.",
        ) from None

    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_usuario(usuario_id: UUID, db: DbSession) -> Response:
    """Marca o usuário como excluído, preservando o registro no banco."""
    usuario = buscar_usuario_ativo(usuario_id, db)
    usuario.deletado_em = datetime.now(timezone.utc)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
