# Trợ lý đặt tên thương hiệu & tên miền

## Mô tả

Web một trang viết bằng Python cho cuộc thi vibe coding. Người dùng nhập tên thương hiệu; ứng dụng chuẩn hóa tên thành slug, dùng AI đánh giá độ dễ nhớ và dễ đọc, đồng thời gợi ý đúng 5 biến thể tên miền theo danh sách đuôi cấu hình. Trạng thái tên miền được kiểm tra ở **chế độ demo** và phải luôn ghi rõ **“Kết quả demo”** trên giao diện, tránh gây hiểu lầm rằng đã kiểm tra khả dụng thực tế. AI còn gợi ý đúng 3 slogan và 1 tagline. Người dùng có thể sao chép toàn bộ kết quả hoặc nhấn **“Đăng ký tên miền”** để mở trang nhà tài trợ.

Địa chỉ trang nhà tài trợ chưa được cung cấp; lưu dưới dạng cấu hình để điền khi triển khai. AI đánh giá tên dùng Gemini Interactions API; trạng thái tên miền demo dùng quy tắc xác định trong `domains.py`, không tra cứu thực tế.

## Nền tảng và cấu trúc

- Framework: **Flask 3.1.x** (Python 3.9 trở lên). Flask xử lý trang và các bước logic sau; Jinja dựng giao diện HTML.
- Giao diện: HTML/CSS thuần, không cần framework giao diện hoặc bước biên dịch. Thiết kế theo mobile-first.
- `app.py`: điểm vào Flask, route trang chủ, `POST /api/evaluate` và `POST /api/slogans`. `slug.py`: hàm `Transtoslug(brand)` chuẩn hóa tên. `domains.py`: danh sách đuôi cấu hình và trạng thái demo. `evaluation.py`: gọi Gemini và kiểm tra dữ liệu đánh giá. `slogans.py`: prompt và kiểm tra 3 slogan cùng tagline.
- `templates/index.html`: bố cục trang; `templates/components/`: các khối giao diện riêng; `public/style.css`: toàn bộ kiểu dáng. `public/actions.js`: sao chép kết quả và cấu hình liên kết nhà tài trợ; `public/slogans.js`: nút gợi ý lại. Flask dùng thư mục `public` làm nguồn CSS và JavaScript khi chạy cục bộ; Vercel phục vụ thư mục này trực tiếp.
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

