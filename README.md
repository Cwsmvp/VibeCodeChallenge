# Trợ lý đặt tên thương hiệu & tên miền — Vibe Coding 2026

Ứng dụng web tiếng Việt giúp đánh giá tên thương hiệu, gợi ý tên miền và tạo slogan/tagline. Source có thể chạy local sau khi cài Python và phụ thuộc; cần cấu hình khóa Gemini hợp lệ để dùng AI thật.

## 1. Thông tin chung

| Hạng mục | Nội dung |
|---|---|
| Tên đội | Nhóm KMPT |
| Bảng thi | Bảng A — Công nghệ |
| Đề bài | Đề 10: Kiểm tra & gợi ý tên thương hiệu + tên miền |
| Demo online | **Cần bổ sung URL bản triển khai đã kiểm tra** |
| Video demo ≤ 2 phút | **Cần bổ sung URL video thao tác thực tế** |
| Repository | [Cwsmvp/VibeCodeChallenge](https://github.com/Cwsmvp/VibeCodeChallenge) |
| Source ZIP | Chạy công cụ đóng gói để tạo `dist/KMPT-De10-source.zip`; cần bổ sung URL tải sau khi đăng gói cuối |
| Minh chứng dùng AI | [PDF một trang](docs/AI_EVIDENCE.pdf), [bản HTML](docs/AI_EVIDENCE.html) |
| Kiểm thử | [Báo cáo tự động](docs/reports/TEST_RESULTS.md), [trình duyệt](docs/reports/BROWSER_RESULTS.md) |
| Việc còn lại | [Checklist bàn giao](docs/SUBMISSION_CHECKLIST.md) |

Thông tin đội/bảng/đề giữ theo hồ sơ hiện có; đội cần đối chiếu với tài khoản đăng ký. Bộ hồ sơ này chưa được gửi lên cổng BTC.

## 2. Năm chức năng theo đề

| Yêu cầu | Cách thực hiện |
|---|---|
| Nhập tên thương hiệu | Form và API cùng kiểm tra 2–30 ký tự sau trim/NFC; phải tạo được slug. Bỏ dấu tiếng Việt, khoảng trắng và ký tự không dùng cho tên miền. |
| Đánh giá tên và gợi ý 5 tên miền | Gemini chấm độ dễ nhớ và dễ đọc/phát âm 1–10, kèm nhận xét. **Phần gợi ý tên miền là mô phỏng theo quy tắc:** ghép slug với `.com`, `.vn`, `.com.vn`, `.shop`, `.online`; chưa dùng AI để chọn 5 biến thể. |
| Kiểm tra trạng thái tên miền demo | Quy tắc trong `domains.py`, không gọi WHOIS/RDAP. Giao diện và nội dung copy ghi **“Kết quả demo, không phải dữ liệu thật”**. |
| Tạo 3 slogan và 1 tagline | Gọi Gemini thật; tối đa 10 từ/slogan, 15 từ/tagline. Có Gợi ý lại; giữ kết quả cũ khi lỗi và từ chối tagline lặp sau chuẩn hóa. |
| Copy và Đăng ký tên miền | Copy state mới nhất, ghi rõ phần đang tải. Nút đăng ký mở tab mới; hiện dẫn tới **trang demo có nhãn** vì chưa có URL chính thức. |

[Giải thích đề 10 của BTC](https://vibecoding.info.vn/de-bai#de-10) cho phép gợi ý tên miền dạng mock có chú thích và dùng link đăng ký demo khi chưa có URL nhà tài trợ. Không coi kết quả tên miền là dữ liệu đăng ký thực tế.

## 3. Công nghệ sử dụng

- Python ≥ 3.10; Flask `>=3.1,<3.2`, Jinja2.
- HTML/CSS và JavaScript thuần; không có bước build frontend hoặc database.
- Gemini Interactions API qua `urllib.request` trong thư viện chuẩn Python.
- Kiểm thử: `unittest`, `unittest.mock`, Node.js `node:test`; công cụ kiểm tra trình duyệt dùng Chrome và CDP.
- Cấu hình triển khai Flask trên Vercel ở `vercel.json`.

Môi trường đã kiểm tra: Windows/PowerShell, Python 3.14.7, Flask 3.1.3, Jinja2 3.1.6, Node.js 24.21.0. Node.js chỉ cần cho bộ test JavaScript và công cụ kiểm tra trình duyệt, không cần để chạy Flask.

## 4. AI và cấu hình bảo mật

Mã sản phẩm gọi Gemini thật cho đánh giá tên và slogan/tagline. Endpoint: `https://generativelanguage.googleapis.com/v1beta/interactions`; model mặc định `gemini-3.6-flash`, đổi được bằng `GEMINI_MODEL`.

Backend yêu cầu JSON Schema rồi kiểm tra lại cấu trúc, điểm số, độ dài và số lượng đầu ra. Thiếu key hoặc API lỗi sẽ trả thông báo lỗi; không tự thay AI bằng kết quả giả. Log không ghi key hoặc tên thương hiệu. Payload có `store: false`.

| Biến môi trường | Giá trị / ý nghĩa |
|---|---|
| `GEMINI_API_KEY` | Bắt buộc để dùng AI; chỉ đặt trên máy chủ hoặc terminal chạy local |
| `GEMINI_MODEL` | Không bắt buộc; mặc định `gemini-3.6-flash` |
| `GEMINI_TIMEOUT_SECONDS` | Số nguyên 1–120; mặc định 30 giây cho thao tác mạng |
| `SPONSOR_DOMAIN_URL` | URL HTTPS chính thức do BTC cung cấp; trống hoặc không hợp lệ thì dùng `/dang-ky-demo` |

[`.env.example`](.env.example) chỉ là tài liệu cấu hình, không có khóa thật. Ứng dụng **không tự nạp file `.env`**. Không đưa key vào source, ZIP, frontend, video hoặc ảnh minh chứng. Máy khác chạy local cần tự cấu hình key; cách cấp quyền truy cập AI khi chấm theo thông báo BTC.

**Trạng thái kiểm chứng:** [báo cáo AI thật](docs/reports/LIVE_AI.md) hiện ghi `not_run` vì phiên hoàn thiện chưa có key. Test tự động và ảnh fixture không chứng minh Gemini thật đã hoạt động.

## 5. Cài đặt và chạy local

Cần Python ≥ 3.10, trình duyệt có JavaScript; cần Internet để cài phụ thuộc và gọi Gemini.

### Windows / PowerShell

Mở terminal tại thư mục chứa `app.py`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts/run_local.py
```

Nếu `python` mở Microsoft Store, thử `py -3 -m venv .venv`. Công cụ hỏi key bằng lời nhắc ẩn; Enter để bỏ qua AI. Nếu biến `GEMINI_API_KEY` đã tồn tại thì dùng biến đó, không hỏi lại. Không cần kích hoạt môi trường ảo.

Muốn chỉ xem giao diện và tên miền demo, không dùng AI:

```powershell
.\.venv\Scripts\python.exe scripts/run_local.py --without-ai
```

Mở `http://127.0.0.1:5000/`. Nhập **Mây Studio**, bấm **Phân tích**, thử Gợi ý lại, Copy tất cả rồi dán vào trình soạn thảo, và mở Đăng ký tên miền. `Ctrl+C` dừng server. Khi không có key, hai phần AI báo chưa cấu hình nhưng tên miền demo vẫn dùng được.

Có thể đặt tùy chọn trước khi chạy:

```powershell
$env:GEMINI_MODEL = "gemini-3.6-flash"
$env:GEMINI_TIMEOUT_SECONDS = "30"
# Khi có URL HTTPS chính thức từ BTC:
# $env:SPONSOR_DOMAIN_URL = "https://..."
```

### macOS / Linux

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/run_local.py
```

Nếu dùng khóa từ biến môi trường, đặt biến trong terminal hoặc công cụ quản lý secret trước khi chạy. Không cần sửa mã nguồn. Tham số `--port 5001` đổi cổng khi cổng mặc định đang bận. Lệnh Flask thông thường vẫn dùng được nếu đã đặt các biến môi trường cần thiết: `python -m flask --app app run`.

## 6. Cấu trúc source

```text
app.py                  # Trang chủ, API và trang đăng ký demo
slug.py, domains.py      # Chuẩn hóa và tên miền mô phỏng
evaluation.py            # Gemini, kiểm tra đánh giá và xử lý lỗi
slogans.py               # Prompt và kiểm tra slogan/tagline
templates/, public/      # HTML/CSS/JavaScript
scripts/                 # Chạy local, kiểm tra, đóng gói
tests/                   # Python và JavaScript
docs/                    # Hồ sơ, báo cáo, ảnh và minh chứng một trang
Yêu Cầu Bài Nộp/          # Ba ảnh yêu cầu do đội cung cấp
.env.example             # Mẫu cấu hình trống, không tự được nạp
requirements.txt
vercel.json
PROJECT.md
README.md
```

## 7. Truy cập và triển khai

Ứng dụng không yêu cầu tài khoản; dữ liệu thử: **Mây Studio**, **Cà phê Đậm**. Không có màn hình quản trị hoặc dữ liệu cần khởi tạo. Hai tác vụ AI tải độc lập; kết quả chỉ tồn tại trong trang hiện tại.

Trên Vercel: chọn thư mục chứa `app.py` làm root, framework Flask, bỏ các lệnh build/output cũ nếu có. Thêm `GEMINI_API_KEY` và các biến tùy chọn vào môi trường server rồi triển khai lại. `SPONSOR_DOMAIN_URL` được đọc khi khởi động; đổi biến cần khởi động/triển khai lại. Không dùng biến công khai cho key.

Sau triển khai, mở link bằng cửa sổ chưa đăng nhập, thử AI thật, Gợi ý lại, copy và link đăng ký. Điền URL bản đã kiểm tra vào mục 1. Chưa có bằng chứng bản online hoạt động trong phiên này.

## 8. Giới hạn

- Gợi ý và trạng thái tên miền là mô phỏng; chưa có tra cứu khả dụng thực tế hoặc xác minh quyền sở hữu nhãn hiệu.
- Liên kết đăng ký dùng trang demo cho đến khi có URL chính thức từ BTC.
- Chưa kiểm chứng Gemini thật/bản online trong phiên hoàn thiện; cần tài khoản AI và hosting có quyền truy cập.
- Không lưu lịch sử khi tải lại trang; chưa có rate limit hoặc xác thực ở tầng ứng dụng.
- Trình duyệt ngừng chờ AI sau 130 giây; backend không tự retry. Timeout thao tác mạng không phải cam kết tổng thời gian xử lý.
- Kiểm tra mobile bằng Chrome headless 390px; chưa kiểm tra trên thiết bị vật lý hoặc mọi trình duyệt.

## 9. Nguồn tham khảo

- [Đề 10 và giải thích chính thức](https://vibecoding.info.vn/de-bai#de-10).
- [Tiêu chí và yêu cầu bài nộp](https://vibecoding.info.vn/tieu-chi-cham-thi).
- [Cổng nộp bài](https://vibecoding.info.vn/nop-bai).
- [Gemini Interactions API](https://aistudio.google.com/docs/interactions-overview), [Google AI Studio](https://aistudio.google.com/apikey).
- [Flask](https://flask.palletsprojects.com/), [Jinja](https://jinja.palletsprojects.com/).
- [Tài liệu kỹ thuật dự án](PROJECT.md); 3 ảnh gốc trong thư mục `Yêu Cầu Bài Nộp/`.

Giao diện dùng font hệ thống Segoe UI/Arial và Georgia/Times New Roman. Công cụ AI hỗ trợ rà soát và hoàn thiện hồ sơ là Codex; xem minh chứng bên dưới.

## 10. Minh chứng dùng AI xây dựng/cải thiện sản phẩm

[Minh chứng PDF một trang](docs/AI_EVIDENCE.pdf) gồm 3 trích đoạn yêu cầu thực tế trong phiên này, theo chuỗi mục tiêu → đối chiếu → phát hiện vấn đề → yêu cầu cải thiện → kiểm tra lại. [HTML nguồn](docs/AI_EVIDENCE.html) có định dạng A4 để đọc hoặc in.

Minh chứng chỉ đại diện phiên hoàn thiện ngày 04/11/2026. Không tạo lại hội thoại phát triển không có trong phiên. Ảnh `docs/screenshots/desktop-ai-fixture.png` được gắn nhãn mô phỏng và chỉ dùng để kiểm tra giao diện.

## 11. Kiểm thử và kết quả thực tế

Ngày kiểm tra: **04/11/2026**. Đã đạt **25 test Python, 6 test JavaScript, 8 ca Chrome local**. Chi tiết và thời điểm chạy chính xác trong [báo cáo tự động](docs/reports/TEST_RESULTS.md), [báo cáo trình duyệt](docs/reports/BROWSER_RESULTS.md).

| Ca bắt buộc | Loại | Đầu vào / thao tác | Kỳ vọng và kết quả đã kiểm tra |
|---|---|---|---|
| TC01 | Bình thường | Mây Studio | HTTP 200, slug `maystudio`, đủ 5 tên miền và nhãn demo — Đạt |
| TC02 | Bình thường | Cà phê Đậm | HTTP 200, slug `caphedam`, đủ 5 tên miền — Đạt |
| TC03 | Không hợp lệ | Tên rỗng/khoảng trắng | Hiện lỗi, không tạo kết quả — Đạt |
| TC04 | Không hợp lệ | `!!!` | Từ chối tên không tạo được slug — Đạt |
| TC05 | Biên | `An` — 2 ký tự | Chấp nhận, đủ 5 tên miền — Đạt |
| TC06 | Biên | 31 chữ `A` | Từ chối vượt giới hạn — Đạt |

TC01–TC06 nằm trong `tests/test_submission.py` và chạy qua Flask test client, không gọi AI thật. Các test bổ sung kiểm tra API sai kiểu/độ dài, chuẩn hóa tiếng Việt, lỗi thiếu key, không lộ key, liên kết demo/chính thức và XSS cơ bản. Test Gemini mô phỏng timeout, lỗi quyền/model/hạn mức và phản hồi JSON. Test frontend mô phỏng DOM/mạng để kiểm tra tải độc lập, lỗi, thử lại và state sao chép.

Chrome thật đã kiểm tra nhập sai, 5 tên miền khi thiếu key, mở link demo, mobile không tràn ngang, kết quả AI/đổi tagline bằng fixture, clipboard thật và không có exception JavaScript chưa xử lý. Không gửi request tới Gemini trong kiểm tra trình duyệt.

Chạy lại và lưu báo cáo:

```powershell
.\.venv\Scripts\python.exe scripts/run_checks.py
node scripts/browser_check.cjs
```

Công cụ trình duyệt cần Node.js ≥ 22 và Chrome/Edge cài sẵn trên Windows; có thể đặt `CHROME_PATH` và `LOCAL_PYTHON` để chỉ định chương trình. Chạy ẩn, không dùng hồ sơ Chrome cá nhân, không dùng key môi trường cho test. Xuất lại PDF minh chứng và xác nhận đúng một trang.

Kiểm chứng AI thật riêng, nhập key ẩn (tối đa 3 request, có thể dùng hạn mức tài khoản):

```powershell
.\.venv\Scripts\python.exe scripts/check_live_ai.py --prompt-key
```

Kết quả được ghi trong [LIVE_AI.md](docs/reports/LIVE_AI.md); chưa chạy khi không có key, không thay bằng fixture. Công cụ này kiểm tra route local, chưa thay thế kiểm tra bản triển khai và video.

## 12. Đóng gói và bàn giao

Đọc [checklist](docs/SUBMISSION_CHECKLIST.md), [kịch bản video](docs/DEMO_SCRIPT.md) và [chuẩn bị hỏi đáp](docs/TECHNICAL_QA.md).

```powershell
.\.venv\Scripts\python.exe scripts/build_source.py
```

Tạo `dist/KMPT-De10-source.zip`, checksum `.sha256` và `MANIFEST.json`. ZIP có thư mục gốc `KMPT-De10/`, source, README, cấu hình mẫu, test và hồ sơ. Công cụ kiểm tra các mẫu khóa phổ biến, giá trị secret có trong môi trường, CRC và hash từng tệp; không thay thế việc tự rà soát tài liệu riêng trước khi nộp.

Không đóng gói `.git/`, `.venv/`, `.env`, file cache, hồ sơ trình duyệt hoặc output `dist/`. Không cần đóng gói tài khoản demo. Sau khi có link online, kiểm chứng AI thật và video, cập nhật README rồi đóng lại ZIP cuối. Tải gói lên nơi BTC yêu cầu và điền URL tải. Không sửa tính năng sau hạn nộp.
