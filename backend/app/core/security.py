import hashlib
import secrets


def gerar_hash_senha(senha: str) -> str:
    """
    Transforma a senha em um hash usando scrypt.

    A senha original nunca deve ser armazenada diretamente
    no banco de dados.
    """
    salt = secrets.token_bytes(16)

    senha_hash = hashlib.scrypt(
        senha.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    )

    return f"scrypt${salt.hex()}${senha_hash.hex()}"