1. Tạo Gemini API key trong [Google AI Studio](https://aistudio.google.com/apikey). Việc gọi mô hình có thể phát sinh chi phí hoặc gặp giới hạn lượt gọi tùy tài khoản và gói sử dụng.
2. Trong PowerShell đang dùng để chạy app, nhập khóa qua lời nhắc ẩn (không ghi khóa vào code hoặc lệnh có thể nằm trong lịch sử):

   ```powershell
   $apiSecret = Read-Host "Gemini API key" -AsSecureString
   $env:GEMINI_API_KEY = [System.Net.NetworkCredential]::new("", $apiSecret).Password
   Remove-Variable apiSecret
   .\.venv\Scripts\python.exe -m flask --app app run --debug
   ```

3. Mở `http://127.0.0.1:5000/`, nhập tên rồi bấm **Phân tích**. Endpoint `POST /api/evaluate` nhận JSON `{ "brand": "..." }`, giới hạn 50 ký tự và trả JSON `evaluation` đúng mẫu bên dưới. `POST /api/slogans` nhận cùng mẫu đầu vào, trả `{ "slogans": ["...", "...", "..."], "tagline": "..." }`. Nút **Gợi ý lại** gọi endpoint slogan để thay phương án trên trang. Ô nhập trên trang vẫn giới hạn 2–30 ký tự theo bước 2.
4. Khi triển khai bằng Vercel, kết nối repo; `app.py` là entrypoint, `requirements.txt` khai báo thư viện và `vercel.json` chọn Flask, đặt lệnh build và thư mục đầu ra về mặc định của Flask. Dự án không cần Vite. Trong **Project Settings → Environment Variables**, thêm `GEMINI_API_KEY` cho môi trường cần dùng (Preview/Production). Có thể thêm `GEMINI_MODEL`; mặc định là `gemini-3.5-flash-lite`. Triển khai lại sau khi thêm hoặc đổi biến. Biến `OPENAI_API_KEY` cũ không còn được ứng dụng sử dụng. Không dùng biến công khai như `NEXT_PUBLIC_...` cho khóa.

Nếu Vercel từng được cấu hình cho Vite và báo `vite: command not found`, mở **Project Settings → Build and Deployment**: chọn **Framework Preset: Flask**, tắt **Build Command Override** đang chứa `vite build` và bỏ **Output Directory Override** như `dist` nếu có. Đẩy commit chứa `vercel.json` lên repo rồi redeploy. Vercel cần dùng thư mục gốc chứa `app.py` làm **Root Directory**.

Lời gọi Gemini có timeout kết nối/đọc mặc định 30 giây, cấu hình bằng `GEMINI_TIMEOUT_SECONDS` (số nguyên 1–120). Đây là thời gian chờ thao tác mạng, không phải cam kết tổng thời gian xử lý. Khi triển khai, giới hạn thời gian chạy của hosting cần đủ lớn cho mức chờ đã chọn và phần xử lý còn lại; redeploy sau khi đổi biến môi trường. Không tự retry để tránh kéo dài chờ và gọi trùng khi yêu cầu trước có thể vẫn đang xử lý. Khi thiếu khóa, timeout hoặc AI trả dữ liệu sai, API trả lỗi JSON và giao diện giữ lại kết quả tên miền demo. Thông báo phân biệt lỗi kết nối, timeout, quyền truy cập, mô hình và hạn mức. Log máy chủ ghi model, thời gian đã chờ, loại kết quả và mã HTTP từ Gemini; không ghi API key hay nội dung người dùng. Log thành công dùng mức INFO, log thất bại dùng WARNING. Không cần đưa API key vào trình duyệt.

## Liên kết nhà tài trợ và sao chép

Tagline là câu mô tả giá trị cốt lõi do Gemini tạo từ tên thương hiệu, tối đa 15 từ. Kết quả chỉ nằm trong trang hiện tại, không lưu vào cơ sở dữ liệu. Nút **Gợi ý lại** gửi thêm `previous_tagline` đến `POST /api/slogans` để yêu cầu một câu khác. Nếu AI vẫn trả câu cũ (kể cả chỉ đổi hoa/thường hoặc dấu câu), API trả HTTP 409; giao diện giữ kết quả trước và báo rõ chưa thay đổi. Khi sửa tên trong ô nhập, cần bấm **Phân tích** trước khi gợi ý lại cho tên mới. Nội dung hiển thị lấy từ `state.tagline` khi tải trang, rồi từ phản hồi API sau khi gợi ý lại; sửa riêng chữ trong template không thay đổi dữ liệu AI hay nội dung sao chép.

Khi đã phân tích được tên và tạo danh sách tên miền demo, nút **Copy tất cả** sao chép tên thương hiệu, slug, đánh giá AI nếu có, 5 tên miền kèm nhãn kết quả demo, 3 slogan và tagline nếu có. Nút dùng Clipboard API, rồi thử cách sao chép dự phòng trên trình duyệt cũ. Sau khi bấm **Gợi ý lại**, nội dung sao chép lấy slogan mới nhất.

Để bật nút **Đăng ký tên miền**, điền URL trang nhà tài trợ chính thức vào hằng số `taitro_URL` ở đầu `public/actions.js`, ví dụ `const taitro_URL = "https://ten-mien-cua-nha-tai-tro.example";`. Khi chưa có URL, nút vẫn vô hiệu hóa và trang báo lý do. Liên kết mở tab mới với `target="_blank"` và `rel="noopener noreferrer"`.

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

`state` là dữ liệu kết quả để hiển thị và sao chép. `domains` có đúng 5 phần tử khi tên nhập hợp lệ, mỗi phần tử có `domain` và `status` (`available` hoặc `taken`). `slogans` có đúng 3 phần tử khi AI tạo thành công; mỗi câu tối đa 10 từ, tagline tối đa 15 từ. Điểm số và nhận xét do AI trả về, trong đó `memorability` là độ dễ nhớ và `pronounceability` là độ dễ đọc.

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

Tiến độ: đã hoàn thành bước 1 (khung giao diện tĩnh), bước 2 (nhập tên, kiểm tra hợp lệ, tạo slug), bước 3 (sinh năm biến thể tên miền), bước 4 (trạng thái tên miền demo), bước 5 (đánh giá tên bằng AI phía máy chủ), bước 6 (3 slogan, 1 tagline, gợi ý lại) và bước 7 (sao chép kết quả, nút đăng ký có cấu hình). Bước 8 trong kế hoạch chưa thực hiện; nút đăng ký chờ URL nhà tài trợ để hoạt động.
