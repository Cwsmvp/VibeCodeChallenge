# WORKED — Nhật ký công việc đã thực hiện

**Dự án:** Trợ lý đặt tên thương hiệu & tên miền · Nhóm KMPT · Bảng A · Đề 10  
**Ngày làm việc:** 04/11/2026 · Giờ Việt Nam (UTC+7)  
**Phạm vi:** Những việc Codex đã thực hiện trong cuộc trao đổi này, từ lúc làm rõ API key và chạy local đến khi chuẩn bị gói source bàn giao.

## 1. Kết quả hiện tại

Đã cải thiện code, hoàn thiện tài liệu chạy local, tạo minh chứng sử dụng AI một trang, bổ sung công cụ kiểm tra và đóng gói source. Gói ZIP đã được giải nén vào thư mục tạm để chạy lại các test Python/JavaScript và kiểm tra nội dung bàn giao.

| Hạng mục | Kết quả |
|---|---|
| Kiểm thử Python | 25/25 test đạt |
| Kiểm thử JavaScript | 6/6 test đạt |
| Kiểm tra Chrome thật | 8/8 ca đạt |
| Minh chứng sử dụng AI | Đã xuất PDF A4 và kiểm tra đúng 1 trang |
| Source ZIP | Đã tạo, gồm 53 tệp, dung lượng 966.742 byte |
| Kiểm tra bản giải nén | Test Python/JavaScript đạt; hash từng tệp khớp manifest |
| Gemini thật | Chưa chạy vì phiên này không có API key |
| Bản online | Chưa triển khai hoặc xác minh |
| Video cuối | Đã có kịch bản; chưa quay/đăng video |
| Nộp lên cổng BTC | Chưa thực hiện |

**Các phần gọi Gemini, tạo slug, mô phỏng tên miền và giao diện chính đã tồn tại trước phiên này.** Công việc trong phiên tập trung vào rà soát, sửa các điểm bàn giao và tạo hồ sơ/kiểm chứng; không coi toàn bộ sản phẩm là được xây mới trong phiên.

## 2. Đọc dự án và làm rõ API key

Đã đọc README, `.gitignore`, tài liệu dự án, code Flask, code Gemini và các phần frontend liên quan để xác nhận cách cấu hình thực tế.

Các kết luận đã giải thích:

- `evaluation.py` đọc key từ biến môi trường `GEMINI_API_KEY` của máy chủ.
- Source chạy trên máy khác cần được cài phụ thuộc và cấu hình key hợp lệ để dùng AI thật; không cần kèm key trong source.
- Khi không có key, ứng dụng vẫn mở được giao diện và hiển thị tên miền demo; hai phần AI báo chưa cấu hình.
- File `.env` không được ứng dụng tự nạp. `.env.example` chỉ là mẫu tham khảo.
- Biến môi trường giúp giữ key ngoài source/frontend; không có nghĩa là che được key khỏi người quản lý máy chủ đang chạy ứng dụng.
- Chưa có căn cứ để mặc định giám khảo tự có key. Cách cấp quyền truy cập AI khi kiểm tra source cần theo thông báo của BTC.

## 3. Đọc ba ảnh yêu cầu và đối chiếu nguồn chính thức

Đã xem đủ 3 ảnh do bạn cung cấp, giữ nguyên trong thư mục `Yêu Cầu Bài Nộp/`:

- `Screenshot 2026-11-04 160221.png`: bảng điểm bảng A và lưu ý AI thật/mock.
- `Screenshot 2026-11-04 160229.png`: hồ sơ bài nộp, video, minh chứng và số ca kiểm thử.
- `Screenshot 2026-11-04 160235.png`: nguyên tắc chấm, xử lý sự cố truy cập và thông báo quyền truy cập AI.

Đã mở và đối chiếu thêm:

