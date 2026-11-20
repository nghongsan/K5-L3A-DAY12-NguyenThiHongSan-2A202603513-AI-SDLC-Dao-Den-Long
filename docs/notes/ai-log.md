# Nhật ký dùng AI

Công cụ: **Claude Code** (extension VS Code), model **Claude Opus 5.5**. Không dùng subagent hay MCP cho phần code.
Token đo từ transcript cục bộ bằng `npm run tokens` (scripts/token-usage.mjs). Số liệu thật, không ước đoán.

## Token theo giai đoạn

| Giai đoạn | Lượt gọi | Ghi cache | Đọc cache | Output | Ghi chú |
|---|---:|---:|---:|---:|---|
| Chuẩn bị (đọc đề, hỏi quota) | 6 | ~46k | ~311k | ~5k | Đọc 6 file đề một lần |
| Phase 1 (code + test + bằng chứng + tài liệu) | ~26 | ~158k | ~4.2M | ~131k | Đo đến lúc commit bằng chứng |
| **Cộng dồn tới tag phase-1** | 32 | 204k | 4.48M | 137k | |

"Đọc cache" là ngữ cảnh được gửi lại ở mỗi lượt gọi (rẻ hơn nhiều so với input mới). Phần này tăng theo số lượt × độ dài hội thoại, nên giảm số lượt là cách tiết kiệm chính.

## Lời nhắc chính (Phase 1)

1. "Nghiên cứu toàn bộ repo này, hãy cho tôi biết tổng quan dự án này"
2. "Hiện tại mức sử dụng của tôi còn bao nhiêu, làm xong cái này còn bao nhiêu?"
3. "Hoàn thành giúp tôi": agent đọc tab Phase 1 trên lab board, lập kế hoạch (lõi tất định tách khỏi phần vẽ, test theo mã yêu cầu, bot để chứng minh chơi được), rồi viết mã, test và bằng chứng.

## Cách đã tiết kiệm token

- Đọc lab board **một lần**, trích thành text rồi đọc bản text, không fetch lại.
- Lập kế hoạch kiểm chứng trước, viết lõi + test thành vài file lớn trong ít lượt, thay vì sửa vòng lặp nhiều lần.
- Test và scenario lấy số trực tiếp từ `game.contract.json`, nên đổi tuning không phải sửa test.
- Dùng bot headless để cân chỉnh độ khó (30 ván chạy trong khoảng 1 s), không phải chơi thử bằng tay qua nhiều lượt.
- Không dùng subagent; ảnh giao diện chụp bằng Chrome headless trong một lệnh.

## Những lần AI sai

Chi tiết ở [phase-1.md §4](phase-1.md#4-đánh-giá-phase-1): mote dạng mảng, biên safe_radius bị làm tròn, server kiểm tra đường dẫn sai, lệnh `timeout` không có trên macOS, ảnh Chrome headless không chạy thời gian game. Tất cả được phát hiện bằng test, curl hoặc tự review, và đã sửa trước khi commit.
