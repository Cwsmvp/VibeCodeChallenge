"""Chuẩn hóa tên thương hiệu thành slug dùng cho tên miền."""

import re
import unicodedata


def Transtoslug(brand: str) -> str:
    """Bỏ dấu, khoảng trắng và ký tự đặc biệt; giữ a-z, 0-9, dấu gạch ngang."""
    brand = brand.replace("đ", "d").replace("Đ", "D")
    without_accents = "".join(
        char for char in unicodedata.normalize("NFKD", brand)
        if not unicodedata.combining(char)
    )
    slug = re.sub(r"[^a-z0-9-]", "", without_accents.lower())
    return re.sub(r"-+", "-", slug).strip("-")
