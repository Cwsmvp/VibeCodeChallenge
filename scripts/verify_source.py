"""Xác minh và chạy thử source ZIP từ một bản giải nén tạm trong dist/."""

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile

import build_source

ROOT = Path(__file__).resolve().parents[1]


def main():
    output = (ROOT / "dist").resolve()
    archive = output / "KMPT-De10-source.zip"
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    expected_checksum = (output / (archive.name + ".sha256")).read_text(encoding="ascii").split()[0]
    if checksum != expected_checksum:
        raise ValueError("Checksum toàn ZIP không khớp")
    temporary = Path(tempfile.mkdtemp(prefix="source-check-", dir=output)).resolve()
    if not temporary.is_relative_to(output) or not temporary.name.startswith("source-check-"):
        raise ValueError("Thư mục kiểm tra nằm ngoài dist/")
    try:
        with zipfile.ZipFile(archive) as package:
            entries = package.infolist()
            names = [entry.filename for entry in entries]
            if len(names) != len(set(names)) or package.testzip():
                raise ValueError("ZIP có entry trùng hoặc CRC không hợp lệ")
            for entry in entries:
                path = PurePosixPath(entry.filename)
                if (path.is_absolute() or ".." in path.parts or "\\" in entry.filename
                        or ":" in entry.filename or path.parts[0] != "KMPT-De10"
                        or stat.S_ISLNK(entry.external_attr >> 16)):
                    raise ValueError("ZIP chứa đường dẫn không hợp lệ")
                if not (temporary / entry.filename).resolve().is_relative_to(temporary):
                    raise ValueError("Đường dẫn giải nén nằm ngoài thư mục tạm")
            manifest = json.loads(package.read("KMPT-De10/MANIFEST.json"))
            expected_names = {"KMPT-De10/" + entry["path"] for entry in manifest["files"]}
            expected_names.add("KMPT-De10/MANIFEST.json")
            if set(names) != expected_names or len(names) != manifest["file_count"]:
                raise ValueError("Danh sách tệp không khớp manifest")
            # Cùng danh sách chọn tệp với công cụ đóng gói, không nhận thêm tệp ngoài danh sách.
            allowed = {path.relative_to(build_source.ROOT).as_posix() for path in build_source.source_files()}
            if {entry["path"] for entry in manifest["files"]} != allowed:
                raise ValueError("ZIP chứa tệp ngoài danh sách hoặc thiếu source cần thiết")
            for entry in manifest["files"]:
                data = package.read("KMPT-De10/" + entry["path"])
                if len(data) != entry["bytes"] or hashlib.sha256(data).hexdigest() != entry["sha256"]:
                    raise ValueError("Tệp trong ZIP không khớp hash/dung lượng")
                build_source.scan_content(build_source.ROOT / entry["path"], data)
            package.extractall(temporary)

        checkout = temporary / "KMPT-De10"
        # Đối chiếu đường dẫn tài liệu bên trong chính bản giải nén.
        original_root = build_source.ROOT
        try:
            build_source.ROOT = checkout
            build_source.validate_document_links([(checkout / item["path"], (checkout / item["path"]).read_bytes())
                                                  for item in manifest["files"]])
        finally:
            build_source.ROOT = original_root
        pdf = (checkout / "docs/AI_EVIDENCE.pdf").read_bytes()
        if len(re.findall(rb"/Type\s*/Page\b", pdf)) != 1:
            raise ValueError("Minh chứng PDF cần đúng một trang")
        environment = os.environ.copy()
        for key in ("GEMINI_API_KEY", "OPENAI_API_KEY", "VERCEL_TOKEN", "SPONSOR_DOMAIN_URL", "PYTHONPATH"):
            environment.pop(key, None)
        environment["PYTHONDONTWRITEBYTECODE"] = "1"
        node = shutil.which("node")
        if not node:
            raise RuntimeError("Cần Node.js để kiểm tra JavaScript trong gói")
        commands = [
            ("Python", [sys.executable, "-m", "unittest", "discover", "-s", "tests"], "package-python-tests.txt"),
            ("JavaScript", [node, "--test", "tests/frontend.test.cjs"], "package-javascript-tests.txt"),
            ("Flask", [sys.executable, "-c",
                       "from app import app; client=app.test_client(); "
                       "assert client.get('/').status_code == 200; "
                       "assert client.post('/', data={'brand': 'May Studio'}).status_code == 200; "
                       "assert client.get('/interface.js').status_code == 200; "
                       "assert client.get('/dang-ky-demo').status_code == 200; print('Flask routes passed')"],
             "package-flask-check.txt"),
        ]
        for label, command, filename in commands:
            result = subprocess.run(command, cwd=checkout, env=environment, capture_output=True,
                                    text=True, encoding="utf-8", errors="replace", timeout=120)
            (output / filename).write_text(result.stdout + result.stderr, encoding="utf-8")
            if result.returncode:
                raise RuntimeError(f"Kiểm tra {label} từ gói giải nén thất bại; xem dist/{filename}")
            print(f"PASS {label} from extracted ZIP")
        report = ["# Kiểm tra source ZIP", "", f"Thời điểm UTC: {datetime.now(timezone.utc).isoformat()}.", "",
                  f"Gói: `{archive.name}`. Trạng thái: **passed**. Tổng số tệp: **{len(names)}**.", "",
                  f"SHA-256: `{checksum}`.", "",
                  "- Đúng danh sách source được chọn; không có thư mục ảnh yêu cầu, mẫu thử, nhật ký, môi trường hoặc cache.",
                  "- Đường dẫn giải nén an toàn, CRC, dung lượng và SHA-256 từng tệp khớp manifest.",
                  "- Liên kết tài liệu nội bộ có đủ tệp đích; PDF minh chứng đúng một trang.",
                  "- Python, JavaScript và các route Flask chạy được từ bản giải nén bằng môi trường đã cài trên máy này.",
                  "- Không gọi Gemini thật. Các mẫu bí mật phổ biến và secret môi trường được kiểm tra, không bảo đảm nhận diện mọi loại bí mật.",
                  "", "Log: package-python-tests.txt, package-javascript-tests.txt, package-flask-check.txt.", ""]
        (output / "PACKAGE_CHECK.md").write_text("\n".join(report), encoding="utf-8")
        print(f"PASS archive integrity, document links and one-page PDF ({len(names)} files)")
        return 0
    finally:
        # Kiểm tra đích tuyệt đối trước khi xóa đệ quy trên Windows.
        if temporary.is_relative_to(output) and temporary.name.startswith("source-check-"):
            shutil.rmtree(temporary)


if __name__ == "__main__":
    raise SystemExit(main())
