"""
Concede (ou remove) o papel de administrador de um usuário já cadastrado.

Uso, dentro da pasta backend:
    python -m app.scripts.promover_admin email@exemplo.com
    python -m app.scripts.promover_admin email@exemplo.com --remover
"""
import argparse
import sys

from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models.enums import PapelUsuario
from app.models.usuario import Usuario


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("email", help="E-mail do usuário cadastrado")
    parser.add_argument("--remover", action="store_true", help="Volta o usuário para o papel comum")
    args = parser.parse_args()

    with SessionLocal() as db:
        usuario = db.scalar(
            select(Usuario).where(
                func.lower(Usuario.email) == args.email.strip().lower(),
                Usuario.deletado_em.is_(None),
            )
        )
        if usuario is None:
            print(f"Usuário não encontrado: {args.email}", file=sys.stderr)
            return 1

        usuario.papel = PapelUsuario.USUARIO if args.remover else PapelUsuario.ADMIN
        db.commit()
        print(f"{usuario.nome} <{usuario.email}> agora tem o papel {usuario.papel}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
