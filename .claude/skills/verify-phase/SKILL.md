---
name: verify-phase
description: Chạy toàn bộ kiểm chứng của một phase và lưu bằng chứng vào docs/proof/phase-N/. Dùng trước khi gắn tag phase-N, sau khi đổi luật game, hoặc khi được hỏi "đã chứng minh chưa".
---

# Kiểm chứng một phase

1. `npm test` phải xanh. Đỏ thì sửa mã (không sửa test cho qua). Test cũ bị yêu cầu mới thay thế: sửa và ghi lý do trong `docs/notes/phase-N.md`.
2. Commit mã trước, rồi chạy `npm run proof -- --phase N` (cần Chrome để đo FPS; không có thì thêm `--no-fps`). Script sinh:
   - `proof-summary.md` (bảng kiểm tra, máy, commit, FPS, bảng bot 3 Đêm × 10 seed), `test-report.txt`
   - `runs/demo-nightK-seed42.jsonl` (tất định từng Đêm), `runs/bot-night*-seed*.json*` (ván bot thắng, phát lại qua CLI)
   - kiểm tra hiệu năng headless: 1 Đêm đầy đủ mỗi Đêm <= 30 s
   Script thoát khác 0 nếu có mục KHÔNG ĐẠT. Không sửa tay các file này.
3. Cập nhật bảng truy vết `docs/proof/phase-N/README.md`: yêu cầu → cách kiểm chứng → file bằng chứng → kết quả.
   Chỉ ghi "Đạt" khi có file bằng chứng; chưa làm/chưa chứng minh thì ghi "Chưa đạt"/"Kiểm tra tay" kèm lý do.
4. Ảnh giao diện: server `PORT=5199 node server.mjs`, rồi với mỗi Đêm K:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --window-size=1280,720 --virtual-time-budget=5000 --screenshot=docs/proof/phase-N/img/nightK.png "http://127.0.0.1:5199/?night=K&seed=3"`
   Lưu ý: Chrome headless không cho thời gian game chạy tiếp khi chụp (ảnh là lúc mới vào Đêm) và khóa trần ~30 FPS (đo bằng `bench-fps.mjs --uncapped`).
5. Ghi token phase: `npm run tokens -- --since <giờ bắt đầu phase>` → `docs/notes/ai-log.md`.
6. Commit bằng chứng, rồi `git tag phase-N && git push origin main phase-N`.

## Thêm một scenario test
Thêm `test(...)` trong `tests/*.test.js` dùng `run(scenario, frames, ticks, { night })` từ `tests/helpers.js`
(mặc định tắt mọi sinh ngẫu nhiên + gió, snapshot mỗi tick; `at(lines, tick)` lấy snapshot một tick).
Đặt tên test theo mã yêu cầu (`F3 ...`) để truy vết; mỗi tính năng mới cần ít nhất 1 scenario headless.
