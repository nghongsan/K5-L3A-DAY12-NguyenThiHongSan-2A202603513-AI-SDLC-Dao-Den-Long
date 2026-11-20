# CHANGELOG

## [v1.0.0 / phase-4] Contract v1.3: Ticket-04 "Bình minh"

### Thêm
- **Benchmark** `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json`:
  - Cảnh chuẩn: 200 Bóng Mực, 100 đom đóm, L1–L3 sáng, camera bay vòng.
  - Chạy trong cửa sổ Chrome 1280×720, đã tắt vsync.
  - Ghi avg_fps, p1_low_fps, frame_ms_p95, load_ms, peak_mem_mb.
- **Soak** `node --expose-gc --jitless scripts/soak.mjs --seed 7 --nights 10 --out soak.json`: 10 Đêm trong một tiến trình, input ngẫu nhiên theo seed.
- **Bảng xếp hạng cục bộ** (top 10, lưu ở `~/.dao-den-long/leaderboard.json`, tên có thể có dấu tiếng Việt):
  - Nhập tên sau màn Bình Minh hoặc sau khi thua.
  - Có màn hình riêng từ menu.
  - Xuất ra file bằng `node server.mjs --export-leaderboard out.json`.
- **Dễ tiếp cận:**
  - Đổi phím mọi hành động (báo phím trùng, có khôi phục mặc định, được lưu).
  - Phụ đề và chỉ báo hình ảnh (Bóng Mực xuất hiện kèm mũi tên ở mép màn hình, gió, 10 giây cuối, đèn dưới 30 dầu).
  - Giảm chuyển động.
  - Chữ UI tối thiểu 18 px, có tùy chọn Chữ lớn ×1.25.
- **Đóng gói:** `npm run release` → `dist/dao-den-long-v1.0.0.zip` (đã kèm three.js, chạy bằng `node server.mjs`); GitHub Release v1.0.0.
- Tài liệu: retro, kịch bản video, README đủ mục (yêu cầu hệ thống, bench, soak).
- Sửa sau khi rà soát:
  - `node server.mjs` tự mở trình duyệt (tắt bằng `--no-open`).
  - Bench tự chạy headless khi máy Linux không có màn hình.
  - Thêm `scripts/ui-smoke.mjs`: kiểm thử giao diện thật qua Chrome, có trong `npm run proof`.

### ⚠ Thay đổi phá vỡ tương thích
- `contract_version` đổi thành `"1.3"`; thêm `bench_cmd` và `soak_cmd`.
- `run_cmd` đổi từ `npm start` thành `node server.mjs`, để `--export-leaderboard` truyền được tham số. `npm start` vẫn chạy như cũ.
- Cỡ chữ và bố cục HUD đổi để chữ đạt tối thiểu 18 px.

## [phase-3] Contract v1.2: Ticket-03 "Đèn cạn dầu"

### ⚠ Thay đổi phá vỡ tương thích (breaking changes)
- `contract_version` đổi thành `"1.2"`. Thời lượng Đêm 1/2/3 đổi từ 300/330/360 s thành **240/270/300 s**.
- **Bỏ thắng sớm.** `game_over.reason = "all_lit"` không còn dùng. Thắng chỉ ở bình minh với `reason = "dawn_survived"` khi số đèn đang sáng ≥ ceil(0.6 × tổng).
- **Đèn có nhiên liệu và có thể tắt.** Đèn sáng hao 1/s; khi hết dầu thì `lit = false`, `deposited = 0`, phát `lantern_out`. Tương tác với đèn đang sáng chưa đầy dầu là **châm dầu** (`refuel`), không còn bị bỏ qua.
- **Vùng an toàn chỉ còn khi fuel ≥ 30.** Bóng Mực vào được đèn yếu và hút dầu (trạng thái mới `drain`).
- **Công thức điểm thay toàn bộ:** +5 mỗi đom đóm nạp (trước là +10); +100 thắp lần đầu; +40 thắp lại; +5 mỗi bóng trúng Tỏa Sáng (+15 nếu đang drain); thưởng bình minh mỗi đèn sáng +50 + floor(fuel) và mỗi lửa +50; **bỏ thưởng thời gian** (`score.per_second_left = 0`).
- **Sức chứa không còn cố định 10:** 10 + 2 × số lần thắp thành công, tối đa 20.
- Hết choáng: Bóng Mực về `wander` (trước đó chọn chase/wander theo khoảng cách; kết quả quan sát được trong cùng tick vẫn như cũ).
- `lantern_lit.data` thêm `relight`. Snapshot đèn thêm `fuel`, `ever_lit`, `relit_count`; `player` thêm `capacity`.

### Thêm
- Tuning: `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`; score: `per_relight`, `per_stun_drain`, `per_lit_at_dawn`.
- Event: `refuel`, `lantern_out`, `fuel_drain` (mỗi 60 tick hút).
- Scenario: đèn có thêm `fuel`, `ever_lit` (đèn `lit: true` không ghi `fuel` thì fuel = 100); `player.successful_lights`; `shades[].target_lantern_id`; trạng thái `drain`.
- Giao diện: thanh dầu; nhấp nháy 1 Hz khi dầu dưới 30; đèn tắt xẹp 20% và có vết rách; HUD hiện sức chứa và số đèn cần; cài đặt **Bảng màu dễ phân biệt** (viền và mắt Bóng Mực #00B3FF, cảnh báo trắng kèm ⚠); tham số `?scenario=` để dựng tình huống.
- Tài liệu: [ADR 0001](docs/adr/0001-lantern-fuel-and-dawn-win.md), [docs/notes/phase-3.md](docs/notes/phase-3.md).

## [phase-2] Contract v1.1: Ticket-02 "Ba hòn đảo"
- Số liệu chuẩn; 3 Đêm (Đảo Bến, Đảo Cau, Đảo Chuông); lướt, rơi và hồi sinh, Gió Lạc, Bùa Gió, tạm dừng; chuỗi 3 Đêm, menu, cài đặt, âm thanh, HUD đầy đủ, bảng màu chuẩn.
- Breaking: bỏ lan can Đêm 1; điểm đom đóm tính lúc nạp; Tỏa Sáng đo 3D, đẩy trong 15 tick; ưu tiên kết thúc no_flames > all_lit > dawn.

## [phase-1] Contract v1.0: PRD-0
- Đêm 1 chơi được, chế độ headless, `game.contract.json`.
