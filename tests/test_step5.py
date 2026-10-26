"""Kiểm tra quy tắc và nhãn trạng thái tên miền demo."""

import unittest

from app import app
from domains import Checkdomain


class DemoDomainTests(unittest.TestCase):
    def test_short_and_common_slugs_are_taken(self):
        self.assertEqual(Checkdomain("abc.com"), "taken")
        self.assertEqual(Checkdomain("coffee.vn"), "taken")

    def test_simple_hash_is_deterministic(self):
        self.assertEqual(Checkdomain("moons.com"), "taken")
        self.assertEqual(Checkdomain("brand.com"), "available")
        self.assertEqual(Checkdomain("brand.com"), Checkdomain("brand.com"))

    def test_result_displays_demo_notice_and_five_statuses(self):
        html = app.test_client().post("/", data={"brand": "Brand"}).get_data(as_text=True)
        self.assertIn("Kết quả demo, chỉ mang tính minh họa", html)
        self.assertEqual(html.count('class="domain-status domain-status--'), 5)
        self.assertIn("Còn trống", html)
        self.assertIn("Đã đăng ký", html)


if __name__ == "__main__":
    unittest.main()
