from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.anuncio_pergunta import AnuncioPergunta
from app.models.enums import StatusAnuncio, StatusUsuario
from app.models.usuario import Usuario
from app.routes.anuncios import buscar_anuncio_ativo
from app.schemas.anuncio_pergunta import (
    AnuncioPerguntaCreate,
    AnuncioPerguntaListResponse,
    AnuncioPerguntaResponse,
    AnuncioRespostaCreate,
)


router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]


def validar_usuario_ativo(usuario_id: UUID, db: Session) -> None:
    usuario = db.scalar(
        select(Usuario.id).where(
            Usuario.id == usuario_id,
            Usuario.status == StatusUsuario.ATIVO,
            Usuario.deletado_em.is_(None),
        )
    )
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sua conta precisa estar ativa para realizar esta ação.",
        )


def salvar(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as erro:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível salvar. Verifique os dados enviados.",
        ) from erro


@router.get("/{anuncio_id}/perguntas", response_model=AnuncioPerguntaListResponse)
def listar_perguntas(
    anuncio_id: UUID,
    db: DbSession,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> AnuncioPerguntaListResponse:
    """Lista as perguntas públicas de um anúncio, da mais recente para a mais antiga."""

    buscar_anuncio_ativo(anuncio_id, db)
    filtro = AnuncioPergunta.anuncio_id == anuncio_id
    total = db.scalar(select(func.count()).select_from(AnuncioPergunta).where(filtro)) or 0
    perguntas = db.scalars(
        select(AnuncioPergunta)
        .where(filtro)
        .order_by(AnuncioPergunta.criado_em.desc(), AnuncioPergunta.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return AnuncioPerguntaListResponse(
        items=[AnuncioPerguntaResponse.model_validate(item) for item in perguntas],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.post(
    "/{anuncio_id}/perguntas",
    response_model=AnuncioPerguntaResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_pergunta(anuncio_id: UUID, dados: AnuncioPerguntaCreate, db: DbSession) -> AnuncioPergunta:
    """Registra uma pergunta pública para o vendedor do anúncio."""

    anuncio = buscar_anuncio_ativo(anuncio_id, db)
    if anuncio.vendedor_id == dados.autor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode fazer perguntas no seu próprio anúncio.",
        )
    if anuncio.status == StatusAnuncio.ENCERRADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Anúncios encerrados não recebem novas perguntas.",
        )
    validar_usuario_ativo(dados.autor_id, db)

    pergunta = AnuncioPergunta(
        id=uuid4(),
        anuncio_id=anuncio.id,
        autor_id=dados.autor_id,
        pergunta=dados.pergunta,
    )
    db.add(pergunta)
    salvar(db)
    db.refresh(pergunta)
    return pergunta


@router.post(
    "/{anuncio_id}/perguntas/{pergunta_id}/resposta",
    response_model=AnuncioPerguntaResponse,
)
def responder_pergunta(
    anuncio_id: UUID,
    pergunta_id: UUID,
    dados: AnuncioRespostaCreate,
    db: DbSession,
) -> AnuncioPergunta:
    """Registra a resposta do vendedor. Cada pergunta aceita uma única resposta."""

    anuncio = buscar_anuncio_ativo(anuncio_id, db)
    if anuncio.vendedor_id != dados.vendedor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Somente o vendedor do anúncio pode responder perguntas.",
        )
    validar_usuario_ativo(dados.vendedor_id, db)

    # O bloqueio impede que duas respostas simultâneas sobrescrevam uma à outra.
    pergunta = db.scalar(
        select(AnuncioPergunta)
        .where(
            AnuncioPergunta.id == pergunta_id,
            AnuncioPergunta.anuncio_id == anuncio_id,
        )
        .with_for_update()
    )
    if pergunta is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta não encontrada.",
        )
    if pergunta.resposta is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta pergunta já foi respondida.",
        )

    pergunta.resposta = dados.resposta
    pergunta.respondido_em = datetime.now(timezone.utc)
    salvar(db)
    db.refresh(pergunta)
    return pergunta
