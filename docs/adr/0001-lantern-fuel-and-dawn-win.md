# ADR 0001: Mô hình nhiên liệu đèn và luật thắng "giữ đảo sáng tới bình minh"

- Trạng thái: Đã chấp nhận (Phase 3, Ticket-03 "Đèn cạn dầu", contract v1.2)
- Thay thế: luật "đèn sáng là sáng mãi", "thắng ngay khi mọi đèn sáng" (Phase 1–2)

## Bối cảnh

Người chơi giỏi thắp hết đèn trong khoảng 2 phút rồi game kết thúc, nên cuối Đêm thiếu căng thẳng. Ticket-03 yêu cầu: đèn hao dầu và có thể tắt, Bóng Mực hút dầu đèn yếu, và chỉ thắng khi còn sống tới bình minh với ≥ 60% số đèn đang sáng.

## Quyết định

1. **Trạng thái đèn** đổi từ hai trạng thái (`chưa sáng` → `sáng`, một chiều) thành vòng:

   ```
   chưa từng sáng ──nạp đủ 10──▶ SÁNG (fuel=100) ──fuel ≤ 0──▶ TẮT (ever_lit) ──nạp đủ 5──▶ SÁNG (relit_count+1)
                                   ▲    │ châm dầu (fuel < 100)
                                   └────┘
   ```

   Mỗi đèn lưu: `lit`, `deposited`, `fuel`, `everLit`, `relit`.
   - **Vùng an toàn** không còn là thuộc tính của "đèn sáng" mà được suy ra: `isSafe(l) = l.lit && fuel ≥ 30`.
   - Hai sự kiện đều đặt cờ `justSafe` để bước 6 đẩy bóng ra mép trong 30 tick (dùng chung cơ chế với lúc vừa thắp): đèn vừa thắp, và đèn vừa được châm từ dưới 30 lên ≥ 30.

2. **Dầu là số nguyên theo đơn vị 1/60.** Mỗi tick hao 1 đơn vị; mỗi bóng đang hút thêm 5; mỗi đom đóm châm thêm 600. Chỉ khi xuất ra mới đổi sang số thực, làm tròn 1 chữ số. Cách này tránh sai số cộng dồn làm lệch tick đèn tắt, nên test được chính xác tới từng tick (ví dụ D1: đèn tắt đúng tick 365).

3. **Thứ tự trong tick:**
   - Bước 2 trừ dầu (hao + bị hút) và phát `fuel_drain` mỗi 60 tick hút.
   - Ngay sau bước 2, `lanternsOut` tắt các đèn có fuel ≤ 0 (`lantern_out`, `deposited = 0`).
   - Bước 11 xét kết thúc: hết lửa → `no_flames` (luôn trước); hết giờ → `dawn_survived` nếu số đèn sáng ≥ ceil(0.6 × tổng), ngược lại `dawn`. Không còn kiểm tra "mọi đèn sáng".

4. **Bóng Mực** có thêm trạng thái `drain`.
   - Chỉ bóng đang wander chọn mục tiêu là đèn: đèn sáng yếu gần nhất, nếu không có thì đèn tắt gần nhất.
   - Bóng đứng yên khi cách đèn ≤ 2 m.
   - Thoát `drain`: sang `chase` khi Mây vào trong 6 m; sang `stunned` khi trúng Tỏa Sáng; sang `wander` khi đèn tắt, được châm lên ≥ 30, hoặc khi bóng ra xa > 2 m.
   - Hết choáng/lùi thì về `wander`.

5. **Điểm** tính tại chỗ phát sinh:
   - +5 mỗi đom đóm nạp hoặc châm.
   - +100 khi thắp lần đầu, +40 khi thắp lại.
   - +5 mỗi bóng trúng Tỏa Sáng, +15 nếu bóng đó đang `drain`.
   - Thưởng bình minh (chỉ khi thắng) cộng trong `finish()`: mỗi đèn sáng +50 + floor(fuel), mỗi lửa +50.

6. **Sức chứa** = min(20, 10 + 2 × `player.lights`). `lights` tăng ở mỗi lần thắp thành công, kể cả thắp lại; scenario có thể đặt `successful_lights`.

## Hệ quả

- Hai test Phase 1 về thắng sớm bị xóa, có ghi lý do; luật mới được kiểm bởi W1–W4. Các test đổi kỳ vọng có nhãn `[P3]` (xem `docs/notes/phase-3.md` §3).
- Bot phải châm dầu (đèn dưới nửa dầu được coi là việc cần lo). Đêm 1 thắng 9/10 seed theo luật mới.
- Giao diện:
  - Thanh dầu trên đèn đang sáng; đèn và thanh nhấp nháy 1 Hz khi fuel < 30.
  - Đèn tắt bị xẹp 20% và có vết rách.
  - Vòng vùng an toàn chỉ hiện khi `isSafe`.
- Rủi ro: luật "đèn đầy dầu (used = 0) không được chọn" gần như không xảy ra, vì dầu hao ở bước 2 trước bước tương tác. Ngay tick sau khi châm đầy, đèn đã là 99.98. Mã vẫn cài đúng điều kiện (`fuel ≥ fuel_max`).
