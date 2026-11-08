import io
import json
import os
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from app import app
from evaluation import EvaluationError, call_gemini


@patch.dict(os.environ, {"GEMINI_API_KEY": "test-only", "GEMINI_TIMEOUT_SECONDS": "30"})
class GeminiTests(unittest.TestCase):
    @patch("evaluation.urlopen")
    def test_success_uses_default_timeout_and_reads_interactions_response(self, open_url):
        with patch.dict(os.environ):
            os.environ.pop("GEMINI_TIMEOUT_SECONDS", None)
            os.environ.pop("GEMINI_MODEL", None)
            body = {"status": "completed", "steps": [{
                "type": "model_output", "content": [{"type": "text", "text": '{"ok": true}'}],
            }]}
            open_url.return_value.__enter__.return_value = io.BytesIO(json.dumps(body).encode())
            self.assertEqual(call_gemini("Mây", "prompt", {}), {"ok": True})
            self.assertEqual(open_url.call_args.kwargs["timeout"], 30)
            self.assertEqual(json.loads(open_url.call_args.args[0].data)["model"], "gemini-3.5-flash-lite")

    @patch("evaluation.urlopen", side_effect=TimeoutError())
    def test_custom_timeout_is_reported_without_retry_or_secret_in_logs(self, open_url):
        with patch.dict(os.environ, {"GEMINI_TIMEOUT_SECONDS": "45"}):
            with self.assertLogs("evaluation", level="WARNING") as logs:
                with self.assertRaises(EvaluationError) as caught:
                    call_gemini("private brand", "prompt", {})
        self.assertEqual(caught.exception.status_code, 504)
        self.assertIn("45", str(caught.exception))
        open_url.assert_called_once()
        self.assertEqual(open_url.call_args.kwargs["timeout"], 45)
        self.assertIn("outcome=timeout", logs.output[0])
        self.assertNotIn("test-only", logs.output[0])
        self.assertNotIn("private brand", logs.output[0])

    @patch("evaluation.urlopen")
    def test_wrapped_timeout_and_connection_failure_are_distinct(self, open_url):
        for reason, status, text in [(TimeoutError(), 504, "30 giây"), (OSError("DNS"), 502, "chưa kết nối")]:
            open_url.side_effect = URLError(reason)
            with self.assertLogs("evaluation", level="WARNING"):
                with self.assertRaises(EvaluationError) as caught:
                    call_gemini("Mây", "prompt", {})
            self.assertEqual(caught.exception.status_code, status)
            self.assertIn(text, str(caught.exception))

    @patch("evaluation.urlopen")
    def test_provider_failures_expose_safe_status_and_specific_message(self, open_url):
        for status, phrase in [(400, "tham số"), (401, "khóa"), (403, "quyền"), (404, "mô hình"),
                               (429, "hạn mức"), (503, "không sẵn sàng"), (504, "thời gian")]:
            body = io.BytesIO(b'{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"private"}}')
            open_url.side_effect = HTTPError("https://example.invalid", status, "error", {}, body)
            with self.assertLogs("evaluation", level="WARNING"):
                with self.assertRaises(EvaluationError) as caught:
                    call_gemini("Mây", "prompt", {})
            self.assertEqual(caught.exception.provider_status, status)
            self.assertIn(phrase, str(caught.exception))
            self.assertNotIn("private", str(caught.exception))
            self.assertEqual(caught.exception.provider_code, "resource_exhausted")

    @patch("evaluation.urlopen")
    def test_bad_timeout_config_does_not_make_request(self, open_url):
        for value in ("0", "121", "abc", "nan", ""):
            with patch.dict(os.environ, {"GEMINI_TIMEOUT_SECONDS": value}):
                with self.assertRaises(EvaluationError) as caught:
                    call_gemini("Mây", "prompt", {})
                self.assertEqual(caught.exception.status_code, 503)
        open_url.assert_not_called()

    @patch("evaluation.urlopen", side_effect=TimeoutError())
    def test_slogans_endpoint_returns_timeout_json(self, _open_url):
        with self.assertLogs("evaluation", level="WARNING"):
            response = app.test_client().post("/api/slogans", json={"brand": "Mây"})
        self.assertEqual(response.status_code, 504)
        self.assertIn("30 giây", response.json["error"])


if __name__ == "__main__":
    unittest.main()
