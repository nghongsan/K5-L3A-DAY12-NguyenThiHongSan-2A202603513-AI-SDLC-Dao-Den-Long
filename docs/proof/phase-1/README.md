# Bằng chứng Phase 1: truy vết yêu cầu

Chạy lại toàn bộ: `npm test` và `npm run proof -- --phase 1`. Kết quả tự động nằm ở [proof-summary.md](proof-summary.md).
Mã yêu cầu và giả định: [docs/notes/phase-1.md](../../notes/phase-1.md).

| ID | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| R1 | Đêm 1, đảo tròn, 5 Đèn Lồng Lớn | Test C2 (snapshot tick 0 có 5 đèn); ảnh giao diện | [test-report.txt](test-report.txt), [img/gui-play.png](img/gui-play.png) | Đạt |
| R2 | Đi lại, nhảy, camera 3D | Test `R2 *` (tốc độ, yaw, chuẩn hóa, nhảy, giữ trong đảo); ảnh góc nhìn thứ ba | [test-report.txt](test-report.txt), [img/gui-play.png](img/gui-play.png) | Đạt |
| R3 | Đom đóm nhặt được | Test `R3 *` (biên ≤ pickup_radius, carry_capacity) | [test-report.txt](test-report.txt) | Đạt |
| R4 | Nạp ánh sáng thắp đèn | Test `R4 *` (thắp khi đủ, nạp thiếu, giữ nút, ngoài bán kính) | [test-report.txt](test-report.txt) | Đạt |
| R5 | Bóng Mực đuổi, chạm mất lửa, sợ đèn, sinh thêm | Test `R5 *` (shade_speed, invuln_s, hit_drop_ratio, safe_radius 600 tick, shade_spawned) | [test-report.txt](test-report.txt) | Đạt |
| R6 | Tỏa sáng xua Bóng Mực, tốn ánh sáng | Test `R6 *` (cost, radius, push, stun 180 tick, cooldown, thiếu ánh sáng) | [test-report.txt](test-report.txt) | Đạt |
| R7 | Điểm, HUD | Test điểm ở R3/R4/R6/R8; ảnh HUD | [test-report.txt](test-report.txt), [img/gui-play.png](img/gui-play.png) | Đạt |
| R8 | Thắng/thua, chơi trọn ván | Test `R8 *` (all_lit, no_flames, dawn); bot chơi 10 seed; phát lại seed 1 qua CLI | [proof-summary.md](proof-summary.md), [runs/bot-seed1.jsonl](runs/bot-seed1.jsonl) | Đạt |
| R9 | Chơi lại sau thắng/thua | Enter/R trên màn kết thúc (`web/main.js` `showEnd` → `newGame`) | Chưa có bằng chứng tự động; cần xác nhận khi chơi và quay video | Kiểm tra tay |
| R10 | Phong cách: vàng cam tốt, tím đen nguy hiểm, nón lá + đèn nhỏ, đảo sáng dần | Ảnh giao diện; sương và nền đổi theo số đèn đã thắp (`sync()` trong web/main.js) | [img/gui-play.png](img/gui-play.png), [img/gui-menu.png](img/gui-menu.png) | Đạt một phần: chưa có ảnh lúc đảo đã sáng |
| C1 | `game.contract.json` | Test C1; sim đọc tuning trực tiếp từ file | [test-report.txt](test-report.txt) | Đạt |
| C2 | Định dạng headless + mô hình tick | Test C2, test CLI (snapshot 0/60/120, end) | [test-report.txt](test-report.txt), [runs/demo-seed42.jsonl](runs/demo-seed42.jsonl) | Đạt |
| C3 | Tất định | Test C3, test CLI so từng byte; proof so sha256 | [proof-summary.md](proof-summary.md) | Đạt |
| C4 | Mã thoát | Test CLI (6 trường hợp sai định dạng → 2; thiếu tham số ≠ 0) | [test-report.txt](test-report.txt), [proof-summary.md](proof-summary.md) | Đạt |
| D1 | README ≤ 3 lệnh | Clone sạch sang thư mục khác → `npm install` → `npm test` + chạy headless + `npm start` | Mục "Clone sạch" bên dưới | Đạt |

## Clone sạch (D1)

Clone repo sang một thư mục trống ở commit `495933c` (macOS 14.4, Apple M1, Node 22.23.5), rồi chạy:

| Lệnh | Kết quả |
|---|---|
| `npm install` | `added 1 package` (three 0.170.0) |
| `npm test` | `# pass 26`, `# fail 0` |
| `node src/headless/cli.js --seed 3 --night 1 --inputs scenarios/demo-inputs.json --ticks 600 --out out/x.jsonl` | exit 0, 62 dòng, cuối: `{"type":"end","ticks":600,"state":"playing","score":0}` |
| `npm start` (`PORT=5288`) + `curl /` và `curl /node_modules/three/build/three.module.js` | 200 / 200 |

Ảnh giao diện chụp bằng Chrome headless (SwiftShader). Không có lỗi JS trong log console, chỉ có cảnh báo hiệu năng của driver GL.
