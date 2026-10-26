"""Kiểm tra thứ tự biến thể tên miền và hiển thị trên trang."""

import unittest

from app import app
from domains import Domains


class DomainTests(unittest.TestCase):
    def test_five_domains_in_required_order(self):
        self.assertEqual(
            Domains("caphegio"),
            [
                {"domain": "caphegio.com"},
                {"domain": "caphegio.vn"},
                {"domain": "caphegio.com.vn"},
                {"domain": "caphegio.shop"},
                {"domain": "caphegio.online"},
            ],
        )

    def test_domains_appear_only_after_valid_input(self):
        client = app.test_client()
        invalid_html = client.post("/", data={"brand": " "}).get_data(as_text=True)
        self.assertNotIn('class="domain-item"', invalid_html)

        html = client.post("/", data={"brand": "Cà Phê Gió"}).get_data(as_text=True)
        domains = ["caphegio.com", "caphegio.vn", "caphegio.com.vn", "caphegio.shop", "caphegio.online"]
        positions = [html.index(f">{domain}</span>") for domain in domains]
        self.assertEqual(positions, sorted(positions))
        self.assertEqual(html.count('class="domain-item"'), 5)


if __name__ == "__main__":
    unittest.main()
