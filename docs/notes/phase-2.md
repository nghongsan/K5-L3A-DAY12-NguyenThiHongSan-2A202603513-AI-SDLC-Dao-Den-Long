# Phase 2: Ticket-02 "Ba hòn đảo" (contract v1.1)

Nguồn: tab Phase 2 trên lab board. Phase này có hai việc: chuẩn hóa số liệu và bản đồ, rồi mở rộng game thành 3 Đêm với các tính năng mới.

## 1. Tiêu chí nghiệm thu

### Phần 1–2: số liệu chuẩn và bản đồ chuẩn

| ID | Yêu cầu | Tiêu chí kiểm chứng | Test |
|---|---|---|---|
| S1 | Tuning khớp số chuẩn | `game.contract.json` v1.1 có đúng từng giá trị chuẩn, kể cả dash_* và night2/3_duration_s | C1 |
| S2 | Thứ tự xử lý trong một tick | Cài đặt đúng 12 bước (`Game.step`). Các test thời điểm kiểm chứng gián tiếp: thắp đèn và đẩy bóng ra cùng tick, đom đóm rơi chỉ nhặt được từ tick sau, all_lit thắng trước dawn | R4, R5, R8 |
| S3 | Đom đóm: sức chứa 10, nhặt khi khoảng cách XZ ≤ 1 và chênh cao ≤ 1.5; ban đầu 20 ở 20 điểm khác nhau, +1 mỗi 240 tick ở điểm trống, trần 30 | Như mô tả | R3 × 3 |
| S4 | Đèn: cần 10, nạp nhiều lần, chọn đèn gần nhất (bằng nhau thì id nhỏ hơn), tầm 2.0 m | Như mô tả | R4 × 3 |
| S5 | Vùng an toàn 6 m: bóng ngoài bị chặn ở mép; bóng trong lúc thắp bị đẩy ra mép trong ≤ 30 tick và không gây sát thương | Như mô tả | R5 vùng an toàn |
| S6 | Tỏa Sáng: tốn 3, bán kính 5 m tính 3D từ tâm (chân + 0.8), hồi chiêu 3 s; choáng 120 tick; 15 tick đầu đẩy tổng 4 m; bóng trùng vị trí đẩy theo +X; +5 điểm mỗi bóng | Như mô tả | R6 × 4 |
| S7 | Bóng Mực: 4.0 m/s (Đêm 3: 4.5), phát hiện 12 m, bỏ đuổi 18 m; chạm khi XZ ≤ 1 và chênh cao ≤ 1.5; lùi 2 m trong 60 tick; lịch sinh 2 con ở tick 300, sau đó theo chu kỳ từng Đêm; trạng thái spawning/wander/chase/recoil/stunned | Như mô tả | R5 × 5, M3 lịch sinh |
| S8 | Bị đánh: −1 lửa, rơi floor(mang/2) đom đóm ra vành 1.5–2.5 m (TTL 480 tick), bất tử 90 tick | Như mô tả | R5 bị chạm |
| S9 | Rơi khỏi đảo (Y < −10): đúng 1 lần, bỏ qua bất tử, −1 lửa, mất hết đom đóm (`lost`), chờ 60 tick, hồi sinh ở điểm xuất phát, bất tử 90 tick; hết lửa thì thua ngay | Như mô tả | F2 × 2, M1 |
| S10 | Thắng/thua sau mỗi tick: no_flames > all_lit (kể cả đúng tick hết giờ) > dawn; điểm: +10 mỗi đom đóm nạp, +100 mỗi đèn, +5 mỗi bóng trúng Tỏa Sáng, thắng thì + giây còn lại × 2 + 50 × lửa | Như mô tả | R4, R8 × 3 |
| M1 | Đêm 1 Đảo Bến: bán kính 40, không lan can, 5 đèn ở tọa độ chuẩn, 24 điểm đom đóm, 12 điểm sinh bóng, mỗi 8 s, tối đa 6 | Như mô tả | C2, M1, R5 lịch |
| M2 | Đêm 2 Đảo Cau: 2 đảo bán kính 28, cầu tre, 2 bục nhảy (14 m/s đứng + 24 m/s ngang, khoảng 1.4 s), 6 đèn, bóng mỗi 7 s, tối đa 8 | Như mô tả | M2 × 2, M3 lịch |
| M3 | Đêm 3 Đảo Chuông: 3 tầng, vách đứng, 2 dốc (30°, 150°), bục (0,3,13) lên tầng 2, tháp chuông chặn, 7 đèn, gió mỗi 30 s kéo dài 5 s đẩy 2 m/s, bóng mỗi 6 s, tối đa 10, tốc độ 4.5 | Như mô tả | M3 × 3, R5 chạm cao |

