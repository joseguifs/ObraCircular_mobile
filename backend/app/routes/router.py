from fastapi import APIRouter

from app.routes import admin, anuncio_perguntas, anuncios, auth, categorias, enderecos, health, pagamentos, usuarios


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticacao"])
api_router.include_router(usuarios.router, prefix="/api/v1/usuarios", tags=["Usuarios"])
api_router.include_router(categorias.router, prefix="/api/v1/categorias", tags=["Categorias"])
api_router.include_router(enderecos.router, prefix="/api/v1/enderecos", tags=["Enderecos"])
api_router.include_router(anuncios.router, prefix="/api/v1/anuncios", tags=["Anuncios"])
api_router.include_router(admin.router, prefix="/api/v1/admin", tags=["Administracao"])
api_router.include_router(
    anuncio_perguntas.router,
    prefix="/api/v1/anuncios",
    tags=["Perguntas dos anuncios"],
)
api_router.include_router(pagamentos.pedidos_router, prefix="/api/v1/pedidos", tags=["Pedidos"])
api_router.include_router(pagamentos.webhooks_router, prefix="/api/v1/webhooks", tags=["Webhooks"])
