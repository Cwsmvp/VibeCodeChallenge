# Báo cáo thực hiện Step 6 — AI đánh giá tên thương hiệu

Tài liệu này mô tả những gì đã thực hiện cho yêu cầu trong [Step6.txt](Step6.txt). Đây là **bước 5 trong kế hoạch 8 bước của PROJECT.md**; số 6 là số thứ tự file hướng dẫn.

## 1. Kết quả hiện có

- Trang chủ có thể đánh giá tên thương hiệu bằng AI sau khi người dùng nhập tên hợp lệ và bấm **Phân tích**. Phần đánh giá gồm điểm và nhận xét cho **độ dễ nhớ**, điểm và nhận xét cho **độ dễ đọc/phát âm**, cùng một câu tổng kết.
- Có endpoint `POST /api/evaluate` nhận JSON `{ "brand": "..." }` và trả về riêng đối tượng `evaluation` theo hợp đồng dữ liệu của dự án.
- Khóa OpenAI chỉ được đọc từ biến môi trường `OPENAI_API_KEY` ở phía máy chủ. Mã HTML/CSS không chứa khóa và không gọi OpenAI trực tiếp.
- Có giới hạn đầu vào, timeout 15 giây, xử lý lỗi API và kiểm tra dữ liệu AI trả về trước khi hiển thị.
- Kết quả tên miền demo vẫn được tạo và hiển thị nếu phần AI thiếu khóa hoặc gặp lỗi.

## 2. File được thêm

| File | Vai trò |
| --- | --- |
| [`../evaluation.py`](../evaluation.py) | Chứa system prompt, JSON Schema, hàm gọi OpenAI, kiểm tra kết quả và lớp lỗi `EvaluationError`. |
| [`../tests/test_step6.py`](../tests/test_step6.py) | Kiểm thử endpoint, đầu vào không hợp lệ, thiếu khóa, nhánh timeout, kết quả trả về, prompt, timeout cấu hình và dữ liệu AI sai. |

## 3. File được sửa

| File | Thay đổi |
| --- | --- |
| [`../app.py`](../app.py) | Thêm `state.evaluation`; gọi AI sau khi tên nhập đã hợp lệ; thêm route `POST /api/evaluate`. |
| [`../templates/components/evaluation.html`](../templates/components/evaluation.html) | Thay khung rỗng bằng phần hiển thị hai điểm, hai nhận xét và tóm tắt; có thông báo khi AI lỗi. |
| [`../public/style.css`](../public/style.css) | Thêm kiểu dáng cho điểm số, nhận xét, tóm tắt và thông báo lỗi. File này ban đầu ở `static/`, sau đó được chuyển sang `public/` để phù hợp cách Vercel phục vụ CSS. |
| [`../requirements.txt`](../requirements.txt) | Thêm thư viện Python `openai>=2,<3`. |
| [`../.gitignore`](../.gitignore) | Bỏ qua `.env`, `.env.*` và `.vercel/` để hạn chế đưa dữ liệu cấu hình cục bộ vào Git. |
| [`../PROJECT.md`](../PROJECT.md) | Ghi công nghệ AI đã chọn, hướng dẫn biến môi trường, endpoint và tiến độ hoàn thành bước 5. |

Không thay đổi `Step6.txt`. Không thêm mã JavaScript phía trình duyệt trong bước này.

## 4. Luồng hoạt động của trang chủ

1. Người dùng gửi biểu mẫu trên `/`. `app.py` cắt khoảng trắng, chuẩn hóa Unicode và áp dụng giới hạn **2–30 ký tự** vốn có từ bước nhập tên.
2. Nếu tên hợp lệ, ứng dụng tạo slug và năm tên miền demo như các bước trước.
3. `app.py` gọi `evaluate_brand(brand)` trong `evaluation.py`. Hàm này đọc khóa từ biến môi trường, gửi tên dưới vai trò **user** và gửi chỉ dẫn đánh giá qua **system prompt** của yêu cầu.
4. Nếu AI trả kết quả hợp lệ, ứng dụng đặt đối tượng đó vào `state["evaluation"]`; template hiển thị hai tiêu chí cùng tổng kết.
5. Nếu thiếu khóa hoặc AI lỗi, ứng dụng hiển thị một thông báo trong khối **Đánh giá tên**. Slug và năm tên miền demo vẫn xuất hiện.

Lưu ý: trang chủ gọi hàm máy chủ `evaluate_brand` trực tiếp khi gửi biểu mẫu; nó **không gửi một yêu cầu HTTP từ trình duyệt tới `/api/evaluate`**. Endpoint API là một đường truy cập riêng dùng chung hàm xử lý đó.

## 5. Endpoint `POST /api/evaluate`

**Đầu vào:** JSON có trường `brand` là chuỗi. Endpoint bỏ khoảng trắng đầu cuối và chuẩn hóa Unicode NFC. Chuỗi rỗng bị từ chối; giới hạn ở đây là **tối đa 50 ký tự** theo Step 6. Khác biệt có chủ ý: biểu mẫu trang chủ vẫn giới hạn 2–30 ký tự theo Step 3; vì vậy API hiện chấp nhận tên dài 1 ký tự còn biểu mẫu thì không.

**Đầu ra thành công (HTTP 200):** đối tượng JSON, không bọc thêm lớp `evaluation`:

```json
{
  "memorability": {"score": 8, "comment": "Dễ liên tưởng và ghi nhớ."},
  "pronounceability": {"score": 7, "comment": "Dễ đọc với người Việt."},
  "summary": "Tên gọn và phù hợp với thị trường Việt Nam."
}
```

