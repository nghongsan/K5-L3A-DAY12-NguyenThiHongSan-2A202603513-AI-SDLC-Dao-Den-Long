# Retro: Đảo Đèn Lồng (Day 12 AI SDLC, 4 phase)

## 1. Tổng hợp đánh giá 4 phase

| Phase | Yêu cầu chính | Kết quả | Test xanh | Chỗ chưa đạt / kiểm tra tay |
|---|---|---|---:|---|
| 1 · PRD-0 | Đêm 1 chơi được, headless v1.0 | Đạt; bot thắng 8/10 | 26 | Chơi lại sau thắng/thua chỉ kiểm tra tay |
| 2 · Ba hòn đảo | Số chuẩn, 3 bản đồ, lướt/rơi/Gió Lạc/Bùa, UI đầy đủ, ≥ 30 FPS | Đạt; khoảng 500 FPS trên GPU | 48 | Bot chưa thắng Đêm 2/3; render phần mềm chỉ ~24 FPS |
| 3 · Đèn cạn dầu | Dầu, drain, thắng ở bình minh, sức chứa, điểm mới, mù màu | Đạt; có ADR và CHANGELOG | 61 | Nhấp nháy 1 Hz kiểm tra tay |
| 4 · Bình minh v1.0.0 | Bench, soak, bảng xếp hạng, a11y, đóng gói, Release | Bench 294.8 / 93.5 FPS, tải 3.3 s; soak 0 crash, bộ nhớ ×1.03 | 66 | Phụ đề, đổi phím, giảm chuyển động kiểm tra tay; video do tôi tự quay |

Không test nào bị skip. Khi luật đổi ở Phase 2 và Phase 3, các test cũ được sửa (nhãn `[P2]`/`[P3]`) hoặc xóa có ghi lý do trong `docs/notes/phase-N.md`.

## 2. Điều hiệu quả khi làm với AI

- **Tách lõi tất định khỏi phần vẽ ngay từ Phase 1.** Mọi luật mới ở Phase 2–4 đều test được bằng headless trong vài mili-giây. Phần giao diện chỉ cần kiểm tra bằng ảnh.
- **Lấy test làm đặc tả.** Mỗi yêu cầu có mã (R/C/F/M/U/D/W/L/S/B) và ít nhất một scenario. Agent tính tay số tick kỳ vọng trước khi chạy, nên khi test đỏ là biết ngay lỗi nằm ở test hay ở mã.
- **`game.contract.json` là nguồn số liệu duy nhất.** Khi Ticket-02 đổi toàn bộ số liệu, phần lớn test tự thích nghi vì đọc số từ contract.
- **Bot headless** giúp chứng minh "chơi được" và cân chỉnh độ khó. Ví dụ: Phase 1 lúc đầu quá dễ (bot thắng 10/10 không mất lửa), và Phase 2 phát hiện Bóng Mực dồn thành bầy.
- **Đo trước khi tin.** Con số ~30 FPS ở Phase 2 hóa ra là trần của Chrome headless (trang trống cũng chỉ 30 FPS). Soak đỏ ở Phase 4 hóa ra là bộ nhớ JIT, vì heap game phẳng qua 150 Đêm.

## 3. Điều không hiệu quả

- Cả 4 phase chạy trong **một phiên chat dài**. Mỗi lượt gửi lại toàn bộ ngữ cảnh nên phần đọc cache lên tới khoảng 42 triệu token, trong khi output thật chỉ khoảng 0.45 triệu.
- Bot tìm đường qua cầu và tầng còn yếu, nên chưa có bằng chứng tự động cho việc thắng Đêm 2/3.
- Agent không đọc được database của lab board. Người dùng phải dán Ticket-02/03/04 bằng tay; tôi đã ghi điều này vào bộ nhớ cho các phiên sau.

## 4. Những lần AI sai và cách phát hiện

| Lần sai | Phát hiện bằng | Sửa harness / quy trình |
|---|---|---|
| Bóng Mực bay leo vách tầng, làm luật chênh cao vô nghĩa | Viết test chênh cao (R5) | Thêm quy tắc "Bóng Mực đi trên mặt đất" vào giả định |
| Bóng lùi 1.967 m thay vì 2 m (lệch một tick do thứ tự bộ đếm) | Tính tay khi viết test | Ghi thứ tự tick vào AGENTS.md |
| Biên vùng an toàn bị làm tròn ra đúng 6 m (Phase 1) | Test R5 đỏ ở tick 120 | Dùng dung sai EPS khi so sánh bán kính |
| Đèn đặt sẵn `lit` nhận `deposited` = 5 | Test U1 | — |
| Test D4 quên phần dầu bị hút trong cùng tick | Test đỏ; đọc lại thứ tự tick | Ghi phép tính vào chú thích test |
| Camera khởi đầu nằm trong tháp nên màn hình trống | Ảnh Chrome headless | Skill `verify-phase` có bước chụp ảnh |
| Tắt PointLight của đèn làm biên dịch lại shader, tụt FPS | Đo bằng `bench-fps.mjs` | Chuyển sang ánh sáng giả có chi phí cố định |
| Server kiểm tra đường dẫn sai thứ tự toán tử | Tự review + curl | — |

## 5. Harness hữu ích nhất

1. **Hook `Stop` chặn kết thúc khi `npm test` đỏ.** Agent không thể báo "xong" khi còn test đỏ.
2. **Skill `verify-phase` + `npm run proof`.** Một lệnh sinh toàn bộ bằng chứng (test, tất định 3 Đêm, hiệu năng, bot, FPS) và ghi commit hash, nên bằng chứng khớp với tag.
3. **AGENTS.md ngắn**, cập nhật mỗi phase: thứ tự tick, tên trạng thái bắt buộc, quy tắc dầu nguyên 1/60, quy tắc ADR/CHANGELOG khi đổi luật.
4. **CI GitHub Actions**: chạy test và kiểm tra tất định ở mỗi lần push.

## 6. Token và chi phí

Đo từ transcript bằng `npm run tokens`:

| Mốc | Lượt gọi | Ghi cache | Đọc cache | Output |
|---|---:|---:|---:|---:|
| Tag phase-1 | 32 | 0.20M | 4.5M | 0.14M |
| Tag phase-2 | 84 | 0.44M | 22.2M | 0.33M |
| Tag phase-3 | 101 | 0.51M | 30.7M | 0.39M |
| Gần tag phase-4 | 120 | 0.58M | 41.7M | 0.45M |

Chi phí tiền ước tính bằng cách nhân các cột với bảng giá của model đang dùng. Phần lớn token là **đọc cache**, loại rẻ nhất, nhưng vẫn là phần cần giảm.

Cách đã tiết kiệm:
- Đọc lab board một lần rồi trích ra text.
- Sửa file lớn bằng script có assert thay vì đọc lại cả file.
- Viết lõi và test thành vài file lớn trong ít lượt.
- Dùng bot headless thay cho chơi thử nhiều lượt.
- Không dùng subagent.

## 7. Nếu làm lại

- **Mỗi phase một phiên chat mới.** Giữ ngữ cảnh bằng AGENTS.md, notes và bộ nhớ thay vì lịch sử chat; đây là cách giảm token lớn nhất.
- **Viết bot tìm đường (nav graph) ngay ở Phase 2** để có bằng chứng thắng mọi Đêm.
- **Thêm test giao diện tự động qua DevTools** (đổi phím, lưu điểm, phụ đề) thay cho kiểm tra tay.
- **Hỏi trợ giảng sớm các chỗ mơ hồ** (ví dụ `invuln` là bool hay số, tick của `night_start`), thay vì tự giả định.
