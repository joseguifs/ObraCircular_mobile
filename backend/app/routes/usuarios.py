from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import gerar_hash_senha
from app.db.session import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCriacao, UsuarioResposta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

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
