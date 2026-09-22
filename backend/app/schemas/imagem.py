"""Valida e reduz avatares antes de persistir junto aos dados do perfil."""
import base64
import binascii
from io import BytesIO
import warnings

from PIL import Image, ImageOps, UnidentifiedImageError


def normalizar_imagem(valor: str | None) -> str | None:
    if valor is None:
        return None
    try:
        cabecalho, conteudo = valor.split(",", 1)
        if cabecalho not in ("data:image/jpeg;base64", "data:image/png;base64", "data:image/webp;base64"):
            raise ValueError()
        dados = base64.b64decode(conteudo, validate=True)
        if len(dados) > 5 * 1024 * 1024:
            raise ValueError()
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(dados)) as original:
                if original.format not in ("JPEG", "PNG", "WEBP") or original.width * original.height > 25_000_000:
                    raise ValueError()
                imagem = ImageOps.exif_transpose(original)
                imagem.thumbnail((512, 512))
                saida = BytesIO()
                imagem.convert("RGB").save(saida, format="JPEG", quality=85)
        return "data:image/jpeg;base64," + base64.b64encode(saida.getvalue()).decode("ascii")
    except (ValueError, binascii.Error, OSError, UnidentifiedImageError,
            Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ValueError("selecione uma imagem JPG, PNG ou WebP de até 5 MB e 25 megapixels") from None
