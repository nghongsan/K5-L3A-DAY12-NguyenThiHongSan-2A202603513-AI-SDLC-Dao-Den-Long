# Bằng chứng tự động — Phase 2

Sinh bởi `npm run proof -- --phase 2` (scripts/proof.mjs). Không sửa tay file này.

- Thời điểm: 2026-11-20T11:45:07.188Z
- Commit mã: `760473f`
- Máy: Darwin 23.4.0 · Apple M1 · 8 nhân · Node v22.23.5
- Contract: v1.1

| Kiểm tra | Kết quả | Chi tiết |
|---|---|---|
| Test đơn vị + scenario (`npm test`) | ĐẠT | pass 48, fail 0 → [test-report.txt](test-report.txt) |
| Tất định Đêm 1: seed 42 hai lần giống từng byte, seed 43 khác | ĐẠT | sha256 08078e5a7b99… = 08078e5a7b99… ≠ 86f5b2166796… → [runs/demo-night1-seed42.jsonl](runs/demo-night1-seed42.jsonl) |
| Tất định Đêm 2: seed 42 hai lần giống từng byte, seed 43 khác | ĐẠT | sha256 87f9e7785da0… = 87f9e7785da0… ≠ a141e8d0f22f… → [runs/demo-night2-seed42.jsonl](runs/demo-night2-seed42.jsonl) |
| Tất định Đêm 3: seed 42 hai lần giống từng byte, seed 43 khác | ĐẠT | sha256 a002e7e6caa7… = a002e7e6caa7… ≠ 1144e4ee4165… → [runs/demo-night3-seed42.jsonl](runs/demo-night3-seed42.jsonl) |
| File inputs sai định dạng → mã thoát 2 | ĐẠT | status 2, stderr: `headless: inputs sai định dạng: frames[1].tick phải tăng nghiêm ngặt (1 sau 3)` |
| Hiệu năng headless Đêm 1: 18000 tick <= 30 s | ĐẠT | 131 ms (gồm khởi động Node) |
| Hiệu năng headless Đêm 2: 19800 tick <= 30 s | ĐẠT | 166 ms (gồm khởi động Node) |
| Hiệu năng headless Đêm 3: 21600 tick <= 30 s | ĐẠT | 270 ms (gồm khởi động Node) |
| Mỗi ván chơi tới kết thúc (bot, 3 Đêm × 10 seed) | ĐẠT | thắng Đêm 1: 10/10, Đêm 2: 1/10, Đêm 3: 0/10 (bảng bên dưới) |
| Phát lại input bot (Đêm 1, seed 1) qua CLI ra đúng kết quả | ĐẠT | end {"type":"end","ticks":13705,"state":"won","score":1327} → [runs/bot-night1-seed1.jsonl](runs/bot-night1-seed1.jsonl) |
| FPS bản thường 1280×720 >= 30 (Chrome, GPU) | ĐẠT | bảng FPS bên dưới; headless Chrome khóa trần ~30 FPS nên đo thêm bản bỏ trần |

## FPS bản thường (scripts/bench-fps.mjs, bot chơi 8 s, bỏ 1 s đầu)

| Đêm | Trung bình (trần headless ~30) | Trung bình (bỏ trần) | Khung hình | Renderer |
|---|---:|---:|---|---|
| 1 | 60.1 | 469.5 | 1280x720 | ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version) |
| 2 | 60.1 | 503.2 | 1280x720 | ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version) |
| 3 | 60.1 | 491.6 | 1280x720 | ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version) |

## Bot chơi thử (src/core/bot.js, chỉ dùng input như người chơi)

| Đêm | seed | kết quả | lý do | thời gian (s) | điểm | đèn | lửa còn |
|---:|---:|---|---|---:|---:|---:|---:|
| 1 | 1 | won | all_lit | 228.4 | 1327 | 5/5 | 3 |
| 1 | 2 | won | all_lit | 154.3 | 1440 | 5/5 | 3 |
| 1 | 3 | won | all_lit | 175.1 | 1418 | 5/5 | 3 |
| 1 | 4 | won | all_lit | 167.8 | 1424 | 5/5 | 3 |
| 1 | 5 | won | all_lit | 201.0 | 1348 | 5/5 | 3 |
| 1 | 6 | won | all_lit | 168.5 | 1427 | 5/5 | 3 |
| 1 | 7 | won | all_lit | 170.0 | 1420 | 5/5 | 3 |
| 1 | 8 | won | all_lit | 195.0 | 1373 | 5/5 | 3 |
| 1 | 9 | won | all_lit | 177.4 | 1344 | 5/5 | 2 |
| 1 | 10 | won | all_lit | 171.3 | 1421 | 5/5 | 3 |
| 2 | 1 | lost | dawn | 330.0 | 1030 | 5/6 | 3 |
| 2 | 2 | lost | no_flames | 254.9 | 625 | 3/6 | 0 |
| 2 | 3 | lost | dawn | 330.0 | 1040 | 5/6 | 3 |
| 2 | 4 | lost | dawn | 330.0 | 1005 | 5/6 | 3 |
| 2 | 5 | won | all_lit | 304.1 | 1435 | 6/6 | 3 |
| 2 | 6 | lost | dawn | 330.0 | 850 | 4/6 | 2 |
| 2 | 7 | lost | dawn | 330.0 | 625 | 3/6 | 1 |
| 2 | 8 | lost | dawn | 330.0 | 1010 | 5/6 | 3 |
| 2 | 9 | lost | no_flames | 246.7 | 600 | 3/6 | 0 |
| 2 | 10 | lost | dawn | 330.0 | 1035 | 5/6 | 2 |
| 3 | 1 | lost | dawn | 360.0 | 680 | 3/7 | 2 |
| 3 | 2 | lost | no_flames | 93.3 | 55 | 0/7 | 0 |
| 3 | 3 | lost | dawn | 360.0 | 705 | 3/7 | 1 |
| 3 | 4 | lost | no_flames | 66.4 | 35 | 0/7 | 0 |
| 3 | 5 | lost | dawn | 360.0 | 855 | 4/7 | 1 |
| 3 | 6 | lost | dawn | 360.0 | 640 | 3/7 | 3 |
| 3 | 7 | lost | dawn | 360.0 | 475 | 2/7 | 1 |
| 3 | 8 | lost | no_flames | 340.0 | 465 | 2/7 | 0 |
| 3 | 9 | lost | no_flames | 172.1 | 50 | 0/7 | 0 |
| 3 | 10 | lost | no_flames | 125.7 | 60 | 0/7 | 0 |