### Phần 3: tính năng mới

| ID | Tính năng | Tiêu chí nghiệm thu | Kiểm chứng |
|---|---|---|---|
| F1 | Lướt | Bấm (false→true) → 14 m/s trong 12 tick (2.8 m), theo hướng đang di chuyển hoặc hướng mặt nếu đứng yên; hồi chiêu 90 tick tính từ lúc bắt đầu; trên không giữ nguyên độ cao; không bất tử; event `dash` | Test F1 × 3 |
| F2 | Rơi và hồi sinh | Như S9 | Test F2 × 2 |
| F3 | Gió Lạc | idle → chase khi Mây mang ≥ 5 và cách ≤ 15 m (kiểm tra mỗi tick, mất điều kiện thì về idle); chạm (≤ 1.2 m) cướp min(3, mang) → flee 7 m/s trong 240 tick → removed; mỗi con chỉ cướp 1 lần; Tỏa Sáng trúng lúc chase → flee không cướp; trúng lúc flee có đồ → thả lại thành đom đóm rơi rồi biến mất sau 120 tick; không làm mất lửa; vùng an toàn không chặn; bất tử không ngăn bị cướp; sinh ở tick 1200, 2400… tối đa 2, id D1, D2 (Đêm 2, 3) | Test F3 × 4 |
| F4 | Bùa Gió | Nhặt như đom đóm → `charm_picked`; 600 tick chạy 7.2 m/s; lướt không hồi chiêu (vẫn phải nhấn lại, nhấn khi đang lướt thì bỏ qua); nhặt lại thì làm mới; xuất hiện lại sau 2700 tick; vị trí theo từng Đêm | Test F4 × 2 |
| F5 | Tạm dừng | Esc/P trong game; headless: input `pause` (false→true) bật/tắt. Khi dừng: tick vẫn tăng nhưng sim_tick, thời gian, hồi chiêu, spawn, TTL đứng yên; snapshot ghi `paused`; event `paused`/`resumed`. Giao diện có menu Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu | Test F5; mở menu tạm dừng trên giao diện |
| F6 | Chuỗi 3 Đêm | Menu → giới thiệu Đêm (tên đảo + lời Ông Đăng) → chơi → kết quả → Đêm kế tiếp; thắng Đêm 3 thì hiện màn Bình Minh với tổng điểm; thua thì chơi lại Đêm đó. Tổng điểm = tổng điểm các Đêm đã thắng | `web/main.js` (`toIntro`, `toResult`); ảnh giao diện; kiểm tra tay |
| F7 | Cài đặt | Âm lượng và độ nhạy chuột, lưu bằng localStorage | `toSettings`; kiểm tra tay |
| F8 | Âm thanh | Nhạc nền + hiệu ứng cho nhặt, thắp, Tỏa Sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s (WebAudio, tự tổng hợp) | `web/audio.js`; kiểm tra tay khi quay video |
| F9 | HUD đầy đủ | Lửa (trên trái); mm:ss (trên giữa, đỏ và nhấp nháy khi ≤ 30 s); đèn k/n + điểm (trên phải); thanh 10 ô đom đóm (dưới giữa); hồi chiêu Lướt và Tỏa Sáng (dưới phải); "E — Nạp ánh sáng (x/10)" khi đứng gần đèn; mũi tên chỉ đèn chưa sáng gần nhất khi đèn ngoài màn hình | Ảnh `img/night*.png` |
| F10 | Bảng màu chuẩn + ánh sáng môi trường | Hằng `PAL` trong `web/main.js` lấy đúng hex; `ambient.intensity = 0.15 + 0.55 × đèn sáng / tổng` | Đọc mã, ảnh giao diện |
| C4 | Contract v1.1 | `--night 1/2/3`; snapshot thêm night, wind, player.vel/grounded/invuln/dash_cd_s/pulse_cd_s/charm_s, motes (kind, ttl_s), drifters, charms; scenario và input mới; event mới | Test C2 + CLI |
| C5 | Headless 1 Đêm đầy đủ ≤ 30 s | Đêm 3 (21600 tick) chạy được | Test C5; proof |
| P1 | ≥ 30 FPS trung bình ở 1280×720 | `scripts/bench-fps.mjs` đo bằng Chrome | proof-summary §FPS |

## 2. Giả định (chỗ ticket chưa quy định)

