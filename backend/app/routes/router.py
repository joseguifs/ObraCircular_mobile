from fastapi import APIRouter

from app.routes import anuncios, categorias, enderecos, health, usuarios


api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(usuarios.router, prefix="/api/v1/usuarios", tags=["Usuarios"])
api_router.include_router(categorias.router, prefix="/api/v1/categorias", tags=["Categorias"])
api_router.include_router(enderecos.router, prefix="/api/v1/enderecos", tags=["Enderecos"])
api_router.include_router(anuncios.router, prefix="/api/v1/anuncios", tags=["Anuncios"])
