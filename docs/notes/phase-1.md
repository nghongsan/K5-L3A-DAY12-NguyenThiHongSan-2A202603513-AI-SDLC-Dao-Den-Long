# Phase 1 — PRD-0: yêu cầu, tiêu chí nghiệm thu, giả định, đánh giá

Nguồn: tab Phase 1 trên lab board (PRD-0 + Test Contract v1.0).

## 1. Yêu cầu → tiêu chí nghiệm thu

| ID | Yêu cầu (PRD-0) | Tiêu chí kiểm chứng được |
|---|---|---|
| R1 | Một màn: Đêm 1 – Đảo Bến, đảo tròn, 5 Đèn Lồng Lớn | Snapshot tick 0 có đúng 5 đèn L1–L5, chưa thắp; giao diện vẽ đảo tròn và 5 đèn |
| R2 | Đi lại, nhảy, camera 3D | `move [0,1]` 60 tick đi đúng `player_speed` m theo +Z; yaw xoay đúng công thức; vector >1 chuẩn hóa; nhảy rời đất rồi về Y=0; camera góc nhìn thứ ba xoay được |
| R3 | Đom đóm rải rác, nhặt được | Trong `pickup_radius` (≤) thì nhặt, ngoài thì không; không vượt `carry_capacity`; event `mote_picked` |
| R4 | Nạp ánh sáng thắp đèn | Nhấn interact trong `interact_radius` thì nạp; đủ `lantern_cost` thì `lantern_lit`; giữ nút không nạp lặp |
| R5 | Bóng Mực xuất hiện, đuổi, chạm thì mất máu, sợ đèn | Đuổi với `shade_speed`; chạm trong `shade_hit_radius` thì −1 lửa, rơi `hit_drop_ratio` đom đóm, bất tử `invuln_s`; không vào `safe_radius` của đèn đã thắp; sinh thêm theo thời gian (`shade_spawned`) |
| R6 | Tỏa sáng xua Bóng Mực, tốn ánh sáng | Tốn `pulse_cost`; choáng `pulse_stun_s` và đẩy `pulse_push_m` mọi Bóng Mực trong `pulse_radius`; hồi chiêu `pulse_cooldown_s`; thiếu ánh sáng thì không tỏa |
| R7 | Điểm số, HUD | Điểm theo `tuning.score`; HUD hiện lửa, đom đóm mang, số đèn, thời gian, điểm, trạng thái tỏa sáng |
| R8 | Thắng/thua | Thắp đủ 5 đèn → `won/all_lit`; hết lửa → `lost/no_flames`; hết giờ → `lost/dawn` |
| R9 | Chơi lại sau thắng/thua | Màn kết thúc có Enter/R để bắt đầu ván mới |
| R10 | Cảm giác & phong cách | Ánh sáng vàng cam là tốt, tím đen là nguy hiểm, đảo sáng dần khi thắp đèn, Mây đội nón lá treo đèn lồng nhỏ, không bạo lực |
| C1 | `game.contract.json` ở gốc repo | Có đủ khóa; số khai báo chính là số game dùng (sim đọc tuning từ file này) |
| C2 | Headless: tham số, mô hình tick, JSONL | Snapshot tick 0 trước input; snapshot mỗi `--snapshot-every`; event ghi tick k+1; dòng cuối `end`; tọa độ làm tròn 3 chữ số |
| C3 | Tất định | Cùng seed + scenario + inputs → output giống từng byte |
| C4 | Mã thoát | 0 khi xong; file inputs/scenario sai định dạng → 2; lỗi khác → khác 0 kèm stderr |
| D1 | README cài/chạy tối đa 3 lệnh, điều khiển, cách tính điểm | Clone sạch → `npm install` → `npm start` |

## 2. Giả định (chỗ PRD-0 chưa quy định)