| # | Giả định | Lý do |
|---|---|---|
| B1 | Góc bản đồ: x = r·cosθ, z = r·sinθ | Đây là cách duy nhất khớp dữ liệu: các điểm tầng 1 ở 20°…160° phải có z > 0 (tầng 1 nằm ở nửa z > 0), và dốc 30°/150° dẫn lên tầng 1 |
| B2 | Đêm 3 xuất phát ở (0,0,−30), quay mặt +Z | Điểm (0,0,0) nằm trong tháp chuông. Ticket chỉ cho điểm xuất phát của Đêm 1 |
| B3 | Đêm 2 xuất phát ở (0,0,0) (tâm đảo A) | Giống Đêm 1 |
| B4 | Tăng tốc tức thì (0 tick) | Thỏa "≤ 0.1 s"; quãng đường đúng bằng tốc độ × thời gian nên dễ test |
| B5 | Bậc đi lên được ≤ 0.5 m | Dốc (cao 3 m qua 6 m) đi được, vách 3 m thì không. Rơi xuống tầng thấp hơn không bị phạt |
| B6 | `invuln` trong snapshot là boolean | Các trường thời gian khác có hậu tố `_s`; `invuln` không có nên hiểu là cờ, giống `grounded` |
| B7 | Event `night_start` ghi tick 0, ngay sau snapshot tick 0 | Dòng đầu file vẫn là snapshot tick 0 (giữ kiểm tra của v1.0) |
| B8 | Bóng Mực mới sinh ở trạng thái `spawning` đúng 1 tick, từ tick sau mới wander/chase | "Thực thể mới chỉ tương tác được từ tick sau" |
| B9 | Bóng Mực trong scenario không ghi `state` thì là chase nếu cách người chơi ≤ 12 m, ngược lại là wander | "Hoạt động bình thường ngay lập tức" (v1.0) |
| B10 | Wander: đi 2 m/s tới một điểm đom đóm ngẫu nhiên cùng tầng, đổi điểm khi tới nơi hoặc sau 10 s | Ticket không cho tốc độ wander; lấy bằng tốc độ lượn của Gió Lạc |
| B11 | Bóng Mực đi trên mặt đất: không ra biển mây, không leo vách > 0.5 m, không xuyên tháp; xuống tầng thấp được. Cao độ tâm = mặt đất + 1 m | Cần có để luật "chênh cao ≤ 1.5 m" và "dừng nếu gặp vật cản" có ý nghĩa |
| B12 | Bóng đang bị đẩy ra khỏi vùng an toàn mang trạng thái `recoil` (không gây sát thương) | Ticket bắt buộc chỉ dùng 5 tên trạng thái; đây là trạng thái "bị đẩy lùi" |
| B13 | Lùi sau khi gây hit: bước đầu tiên ngay tick hit, đủ 2 m sau 60 tick | |
| B14 | Đèn đặt sẵn `lit: true` trong scenario tính như vừa thắp ở tick đầu (bóng bên trong bị đẩy ra) | Vùng an toàn có hiệu lực ngay |
| B15 | Trần 30 đom đóm tính mọi đom đóm đang có (cả loại rơi). "Điểm trống" là điểm sinh chưa có đom đóm đứng đúng chỗ | |
| B16 | Gió Lạc chỉ cướp khi đang chase. Tỏa Sáng trúng lúc idle không có tác dụng. Con đã removed vẫn nằm trong mảng `drifters` (state `removed`) và không tính vào giới hạn 2 | Có tên trạng thái `removed` |
| B17 | Gió Lạc bay ở độ cao mặt đất + 1.5 m; chỉ chạm theo XZ; sinh ở một điểm sinh Bóng Mực ngẫu nhiên ("điểm sương") | |
| B18 | Gió: chọn hướng ngẫu nhiên (số nguyên độ) lúc báo trước (2 s trước cơn); `dir_deg = null` khi không có gió | |
| B19 | Đang chờ hồi sinh thì Mây đứng yên tại chỗ rơi; không nhặt, không tương tác, không bị chạm, không bị cướp | |
| B20 | Lướt chặn nhảy; nhảy chỉ khi chạm đất. Lướt khi đang bay từ bục: lướt thay vận tốc ngang 12 tick rồi trở lại vận tốc phóng | "Vẫn được lướt" |
| B21 | Điểm game trên giao diện = tổng điểm các Đêm đã thắng + điểm Đêm đang chơi. Headless chỉ báo điểm của Đêm đang chạy | |
| B22 | Giao diện xử lý tạm dừng bằng cách ngừng gọi `step` (logic dừng hoàn toàn). Input `pause` chỉ dùng cho headless | |

## 3. Thay đổi thiết kế so với Phase 1 và lý do

