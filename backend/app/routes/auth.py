from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import verificar_senha
from app.db.session import get_db
from app.models.enums import StatusUsuario
from app.models.usuario import Usuario
from app.schemas.auth import LoginCredenciais
from app.schemas.usuario import UsuarioResposta

router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]

CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos."


@router.post("/login", response_model=UsuarioResposta, status_code=status.HTTP_200_OK)
def autenticar_usuario(dados: LoginCredenciais, db: DbSession) -> Usuario:
    """
    Autentica um usuário pelo e-mail e senha.
    """

    usuario = db.scalar(
        select(Usuario).where(
            func.lower(Usuario.email) == dados.email,
            Usuario.deletado_em.is_(None),
        )
    )

    if usuario is None or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=CREDENCIAIS_INVALIDAS,
        )

    if usuario.status != StatusUsuario.ATIVO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta conta não está ativa. Fale com o suporte.",
        )

    return usuario
