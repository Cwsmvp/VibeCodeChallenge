# Các phần trong gói source — KMPT, bảng A, đề 10

Giải nén `KMPT-De10-source.zip`, mở thư mục `KMPT-De10/` và đọc [README](README.md). Giữ nguyên cấu trúc thư mục để các lệnh chạy local, test và đường dẫn giao diện hoạt động.

| Phần | Tệp / thư mục | Mục đích |
|---|---|---|
| 1. Hướng dẫn và mô tả | `README.md`, `PROJECT.md`, `PACKAGE_CONTENTS.md` | Thông tin đề thi, tính năng, công nghệ, chạy local, API key, kiến trúc, giới hạn và nguồn tham khảo |
| 2. Mã ứng dụng | `app.py`, `domains.py`, `evaluation.py`, `slogans.py`, `slug.py` | Flask, kiểm tra đầu vào, tên miền demo và tích hợp Gemini |
| 3. Giao diện | `templates/`, `public/` | HTML/Jinja, CSS và JavaScript; luồng 3 bước, chuyển cảnh, tổng hợp, lịch sử tên và sao chép |
| 4. Cấu hình mẫu | `requirements.txt`, `vercel.json`, `.env.example`, `.gitignore` | Cài thư viện, triển khai và tham chiếu biến môi trường; không chứa API key thật |
| 5. Công cụ | `scripts/` | Chạy local, kiểm thử, kiểm chứng AI thật, kiểm tra trình duyệt, đóng và xác minh ZIP |
| 6. Kiểm thử | `tests/`, `docs/reports/`, `docs/screenshots/` | Ca kiểm tra bắt buộc, kết quả/log, ảnh giao diện và trạng thái kiểm chứng AI thật |
| 7. Minh chứng và bàn giao | `docs/AI_EVIDENCE.pdf`, `docs/AI_EVIDENCE.html`, `docs/SUBMISSION_CHECKLIST.md` | Minh chứng sử dụng AI một trang từ phiên thực tế và các việc còn thiếu trước khi nộp |
| 8. Kiểm tra toàn vẹn | `MANIFEST.json` | Danh sách tệp, nhóm nội dung, dung lượng và SHA-256 của từng tệp nguồn trong gói |

## Chạy sau khi giải nén

Trong PowerShell, tại thư mục có `app.py`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts/run_local.py
```

Dán Gemini API key vào lời nhắc ẩn để dùng AI thật, hoặc chạy với `--without-ai` để xem giao diện và tên miền demo. Mở `http://127.0.0.1:5000/`. Xem hướng dẫn Windows/macOS/Linux và API key trong [README mục 5](README.md#5-cài-đặt-và-chạy-local).

## Những nội dung không đưa vào gói

- Thư mục ảnh yêu cầu gốc `Yêu Cầu Bài Nộp/` và mẫu thử `test.html`.
- Nhật ký `WORKED.md`, kịch bản video và tài liệu chuẩn bị hỏi đáp nội bộ.
- Thư mục `static/` không được Flask sử dụng; frontend thực tế nằm trong `public/`.
- `.git/`, `.venv/`, `.env`, cache Python, hồ sơ Chrome, file tạm và các ZIP/output cũ trong `dist/`.

Các tệp trên vẫn được giữ ở dự án local; chỉ loại khỏi danh sách đóng gói.

## Trạng thái và cách kiểm tra

- Báo cáo kiểm thử ghi riêng kết quả thực tế và các ca dùng fixture; ảnh có `ai-fixture` được gắn nhãn mô phỏng. Đây là ảnh kiểm tra giao diện, không phải bằng chứng Gemini thật hoặc ảnh hội thoại dùng AI.
- Minh chứng AI một trang giữ nguyên phạm vi phiên 04/11/2026; các báo cáo kiểm thử hiện tại có thời điểm cập nhật riêng.
- Theo hồ sơ hiện có, chưa có URL online/video cuối; báo cáo kiểm chứng Gemini thật ghi `failed` ở model cũ vì phần slogan gặp lỗi provider 503. Cần chạy lại với model mặc định mới `gemini-3.5-flash-lite` và hoàn thiện các mục này trước khi nộp; không có API key trong gói.
- `MANIFEST.json` mô tả các tệp nguồn, không tự chứa hash của chính nó. Checksum SHA-256 của toàn ZIP nằm cạnh ZIP ở thư mục `dist/`.
- Sau khi đóng gói, chạy `python scripts/verify_source.py` bằng Python đã cài phụ thuộc để kiểm tra manifest, đường dẫn, liên kết tài liệu, test và Flask từ bản giải nén.
