# Bằng chứng tự động — Phase 4

Sinh bởi `npm run proof -- --phase 4` (scripts/proof.mjs). Không sửa tay file này.

- Thời điểm: 2026-11-20T12:42:07.163Z
- Commit mã: `fc1e911` (có thay đổi chưa commit trong src/tests/web)
- Máy: Darwin 23.4.0 · Apple M1 · 8 nhân · Node v22.23.5
- Contract: v1.3

| Kiểm tra | Kết quả | Chi tiết |
|---|---|---|
| Test đơn vị + scenario (`npm test`) | ĐẠT | pass 66, fail 0 → [test-report.txt](test-report.txt) |
| Tất định Đêm 1: seed 42 hai lần giống từng byte, seed 43 khác | ĐẠT | sha256 c520d2a72aed… = c520d2a72aed… ≠ e38c86104696… → [runs/demo-night1-seed42.jsonl](runs/demo-night1-seed42.jsonl) |
| Tất định Đêm 2: seed 42 hai lần giống từng byte, seed 43 khác | ĐẠT | sha256 921f7538cb44… = 921f7538cb44… ≠ bab17f83dd82… → [runs/demo-night2-seed42.jsonl](runs/demo-night2-seed42.jsonl) |
| Tất định Đêm 3: seed 42 hai lần giống từng byte, seed 43 khác | ĐẠT | sha256 59c8fbb53750… = 59c8fbb53750… ≠ f7218e16ec0f… → [runs/demo-night3-seed42.jsonl](runs/demo-night3-seed42.jsonl) |
| File inputs sai định dạng → mã thoát 2 | ĐẠT | status 2, stderr: `headless: inputs sai định dạng: frames[1].tick phải tăng nghiêm ngặt (1 sau 3)` |
| Hiệu năng headless Đêm 1: 14400 tick <= 30 s | ĐẠT | 133 ms (gồm khởi động Node) |
| Hiệu năng headless Đêm 2: 16200 tick <= 30 s | ĐẠT | 168 ms (gồm khởi động Node) |
| Hiệu năng headless Đêm 3: 18000 tick <= 30 s | ĐẠT | 252 ms (gồm khởi động Node) |
| Mỗi ván chơi tới kết thúc (bot, 3 Đêm × 10 seed) | ĐẠT | thắng Đêm 1: 9/10, Đêm 2: 0/10, Đêm 3: 0/10 (bảng bên dưới) |
| Phát lại input bot (Đêm 1, seed 1) qua CLI ra đúng kết quả | ĐẠT | end {"type":"end","ticks":14400,"state":"won","score":1221} → [runs/bot-night1-seed1.jsonl](runs/bot-night1-seed1.jsonl) |

## Bot chơi thử (src/core/bot.js, chỉ dùng input như người chơi)

| Đêm | seed | kết quả | lý do | thời gian (s) | điểm | đèn | lửa còn |
|---:|---:|---|---|---:|---:|---:|---:|
| 1 | 1 | won | dawn_survived | 240.0 | 1221 | 3/5 | 3 |
| 1 | 2 | won | dawn_survived | 240.0 | 1267 | 3/5 | 2 |
| 1 | 3 | lost | dawn | 240.0 | 150 | 0/5 | 3 |
| 1 | 4 | won | dawn_survived | 240.0 | 1084 | 3/5 | 3 |
| 1 | 5 | won | dawn_survived | 240.0 | 1312 | 3/5 | 3 |
| 1 | 6 | won | dawn_survived | 240.0 | 1213 | 3/5 | 3 |
| 1 | 7 | won | dawn_survived | 240.0 | 1116 | 3/5 | 3 |
| 1 | 8 | won | dawn_survived | 240.0 | 1251 | 3/5 | 3 |
| 1 | 9 | won | dawn_survived | 240.0 | 1117 | 3/5 | 3 |
| 1 | 10 | won | dawn_survived | 240.0 | 1260 | 3/5 | 3 |
| 2 | 1 | lost | dawn | 270.0 | 440 | 2/6 | 3 |
| 2 | 2 | lost | dawn | 270.0 | 740 | 2/6 | 3 |
| 2 | 3 | lost | dawn | 270.0 | 520 | 2/6 | 3 |
| 2 | 4 | lost | dawn | 270.0 | 265 | 1/6 | 2 |
| 2 | 5 | lost | dawn | 270.0 | 755 | 3/6 | 3 |
| 2 | 6 | lost | dawn | 270.0 | 550 | 1/6 | 1 |
| 2 | 7 | lost | dawn | 270.0 | 445 | 2/6 | 1 |
| 2 | 8 | lost | dawn | 270.0 | 450 | 2/6 | 3 |
| 2 | 9 | lost | dawn | 270.0 | 465 | 2/6 | 2 |
| 2 | 10 | lost | dawn | 270.0 | 475 | 2/6 | 3 |
| 3 | 1 | lost | no_flames | 82.3 | 35 | 0/7 | 0 |
| 3 | 2 | lost | no_flames | 75.1 | 45 | 0/7 | 0 |
| 3 | 3 | lost | no_flames | 57.0 | 155 | 1/7 | 0 |
| 3 | 4 | lost | no_flames | 210.4 | 420 | 2/7 | 0 |
| 3 | 5 | lost | no_flames | 240.9 | 355 | 1/7 | 0 |
| 3 | 6 | lost | dawn | 300.0 | 425 | 2/7 | 3 |
| 3 | 7 | lost | no_flames | 129.6 | 200 | 1/7 | 0 |
| 3 | 8 | lost | dawn | 300.0 | 250 | 1/7 | 3 |
| 3 | 9 | lost | no_flames | 58.4 | 20 | 0/7 | 0 |
| 3 | 10 | lost | no_flames | 193.3 | 365 | 2/7 | 0 |
