# Trợ lý đặt tên thương hiệu & tên miền

## Mô tả

Web một trang viết bằng Python cho cuộc thi vibe coding. Người dùng nhập tên thương hiệu; ứng dụng chuẩn hóa tên thành slug, dùng AI đánh giá độ dễ nhớ và dễ đọc, đồng thời gợi ý đúng 5 biến thể tên miền theo danh sách đuôi cấu hình. Trạng thái tên miền được kiểm tra ở **chế độ demo** và phải luôn ghi rõ **“Kết quả demo”** trên giao diện, tránh gây hiểu lầm rằng đã kiểm tra khả dụng thực tế. AI còn gợi ý đúng 3 slogan và 1 tagline. Người dùng có thể sao chép toàn bộ kết quả hoặc nhấn **“Đăng ký tên miền”** để mở trang nhà tài trợ.

Địa chỉ trang nhà tài trợ chưa được cung cấp; lưu dưới dạng cấu hình để điền khi triển khai. AI đánh giá tên dùng OpenAI Responses API; trạng thái tên miền demo dùng quy tắc xác định trong `domains.py`, không tra cứu thực tế.

## Nền tảng và cấu trúc

- Framework: **Flask 3.1.x** (Python 3.9 trở lên). Flask xử lý trang và các bước logic sau; Jinja dựng giao diện HTML.
- Giao diện: HTML/CSS thuần, không cần framework giao diện hoặc bước biên dịch. Thiết kế theo mobile-first.
- `app.py`: điểm vào Flask, route trang chủ và `POST /api/evaluate`. `slug.py`: hàm `Transtoslug(brand)` chuẩn hóa tên. `domains.py`: danh sách đuôi cấu hình và trạng thái demo. `evaluation.py`: system prompt, gọi OpenAI và kiểm tra JSON trả về.
- `templates/index.html`: bố cục trang; `templates/components/`: các khối giao diện riêng; `public/style.css`: toàn bộ kiểu dáng. Flask dùng thư mục `public` làm nguồn CSS khi chạy cục bộ; Vercel phục vụ thư mục này trực tiếp.
- `requirements.txt`: phụ thuộc Python. Cài và chạy cục bộ theo hướng dẫn bên dưới.
- Bước 5 đã nối khối “Đánh giá tên” với AI phía máy chủ; khi chưa cấu hình API key hoặc AI gặp lỗi, phần tên miền vẫn hoạt động.

Trên máy phát triển hiện tại, alias `python` của WindowsApps đứng trước Python thật trong `PATH` và không chạy được. Mở PowerShell tại thư mục dự án, tạo môi trường ảo một lần rồi chạy ứng dụng:

```powershell
$env:Path = "$env:LOCALAPPDATA\Python\bin;$env:Path"
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m flask --app app run --debug
```

Những lần sau chỉ cần lệnh cuối. Mở `http://127.0.0.1:5000/` để xem trang và nhấn `Ctrl+C` trong cửa sổ PowerShell để dừng. Đã xác nhận trang chủ và CSS trả về HTTP 200 trong môi trường này.

## Cấu hình AI và triển khai

