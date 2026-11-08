"""Kiểm chứng hai route AI bằng API thật khi có key; không lưu khóa vào báo cáo."""

import argparse
from datetime import datetime, timezone
import getpass
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main():
    parser = argparse.ArgumentParser(description="Kiem tra Gemini that, co the tieu thu han muc tai khoan")
    parser.add_argument("--prompt-key", action="store_true", help="Nhap API key bang loi nhac an")
    args = parser.parse_args()
    if args.prompt_key and not os.environ.get("GEMINI_API_KEY"):
        try:
            value = getpass.getpass("Gemini API key (nhap an): ").strip()
        except (EOFError, KeyboardInterrupt):
            return 2
        if value:
            os.environ["GEMINI_API_KEY"] = value
    report = {"checked_at_utc": datetime.now(timezone.utc).isoformat(), "status": "not_run",
              "model": os.environ.get("GEMINI_MODEL") or "gemini-3.5-flash-lite", "brand": "Mây Studio", "requests": []}
    if not os.environ.get("GEMINI_API_KEY"):
        report["reason"] = "Chưa có GEMINI_API_KEY trong môi trường; không gửi request tới Gemini."
    else:
        from app import app
        client = app.test_client()
        tagline = ""
        for route in ("/api/evaluate", "/api/slogans", "/api/slogans"):
            payload = {"brand": report["brand"]}
            if route == "/api/slogans":
                payload["previous_tagline"] = tagline
            response = client.post(route, json=payload)
            body = response.get_json()
            report["requests"].append({"route": route, "status_code": response.status_code, "response": body})
            if response.status_code != 200:
                report["status"] = "failed"
                break
            if route == "/api/slogans":
                tagline = body["tagline"]
        else:
            report["status"] = "passed"
    output = ROOT / "docs" / "reports"
    output.mkdir(parents=True, exist_ok=True)
    (output / "live-ai.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    text = ["# Kiểm chứng Gemini thật", "", f"Thời điểm UTC: `{report['checked_at_utc']}`.", "",
            f"Trạng thái: **{report['status']}**. Model cấu hình: `{report['model']}`.", "",
            report.get("reason", "Kết quả bên dưới là phản hồi thực tế qua Flask test client; chưa thay thế kiểm tra bản online và video."), "",
            "```json", json.dumps(report["requests"], ensure_ascii=False, indent=2), "```", ""]
    (output / "LIVE_AI.md").write_text("\n".join(text), encoding="utf-8")
    print(f"Live AI: {report['status']}. Report: docs/reports/LIVE_AI.md")
    return {"passed": 0, "failed": 1, "not_run": 2}[report["status"]]


if __name__ == "__main__":
    raise SystemExit(main())
