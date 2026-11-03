from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import gerar_hash_token, gerar_token_sessao, verificar_senha
from app.db.session import get_db
from app.models.anuncio import Anuncio
from app.models.categoria import Categoria
from app.models.enums import PapelUsuario, StatusAnuncio, StatusCategoria, StatusUsuario
from app.models.sessao_admin import SessaoAdmin
from app.models.usuario import Usuario
from app.routes import categorias as rotas_categorias
from app.routes.anuncios import salvar as salvar_anuncio
from app.schemas.admin import (
    AnuncioAdminAtualizacao,
    AnuncioAdminResposta,
    CategoriaAdminResposta,
    ResumoAdmin,
    SessaoAdminResposta,
    UsuarioAdminAtualizacao,
    UsuarioAdminResposta,
)
from app.schemas.anuncio import AnuncioResponse
from app.schemas.auth import LoginCredenciais
from app.schemas.categoria import CategoriaCreate, CategoriaResponse, CategoriaUpdate
from app.schemas.usuario import UsuarioResposta


router = APIRouter()

DbSession = Annotated[Session, Depends(get_db)]
esquema_bearer = HTTPBearer(auto_error=False)

CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos."
LIMITE_LISTAGEM = Query(default=200, ge=1, le=500)


def agora() -> datetime:
    return datetime.now(timezone.utc)


def como_utc(momento: datetime) -> datetime:
    # O SQLite dos testes devolve datas sem fuso; o PostgreSQL devolve em UTC.
    return momento if momento.tzinfo else momento.replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Autenticação
# ---------------------------------------------------------------------------


def obter_sessao_admin(
    db: DbSession,
    credenciais: Annotated[HTTPAuthorizationCredentials | None, Depends(esquema_bearer)],
) -> SessaoAdmin:
    """Exige um token de sessão válido pertencente a um administrador ativo."""

    nao_autenticado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessão administrativa inválida ou expirada. Entre novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credenciais is None:
        raise nao_autenticado

    sessao = db.scalar(
        select(SessaoAdmin).where(SessaoAdmin.token_hash == gerar_hash_token(credenciais.credentials))
    )
    if sessao is None or sessao.revogado_em is not None or como_utc(sessao.expira_em) <= agora():
        raise nao_autenticado

    # Papel e status são conferidos a cada requisição: rebaixar ou bloquear
    # um administrador encerra o acesso imediatamente.
    usuario = sessao.usuario
    if (
        usuario.deletado_em is not None
        or usuario.status != StatusUsuario.ATIVO
        or usuario.papel != PapelUsuario.ADMIN
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )
    return sessao


SessaoAtual = Annotated[SessaoAdmin, Depends(obter_sessao_admin)]


@router.post("/login", response_model=SessaoAdminResposta)
def entrar_admin(dados: LoginCredenciais, db: DbSession) -> dict:
    """Autentica um administrador e devolve um token de sessão Bearer."""

    usuario = db.scalar(
        select(Usuario).where(
            func.lower(Usuario.email) == dados.email,
            Usuario.deletado_em.is_(None),
        )
    )
    if usuario is None or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=CREDENCIAIS_INVALIDAS)
    if usuario.status != StatusUsuario.ATIVO or usuario.papel != PapelUsuario.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores.",
        )

    token = gerar_token_sessao()
    expira_em = agora() + timedelta(hours=settings.admin_sessao_horas)
    db.add(
        SessaoAdmin(
            id=uuid4(),
            usuario_id=usuario.id,
            token_hash=gerar_hash_token(token),
            expira_em=expira_em,
        )
    )
    db.commit()
    return {"token": token, "expira_em": expira_em, "usuario": usuario}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def sair_admin(sessao: SessaoAtual, db: DbSession) -> Response:
    """Revoga o token usado na requisição."""

    sessao.revogado_em = agora()
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UsuarioResposta)
def obter_admin_atual(sessao: SessaoAtual) -> Usuario:
    return sessao.usuario


# ---------------------------------------------------------------------------
# Resumo
# ---------------------------------------------------------------------------


def contar_por(db: Session, coluna, *filtros) -> dict[str, int]:
    consulta = select(coluna, func.count()).where(*filtros).group_by(coluna)
    return {valor: total for valor, total in db.execute(consulta).all()}