1. Tạo API key trong [OpenAI Platform](https://platform.openai.com/api-keys). API key này thuộc OpenAI API và có thể phát sinh chi phí khi gọi mô hình.
2. Trong PowerShell đang dùng để chạy app, nhập khóa qua lời nhắc ẩn (không ghi khóa vào code hoặc lệnh có thể nằm trong lịch sử):

   ```powershell
   $apiSecret = Read-Host "OpenAI API key" -AsSecureString
   $env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new("", $apiSecret).Password
   Remove-Variable apiSecret
   .\.venv\Scripts\python.exe -m flask --app app run --debug
   ```

3. Mở `http://127.0.0.1:5000/`, nhập tên rồi bấm **Phân tích**. Endpoint `POST /api/evaluate` nhận JSON `{ "brand": "..." }`, giới hạn 50 ký tự và trả JSON `evaluation` đúng mẫu bên dưới. Ô nhập trên trang vẫn giới hạn 2–30 ký tự theo bước 2.
4. Khi triển khai bằng Vercel, kết nối repo và chọn Python/Flask; `app.py` là entrypoint, `requirements.txt` khai báo thư viện. Dự án dùng Flask trực tiếp, không cần Vite hoặc lệnh build giao diện. Trong **Project Settings → Environment Variables**, thêm `OPENAI_API_KEY` cho môi trường cần dùng (Preview/Production). Có thể thêm `OPENAI_MODEL`; mặc định là `gpt-4o-mini`. Triển khai lại sau khi thêm hoặc đổi biến. Không dùng biến công khai như `NEXT_PUBLIC_...` cho khóa.

Lời gọi OpenAI có timeout 15 giây và tắt retry tự động để tránh kéo dài thời gian chờ. Khi thiếu khóa, timeout hoặc AI trả dữ liệu sai, API trả lỗi JSON và giao diện giữ lại kết quả tên miền demo. Không cần đưa API key vào trình duyệt.

## Kế hoạch 8 bước

1. Tạo khung giao diện tĩnh cho web một trang: ô nhập tên, khu vực đánh giá, danh sách tên miền, slogan, tagline và các nút hành động.
2. Nhận tên thương hiệu, kiểm tra dữ liệu nhập hợp lệ và tạo `slug` đã chuẩn hóa để dùng trong tên miền.
3. Sinh đúng 5 biến thể tên miền từ `slug` theo danh sách đuôi cấu hình.
4. Gán trạng thái tên miền ở chế độ demo; hiển thị rõ nhãn **“Kết quả demo”** cạnh kết quả, không trình bày trạng thái như dữ liệu tra cứu thực tế.
5. Dùng AI đánh giá độ dễ nhớ và dễ đọc của tên thương hiệu, gồm điểm số, nhận xét và phần tổng kết.
6. Dùng AI gợi ý đúng 3 slogan và 1 tagline.
7. Thêm nút sao chép toàn bộ thông tin kết quả và nút **“Đăng ký tên miền”** dẫn tới trang nhà tài trợ.
8. Ghép các phần, kiểm thử luồng chính và trường hợp nhập không hợp lệ, hoàn thiện giao diện rồi triển khai.

## Quy ước

- Giao diện và thông báo dành cho người dùng dùng tiếng Việt.
- Thiết kế mobile-first, dùng tốt trên màn hình nhỏ rồi mở rộng cho màn hình lớn.
- Code đơn giản, dễ đọc; giữ dữ liệu và cách hiển thị nhất quán với hợp đồng bên dưới.
- Mọi trạng thái `available` hoặc `taken` trong bản demo chỉ là **kết quả demo**.

## Hợp đồng dữ liệu

`state` là dữ liệu kết quả để hiển thị và sao chép. `domains` có đúng 5 phần tử khi tên nhập hợp lệ, mỗi phần tử có `domain` và `status` (`available` hoặc `taken`). `slogans` sẽ có đúng 3 phần tử khi đến bước 6. Điểm số và nhận xét do AI trả về, trong đó `memorability` là độ dễ nhớ và `pronounceability` là độ dễ đọc.

Quy tắc demo trong `Checkdomain(domain)`: slug dưới 5 ký tự hoặc nằm trong `shop`, `store`, `viet`, `coffee`, `online`, `vn`, `fashion` thì `taken`; còn lại lấy tổng mã Unicode của tên miền chia dư 3, dư 0 là `taken`, khác 0 là `available`. Kết quả chỉ để minh họa.

```js
state = {
  brand: "...", // tên người dùng nhập
  slug: "...", // tên đã chuẩn hóa dùng làm tên miền
  domains: [
    { domain: "...", status: "available" },
    { domain: "...", status: "taken" },
    { domain: "...", status: "available" },
    { domain: "...", status: "taken" },
    { domain: "...", status: "available" }
  ],
  evaluation: {
    memorability: { score: 8, comment: "..." },
    pronounceability: { score: 7, comment: "..." },
    summary: "..."
  },
  slogans: ["...", "...", "..."],
  tagline: "..."
}
```

Tiến độ: đã hoàn thành bước 1 (khung giao diện tĩnh), bước 2 (nhập tên, kiểm tra hợp lệ, tạo slug), bước 3 (sinh năm biến thể tên miền), bước 4 (trạng thái tên miền demo) và bước 5 (đánh giá tên bằng AI phía máy chủ). Các bước 6–8 chưa thực hiện.
