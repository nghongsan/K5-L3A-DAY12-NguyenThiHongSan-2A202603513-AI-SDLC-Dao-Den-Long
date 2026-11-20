# Bằng chứng Phase 4: truy vết yêu cầu (Ticket-04 "Bình minh v1.0.0", contract v1.3)

Chạy lại:
- `npm test`
- `npm run proof -- --phase 4 --no-fps`
- `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json`
- `node --expose-gc --jitless scripts/soak.mjs --seed 7 --nights 10 --out soak.json`

Tiêu chí và giả định: [docs/notes/phase-4.md](../../notes/phase-4.md).

| ID | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| B1–B3 | Benchmark: cảnh chuẩn, chỉ số theo định nghĩa, ngưỡng | Chạy đúng `bench_cmd` (cửa sổ Chrome 1280×720, vsync tắt, đo 30 s); test B1 cho chế độ bench của lõi | [bench.json](../../../bench.json): avg **294.8**, p1_low **93.5**, p95 5.9 ms, 8847 khung, load **3251 ms**, peak 784 MB; [img/bench.png](img/bench.png) | Đạt (máy tôi: Apple M1) |
| S1 | Soak 10 Đêm, 0 crash, bộ nhớ ≤ 1.2 lần | Chạy đúng `soak_cmd`; test S1 | [soak.json](../../../soak.json): crashes 0, RSS 39.3 → 40.3 MB (×1.03), heap phẳng | Đạt (lý do dùng `--jitless`: notes §4) |
| L1–L3 | Bảng xếp hạng: tên, mục, top 10, sắp xếp, lưu đĩa, lệnh xuất | Test L1–L3; curl POST/GET; xuất bằng `run_cmd --export-leaderboard` | [test-report.txt](test-report.txt), [img/board.png](img/board.png) | Đạt |
| A1 | Đổi phím mọi hành động, báo trùng, khôi phục mặc định, lưu | Màn Cài đặt; `bindKey()` từ chối phím trùng | [img/settings.png](img/settings.png) | Đạt (ảnh + mã); thao tác: kiểm tra tay |
| A2 | Phụ đề và chỉ báo (Bóng Mực + mũi tên mép, gió, 10 s cuối, dầu < 30) | `sub()`, `edgeArrow()` gắn với các event | web/main.js | Kiểm tra tay khi quay video |
| A3 | Giảm chuyển động | `flash()` và `shake` tắt khi bật tùy chọn | web/main.js | Kiểm tra tay |
| A4 | Chữ ≥ 18 px, tùy chọn ×1.25 | `html { font-size: calc(18px * var(--ui-scale)) }`, mọi chữ ≥ 1rem | [img/play.png](img/play.png), [img/settings.png](img/settings.png) | Đạt |
| P1 | Clone sạch 3 lệnh; README; CHANGELOG 4 phase; CREDITS; LICENSE | Clone sang thư mục trống → `npm install` → `npm test` (66/66) → `node server.mjs`: `/`, `three.module.js`, `/api/leaderboard` đều trả 200 | [README.md](../../../README.md), [CHANGELOG.md](../../../CHANGELOG.md) | Đạt |
| P2 | Release v1.0.0 có bản chạy được | `npm run release` → zip đã kèm three.js; giải nén → `node server.mjs` → các file trả 200 | GitHub Release v1.0.0 | Đạt |
| C7 | Contract v1.3; v1.0–v1.2 giữ nguyên | Test C1 + toàn bộ test cũ; tất định 3 Đêm | [test-report.txt](test-report.txt), [proof-summary.md](proof-summary.md) | Đạt |
| R | Retro, video | [retro.md](../../notes/retro.md); video quay theo [kịch bản](../../demo/kich-ban-video.md) | — | Retro: đạt · Video: người dùng tự quay và tải lên Release |
