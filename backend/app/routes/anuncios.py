from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.anuncio import Anuncio
from app.models.categoria import Categoria
from app.models.endereco import Endereco
from app.models.enums import StatusAnuncio, StatusCategoria, StatusUsuario
from app.models.usuario import Usuario
from app.schemas.anuncio import AnuncioCreate, AnuncioResponse, AnuncioUpdate


router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]


def buscar_anuncio_ativo(anuncio_id: UUID, db: Session) -> Anuncio:
    anuncio = db.scalar(
        select(Anuncio).where(
            Anuncio.id == anuncio_id,
            Anuncio.deletado_em.is_(None),
        )
    )
    if anuncio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anúncio não encontrado.",
        )
    return anuncio


def validar_categoria(categoria_id: UUID, db: Session) -> None:
    categoria = db.scalar(
        select(Categoria.id).where(
            Categoria.id == categoria_id,
            Categoria.status == StatusCategoria.ATIVA,
        )
    )
    if categoria is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoria ativa não encontrada.",
        )


def validar_vendedor(vendedor_id: UUID, db: Session) -> None:
    vendedor = db.scalar(
        select(Usuario.id).where(
            Usuario.id == vendedor_id,
            Usuario.status == StatusUsuario.ATIVO,
            Usuario.deletado_em.is_(None),
        )
    )
    if vendedor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendedor ativo não encontrado.",
        )


def validar_endereco_do_vendedor(endereco_id: UUID, vendedor_id: UUID, db: Session) -> None:
    endereco = db.scalar(
        select(Endereco.id).where(
            Endereco.id == endereco_id,
            Endereco.usuario_id == vendedor_id,
        )
    )
    if endereco is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O endereço informado não pertence ao vendedor.",
        )


def salvar(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as erro:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não foi possível salvar o anúncio. Verifique os dados enviados.",
        ) from erro


@router.post("", response_model=AnuncioResponse, status_code=status.HTTP_201_CREATED)
def cadastrar_anuncio(dados: AnuncioCreate, db: DbSession) -> Anuncio:
    """Cadastra um anúncio para um vendedor e um endereço existentes."""

    validar_vendedor(dados.vendedor_id, db)
    validar_categoria(dados.categoria_id, db)
    validar_endereco_do_vendedor(dados.endereco_id, dados.vendedor_id, db)

    anuncio = Anuncio(
        id=uuid4(),
        **dados.model_dump(),
        status=StatusAnuncio.ESGOTADO if dados.quantidade == 0 else StatusAnuncio.ATIVO,
    )
    db.add(anuncio)
    salvar(db)
    db.refresh(anuncio)
    return anuncio


@router.get("", response_model=list[AnuncioResponse])
def listar_anuncios(
    db: DbSession,
    categoria_id: UUID | None = None,
    vendedor_id: UUID | None = None,
    situacao: Annotated[StatusAnuncio | None, Query(alias="status")] = None,
) -> list[Anuncio]:
    """Lista anúncios não excluídos, com filtros opcionais."""

    consulta = select(Anuncio).where(Anuncio.deletado_em.is_(None))
    if categoria_id is not None:
        consulta = consulta.where(Anuncio.categoria_id == categoria_id)
    if vendedor_id is not None:
        consulta = consulta.where(Anuncio.vendedor_id == vendedor_id)
    if situacao is not None:
        consulta = consulta.where(Anuncio.status == situacao)

    return list(db.scalars(consulta.order_by(Anuncio.postado_em.desc())).all())


@router.get("/{anuncio_id}", response_model=AnuncioResponse)
def obter_anuncio(anuncio_id: UUID, db: DbSession) -> Anuncio:
    """Retorna um anúncio não excluído pelo UUID."""

    return buscar_anuncio_ativo(anuncio_id, db)


@router.patch("/{anuncio_id}", response_model=AnuncioResponse)
def editar_anuncio(anuncio_id: UUID, dados: AnuncioUpdate, db: DbSession) -> Anuncio:
    """Atualiza somente os campos informados, mantendo o vendedor imutável."""

    anuncio = buscar_anuncio_ativo(anuncio_id, db)
    alteracoes = dados.model_dump(exclude_unset=True)

    if "categoria_id" in alteracoes:
        validar_categoria(alteracoes["categoria_id"], db)
    if "endereco_id" in alteracoes:
        validar_endereco_do_vendedor(alteracoes["endereco_id"], anuncio.vendedor_id, db)

    for campo, valor in alteracoes.items():
        setattr(anuncio, campo, valor)

    if anuncio.status == StatusAnuncio.ENCERRADO:
        anuncio.encerrado_em = anuncio.encerrado_em or datetime.now(timezone.utc)
    else:
        anuncio.encerrado_em = None
        if anuncio.quantidade == 0:
            anuncio.status = StatusAnuncio.ESGOTADO
        elif "quantidade" in alteracoes and "status" not in alteracoes:
            anuncio.status = StatusAnuncio.ATIVO

    salvar(db)
    db.refresh(anuncio)
    return anuncio


@router.delete("/{anuncio_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_anuncio(anuncio_id: UUID, db: DbSession) -> Response:
    """Exclui logicamente um anúncio, preservando seu registro."""

    anuncio = buscar_anuncio_ativo(anuncio_id, db)
    anuncio.deletado_em = datetime.now(timezone.utc)
    salvar(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
