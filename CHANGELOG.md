# CHANGELOG

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
