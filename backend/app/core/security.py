import hashlib
import hmac
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


def verificar_senha(senha: str, senha_hash: str) -> bool:
    """
    Confere se a senha informada corresponde ao hash armazenado.
    """
    try:
        algoritmo, salt_hex, hash_hex = senha_hash.split("$")
    except ValueError:
        return False

    if algoritmo != "scrypt":
        return False

    hash_calculado = hashlib.scrypt(
        senha.encode("utf-8"),
        salt=bytes.fromhex(salt_hex),
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    )

    return hmac.compare_digest(hash_calculado.hex(), hash_hex)
