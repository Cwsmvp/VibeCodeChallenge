"""Đóng gói source theo danh sách cho phép, kiểm tra bí mật phổ biến và CRC ZIP."""

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TOP_FILES = ("app.py", "domains.py", "evaluation.py", "slogans.py", "slug.py", "requirements.txt",
             "vercel.json", ".gitignore", ".env.example", "README.md", "PROJECT.md", "PACKAGE_CONTENTS.md")
DIRECTORIES = ("public", "templates", "tests", "scripts")
DOCUMENTS = ("docs/AI_EVIDENCE.html", "docs/AI_EVIDENCE.pdf", "docs/SUBMISSION_CHECKLIST.md",
             "docs/reports/TEST_RESULTS.md", "docs/reports/test-results.json",
             "docs/reports/python-tests.txt", "docs/reports/frontend-tests.txt",
             "docs/reports/BROWSER_RESULTS.md", "docs/reports/browser-results.json",
             "docs/reports/LIVE_AI.md", "docs/reports/live-ai.json")
SUFFIXES = {".py", ".cjs", ".js", ".css", ".html", ".md", ".txt", ".json", ".png", ".pdf", ".svg"}
SECRET_PATTERNS = (
    rb"AIza[0-9A-Za-z_-]{35}",
    rb"sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}",
    rb"gh[pousr]_[A-Za-z0-9]{30,}",
    rb"github_pat_[A-Za-z0-9_]{50,}",
    rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
)


def source_files():
    paths = [ROOT / name for name in (*TOP_FILES, *DOCUMENTS)]
    for directory in DIRECTORIES:
        paths.extend(path for path in (ROOT / directory).rglob("*")
                     if path.is_file() and path.suffix.lower() in SUFFIXES
                     and not any(part.startswith(".") or part == "__pycache__" for part in path.relative_to(ROOT / directory).parts))
    browser = json.loads((ROOT / "docs/reports/browser-results.json").read_text(encoding="utf-8"))
    for screenshot in browser["screenshots"]:
        path = ROOT / screenshot
        if not path.resolve().is_relative_to(ROOT / "docs/screenshots") or path.suffix.lower() != ".png":
            raise ValueError("Đường dẫn ảnh kiểm thử không hợp lệ")
        paths.append(path)
    result = []
    for path in sorted(set(paths)):
        if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(ROOT):
            raise ValueError(f"Tệp nguồn thiếu hoặc đường dẫn không hợp lệ: {path.name}")
        result.append(path)
    return result


def section_for(relative):
    if relative in ("README.md", "PROJECT.md", "PACKAGE_CONTENTS.md"):
        return "01-documentation"
    if relative.startswith(("public/", "templates/")):
        return "03-interface"
    if relative in ("requirements.txt", "vercel.json", ".gitignore", ".env.example"):
        return "04-configuration"
    if relative.startswith("scripts/"):
        return "05-tools"
    if relative.startswith(("tests/", "docs/reports/", "docs/screenshots/")):
        return "06-tests-and-results"
    if relative.startswith("docs/"):
        return "07-evidence-and-handover"
    return "02-application"


def validate_document_links(contents):
    """Chỉ kiểm tra đích tệp local; không gọi mạng hoặc kiểm tra fragment."""
    from urllib.parse import unquote, urlsplit

    available = {path.resolve() for path, _ in contents}
    available.add((ROOT / "MANIFEST.json").resolve())
    for path, data in contents:
        if path.suffix.lower() != ".md":
            continue
        for match in re.finditer(r'!?\[[^\]]*\]\(([^)\n]+)\)', data.decode("utf-8")):
            target = match.group(1).strip().strip("<>")
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            resolved = (path.parent / unquote(parsed.path)).resolve()
            if resolved not in available:
                raise ValueError(f"Liên kết không có đích trong gói: {path.relative_to(ROOT).as_posix()} -> {target}")


def scan_content(path, data):
    for pattern in SECRET_PATTERNS:
        if re.search(pattern, data):
            raise ValueError(f"Dừng đóng gói: phát hiện mẫu bí mật trong {path.relative_to(ROOT).as_posix()} (không in giá trị)")
    for name in ("GEMINI_API_KEY", "OPENAI_API_KEY", "VERCEL_TOKEN"):
        value = os.environ.get(name, "")
        if len(value) >= 12 and value.encode() in data:
            raise ValueError(f"Dừng đóng gói: giá trị biến {name} xuất hiện trong tệp {path.name}")


def main():
    files = source_files()
    contents = [(path, path.read_bytes()) for path in files]
    for path, data in contents:
        scan_content(path, data)
    validate_document_links(contents)
    for name in ("test-results.json", "browser-results.json"):
        report = json.loads((ROOT / "docs" / "reports" / name).read_text(encoding="utf-8"))
        if name == "test-results.json":
            passed = report["python"]["status"] == "passed" and report["frontend"]["status"] == "passed"
        else:
            passed = report["status"] == "passed"
        if not passed:
            raise ValueError(f"Báo cáo {name} chưa đạt; chạy lại kiểm tra trước khi đóng gói")
    output = ROOT / "dist"
    output.mkdir(exist_ok=True)
    archive = output / "KMPT-De10-source.zip"
    manifest = [{"path": path.relative_to(ROOT).as_posix(), "section": section_for(path.relative_to(ROOT).as_posix()),
                 "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()} for path, data in contents]
    sections = {name: [entry["path"] for entry in manifest if entry["section"] == name]
                for name in sorted({entry["section"] for entry in manifest})}
    payload = {"built_at_utc": datetime.now(timezone.utc).isoformat(), "archive": archive.name,
               "file_count": len(manifest) + 1, "source_file_count": len(manifest),
               "sections": sections, "files": manifest,
               "manifest_scope": "Hashes cover every source entry except MANIFEST.json itself; archive hash is in the external sidecar.",
               "secret_scan": "Passed common provider key/private key patterns and present environment secret values; not an exhaustive guarantee",
               "readiness": "Source package prepared; online deployment, real AI verification and final video still require completion. See docs/SUBMISSION_CHECKLIST.md"}
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as package:
        for path, data in contents:
            relative = path.relative_to(ROOT).as_posix()
            package.writestr(f"KMPT-De10/{relative}", data)
        package.writestr("KMPT-De10/MANIFEST.json", json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    with zipfile.ZipFile(archive) as package:
        bad_file = package.testzip()
        if bad_file:
            raise ValueError("ZIP CRC không hợp lệ")
        for entry in manifest:
            if hashlib.sha256(package.read("KMPT-De10/" + entry["path"])).hexdigest() != entry["sha256"]:
                raise ValueError("Nội dung ZIP không khớp source")
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    (output / "KMPT-De10-source.zip.sha256").write_text(f"{checksum}  {archive.name}\n", encoding="ascii")
    payload["archive_sha256"] = checksum
    (output / "MANIFEST.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built: {archive.relative_to(ROOT)} ({len(manifest) + 1} files, {archive.stat().st_size} bytes)")
    print(f"SHA256: {checksum}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
