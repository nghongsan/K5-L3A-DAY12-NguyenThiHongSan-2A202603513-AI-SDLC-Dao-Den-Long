---
name: verify-phase
description: Chạy toàn bộ kiểm chứng của một phase và lưu bằng chứng vào docs/proof/phase-N/. Dùng trước khi gắn tag phase-N, sau khi đổi luật game, hoặc khi được hỏi "đã chứng minh chưa".
---

# Kiểm chứng một phase

1. `npm test` phải xanh. Đỏ thì sửa mã (không sửa test cho qua). Test cũ bị yêu cầu mới thay thế: sửa và ghi lý do trong `docs/notes/phase-N.md`.
2. Commit mã trước, rồi chạy `npm run proof -- --phase N`. Script sinh:
   - `proof-summary.md` (bảng kiểm tra, máy, commit), `test-report.txt`
   - `runs/demo-seed42.jsonl` (tất định), `runs/bot-seed1*.json*` (bot chơi trọn ván, phát lại qua CLI)
   Script thoát khác 0 nếu có mục KHÔNG ĐẠT. Không sửa tay các file này.
3. Cập nhật bảng truy vết `docs/proof/phase-N/README.md`: yêu cầu → cách kiểm chứng → file bằng chứng → kết quả.
   Chỉ ghi "Đạt" khi có file bằng chứng; chưa làm/chưa chứng minh thì ghi "Chưa đạt"/"Kiểm tra tay" kèm lý do.
4. Ảnh giao diện (nếu cần): server `PORT=5199 node server.mjs`, rồi
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1280,720 --virtual-time-budget=6000 --screenshot=docs/proof/phase-N/img/<tên>.png "http://127.0.0.1:5199/?seed=7"`
5. Ghi token phase: `npm run tokens -- --since <giờ bắt đầu phase>` → `docs/notes/ai-log.md`.
6. Commit bằng chứng, rồi `git tag phase-N && git push origin main phase-N`.

## Thêm một scenario test
Thêm `test(...)` trong `tests/sim.test.js` dùng helper `run(scenario, frames, ticks)` (mặc định tắt sinh ngẫu nhiên, snapshot mỗi tick).
Đặt tên test theo mã yêu cầu (`R4 ...`) để truy vết.