| # | Giả định | Lý do |
|---|---|---|
| A1 | Đảo tròn bán kính 40 m có lan can, người chơi bị giữ trong đảo. `fall_enabled = false`, không có event `player_hit` với `by: "fall"` | Đơn giản, không cần cơ chế hồi sinh |
| A2 | Đèn L1–L5 nằm trên vòng bán kính 25 m, L1 tại (0,0,25), mỗi đèn cách nhau 72° | Khớp ví dụ L1 [0,0,25] trong contract |
| A3 | "Máu" là lửa (`flames` = 3). Bị chạm thì −1 lửa, rơi `floor(carried × 0.5)` đom đóm (bay mất, không rơi xuống đất), bất tử 1.5 s, tối đa 1 lần chạm mỗi tick | Rõ ràng, dễ test |
| A4 | "Ánh sáng" để tỏa sáng là đom đóm đang mang (`pulse_cost` = 1). Không đủ đom đóm hoặc đang hồi chiêu thì nhấn không có tác dụng và không phát event | PRD: "tỏa sáng tốn ánh sáng" |
| A5 | Tỏa sáng thành công luôn phát event `pulse` (`stunned_ids` có thể rỗng). Bóng Mực đang choáng vẫn bị choáng lại và đẩy tiếp | |
| A6 | Chỉ đèn **đã thắp** có vùng an toàn `safe_radius` = 6 m. Bóng Mực trong vùng bị đẩy ra cách đèn `safe_radius + 0.01` m | "Sợ đèn" = sợ ánh sáng; đèn tắt không bảo vệ |
| A7 | Bóng Mực luôn đuổi (`chase`), bị choáng thì `stunned`, không bị tiêu diệt. Tâm ở Y = 1 | Không bạo lực |
| A8 | Nạp đèn bằng nút interact (false→true), vào đèn chưa thắp gần nhất trong `interact_radius`, nạp `min(đang mang, còn thiếu)`. Đèn cần 5, mang tối đa 5 | |
| A9 | Nhặt đom đóm tự động khi trong `pickup_radius`, không cần nút | Contract chỉ có `mote_picked`, không gắn nút |
| A10 | Thắng được kiểm tra mỗi bước (kể cả đèn đặt sẵn qua scenario). Nếu nhiều kết thúc xảy ra cùng tick thì ưu tiên won > no_flames > dawn | |
| A11 | Điểm: +10 mỗi đom đóm, +100 mỗi đèn, +20 mỗi Bóng Mực bị choáng. Khi thắng cộng thêm 2 × số giây còn lại (làm tròn xuống) + 50 × số lửa còn lại. Thua thì không có thưởng | |
| A12 | Sinh ngẫu nhiên (khi `random_*` khác false): 30 đom đóm ban đầu ở bán kính 4–37 m, mỗi 4 s sinh thêm 1 nếu đang dưới 30. 3 Bóng Mực ban đầu ở bán kính 36 m (cách người chơi ≥ 15 m), mỗi 20 s thêm 1, tối đa 6. Bóng Mực ban đầu không phát event | Cân chỉnh bằng bot (mục 4) |
| A13 | Nhảy: 7 m/s, trọng lực 20 m/s². Khoảng cách tính trên mặt XZ nên nhảy không né được Bóng Mực | Theo quy ước khoảng cách của contract |
| A14 | Không có dash: trường `dash` được nhận nhưng bỏ qua | |
| A15 | Mã 2 khi: JSON hỏng, tick không tăng, `move` ngoài [-1,1], kiểu sai, id đèn ngoài L1–L5, id trùng. `motes` nhận `[x,y,z]` hoặc `{pos,id}` | "Sai định dạng → 2" |
| A16 | Game kết thúc giữa chừng thì không ghi snapshot bổ sung (chỉ ghi theo `--snapshot-every`), rồi tới dòng `end`. `end.ticks` = số bước đã chạy | |
| A17 | Trên giao diện, A/D ứng với x = +1/−1, vì camera nhìn theo +Z thì +X nằm bên trái màn hình | Giữ đúng công thức yaw của contract |

## 3. Kế hoạch kiểm chứng (lập trước khi code)

- Lõi thuần (`src/core/sim.js`) tách khỏi phần vẽ. Mọi luật đều test được bằng `runHeadless` với scenario tắt sinh ngẫu nhiên.
- Mỗi yêu cầu R/C có ít nhất một test mang mã ID trong tên (`tests/sim.test.js`, `tests/cli.test.js`).
- CLI được test end-to-end đúng lệnh ghi trong `game.contract.json`: mã thoát, định dạng, so sánh byte.
- "Chơi được tới thắng/thua": bot chỉ dùng input như người chơi, chạy 10 seed. Input của seed 1 được phát lại qua CLI.
- Giao diện: chụp ảnh bằng Chrome headless, kiểm tra không có lỗi JS.

## 4. Đánh giá Phase 1

- **Đạt:** R1–R8, C1–C4, D1 đều có bằng chứng tự động (xem `docs/proof/phase-1/README.md`).
- **Kiểm tra tay:** R9 (chơi lại) và độ "sáng dần" của R10 chỉ thấy khi chơi trên giao diện; cần xác nhận khi quay video.
- **Cân chỉnh số liệu bằng bot:**
  1. Ban đầu đặt `shade_speed` 3.5, 2 Bóng Mực, tối đa 6: bot thắng 10/10 mà không lần nào bị chạm, quá dễ.
  2. Đổi sang 4.5, ban đầu 3, tối đa 8, mỗi 15 s: Bóng Mực dồn thành bầy 8 con, bot chạy vòng tới sáng.
  3. Chốt 4.5, ban đầu 3, tối đa 6, mỗi 20 s: bot thắng 28/30 seed, còn trung bình 2.6 lửa, thắng trong khoảng 55 s. Người chơi thật chậm hơn bot nhưng có 300 s.
- **AI sai và cách phát hiện:**
  - `Game` không nhận mote dạng `[x,y,z]` khi test bỏ qua bộ parse. 2 test đỏ báo lỗi; đã sửa ở lõi để nhận cả hai dạng.
  - Vùng an toàn dùng `d > R` nên Bóng Mực có thể đứng ở 6.0000x m, làm tròn ra đúng 6 (tức là "trong" bán kính). Test R5 bắt được ở tick 120; đã sửa bằng biên `R + 0.01`.
  - Server kiểm tra đường dẫn sai thứ tự toán tử nên sẽ trả 404 mọi file. Phát hiện khi tự review trước khi chạy; xác nhận lại bằng curl.
  - Dùng lệnh `timeout` không có trên macOS; đổi sang tham số timeout của công cụ.
  - Chrome headless không cho game chạy thêm thời gian khi chụp ảnh, nên ảnh "bot đang chơi" giống ảnh mới vào ván. Đã bỏ ảnh đó; bằng chứng tiến trình ván chơi lấy từ headless (bot + phát lại qua CLI).
- **Harness thêm trong phase:** `AGENTS.md` (+ `CLAUDE.md` import), hook Stop chặn kết thúc khi `npm test` đỏ, skill `verify-phase`, CI GitHub Actions.
