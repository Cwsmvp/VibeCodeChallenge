# Checklist bài nộp — Nhóm KMPT, bảng A, đề 10

Đối chiếu ngày 08/11/2026 với [tiêu chí BTC](https://vibecoding.info.vn/tieu-chi-cham-thi) và [đề 10](https://vibecoding.info.vn/de-bai#de-10). Gói source không kèm ảnh chụp yêu cầu gốc.

Đây là hồ sơ đang hoàn thiện. Chưa gửi bài lên cổng BTC.

## Đã chuẩn bị và kiểm tra

- [x] README ghi đội, bảng, đề, công nghệ, 5 chức năng, cách chạy, cấu hình AI, dữ liệu demo và giới hạn.
- [x] `.env.example` không chứa key; công cụ chạy local có lời nhắc nhập key ẩn.
- [x] Form/API kiểm tra tên thống nhất 2–30 ký tự.
- [x] Nút đăng ký có trang demo và nhãn rõ; cấu hình được URL HTTPS chính thức qua `SPONSOR_DOMAIN_URL`.
- [x] Có mã chạy lại 6 ca bắt buộc: 2 bình thường, 2 đầu vào sai, 2 ca biên.
- [x] Bộ kiểm thử tự động: 25 Python và 7 JavaScript đạt; xem [báo cáo](reports/TEST_RESULTS.md).
- [x] Chrome local: 19 ca đạt, gồm chuyển cảnh, mobile, lỗi mạng, lỗi thiếu key và clipboard; xem [phạm vi kiểm tra](reports/BROWSER_RESULTS.md).
- [x] Minh chứng sử dụng AI từ phiên hoàn thiện thực tế: [bản một trang](AI_EVIDENCE.html), PDF được công cụ kiểm tra trình duyệt tạo và xác nhận một trang.
- [x] Gói có [bảng chỉ dẫn từng phần](../PACKAGE_CONTENTS.md), cấu hình mẫu, source và test có thể chạy sau khi giải nén.
- [x] Có công cụ đóng ZIP theo danh sách cho phép và kiểm tra lại gói giải nén, gồm mẫu key phổ biến, liên kết tài liệu, CRC và SHA-256.

## Cần hoàn thành trước khi bấm nộp

1. **Kiểm chứng Gemini thật.** Trên terminal chạy `python scripts/check_live_ai.py --prompt-key` bằng Python của môi trường ảo. Công cụ gửi tối đa 3 request, có thể dùng hạn mức tài khoản. Xem `docs/reports/LIVE_AI.md`; chỉ coi hoàn tất khi trạng thái `passed`. Không gửi key trong hội thoại hoặc thêm vào source.
2. **Triển khai và kiểm tra bản online.** Cần tài khoản/quyền hosting. Đặt key ở biến môi trường hosting, triển khai đúng source, mở từ cửa sổ chưa đăng nhập, thử toàn bộ luồng và mobile. Điền URL vào README.
3. **URL nhà tài trợ.** Khi BTC cung cấp, đặt `SPONSOR_DOMAIN_URL`, triển khai lại và kiểm tra link. Trong thời gian chưa có URL, đề cho phép dùng link demo có ghi chú; phương án này đã thực hiện.
4. **Quay và đăng video ≤ 2 phút.** Dùng kết quả thật trên bản nộp; thể hiện 5 chức năng. Điền URL có quyền xem phù hợp vào README.
5. **Rà lại thông tin đội.** Tên/bảng/đề được giữ theo README hiện có. Đối chiếu với tài khoản đăng ký và kết quả bốc thăm chính thức.
6. **Đóng lại ZIP cuối.** Chạy kiểm tra, cập nhật tài liệu, rồi `python scripts/build_source.py`. ZIP và checksum nằm trong `dist/`. Công cụ không tự tải gói lên Internet hoặc nộp bài.
7. **Nộp bằng tài khoản đội.** Tải ZIP/video/minh chứng lên nơi BTC yêu cầu; điền link và kiểm tra xác nhận đã nộp. Không sửa tính năng sau hạn nộp.

Không cần bổ sung mock AI vào sản phẩm để giấu lỗi thiếu key. Kiểm tra bằng fixture chỉ dùng cho bộ test và ảnh có nhãn rõ. Quyền truy cập AI khi giám khảo chạy source thực hiện theo thông báo BTC; tài liệu hiện không giả định BTC tự có key.
