# Phase 3: Ticket-03 "Đèn cạn dầu" (Change Request, contract v1.2)

Quyết định thiết kế: [ADR 0001](../adr/0001-lantern-fuel-and-dawn-win.md). Thay đổi phá vỡ tương thích: [CHANGELOG](../../CHANGELOG.md).

## 1. Tiêu chí nghiệm thu

| ID | Yêu cầu | Tiêu chí kiểm chứng | Test |
|---|---|---|---|
| U1 | Hao dầu 1/s; snapshot có fuel (1 chữ số), ever_lit, relit_count | 30 tick → 99.5; 60 tick → 99 | U1 |
| U2 | Hết dầu thì tắt | fuel 1 → `lantern_out` ở tick 60; `lit=false`, `deposited=0`, `fuel=0`, `ever_lit=true` | U2 |
| U3 | Châm dầu | `used = min(mang, ceil((100−fuel)/10))`; fuel tối đa 100; +5/đom đóm; event `refuel` | U3 |
| U4 | Chọn đèn | Đèn nhận được gần nhất (sáng chưa đầy cũng được); bằng nhau thì id nhỏ hơn | U4 |
| U5 | Thắp lại | Từng sáng thì cần 5; `relight: true`, +40, `relit_count` + 1; chưa từng sáng vẫn cần 10 | U5 |
| K1 | Sức chứa | 10 + 2 × lần thắp (kể cả thắp lại), tối đa 20; nhặt theo sức chứa | K1 |
| D1 | Bóng hút dầu | Bóng wander đi tới đèn có fuel < 30, cách ≤ 2 m thì `drain`, hút 5/s (+ hao 1/s), `fuel_drain` mỗi 60 tick; đèn tắt thì về wander | D1 |
| D2 | Ngưỡng 30 | fuel ≥ 30 vẫn có vùng an toàn (bóng bị chặn ở 6 m); dưới 30 thì bóng vào được | D2 |
| D3 | Thoát drain | Mây vào trong 6 m → chase; trúng Tỏa Sáng → stunned, +15 | D3 |
| D4 | Châm lên ≥ 30 | Bóng trong 6 m bị đẩy ra mép trong ≤ 30 tick, không gây sát thương | D4 |
| W1 | Thắng ở bình minh | Còn sống và số đèn sáng ≥ ceil(0.6 × tổng) → `dawn_survived`; điểm bình minh đúng công thức | W1 |
| W2 | Thua ở bình minh | Dưới ngưỡng → `dawn`, không có thưởng; ngưỡng Đêm 2 là 4/6, Đêm 3 là 5/7 | W2 |
| W3 | Không thắng sớm | Thắp đủ đèn vẫn chơi tiếp tới bình minh | W3 |
| W4 | Thứ tự xét | Hết lửa đúng tick bình minh vẫn là `no_flames` | W4 |
| C6 | Scenario v1.2 | `lit` không có fuel thì fuel = 100; trường sai → mã 2 | C6 |
| C1 | Tuning v1.2 | Đủ khóa và số chuẩn mới | C1 |
| G1 | Hiển thị dầu | Thanh dầu trên đèn sáng; nhấp nháy 1 Hz khi dầu dưới 30 | Ảnh `img/fuel.png`, kiểm tra tay phần nhấp nháy |
| G2 | Chế độ mù màu (lưu) | Viền và mắt Bóng Mực #00B3FF; cảnh báo UI #FFFFFF kèm ⚠; đèn tắt xẹp 20% và có vết rách | Ảnh `img/fuel-cb.png`, mã `applyPalette` |
| G3 | HUD sức chứa | "đang mang/sức chứa" | Ảnh `img/fuel.png` |

## 2. Giả định

| # | Giả định |
|---|---|
| E1 | `fuel_drain` ghi khi bóng đã hút đủ 60, 120… tick (không ghi ngay tick đầu). `fuel` trong event là dầu sau khi trừ ở tick đó |
| E2 | Bóng wander chọn đèn tắt gần nhất khi không có đèn yếu, đi tới cách ≤ 2 m rồi đứng chờ; không có đèn nào để đi thì lang thang như Phase 2 |
| E3 | Bóng đang `drain` không gây sát thương. Khi Mây vào trong 6 m, bóng chuyển sang chase ở bước 8 rồi mới có thể chạm ở bước 9 |
| E4 | Đèn đặt sẵn `lit: true` thì `ever_lit = true` (trừ khi scenario ghi khác) và `deposited = 10` |
| E5 | `score.per_second_left` giữ khóa nhưng đặt bằng 0 (bỏ thưởng thời gian); thêm `per_relight`, `per_stun_drain`, `per_lit_at_dawn` |
| E6 | Đèn tắt xẹp 20% và có vết rách ở cả chế độ thường, không chỉ chế độ mù màu (không trái yêu cầu và dễ phân biệt hơn) |

## 3. Test cũ bị luật mới thay thế

| Test | Xử lý | Lý do |
|---|---|---|
| R8 "thắng khi mọi đèn sáng" | **Xóa** | Bỏ thắng sớm (`all_lit`); thay bằng W1/W3 |
| R8 "thắp đèn cuối đúng tick hết giờ vẫn thắng" | **Xóa** | Luật thắng mới dựa trên số đèn sáng ở bình minh; thay bằng W1/W4 |
| C1 contract | Sửa | v1.2, thời lượng mới, khóa dầu, điểm mới |
| R4 thắp đèn | Sửa | +5/đom đóm, `lantern_lit.relight`, fuel = 100 |
| C2 snapshot | Sửa | Thêm `fuel`, `ever_lit`, `relit_count`, `capacity`; Đêm 1 dài 240 s |
| F5 tạm dừng | Sửa | `time_left_s` của Đêm 1 là 240 |
| C5 hiệu năng | Sửa | Đêm 3 còn 300 s = 18000 tick |

Không test nào bị skip. Mọi test Phase 1–2 không bị thay thế vẫn chạy và xanh (61 test).

## 4. Đánh giá Phase 3

- **Đạt, có test:** U1–U5, K1, D1–D4, W1–W4, C1, C6. Có ảnh cho G1–G3.
- **Kiểm tra tay:** nhấp nháy 1 Hz, lưu cài đặt mù màu, âm thanh `lantern_out`.
- **Bot:** Đêm 1 thắng 9/10 theo luật mới (bot châm dầu đèn dưới nửa dầu). Đêm 2 và 3 vẫn 0/10 vì bot tìm đường kém (đã ghi từ Phase 2).
- **AI sai và cách phát hiện:**
  - Đèn đặt sẵn `lit` nhận `deposited` = 5 do gọi hàm chi phí sau khi đã đặt `everLit`. Test U1 bắt được.
  - Test D4 tính tay quên phần dầu bị bóng hút trong cùng tick (49.9 chứ không phải 50). Lỗi nằm ở test, lõi đúng; đã sửa test và ghi phép tính vào chú thích.
- **Phát hiện về đặc tả:** luật "đèn đầy dầu không được chọn" gần như không bao giờ xảy ra do thứ tự tick (xem ADR, mục Hệ quả).