- [Tiêu chí chấm và yêu cầu bài nộp](https://vibecoding.info.vn/tieu-chi-cham-thi).
- [Đề 10 và phần giải thích](https://vibecoding.info.vn/de-bai#de-10).
- [Cổng nộp bài](https://vibecoding.info.vn/nop-bai).
- [Tài liệu Gemini Interactions API](https://aistudio.google.com/docs/interactions-overview).

Điểm áp dụng vào dự án: đề 10 cho phép dùng link đăng ký demo có ghi chú khi chưa có URL nhà tài trợ; phần gợi ý tên miền cũng được phép dùng mock có chú thích. README đã được sửa để công bố đúng cả việc sinh tên miền theo quy tắc lẫn trạng thái mô phỏng.

## 4. Những vấn đề phát hiện trước khi sửa

1. Form nhận tên 2–30 ký tự, nhưng API trước đó chỉ chặn tên rỗng và tên dài hơn 50 ký tự.
2. Nút Đăng ký tên miền chưa hoạt động vì hằng số URL trong frontend còn trống.
3. Sáu ca kiểm tra bàn giao bắt buộc đã được mô tả trong README nhưng chưa có file test để chạy lại đầy đủ.
4. README có mục tham chiếu tới `README.md.txt` không hiện diện trong thư mục dự án.
5. Tài liệu kỹ thuật còn mô tả cấu hình liên kết nhà tài trợ theo cách cũ.
6. Hồ sơ còn thiếu minh chứng sử dụng AI, kịch bản video, công cụ đóng ZIP và báo cáo kiểm tra gói source.
7. Chưa có API key trong môi trường phiên này, chưa có URL triển khai/video được xác nhận.

## 5. Các thay đổi code đã thực hiện

| Tệp | Nội dung thay đổi |
|---|---|
| `app.py` | Thêm `validated_brand()` để form và hai API dùng chung quy tắc trim/NFC, độ dài 2–30 ký tự và khả năng tạo slug. |
| `app.py` | Đọc `SPONSOR_DOMAIN_URL` khi khởi động; thêm `registration_target()` chọn URL HTTPS hợp lệ hoặc trang demo. |
| `app.py` | Thêm route `GET /dang-ky-demo`, truyền URL và trạng thái demo cho template trang chính. |
| `public/actions.js` | Bỏ hằng số URL nhà tài trợ ở frontend và logic khóa nút dựa trên hằng số đó; liên kết được dựng từ server. |
| `public/actions.js` | Đổi nhãn trong nội dung sao chép thành “KẾT QUẢ DEMO, KHÔNG PHẢI DỮ LIỆU THẬT”. |
| `templates/components/actions.html` | Khi có tên hợp lệ, nút đăng ký mở liên kết đã chọn ở tab mới với `noopener noreferrer`; thêm thông báo nếu đang dùng link demo. |
| `templates/components/brand_form.html` | Thêm thuộc tính `minlength`, `maxlength`, `required`; việc kiểm tra thực tế vẫn do server thực hiện. |
| `templates/components/domains.html` | Hiển thị nhãn “Kết quả demo, không phải dữ liệu thật”. |
| `templates/registration_demo.html` | Tạo trang minh họa đăng ký tên miền, nói rõ chưa tiếp nhận đăng ký/thanh toán và có đường dẫn về trang chủ. |
| `.gitignore` | Cho phép quản lý `.env.example`; loại `dist/` và `.browser-check/` khỏi Git. |
| `.env.example` | Tạo mẫu cấu hình không có key thật: key trống, model, timeout và URL nhà tài trợ. |

URL nhà tài trợ chính thức có thể cấu hình sau qua `SPONSOR_DOMAIN_URL`; đổi biến cần khởi động/triển khai lại ứng dụng. Trang demo hiện tại không đăng ký tên miền thật hoặc lưu thông tin khách hàng.

## 6. Các công cụ mới đã tạo

| Tệp | Công dụng |
|---|---|
| [scripts/run_local.py](scripts/run_local.py) | Khởi động Flask ở `127.0.0.1`; dùng key môi trường hoặc hỏi nhập key ẩn; có `--without-ai` và tùy chọn cổng. Không ghi key vào file. |
| [scripts/run_checks.py](scripts/run_checks.py) | Chạy test Python và JavaScript, ghi log, báo cáo Markdown và JSON. Không gọi Gemini thật. |
| [scripts/check_live_ai.py](scripts/check_live_ai.py) | Công cụ kiểm chứng AI thật khi có key, tối đa 3 request để kiểm tra đánh giá, slogan và gợi ý lại. Có lời nhắc key ẩn. |
| [scripts/browser_check.cjs](scripts/browser_check.cjs) | Chạy Chrome ẩn với hồ sơ riêng để kiểm tra UI, mở tab đăng ký, viewport mobile, clipboard và xuất PDF một trang. |
| [scripts/build_source.py](scripts/build_source.py) | Đóng ZIP theo danh sách cho phép, quét một số mẫu secret phổ biến, kiểm tra CRC/hash, tạo manifest và checksum. |

Công cụ trình duyệt xóa key khỏi môi trường server kiểm tra. Phản hồi AI thành công chỉ được mô phỏng bằng cách chặn request trong chính công cụ test; không bổ sung chế độ giả AI tự động vào sản phẩm.

## 7. Kiểm thử Python và JavaScript

Đã chạy bộ test ban đầu: **13 Python và 6 JavaScript đều đạt**.

Sau đó thêm [tests/test_submission.py](tests/test_submission.py) với **12 test mới**:

| Test mới | Nội dung kiểm tra |
|---|---|
| TC01 | “Mây Studio” tạo slug `maystudio`, đủ 5 tên miền và nhãn demo. |
| TC02 | “Cà phê Đậm” tạo slug `caphedam`, đủ 5 tên miền. |
| TC03 | Tên rỗng/khoảng trắng hiển thị lỗi và không tạo kết quả. |
| TC04 | `!!!` bị từ chối vì không tạo được slug. |
| TC05 | `An` được chấp nhận ở cận dưới 2 ký tự. |
| TC06 | 31 chữ `A` bị từ chối vì vượt giới hạn. |
| Quy tắc form/API | Cùng chặn đầu vào sai, cùng chấp nhận cận hợp lệ và chuẩn hóa Unicode. |
| Thiếu key | Hai API trả lỗi an toàn, không liên hệ nhà cung cấp. |
| JSON sai | Chặn sai kiểu, thiếu trường và JSON hỏng trước khi gọi AI. |
| Liên kết đăng ký | Chọn đúng link demo/chính thức, xử lý cấu hình URL không hợp lệ và giữ thuộc tính an toàn khi mở tab. |
| Escape/key | Tên chứa thẻ script được escape; key giả phục vụ test không xuất hiện trong HTML. |
| Tài nguyên/viewport | HTML có viewport và các file CSS/JS được phục vụ thành công. |

Kết quả cuối: **25/25 Python và 6/6 JavaScript đạt**. Các test Gemini và frontend dùng mock; không kiểm chứng dịch vụ Gemini thật.

Báo cáo đã tạo:

- [docs/reports/TEST_RESULTS.md](docs/reports/TEST_RESULTS.md).
- [docs/reports/test-results.json](docs/reports/test-results.json).
- [docs/reports/python-tests.txt](docs/reports/python-tests.txt).
- [docs/reports/frontend-tests.txt](docs/reports/frontend-tests.txt).

Đã chạy `git diff --check`, không phát hiện lỗi khoảng trắng cần xử lý.

## 8. Kiểm tra Chrome thật và ảnh minh chứng

Đã khởi động Chrome ở chế độ ẩn và server Flask local, kiểm tra **8 ca**, tất cả đạt:

1. Trang trống tải thành công, không gửi request AI.
2. Tên không hợp lệ hiện lỗi và không tạo kết quả.
3. Đủ 5 tên miền demo vẫn dùng được khi hai API AI thiếu key.
4. Nút đăng ký thực sự mở tab tới trang demo có nhãn rõ.
5. Viewport mobile rộng 390px không tràn ngang.
6. Hai vùng AI hiển thị đúng bằng fixture; gợi ý lại gửi tagline trước đó.
7. Nút Copy ghi kết quả mới nhất và nhãn demo vào clipboard thật của trình duyệt; nội dung clipboard trước kiểm tra được khôi phục sau đó.
8. Không có JavaScript exception chưa được xử lý trong các ca kiểm tra.

Đã lưu 4 ảnh và mở xem ảnh desktop có fixture cùng ảnh mobile để kiểm tra trực quan:

| Ảnh | Nội dung |
|---|---|
| [desktop-empty.png](docs/screenshots/desktop-empty.png) | Trang desktop ban đầu. |
| [desktop-without-ai.png](docs/screenshots/desktop-without-ai.png) | Desktop hiển thị tên miền và thông báo chưa cấu hình key. |
| [mobile-without-ai.png](docs/screenshots/mobile-without-ai.png) | Giao diện mobile khi chưa cấu hình key. |
| [desktop-ai-fixture.png](docs/screenshots/desktop-ai-fixture.png) | UI có dữ liệu AI mô phỏng phục vụ test, có banner ghi rõ không phải Gemini thật. |

Báo cáo: [BROWSER_RESULTS.md](docs/reports/BROWSER_RESULTS.md), [browser-results.json](docs/reports/browser-results.json).

Kiểm tra này dùng Chrome thật nhưng phản hồi AI thành công là fixture. Không tương đương việc đã kiểm tra AI thật, bản online hoặc thiết bị di động vật lý.

## 9. Tài liệu và hồ sơ đã hoàn thiện

| Tài liệu | Nội dung |
|---|---|
| [README.md](README.md) | Viết lại hướng dẫn bàn giao: thông tin đội/đề, 5 chức năng, công nghệ, cấu hình bảo mật, chạy Windows/macOS/Linux, triển khai, kiểm thử, nguồn tham khảo và cách đóng gói. |
| [PROJECT.md](PROJECT.md) | Cập nhật mô tả luồng xử lý, thành phần, hợp đồng API, cấu hình, timeout, lỗi và giới hạn theo code hiện tại. |
| [docs/AI_EVIDENCE.html](docs/AI_EVIDENCE.html) | Minh chứng sử dụng Codex từ phiên trao đổi thực tế, gồm 3 trích đoạn yêu cầu và quá trình phát hiện/sửa/kiểm tra lại. |
| [docs/AI_EVIDENCE.pdf](docs/AI_EVIDENCE.pdf) | Xuất từ HTML bằng Chrome, kiểm tra đúng 1 trang A4. |
| [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) | Kịch bản thao tác và lời dẫn cho video tối đa 2 phút, bao quát 5 chức năng. |
| [docs/TECHNICAL_QA.md](docs/TECHNICAL_QA.md) | Chuẩn bị hỏi đáp về kiến trúc, luồng AI, đầu vào/đầu ra, bảo mật, lỗi và giới hạn sản phẩm. |
| [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) | Phân biệt phần đã chuẩn bị và việc đội cần hoàn tất trước khi bấm nộp. |

Minh chứng AI chỉ mô tả phiên hoàn thiện có trong hội thoại này; không tạo lại lịch sử phát triển ban đầu. Kịch bản video là tài liệu chuẩn bị, chưa phải video đã quay.

## 10. Kiểm chứng AI thật

Đã chạy công cụ kiểm tra điều kiện thực hiện. Vì không có `GEMINI_API_KEY`, công cụ không gửi request đến Gemini và ghi trạng thái **`not_run`**.

Tệp kết quả:

- [docs/reports/LIVE_AI.md](docs/reports/LIVE_AI.md).
- [docs/reports/live-ai.json](docs/reports/live-ai.json).

Không có bằng chứng mới trong phiên rằng key, hạn mức, quyền model và đường truyền trên tài khoản triển khai đã hoạt động. Cần chạy công cụ bằng key hợp lệ rồi kiểm tra thêm trên bản online.

## 11. Đóng gói source và kiểm tra bản bàn giao

Đã tạo:

- [dist/KMPT-De10-source.zip](dist/KMPT-De10-source.zip): **53 tệp**, có thư mục gốc `KMPT-De10/`.
- [dist/KMPT-De10-source.zip.sha256](dist/KMPT-De10-source.zip.sha256): checksum gói.
- [dist/MANIFEST.json](dist/MANIFEST.json): danh sách tệp, dung lượng và SHA-256 từng tệp.
- [dist/PACKAGE_CHECK.md](dist/PACKAGE_CHECK.md): kết quả kiểm tra gói đã giải nén.
- [dist/package-python-tests.txt](dist/package-python-tests.txt), [dist/package-javascript-tests.txt](dist/package-javascript-tests.txt): log test chạy từ gói giải nén.

SHA-256 của ZIP tại thời điểm kiểm tra:

```text
adf2d40927c60737d85397e9e65c8411e2a95812c3801584192a0a2a285de409
```

Các bước đã thực hiện:

1. Chọn source và hồ sơ theo danh sách cho phép, không dựa vào việc file đã được commit hay chưa.
2. Loại `.env`, `.git`, `.venv`, cache, hồ sơ Chrome và output `dist/`; giữ `.env.example` trống.
3. Quét một số mẫu API key/private key phổ biến và các giá trị secret hiện có trong môi trường. Đây là kiểm tra có phạm vi, không bảo đảm nhận diện mọi dạng bí mật.
4. Tạo ZIP, kiểm tra CRC và đối chiếu SHA-256 từng entry với source.
5. Giải nén vào thư mục tạm nằm trong workspace, kiểm tra đường dẫn giải nén.
6. Chạy lại toàn bộ test Python và JavaScript từ thư mục đã giải nén: đều đạt.
7. Kiểm tra liên kết tài liệu Markdown tương đối: không có tệp đích bị thiếu.
8. Kiểm tra PDF trong gói đúng 1 trang.
9. Kiểm tra bộ quét từ chối mẫu key được tạo giả trong bộ nhớ, không ghi khóa giả đầy đủ vào source.
10. Đối chiếu mọi tệp giải nén với manifest: khớp.

Kiểm tra bản giải nén sử dụng Python/môi trường thư viện và Node.js đã cài trên máy hiện tại. Chưa thực hiện cài mới trên một máy vật lý khác.

Gói ZIP trên được tạo trước `WORKED.md`; nhật ký này được lưu riêng ở thư mục gốc và chưa nằm trong gói 53 tệp đã kiểm tra.

## 12. Các lệnh để tiếp tục sử dụng

Chạy trong PowerShell tại thư mục dự án, sau khi đã tạo môi trường ảo và cài `requirements.txt`:

```powershell
# Chạy local, nhập key qua lời nhắc ẩn nếu cần.
.\.venv\Scripts\python.exe scripts/run_local.py

# Chỉ xem giao diện và tên miền demo.
.\.venv\Scripts\python.exe scripts/run_local.py --without-ai

# Chạy lại test và lưu báo cáo.
.\.venv\Scripts\python.exe scripts/run_checks.py

# Kiểm tra Chrome, tạo ảnh và xuất lại PDF minh chứng.
node scripts/browser_check.cjs

# Kiểm chứng Gemini thật; tối đa 3 request, có thể dùng hạn mức tài khoản.
.\.venv\Scripts\python.exe scripts/check_live_ai.py --prompt-key

# Đóng lại ZIP sau khi cập nhật hồ sơ.
.\.venv\Scripts\python.exe scripts/build_source.py
```

## 13. Những việc còn lại cần thông tin/quyền truy cập của đội

- [ ] Cấu hình key Gemini hợp lệ trong terminal/hosting và kiểm chứng AI thật.
- [ ] Triển khai bằng tài khoản hosting có quyền, kiểm tra toàn bộ luồng và ghi URL online vào README.
- [ ] Quay/đăng video thực tế tối đa 2 phút, kiểm tra quyền xem và bổ sung URL.
- [ ] Khi BTC cấp URL nhà tài trợ, đặt `SPONSOR_DOMAIN_URL` và kiểm tra lại link. Hiện đã có phương án demo ghi nhãn.
- [ ] Đối chiếu tên đội, bảng và đề với tài khoản đăng ký chính thức.
- [ ] Cập nhật hồ sơ cuối, đóng lại ZIP, tải lên nơi BTC yêu cầu và điền URL tải.
- [ ] Đăng nhập tài khoản đội, nộp bài và kiểm tra xác nhận.

Các thay đổi vẫn ở workspace; chưa tạo commit, push source, triển khai hosting hoặc gửi thông tin cho người khác. Không có API key thật được thêm vào các tệp tạo trong phiên này.
