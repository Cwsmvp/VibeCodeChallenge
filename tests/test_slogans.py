import json
import unittest
from unittest.mock import patch

from app import app
from evaluation import EvaluationError
from slogans import suggest_slogans


RESULT = {
    "slogans": ["Chạm vào cảm xúc", "Giá trị mỗi ngày", "Ý tưởng bay xa"],
    "tagline": "Nuôi dưỡng ý tưởng mỗi ngày",
}


class SloganTests(unittest.TestCase):
    @patch("slogans.call_gemini", return_value=RESULT)
    def test_retry_sends_previous_tagline_as_data(self, call):
        self.assertEqual(suggest_slogans("Mây", "Sáng tạo cùng bạn"), RESULT)
        self.assertEqual(json.loads(call.call_args.args[0]), {
            "brand": "Mây", "previous_tagline": "Sáng tạo cùng bạn",
        })

    @patch("slogans.call_gemini", return_value=RESULT)
    def test_repeated_tagline_is_reported_even_with_cosmetic_changes(self, _call):
        with self.assertRaises(EvaluationError) as caught:
            suggest_slogans("Mây", "  NUÔI DƯỠNG Ý TƯỞNG MỖI NGÀY! ")
        self.assertEqual(caught.exception.status_code, 409)

    @patch("app.suggest_slogans", return_value=RESULT)
    def test_retry_api_forwards_previous_tagline(self, suggest):
        response = app.test_client().post("/api/slogans", json={
            "brand": "Mây", "previous_tagline": "Sáng tạo cùng bạn",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, RESULT)
        suggest.assert_called_once_with("Mây", "Sáng tạo cùng bạn")

    @patch("app.suggest_slogans")
    def test_invalid_previous_tagline_does_not_call_ai(self, suggest):
        for value in (None, [], "từ " * 16):
            response = app.test_client().post("/api/slogans", json={
                "brand": "Mây", "previous_tagline": value,
            })
            self.assertEqual(response.status_code, 400)
        suggest.assert_not_called()

    @patch("app.suggest_slogans", side_effect=EvaluationError("AI trả lại tagline cũ", 409))
    def test_retry_api_returns_repeat_error(self, _suggest):
        response = app.test_client().post("/api/slogans", json={"brand": "Mây"})
        self.assertEqual(response.status_code, 409)
        self.assertIn("error", response.json)

    @patch("app.suggest_slogans", return_value=RESULT)
    @patch("app.evaluate_brand", return_value=None)
    def test_initial_page_renders_tagline_and_copy_state(self, _evaluate, suggest):
        response = app.test_client().post("/", data={"brand": "Mây"})
        self.assertEqual(response.status_code, 200)
        self.assertIn(RESULT["tagline"], response.get_data(as_text=True))
        self.assertIn("window.appState =", response.get_data(as_text=True))
        suggest.assert_called_once_with("Mây")


if __name__ == "__main__":
    unittest.main()
