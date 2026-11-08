"""Các ca bàn giao chạy lại được, không cần Internet hoặc API key."""

import json
import os
import re
import unicodedata
import unittest
from unittest.mock import patch

from app import app


def page_state(response):
    html = response.get_data(as_text=True)
    return json.loads(re.search(r"window\.appState = (.*?);</script>", html).group(1))


class SubmissionTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def assert_domains(self, brand, slug):
        response = self.client.post("/", data={"brand": brand})
        self.assertEqual(response.status_code, 200)
        state = page_state(response)
        self.assertEqual(state["slug"], slug)
        self.assertEqual([item["domain"] for item in state["domains"]], [
            slug + suffix for suffix in (".com", ".vn", ".com.vn", ".shop", ".online")
        ])
        self.assertTrue(all(item["status"] in {"available", "taken"} for item in state["domains"]))
        self.assertIn("Kết quả demo", response.get_data(as_text=True))

    def test_tc01_normal_may_studio(self):
        self.assert_domains("Mây Studio", "maystudio")

    def test_tc02_normal_vietnamese_accents(self):
        self.assert_domains("Cà phê Đậm", "caphedam")

    def test_tc03_empty_input(self):
        response = self.client.post("/", data={"brand": "   "})
        self.assertIn("Vui lòng nhập tên thương hiệu", response.get_data(as_text=True))
        self.assertEqual(page_state(response)["domains"], [])

    def test_tc04_invalid_input(self):
        response = self.client.post("/", data={"brand": "!!!"})
        self.assertIn("chữ cái Latin hoặc chữ số", response.get_data(as_text=True))
        self.assertEqual(page_state(response)["slug"], "")

    def test_tc05_minimum_length(self):
        self.assert_domains("An", "an")

    def test_tc06_over_maximum_length(self):
        response = self.client.post("/", data={"brand": "A" * 31})
        self.assertIn("từ 2 đến 30 ký tự", response.get_data(as_text=True))
        self.assertEqual(page_state(response)["domains"], [])

    @patch("app.suggest_slogans", return_value={"slogans": [], "tagline": ""})
    @patch("app.evaluate_brand", return_value={})
    def test_form_and_api_share_validation_and_normalization(self, evaluate, suggest):
        for brand in ("", " ", "A", "!" * 3, "A" * 31, "---", "☁☁"):
            with self.subTest(invalid=brand):
                response = self.client.post("/", data={"brand": brand})
                self.assertFalse(page_state(response)["slug"])
                for route in ("/api/evaluate", "/api/slogans"):
                    self.assertEqual(self.client.post(route, json={"brand": brand}).status_code, 400)
        evaluate.assert_not_called()
        suggest.assert_not_called()
        for brand in ("An", "A" * 30, unicodedata.normalize("NFD", "  Mây Studio  ")):
            with self.subTest(valid=brand):
                for route in ("/api/evaluate", "/api/slogans"):
                    self.assertEqual(self.client.post(route, json={"brand": brand}).status_code, 200)
        self.assertEqual(evaluate.call_args.args[0], "Mây Studio")
        self.assertEqual(suggest.call_args.args[0], "Mây Studio")

    @patch("evaluation.urlopen")
    def test_missing_key_is_safe_and_does_not_contact_provider(self, open_url):
        with patch.dict(os.environ):
            os.environ.pop("GEMINI_API_KEY", None)
            for route in ("/api/evaluate", "/api/slogans"):
                response = self.client.post(route, json={"brand": "Mây Studio"})
                self.assertEqual(response.status_code, 503)
                self.assertIn("chưa được cấu hình", response.json["error"])
        open_url.assert_not_called()

    @patch("app.evaluate_brand")
    @patch("app.suggest_slogans")
    def test_malformed_json_is_rejected_without_ai(self, suggest, evaluate):
        for route in ("/api/evaluate", "/api/slogans"):
            for value in (None, [], "brand", {"brand": 123}, {}):
                with self.subTest(route=route, value=value):
                    self.assertEqual(self.client.post(route, json=value).status_code, 400)
            self.assertEqual(self.client.post(route, data="{", content_type="application/json").status_code, 400)
        evaluate.assert_not_called()
        suggest.assert_not_called()

    def test_registration_demo_and_official_link(self):
        for value in ("", "javascript:alert(1)", "https://", "https://["):
            with self.subTest(value=value), patch.dict(app.config, {"SPONSOR_DOMAIN_URL": value}):
                html = self.client.post("/", data={"brand": "Mây Studio"}).get_data(as_text=True)
                self.assertIn('href="/dang-ky-demo"', html)
                self.assertIn("Liên kết đăng ký hiện là bản demo", html)
        with patch.dict(app.config, {"SPONSOR_DOMAIN_URL": "https://example.org/domain"}):
            html = self.client.post("/", data={"brand": "Mây Studio"}).get_data(as_text=True)
            self.assertIn('href="https://example.org/domain"', html)
            self.assertIn('rel="noopener noreferrer"', html)
            self.assertNotIn("Liên kết đăng ký hiện là bản demo", html)
        demo = self.client.get("/dang-ky-demo")
        self.assertEqual(demo.status_code, 200)
        self.assertIn("chưa tiếp nhận đăng ký", demo.get_data(as_text=True))

    def test_untrusted_brand_is_escaped_and_key_is_never_served(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "local-secret-test-placeholder"}):
            html = self.client.post("/", data={"brand": "<script>alert(1)</script>"}).get_data(as_text=True)
        self.assertNotIn("<script>alert(1)</script>", html)
        self.assertNotIn("local-secret-test-placeholder", html)

    def test_assets_and_mobile_viewport_are_available(self):
        html = self.client.get("/").get_data(as_text=True)
        self.assertIn('name="viewport"', html)
        for asset in ("style.css", "ai.js", "evaluation.js", "slogans.js", "actions.js"):
            self.assertEqual(self.client.get("/" + asset).status_code, 200)


if __name__ == "__main__":
    unittest.main()
