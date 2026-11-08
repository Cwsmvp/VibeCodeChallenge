# Tài liệu kỹ thuật — Trợ lý đặt tên thương hiệu & tên miền

Nhóm KMPT · Bảng A · Đề 10. Hướng dẫn cài đặt và trạng thái hồ sơ nằm trong [README](README.md). Tài liệu này mô tả code hiện tại, không phải kế hoạch chưa thực hiện.

## Luồng xử lý

1. `GET /` dựng trang trống bằng Flask/Jinja.
2. `POST /` nhận tên, trim và chuẩn hóa Unicode NFC, kiểm tra 2–30 ký tự và khả năng tạo slug bằng hàm `validated_brand` trong `app.py`.
3. `slug.py` chuyển đ/Đ, bỏ dấu, ký tự đặc biệt; giữ a–z, 0–9, gạch ngang và bỏ gạch ngang ở hai đầu.
4. `domains.py` ghép slug với 5 đuôi cố định, mô phỏng trạng thái theo quy tắc ổn định. Đây là phần mock có công bố, không phải gợi ý tên miền từ AI hoặc tra cứu WHOIS/RDAP.
5. HTML có kết quả tên miền và `window.appState`. JavaScript gọi đồng thời `/api/evaluate` và `/api/slogans`.
6. Hai API dùng cùng quy tắc kiểm tra tên với form, từ chối JSON sai kiểu trước khi gọi Gemini. Backend gọi Interactions API rồi kiểm tra nội dung đầu ra.
7. JavaScript cập nhật độc lập từng vùng và state. Copy đọc state mới nhất. Khi gợi ý lại slogan lỗi, kết quả cũ được giữ.

## Thành phần

| File | Trách nhiệm |
|---|---|
| `app.py` | Routes, kiểm tra đầu vào dùng chung, chọn liên kết đăng ký demo/chính thức |
| `evaluation.py` | Gemini HTTP client, JSON Schema, kiểm tra điểm/nhận xét và thông báo lỗi an toàn |
| `slogans.py` | Prompt, kiểm tra số lượng/độ dài slogan, tagline và phát hiện tagline lặp |
| `templates/index.html` | Ghép các khối HTML, đưa state qua bộ lọc `tojson` |
| `templates/registration_demo.html` | Trang đăng ký minh họa, không thu thập thông tin hoặc thanh toán |
| `public/ai.js` | Request, loading và timeout trình duyệt |
| `public/evaluation.js`, `public/slogans.js` | Hiển thị AI, nút thử lại, trạng thái đang tải |
| `public/actions.js` | Nội dung sao chép, Clipboard API và phương án dự phòng |
| `scripts/` | Chạy local, kiểm thử, kiểm chứng AI thật, kiểm tra trình duyệt và đóng ZIP |

## Hợp đồng API

`POST /api/evaluate`, body `{"brand":"Mây Studio"}`. Thành công:

```json
{
  "memorability": {"score": 8, "comment": "Nhận xét minh họa"},
  "pronounceability": {"score": 9, "comment": "Nhận xét minh họa"},
  "summary": "Tóm tắt minh họa"
}
```

Ví dụ trên chỉ mô tả cấu trúc, không phải kết quả Gemini thực tế. Điểm phải là số nguyên 1–10; mỗi nhận xét tối đa 25 từ, summary không rỗng.

`POST /api/slogans`, body `{"brand":"Mây Studio","previous_tagline":""}`. Thành công là `{"slogans":["...","...","..."],"tagline":"..."}`. Đúng 3 slogan khác nhau, tối đa 10 từ/câu và tagline tối đa 15 từ. Tagline cũ được gửi như dữ liệu; so sánh sau NFC, casefold, bỏ dấu câu và chuẩn hóa khoảng trắng. Câu lặp trả HTTP 409.

Lỗi đầu vào trả 400, thiếu key hoặc cấu hình timeout sai trả 503, timeout trả 504, lỗi kết nối/provider/đầu ra sai thường trả 502. JSON lỗi có `error`; khi có lỗi provider, chỉ chuyển `provider_status` và mã trong danh sách an toàn. Không trả raw body lỗi từ Gemini.

## Cấu hình và bảo mật

Key chỉ đọc từ `GEMINI_API_KEY`. Các biến tùy chọn: `GEMINI_MODEL`, `GEMINI_TIMEOUT_SECONDS`, `SPONSOR_DOMAIN_URL`; xem `.env.example`. File `.env` không tự được nạp.

`SPONSOR_DOMAIN_URL` được đọc khi Flask khởi động. Chỉ dùng URL HTTPS có hostname và không kèm user/password; giá trị thiếu/sai chuyển về `/dang-ky-demo`. Jinja dựng link có `target="_blank"`, `rel="noopener noreferrer"`; không cần sửa frontend khi đổi URL chính thức. Trước khi có tên hợp lệ, nút bị vô hiệu hóa.

Tên người dùng được escape trong HTML và đưa vào JavaScript bằng `tojson`. Nội dung AI hiển thị bằng `textContent`, không qua `innerHTML`. Prompt coi đầu vào là dữ liệu; backend vẫn kiểm tra schema/giới hạn vì prompt không bảo đảm đầu ra an toàn.

Gemini nhận `store: false`. Log chỉ có model, thời gian, loại kết quả và trạng thái provider; không ghi tên thương hiệu hoặc key. Không có cơ chế xác thực/rate limit ở tầng ứng dụng; cần cân nhắc hạn mức và kiểm soát truy cập hosting khi vận hành công khai.

## Timeout và xử lý lỗi

Backend mặc định 30 giây cho thao tác mạng, cấu hình 1–120 giây. Trình duyệt dừng chờ sau 130 giây. Giới hạn thời gian hosting là một giới hạn độc lập cần kiểm tra khi triển khai. Không tự retry AI.

Một phần AI lỗi không chặn phần kia hoặc danh sách tên miền. Khi đổi tên trong ô nhập, các nút AI cũ bị khóa cho đến khi bấm Phân tích lại. Copy trong lúc tải ghi rõ phần còn đang tải.

## Kiểm chứng và bàn giao

[25 test Python và 6 JavaScript](docs/reports/TEST_RESULTS.md) kiểm tra logic và lỗi với mock, không gọi AI thật. [8 ca Chrome](docs/reports/BROWSER_RESULTS.md) kiểm tra trình duyệt local, trong đó các phản hồi AI thành công được chặn và thay bằng fixture chỉ trong công cụ kiểm tra. Ảnh fixture có banner minh bạch.

[Kiểm chứng Gemini thật](docs/reports/LIVE_AI.md) hiện chưa thực hiện vì không có key trong phiên. [Checklist](docs/SUBMISSION_CHECKLIST.md) ghi các việc còn lại; [minh chứng sử dụng AI](docs/AI_EVIDENCE.pdf) chỉ ghi lại phiên hoàn thiện thực tế.
