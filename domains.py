"""Tạo các biến thể tên miền từ slug thương hiệu."""


DOMAIN_SUFFIXES = [".com", ".vn", ".com.vn", ".shop", ".online"]
COMMON_SLUGS = {"shop", "store", "viet", "coffee", "online", "vn", "fashion"}


def Domains(slug: str) -> list[dict[str, str]]:
    """Trả về năm tên miền theo đúng thứ tự đuôi đã cấu hình."""
    return [{"domain": f"{slug}{suffix}"} for suffix in DOMAIN_SUFFIXES]


def Checkdomain(domain: str) -> str:
    """Trả về trạng thái minh họa ổn định, không tra cứu tên miền thật."""
    slug = domain.split(".", 1)[0]
    if len(slug) < 5 or slug in COMMON_SLUGS:
        return "taken"

    simple_hash = sum(ord(char) for char in domain)
    return "taken" if simple_hash % 3 == 0 else "available"