@router.get("/resumo", response_model=ResumoAdmin)
def obter_resumo(_: SessaoAtual, db: DbSession) -> dict:
    """Totais exibidos no painel inicial."""

    usuarios = contar_por(db, Usuario.status, Usuario.deletado_em.is_(None))
    administradores = db.scalar(
        select(func.count()).where(Usuario.papel == PapelUsuario.ADMIN, Usuario.deletado_em.is_(None))
    )
    anuncios = contar_por(db, Anuncio.status, Anuncio.deletado_em.is_(None))
    anuncios_excluidos = db.scalar(select(func.count()).where(Anuncio.deletado_em.is_not(None)))
    categorias = contar_por(db, Categoria.status)

    return {
        "usuarios": {
            "total": sum(usuarios.values()),
            "ativos": usuarios.get(StatusUsuario.ATIVO, 0),
            "inativos": usuarios.get(StatusUsuario.INATIVO, 0),
            "bloqueados": usuarios.get(StatusUsuario.BLOQUEADO, 0),
            "administradores": administradores or 0,
        },
        "anuncios": {
            "total": sum(anuncios.values()),
            "ativos": anuncios.get(StatusAnuncio.ATIVO, 0),
            "esgotados": anuncios.get(StatusAnuncio.ESGOTADO, 0),
            "encerrados": anuncios.get(StatusAnuncio.ENCERRADO, 0),
            "excluidos": anuncios_excluidos or 0,
        },
        "categorias": {
            "total": sum(categorias.values()),
            "ativas": categorias.get(StatusCategoria.ATIVA, 0),
            "inativas": categorias.get(StatusCategoria.INATIVA, 0),
        },
    }


# ---------------------------------------------------------------------------
# Usuários
# ---------------------------------------------------------------------------


def contagem_anuncios_por_vendedor():
    return (
        select(Anuncio.vendedor_id, func.count().label("total"))
        .where(Anuncio.deletado_em.is_(None))
        .group_by(Anuncio.vendedor_id)
        .subquery()
    )


def montar_usuario_admin(usuario: Usuario, total_anuncios: int | None) -> UsuarioAdminResposta:
    return UsuarioAdminResposta.model_validate(
        {
            **UsuarioResposta.model_validate(usuario).model_dump(),
            "deletado_em": usuario.deletado_em,
            "total_anuncios": total_anuncios or 0,
        }
    )


def buscar_usuario_admin(usuario_id: UUID, db: Session) -> UsuarioAdminResposta:
    contagem = contagem_anuncios_por_vendedor()
    linha = db.execute(
        select(Usuario, contagem.c.total)
        .outerjoin(contagem, contagem.c.vendedor_id == Usuario.id)
        .where(Usuario.id == usuario_id)
    ).first()
    if linha is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    return montar_usuario_admin(*linha)


def obter_usuario_gerenciavel(usuario_id: UUID, sessao: SessaoAdmin, db: Session) -> Usuario:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    if usuario.id == sessao.usuario_id:
        # Evita que o painel fique sem nenhum administrador por engano.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Você não pode alterar o status, o papel ou excluir a própria conta pelo painel.",
        )
    return usuario


@router.get("/usuarios", response_model=list[UsuarioAdminResposta])
def listar_usuarios_admin(
    _: SessaoAtual,
    db: DbSession,
    busca: str | None = None,
    situacao: Annotated[StatusUsuario | None, Query(alias="status")] = None,
    papel: PapelUsuario | None = None,
    incluir_excluidos: bool = False,
    limite: int = LIMITE_LISTAGEM,
) -> list[UsuarioAdminResposta]:
    """Lista usuários com filtros por nome/e-mail, status e papel."""

    contagem = contagem_anuncios_por_vendedor()
    consulta = select(Usuario, contagem.c.total).outerjoin(
        contagem, contagem.c.vendedor_id == Usuario.id
    )
    if not incluir_excluidos:
        consulta = consulta.where(Usuario.deletado_em.is_(None))
    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        consulta = consulta.where(or_(Usuario.nome.ilike(termo), Usuario.email.ilike(termo)))
    if situacao is not None:
        consulta = consulta.where(Usuario.status == situacao)
    if papel is not None:
        consulta = consulta.where(Usuario.papel == papel)

    linhas = db.execute(consulta.order_by(Usuario.criado_em.desc()).limit(limite)).all()
    return [montar_usuario_admin(usuario, total) for usuario, total in linhas]


