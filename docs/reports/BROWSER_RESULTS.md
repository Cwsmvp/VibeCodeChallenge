# Kiểm tra trình duyệt

Thời điểm UTC: 2026-11-08T15:08:42.457Z.

Trạng thái: **passed**. 19 ca hoàn thành.

Chạy Chrome headless thật với Flask local. Giai đoạn đầu không có API key; giai đoạn sau chặn request và trả fixture trong công cụ kiểm tra. Không gọi Gemini thật.

| Ca | Phạm vi | Kết quả |
|---|---|---|
| Empty page renders without AI requests | local application | passed |
| Invalid brand shows validation and no results | local application | passed |
| Submitting a brand morphs the input into its badge without reloading | actual native View Transition animations | passed |
| Five demo domains remain usable when both AI routes lack a key | local application, no API key | passed |
| Summary shows unavailable AI honestly and keeps the three cards | local application, no API key | passed |
| History can reopen a name, focus its input and clear local storage | real dialog and localStorage | passed |
| Registration CTA opens a labelled demo destination | local application | passed |
| 390px mobile viewport has no horizontal overflow | local application | passed |
| Mobile has a visible fallback animation without View Transition support | actual Web Animations playback | passed |
| Animations always play despite reduced motion or a previously saved off preference | explicit product preference, actual Web Animations | passed |
| Stage navigation still works when both animation APIs are unavailable | simulated unsupported browser | passed |
| Failed native snapshots still animate using the fallback | simulated browser snapshot rejection, real Web Animations | passed |
| Results and summary adapt across 320, 390, 768 and 1024px | real responsive layout | passed |
| AI panels render and retry uses the previous tagline | intercepted AI fixtures, no Gemini request | passed |
| Summary reflects the actual latest AI scores, slogans and tagline | intercepted AI fixtures, no Gemini request | passed |
| Copy writes the latest results to the actual browser clipboard | real clipboard with intercepted AI fixtures | passed |
| Network failure is recoverable and a new brand loads each AI panel once | same document, intercepted AI fixtures | passed |
| No uncaught JavaScript exceptions | all browser checks | passed |
| Form and results remain visible without JavaScript | progressive enhancement | passed |

Ảnh có tên `ai-fixture` được gắn nhãn mô phỏng, chỉ minh chứng giao diện. Các ảnh còn lại là ứng dụng local chưa cấu hình AI.

- [desktop-empty.png](../../docs/screenshots/desktop-empty.png)
- [desktop-without-ai.png](../../docs/screenshots/desktop-without-ai.png)
- [desktop-overview-without-ai.png](../../docs/screenshots/desktop-overview-without-ai.png)
- [mobile-without-ai.png](../../docs/screenshots/mobile-without-ai.png)
- [mobile-overview-without-ai.png](../../docs/screenshots/mobile-overview-without-ai.png)
- [desktop-overview-ai-fixture.png](../../docs/screenshots/desktop-overview-ai-fixture.png)
- [desktop-ai-fixture.png](../../docs/screenshots/desktop-ai-fixture.png)

Lần chạy này chỉ kiểm tra giao diện, không xuất lại PDF minh chứng.

Không ghi nhận JavaScript exception chưa xử lý.
