"""Chạy local với lời nhắc khóa ẩn; không ghi khóa vào file hoặc lịch sử lệnh."""

import argparse
import getpass
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main():
    parser = argparse.ArgumentParser(description="Chay tro ly dat ten thuong hieu tren 127.0.0.1")
    parser.add_argument("--without-ai", action="store_true", help="Xem giao dien va ten mien demo, khong goi AI")
    parser.add_argument("--port", type=int, default=5000)
    args = parser.parse_args()
    if args.without_ai:
        os.environ.pop("GEMINI_API_KEY", None)
    elif not os.environ.get("GEMINI_API_KEY"):
        if not sys.stdin.isatty():
            parser.error("Can dat GEMINI_API_KEY hoac dung --without-ai khi chay khong tuong tac")
        try:
            value = getpass.getpass("Gemini API key (nhap an, Enter de bo qua AI): ").strip()
        except (EOFError, KeyboardInterrupt):
            return 1
        if value:
            os.environ["GEMINI_API_KEY"] = value
    from app import app
    print("AI: " + ("da co cau hinh key (chua xac minh)" if os.environ.get("GEMINI_API_KEY") else "chua cau hinh"))
    app.run(host="127.0.0.1", port=args.port, debug=False, use_reloader=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