@router.patch("/usuarios/{usuario_id}", response_model=UsuarioAdminResposta)
def atualizar_usuario_admin(
    usuario_id: UUID, dados: UsuarioAdminAtualizacao, sessao: SessaoAtual, db: DbSession
) -> UsuarioAdminResposta:
    """Altera status (ativar, inativar, bloquear) e papel de um usuário."""

    usuario = obter_usuario_gerenciavel(usuario_id, sessao, db)
    if usuario.deletado_em is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Restaure o usuário antes de alterá-lo.",
        )

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(usuario, campo, valor)
    db.commit()
    return buscar_usuario_admin(usuario_id, db)


@router.delete("/usuarios/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_usuario_admin(usuario_id: UUID, sessao: SessaoAtual, db: DbSession) -> Response:
    """Exclui logicamente o usuário, preservando seu histórico."""

    usuario = obter_usuario_gerenciavel(usuario_id, sessao, db)
    if usuario.deletado_em is None:
        usuario.deletado_em = agora()
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/usuarios/{usuario_id}/restaurar", response_model=UsuarioAdminResposta)
def restaurar_usuario_admin(usuario_id: UUID, _: SessaoAtual, db: DbSession) -> UsuarioAdminResposta:
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    usuario.deletado_em = None
    db.commit()
    return buscar_usuario_admin(usuario_id, db)


# ---------------------------------------------------------------------------
# Anúncios
# ---------------------------------------------------------------------------


def consulta_anuncios_admin():
    return (
        select(Anuncio, Usuario.nome, Categoria.nome)
        .join(Usuario, Usuario.id == Anuncio.vendedor_id)
        .join(Categoria, Categoria.id == Anuncio.categoria_id)
    )


def montar_anuncio_admin(anuncio: Anuncio, vendedor_nome: str, categoria_nome: str) -> AnuncioAdminResposta:
    return AnuncioAdminResposta.model_validate(
        {
            **AnuncioResponse.model_validate(anuncio).model_dump(),
            "deletado_em": anuncio.deletado_em,
            "vendedor_nome": vendedor_nome,
            "categoria_nome": categoria_nome,
        }
    )


def buscar_anuncio_admin(anuncio_id: UUID, db: Session) -> AnuncioAdminResposta:
    linha = db.execute(consulta_anuncios_admin().where(Anuncio.id == anuncio_id)).first()
    if linha is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anúncio não encontrado.")
    return montar_anuncio_admin(*linha)


def obter_anuncio(anuncio_id: UUID, db: Session) -> Anuncio:
    anuncio = db.get(Anuncio, anuncio_id)
    if anuncio is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anúncio não encontrado.")
    return anuncio


@router.get("/anuncios", response_model=list[AnuncioAdminResposta])
def listar_anuncios_admin(
    _: SessaoAtual,
    db: DbSession,
    busca: str | None = None,
    situacao: Annotated[StatusAnuncio | None, Query(alias="status")] = None,
    categoria_id: UUID | None = None,
    vendedor_id: UUID | None = None,
    incluir_excluidos: bool = False,
    limite: int = LIMITE_LISTAGEM,
) -> list[AnuncioAdminResposta]:
    """Lista anúncios de todos os vendedores para moderação."""

    consulta = consulta_anuncios_admin()
    if not incluir_excluidos:
        consulta = consulta.where(Anuncio.deletado_em.is_(None))
    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        consulta = consulta.where(or_(Anuncio.titulo.ilike(termo), Usuario.nome.ilike(termo)))
    if situacao is not None:
        consulta = consulta.where(Anuncio.status == situacao)
    if categoria_id is not None:
        consulta = consulta.where(Anuncio.categoria_id == categoria_id)
    if vendedor_id is not None:
        consulta = consulta.where(Anuncio.vendedor_id == vendedor_id)

    linhas = db.execute(consulta.order_by(Anuncio.postado_em.desc()).limit(limite)).all()
    return [montar_anuncio_admin(*linha) for linha in linhas]


@router.patch("/anuncios/{anuncio_id}", response_model=AnuncioAdminResposta)
def moderar_anuncio(
    anuncio_id: UUID, dados: AnuncioAdminAtualizacao, _: SessaoAtual, db: DbSession
) -> AnuncioAdminResposta:
    """Encerra ou reativa um anúncio."""

    anuncio = obter_anuncio(anuncio_id, db)
    if anuncio.deletado_em is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Restaure o anúncio antes de alterá-lo.",
        )

    if dados.status == StatusAnuncio.ENCERRADO:
        anuncio.status = StatusAnuncio.ENCERRADO
        anuncio.encerrado_em = anuncio.encerrado_em or agora()
    else:
        anuncio.encerrado_em = None
        anuncio.status = StatusAnuncio.ESGOTADO if anuncio.quantidade == 0 else dados.status

    salvar_anuncio(db)
    return buscar_anuncio_admin(anuncio_id, db)


