# Bằng chứng tự động — Phase 1

Sinh bởi `npm run proof` (scripts/proof.mjs). Không sửa tay file này.

- Thời điểm: 2026-11-20T10:10:35.440Z
- Commit mã: `495933c`
- Máy: Darwin 23.4.0 · Apple M1 · 8 nhân · Node v22.23.5

| Kiểm tra | Kết quả | Chi tiết |
|---|---|---|
| Test đơn vị + scenario (`npm test`) | ĐẠT | pass 26, fail 0 → [test-report.txt](test-report.txt) |
| Tất định: seed 42 chạy 2 lần giống từng byte | ĐẠT | sha256 1f8572e70c3733e0… = 1f8572e70c3733e0… → [runs/demo-seed42.jsonl](runs/demo-seed42.jsonl) |
| Khác seed (43) → output khác | ĐẠT | sha256 f963dedb5d281423… |
| File inputs sai định dạng → mã thoát 2 | ĐẠT | status 2, stderr: `headless: inputs sai định dạng: frames[1].tick phải tăng nghiêm ngặt (1 sau 3)` |
| Đêm 1 chơi được tới kết thúc (bot, 10 seed) | ĐẠT | 8/10 thắng, còn lại thua; bảng bên dưới |
| Phát lại input của bot qua CLI ra đúng kết quả ván | ĐẠT | end {"type":"end","ticks":3526,"state":"won","score":1682} → [runs/bot-seed1.jsonl](runs/bot-seed1.jsonl) |
| Hiệu năng: 1 đêm đủ 18000 tick (đo cả khởi động Node) | ĐẠT | 116 ms, end {"type":"end","ticks":18000,"state":"lost","score":0} |

## Bot chơi thử 10 seed (src/core/bot.js, chỉ dùng input như người chơi)

| seed | kết quả | lý do | thời gian (s) | điểm | đèn thắp | lửa còn |
|---:|---|---|---:|---:|---:|---:|
| 1 | won | all_lit | 58.8 | 1682 | 5/5 | 3 |
| 2 | won | all_lit | 61.8 | 1956 | 5/5 | 3 |
| 3 | won | all_lit | 64.3 | 1590 | 5/5 | 2 |
| 4 | won | all_lit | 61.8 | 1806 | 5/5 | 3 |
| 5 | lost | dawn | 300.0 | 790 | 4/5 | 3 |
| 6 | won | all_lit | 54.6 | 1760 | 5/5 | 3 |
| 7 | won | all_lit | 65.7 | 1768 | 5/5 | 3 |
| 8 | won | all_lit | 42.2 | 1474 | 5/5 | 3 |
| 9 | lost | dawn | 300.0 | 1410 | 4/5 | 1 |
| 10 | won | all_lit | 60.2 | 1738 | 5/5 | 2 |
