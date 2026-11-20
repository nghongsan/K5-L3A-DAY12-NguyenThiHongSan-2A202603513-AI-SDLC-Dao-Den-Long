# Nhật ký dùng AI

Công cụ: **Claude Code** (extension VS Code), model **Claude Opus 5.5**. Không dùng subagent hay MCP cho phần code.
Token đo từ transcript cục bộ bằng `npm run tokens` (scripts/token-usage.mjs). Số liệu thật, không ước đoán.

## Token theo giai đoạn

| Giai đoạn | Lượt gọi | Ghi cache | Đọc cache | Output | Ghi chú |
|---|---:|---:|---:|---:|---|
| Chuẩn bị (đọc đề, hỏi quota) | 6 | ~46k | ~311k | ~5k | Đọc 6 file đề một lần |
| Phase 1 (code + test + bằng chứng + tài liệu) | ~26 | ~158k | ~4.2M | ~131k | Đo đến lúc commit bằng chứng |
| **Cộng dồn tới tag phase-1** | 32 | 204k | 4.48M | 137k | |
| Giữa phase (push, kiểm tra lab board, repo đề) | ~10 | ~20k | ~1.3M | ~5k | Lab board tải phase mới qua database chỉ trình duyệt đọc được, nên người dùng dán Ticket-02 |
| Phase 2 (lõi v1.1, 3 bản đồ, tính năng mới, giao diện, đo FPS, bằng chứng) | ~42 | ~215k | ~16.4M | ~187k | Ngữ cảnh dài nên phần đọc cache tăng nhanh |
| **Cộng dồn tới tag phase-2** | 84 | 439k | 22.2M | 329k | |
| Phase 3 (dầu đèn, drain, luật bình minh, giao diện, ADR, changelog) | ~17 | ~69k | ~8.5M | ~57k | Vẫn cùng phiên; ít lượt hơn nhờ sửa bằng script có assert |
| **Cộng dồn tới tag phase-3** | 101 | 508k | 30.7M | 387k | |
| Phase 4 (bench, soak, bảng xếp hạng, a11y, đóng gói, retro, Release) | ~22 | ~80k | ~12M | ~70k | Soak và bench đo bằng lệnh thật |
| **Cộng dồn tới tag phase-4 (ước tính)** | ~123 | ~0.59M | ~42M | ~0.46M | Xem retro §6 |

"Đọc cache" là ngữ cảnh được gửi lại ở mỗi lượt gọi (rẻ hơn nhiều so với input mới). Phần này tăng theo số lượt × độ dài hội thoại, nên giảm số lượt là cách tiết kiệm chính.

## Lời nhắc chính (Phase 1)

1. "Nghiên cứu toàn bộ repo này, hãy cho tôi biết tổng quan dự án này"
2. "Hiện tại mức sử dụng của tôi còn bao nhiêu, làm xong cái này còn bao nhiêu?"
3. "Hoàn thành giúp tôi": agent đọc tab Phase 1 trên lab board, lập kế hoạch (lõi tất định tách khỏi phần vẽ, test theo mã yêu cầu, bot để chứng minh chơi được), rồi viết mã, test và bằng chứng.

## Lời nhắc chính (Phase 2)

1. Dán nguyên văn tab Ticket-02 từ lab board (agent không đọc được database của lab board).
2. "Làm tiếp": agent viết lại lõi theo thứ tự 12 bước, viết test cho từng tính năng, làm giao diện 3 Đêm, đo FPS, rồi làm bằng chứng và gắn tag.

## Lời nhắc chính (Phase 3)

1. Dán nguyên văn Ticket-03 + "Làm tiếp Phase 3".

## Lời nhắc chính (Phase 4)

1. Dán nguyên văn Ticket-04 + "làm phase 4".

## Cách đã tiết kiệm token

- Đọc lab board **một lần**, trích thành text rồi đọc bản text, không fetch lại.
- Lập kế hoạch kiểm chứng trước, viết lõi + test thành vài file lớn trong ít lượt, thay vì sửa vòng lặp nhiều lần.
- Test và scenario lấy số trực tiếp từ `game.contract.json`, nên đổi tuning không phải sửa test.
- Dùng bot headless để cân chỉnh độ khó (30 ván chạy trong khoảng 1 s), không phải chơi thử bằng tay qua nhiều lượt.
- Không dùng subagent; ảnh giao diện chụp bằng Chrome headless trong một lệnh.
- Phase 2: sửa file lớn bằng script Python thay vì đọc lại cả file; test viết theo helper chung (`tests/helpers.js`).
- **Điều nên làm khác:** Phase 2 vẫn chạy trong cùng phiên với Phase 1, nên mỗi lượt gửi lại ngữ cảnh rất dài (đọc cache 16M token). Phase 3 nên mở phiên mới để giảm phần này.

## Những lần AI sai

Chi tiết ở [phase-1.md §4](phase-1.md#4-đánh-giá-phase-1): mote dạng mảng, biên safe_radius bị làm tròn, server kiểm tra đường dẫn sai, lệnh `timeout` không có trên macOS, ảnh Chrome headless không chạy thời gian game. Tất cả được phát hiện bằng test, curl hoặc tự review, và đã sửa trước khi commit.