@router.delete("/anuncios/{anuncio_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_anuncio_admin(anuncio_id: UUID, _: SessaoAtual, db: DbSession) -> Response:
    """Remove o anúncio das listagens públicas (exclusão lógica)."""

    anuncio = obter_anuncio(anuncio_id, db)
    if anuncio.deletado_em is None:
        anuncio.deletado_em = agora()
        salvar_anuncio(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/anuncios/{anuncio_id}/restaurar", response_model=AnuncioAdminResposta)
def restaurar_anuncio_admin(anuncio_id: UUID, _: SessaoAtual, db: DbSession) -> AnuncioAdminResposta:
    anuncio = obter_anuncio(anuncio_id, db)
    anuncio.deletado_em = None
    salvar_anuncio(db)
    return buscar_anuncio_admin(anuncio_id, db)


# ---------------------------------------------------------------------------
# Categorias
# ---------------------------------------------------------------------------


def contar_anuncios_da_categoria(categoria_id: UUID, db: Session) -> int:
    return db.scalar(
        select(func.count()).where(Anuncio.categoria_id == categoria_id, Anuncio.deletado_em.is_(None))
    ) or 0


def montar_categoria_admin(categoria: Categoria, total_anuncios: int | None) -> CategoriaAdminResposta:
    return CategoriaAdminResposta.model_validate(
        {**CategoriaResponse.model_validate(categoria).model_dump(), "total_anuncios": total_anuncios or 0}
    )


@router.get("/categorias", response_model=list[CategoriaAdminResposta])
def listar_categorias_admin(_: SessaoAtual, db: DbSession) -> list[CategoriaAdminResposta]:
    """Lista todas as categorias, inclusive inativas, com o total de anúncios."""

    contagem = (
        select(Anuncio.categoria_id, func.count().label("total"))
        .where(Anuncio.deletado_em.is_(None))
        .group_by(Anuncio.categoria_id)
        .subquery()
    )
    linhas = db.execute(
        select(Categoria, contagem.c.total)
        .outerjoin(contagem, contagem.c.categoria_id == Categoria.id)
        .order_by(Categoria.nome)
    ).all()
    return [montar_categoria_admin(categoria, total) for categoria, total in linhas]


@router.post("/categorias", response_model=CategoriaAdminResposta, status_code=status.HTTP_201_CREATED)
def criar_categoria_admin(payload: CategoriaCreate, _: SessaoAtual, db: DbSession) -> CategoriaAdminResposta:
    categoria = rotas_categorias.criar_categoria(payload, db)
    return montar_categoria_admin(categoria, 0)


@router.patch("/categorias/{categoria_id}", response_model=CategoriaAdminResposta)
def editar_categoria_admin(
    categoria_id: UUID, payload: CategoriaUpdate, _: SessaoAtual, db: DbSession
) -> CategoriaAdminResposta:
    """Renomeia, descreve, ativa ou inativa uma categoria."""

    categoria = rotas_categorias.editar_categoria(categoria_id, payload, db)
    return montar_categoria_admin(categoria, contar_anuncios_da_categoria(categoria_id, db))


@router.delete("/categorias/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_categoria_admin(categoria_id: UUID, _: SessaoAtual, db: DbSession) -> Response:
    """Exclui uma categoria que nunca foi usada; as demais devem ser inativadas."""

    possui_anuncios = db.scalar(select(Anuncio.id).where(Anuncio.categoria_id == categoria_id).limit(1))
    if possui_anuncios is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta categoria possui anúncios vinculados. Inative-a em vez de excluir.",
        )
    rotas_categorias.excluir_categoria(categoria_id, db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
