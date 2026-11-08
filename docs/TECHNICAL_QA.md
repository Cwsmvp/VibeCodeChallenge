# Chuẩn bị hỏi đáp kỹ thuật — 5 phút

Các câu trả lời dưới đây mô tả code hiện tại. Thành viên đội cần tự chạy và hiểu sản phẩm trước khi trình bày.

| Câu hỏi | Ý chính để giải thích |
|---|---|
| Vì sao chọn Flask và JavaScript thuần? | Bài toán một trang, hai tác vụ AI và logic slug đơn giản. Flask dựng HTML và giữ key phía máy chủ; không cần database hoặc bước build frontend. |
| Luồng từ nhập tên đến kết quả? | Form POST kiểm tra tên, chuẩn hóa NFC và tạo slug/tên miền demo. Trình duyệt gọi đồng thời hai API AI; mỗi phần có trạng thái tải, lỗi và nút thử lại riêng. |
| AI làm những gì? | Gemini đánh giá tên và sinh slogan/tagline. Năm tên miền được ghép theo quy tắc, trạng thái mô phỏng được ghi nhãn. Không có chức năng tra cứu WHOIS/RDAP. |
| Làm sao kiểm soát đầu ra AI? | Gửi JSON Schema; backend kiểm tra lại cấu trúc, điểm nguyên 1–10, độ dài nhận xét, đúng 3 slogan tối đa 10 từ/câu, tagline tối đa 15 từ; từ chối tagline lặp sau chuẩn hóa. |
| Chặn đầu vào sai thế nào? | Form và hai API dùng chung quy tắc 2–30 ký tự sau trim/NFC, cần tạo được slug. JSON sai kiểu bị trả 400 trước khi gọi Gemini. |
| API key ở đâu? | Biến môi trường máy chủ. Source và ZIP chỉ có mẫu trống; frontend gọi các route nội bộ. Chạy local cần tự cấu hình key hợp lệ. |
| Gemini lỗi thì sao? | Backend trả thông báo an toàn cho thiếu key, kết nối, timeout, quyền/model/hạn mức và dữ liệu sai. Không tự thay AI bằng kết quả giả. Tên miền demo vẫn hiển thị; slogan cũ được giữ nếu gợi ý lại lỗi. |
| Copy có lấy kết quả mới nhất không? | Nội dung lấy từ window.appState. Sau khi sinh lại thành công, state cập nhật. Khi đang tải lần đầu, nội dung copy ghi rõ phần đang tải. |
| Nút đăng ký có đăng ký thật không? | Hiện mở trang demo và ghi rõ trên giao diện. Khi có URL HTTPS chính thức, đặt SPONSOR_DOMAIN_URL trên máy chủ và khởi động/triển khai lại. |
| Đã kiểm chứng được gì? | Xem báo cáo 25 test Python, 6 test JavaScript và 8 ca Chrome local. Phản hồi AI trong kiểm tra trình duyệt là fixture. Báo cáo LIVE_AI ghi trạng thái thực tế riêng. |
| Giới hạn còn lại? | Chưa có rate limit/xác thực, lịch sử lưu, hay kiểm tra tên miền thật. Chưa xác minh Gemini thật và bản online trong phiên chuẩn bị này. |
