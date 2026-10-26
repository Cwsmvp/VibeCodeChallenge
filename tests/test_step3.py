"""Kiểm tra nhập tên và chuẩn hóa slug tiếng Việt."""

import unittest

from app import app
from slug import Transtoslug


class SlugTests(unittest.TestCase):
    def test_vietnamese_examples(self):
        self.assertEqual(Transtoslug("Cà Phê Gió"), "caphegio")
        self.assertEqual(Transtoslug("Đất Việt"), "datviet")

    def test_special_characters_and_hyphens(self):
        self.assertEqual(Transtoslug("  Đà--Lạt & Co.  "), "da-latco")


class BrandFormTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_empty_name(self):
        response = self.client.post("/", data={"brand": "   "})
        self.assertIn("Vui lòng nhập tên thương hiệu", response.get_data(as_text=True))

    def test_length_limits(self):
        for brand in ("A", "A" * 31):
            with self.subTest(brand=brand):
                response = self.client.post("/", data={"brand": brand})
                self.assertIn("Tên thương hiệu phải có từ 2 đến 30 ký tự", response.get_data(as_text=True))

    def test_valid_brand_is_trimmed_and_slug_is_shown(self):
        response = self.client.post("/", data={"brand": "  Cà Phê Gió  "})
        html = response.get_data(as_text=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn('value="Cà Phê Gió"', html)
        self.assertIn("<strong>caphegio</strong>", html)

    def test_name_without_domain_characters_has_error(self):
        response = self.client.post("/", data={"brand": "你好"})
        self.assertIn("cần có chữ cái Latin hoặc chữ số", response.get_data(as_text=True))


if __name__ == "__main__":
    unittest.main()