- **Toàn bộ số liệu** được thay bằng số chuẩn của ticket. Game vẫn đọc tuning từ `game.contract.json`.
- **Lõi** chuyển sang thứ tự 12 bước của ticket. Thêm `maps.js` (bản đồ, `groundAt`, tháp) và `util.js`.
- **Bỏ lan can Đêm 1:** ticket nói ngoài 40 m là rơi. `fall_enabled` đổi thành `true`.
- **Bóng Mực đi trên mặt đất (B11).** Khi viết test chênh cao, tôi phát hiện bản đầu cho Bóng Mực bay theo địa hình nên leo được vách, làm quy tắc chênh cao vô nghĩa. Đã sửa.
- **Giao diện:** bỏ PointLight của đèn lồng, thay bằng quầng sáng giả. Lý do: chi phí cố định, không phải biên dịch lại shader mỗi lần đèn thay đổi.

## 4. Test cũ bị luật mới thay thế (sửa, có lý do)

| Test Phase 1 | Thay đổi | Lý do (Ticket-02) |
|---|---|---|
| R2 không rơi khỏi đảo (lan can) | Thay bằng M1 và F2 (rơi) | Đêm 1 không còn lan can |
| R3 nhặt +10 điểm | Nhặt 0 điểm; +10 tính lúc nạp | Điểm chuẩn hóa: "+10 mỗi đom đóm nạp" |
| R6 đẩy 4 m tức thì, choáng 180 tick | Đẩy trong 15 tick, choáng 120 tick | Số chuẩn |
| R6 khoảng cách XZ ≤ 6 | Khoảng cách 3D từ tâm chân + 0.8 m, ≤ 5 | Số chuẩn |
| R5 đẩy ra tới 6.01 m | Chặn đúng ở mép 6 m; bóng bên trong lúc thắp bị đẩy dần trong 30 tick | Luật vùng an toàn mới |
| R5 Bóng Mực mới mỗi 20 s, ban đầu 3 con | 2 con ở tick 300, rồi mỗi 8/7/6 s | Lịch sinh chuẩn |
| R8 ưu tiên won > no_flames | no_flames > all_lit > dawn | Luật thắng/thua mới |
| C2 snapshot đầu, không có event tick 0 | Thêm `night_start` ở tick 0 và các trường v1.1 | Contract v1.1 |
| CLI: end.score sau khi nhặt = 10 | = 0 | Như R3 |

Không test nào bị tắt hay skip. Các test đổi kỳ vọng đều có nhãn `[P2: …]` trong tên hoặc ghi chú.

## 5. Đánh giá Phase 2

- **Đạt, có test:** S1–S10, M1–M3, F1–F5, C4, C5 (48 test xanh). Tất định đúng ở cả 3 Đêm. Headless 1 Đêm đầy đủ chạy khoảng 0.25 s.
- **FPS:** Chrome dùng GPU (Apple M1, Metal) đạt 30 FPS khi bị trần của headless, và khoảng 500 FPS khi bỏ trần, ở 1280×720. **Rủi ro:** nếu máy chấm không có GPU (render phần mềm SwiftShader), Đêm 3 chỉ được khoảng 24 FPS.
- **Kiểm tra tay** (chưa có bằng chứng tự động): F6 chuỗi màn hình, F7 lưu cài đặt, F8 âm thanh, nhạc, độ nhấp nháy của HUD. Sẽ xác nhận khi quay video.
- **Bot:** thắng Đêm 1 10/10, Đêm 2 1/10, Đêm 3 0/10. Bot tìm đường qua tầng và cầu còn yếu, không phải do luật game. Người chơi thật dùng camera và lướt tốt hơn.
- **AI sai và cách phát hiện:**
  - Bóng Mực leo vách: phát hiện khi viết test chênh cao; sửa lõi.
  - Bóng lùi chỉ được 1.967 m thay vì 2 m: lệch một tick do bộ đếm giảm trước khi di chuyển. Phát hiện khi tính tay số tick lúc viết test; sửa bằng bước đầu ngay tick hit.
  - Camera giao diện khởi đầu ở gốc tọa độ, rơi vào trong tháp nên màn hình trống. Phát hiện qua ảnh Chrome headless; sửa bằng cách đặt camera ngay vào vị trí đúng.
  - FPS đo được ~30 tưởng là chậm. Đo mốc trang trống cho thấy headless khóa trần 30, nên đã thêm chế độ bỏ trần.
  - Thử tắt PointLight của đèn chưa thắp thì FPS phần mềm lại giảm, do biên dịch lại shader. Đã đổi sang ánh sáng giả.
- **Harness:** cập nhật AGENTS.md (bản đồ, thứ tự tick, trạng thái, lệnh đo FPS) và skill `verify-phase` (3 Đêm, đo FPS). Thêm `tests/helpers.js`.
