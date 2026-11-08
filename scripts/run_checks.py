"""Chạy kiểm thử và lưu báo cáo thực tế, không gọi API thật."""

from datetime import datetime, timezone
import io
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
REPORTS = ROOT / "docs" / "reports"


class RecordedResult(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cases = []

    def startTest(self, test):
        self.current_status = "passed"
        super().startTest(test)

    def addFailure(self, test, err):
        self.current_status = "failed"
        super().addFailure(test, err)

    def addError(self, test, err):
        self.current_status = "error"
        super().addError(test, err)

    def addSkip(self, test, reason):
        self.current_status = "skipped"
        super().addSkip(test, reason)

    def addSubTest(self, test, subtest, err):
        if err is not None:
            self.current_status = "failed"
        super().addSubTest(test, subtest, err)

    def stopTest(self, test):
        self.cases.append({"id": test.id(), "status": self.current_status})
        super().stopTest(test)


def main():
    REPORTS.mkdir(parents=True, exist_ok=True)
    stream = io.StringIO()
    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"))
    result = unittest.TextTestRunner(stream=stream, verbosity=2, resultclass=RecordedResult).run(suite)
    log = stream.getvalue()
    (REPORTS / "python-tests.txt").write_text(log, encoding="utf-8")
    print(log)
    node = shutil.which("node")
    frontend = {"status": "not_run", "total": 0, "passed": 0, "failed": 0}
    if node:
        process = subprocess.run([node, "--test", "--test-reporter=tap", "tests/frontend.test.cjs"],
                                 cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        output = process.stdout + process.stderr
        (REPORTS / "frontend-tests.txt").write_text(output, encoding="utf-8")
        print(output)
        frontend["status"] = "passed" if process.returncode == 0 else "failed"
        for field, tap_name in (("total", "tests"), ("passed", "pass"), ("failed", "fail")):
            match = re.search(r"^# " + tap_name + r" (\d+)$", output, re.MULTILINE)
            frontend[field] = int(match.group(1)) if match else 0
    else:
        print("Node.js chua co: chua chay kiem thu JavaScript.")
    report = {
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "scope": "Flask test client and Node VM tests; no real Gemini requests or browser interaction",
        "python": {"status": "passed" if result.wasSuccessful() else "failed", "total": result.testsRun,
                   "failed": len(result.failures), "errors": len(result.errors), "cases": result.cases},
        "frontend": frontend,
    }
    (REPORTS / "test-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# Kết quả kiểm thử tự động", "", f"Thời điểm UTC: `{report['checked_at_utc']}`.", "",
             f"Python: **{result.testsRun} test**, trạng thái `{report['python']['status']}`.",
             f"JavaScript: **{frontend['passed']}/{frontend['total']} test đạt**, trạng thái `{frontend['status']}`.", "",
             "Không gọi Gemini thật. Bộ JavaScript mô phỏng DOM và phản hồi mạng, không thay thế kiểm tra trình duyệt.", "",
             "| Ca | Trạng thái |", "|---|---|"]
    for case in result.cases:
        lines.append(f"| `{case['id']}` | {case['status']} |")
    lines += ["", "Log: [Python](python-tests.txt), [JavaScript](frontend-tests.txt); dữ liệu máy đọc: [JSON](test-results.json).", ""]
    (REPORTS / "TEST_RESULTS.md").write_text("\n".join(lines), encoding="utf-8")
    return 0 if result.wasSuccessful() and frontend["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