Các con số và câu chữ trên chỉ là **ví dụ về định dạng**, không phải kết quả đã được AI tạo ra trong dự án.

**Đầu ra lỗi:** `{ "error": "..." }` cùng mã HTTP phù hợp:

| Mã | Trường hợp |
| --- | --- |
| `400` | JSON sai cấu trúc, thiếu `brand`, `brand` không phải chuỗi, rỗng hoặc quá 50 ký tự. |
| `503` | Máy chủ chưa có `OPENAI_API_KEY`. |
| `504` | Gọi OpenAI vượt thời gian chờ 15 giây. |
| `502` | OpenAI trả lỗi API, kết quả chưa hoàn chỉnh hoặc JSON không đạt cấu trúc yêu cầu. |

## 6. Cách gọi AI và giới hạn dữ liệu

- Mô hình mặc định: `gpt-4o-mini`; có thể đổi bằng biến môi trường `OPENAI_MODEL`. Đây là lựa chọn cấu hình, không phải mô hình do người dùng đã chỉ định.
- Dùng OpenAI **Responses API** với định dạng `json_schema` ở chế độ `strict` và `store=False`.
- System prompt yêu cầu AI đóng vai chuyên gia đặt tên cho thị trường Việt Nam, chấm **độ dễ nhớ** và **độ dễ đọc/phát âm** từ 1 đến 10, mỗi nhận xét tối đa 25 từ bằng tiếng Việt, thêm một câu tóm tắt; đồng thời nhắc AI không làm theo chỉ dẫn có trong tên người dùng gửi.
- JSON Schema yêu cầu đúng ba trường `memorability`, `pronounceability`, `summary`; hai tiêu chí phải có `score` và `comment`, không có trường thừa.
- Sau phản hồi AI, Python kiểm tra lại: điểm là số nguyên 1–10; nhận xét là chuỗi không rỗng và tối đa 25 từ theo cách tách bằng khoảng trắng; tổng kết là chuỗi không rỗng. Kết quả sai bị từ chối, không đưa vào giao diện.
- Client OpenAI đặt `timeout=15.0` và `max_retries=0`, tránh SDK tự thử lại sau khi hết thời gian chờ.

## 7. Đặt API key và mở app trên máy

1. Tạo API key trong [OpenAI Platform](https://platform.openai.com/api-keys). Giữ khóa riêng tư.
2. Mở PowerShell tại thư mục dự án và nhập khóa qua lời nhắc ẩn. Cách này đặt khóa trong **phiên PowerShell hiện tại**, không ghi khóa vào file dự án:

   ```powershell
   cd D:\VibeCodeChallenge10
   $apiSecret = Read-Host "OpenAI API key" -AsSecureString
   $env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new("", $apiSecret).Password
   Remove-Variable apiSecret
   .\.venv\Scripts\python.exe -m flask --app app run --debug
   ```

3. Mở `http://127.0.0.1:5000/` trong trình duyệt, nhập tên và bấm **Phân tích**. Nhấn `Ctrl+C` trong PowerShell để dừng.
4. Khi mở PowerShell mới, cần đặt lại `OPENAI_API_KEY`. Nếu chưa có môi trường ảo hoặc thư viện, làm theo phần cài đặt trong [`../PROJECT.md`](../PROJECT.md).

Có thể thử endpoint riêng bằng PowerShell sau khi app đang chạy:

```powershell
$body = @{ brand = "Cà Phê Gió" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/evaluate" -Method Post -ContentType "application/json; charset=utf-8" -Body $body
```

## 8. Khi triển khai

Hướng triển khai đã chọn là **Vercel**: dự án Flask có `app.py` và `requirements.txt`; Vercel có thể chạy toàn bộ ứng dụng như Python Function, trong đó `/api/evaluate` là route Flask. Chưa tạo một function độc lập trong thư mục `api/` và **chưa triển khai ứng dụng lên Vercel**.

Sau khi kết nối repo vào Vercel, mở **Project Settings → Environment Variables**, thêm `OPENAI_API_KEY` vào môi trường muốn dùng (Preview và/hoặc Production), có thể thêm `OPENAI_MODEL`, rồi triển khai lại để biến mới có hiệu lực. Không đặt khóa vào biến công khai, HTML, CSS, JavaScript hoặc Git. Xem thêm [tài liệu Python Runtime của Vercel](https://vercel.com/docs/functions/runtimes/python) và [biến môi trường Vercel](https://vercel.com/docs/environment-variables).

## 9. Kiểm thử và giới hạn xác minh

- Sau Step 6, đã chạy ` .\.venv\Scripts\python.exe -m unittest discover -s tests -q `: **16 kiểm thử đạt** trên toàn dự án.
- Các kiểm thử Step 6 dùng mô phỏng phản hồi OpenAI. Chúng xác nhận API trả mã lỗi đúng, gọi AI với system prompt, schema, timeout 15 giây và khóa phía máy chủ, đồng thời kiểm tra giao diện khi có kết quả giả lập.
- **Chưa gọi OpenAI thật** vì chưa có API key trong môi trường làm việc. Vì vậy chưa xác minh chất lượng nhận xét thực tế hoặc tương thích của một lần gọi API thật.
- **Chưa triển khai Vercel**; phần hướng dẫn triển khai là cấu hình cần thực hiện sau, không phải kết quả đã kiểm chứng trên hosting.
