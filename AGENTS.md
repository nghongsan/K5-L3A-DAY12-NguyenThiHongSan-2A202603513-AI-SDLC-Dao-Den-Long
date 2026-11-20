# AGENTS.md — Đảo Đèn Lồng

Game 3D (Three.js) + lõi tất định chạy headless theo Test Contract. Node ≥ 20, lõi không phụ thuộc thư viện.

## Lệnh
- Cài: `npm install` · Chơi: `npm start` → http://localhost:5173 (`?seed=7` vào thẳng ván, `?bot` bot tự chơi)
- Test: `npm test` — PHẢI xanh trước khi kết thúc (hook Stop chặn nếu đỏ)
- Bằng chứng: `npm run proof -- --phase N` → `docs/proof/phase-N/` (skill `verify-phase`)
- Headless: `node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out out/run.jsonl [--scenario f] [--inputs f]`
- Token: `npm run tokens -- --since <ISO>` (ghi vào docs/notes/ai-log.md)

## Bố cục
- `src/core/sim.js` luật game (class Game, step = 1 tick). `io.js` kiểm tra file scenario/inputs. `runner.js` ra JSONL. `bot.js` bot chơi thử.
- `src/headless/cli.js` CLI của contract. Mã thoát: 0 xong, 2 file sai định dạng, 1 lỗi khác.
- `web/` chỉ VẼ trạng thái lõi + đọc bàn phím; không chứa luật game.
- `game.contract.json` là nguồn số liệu duy nhất (sim đọc `tuning` từ đây). Đổi số chỉ ở đó; hằng số khác ở `WORLD` trong sim.js.

## Quy tắc
- Yêu cầu: `docs/notes/phase-N.md` (trích từ lab board). Không bịa yêu cầu; chỗ mơ hồ ghi giả định vào file đó.
- Lõi: không DOM, không `Math.random`/`Date` (dùng `this.rng`), 60 tick/s, tọa độ ra làm tròn 3 số.
- Đổi luật → viết/sửa test trước (`tests/`, đặt tên theo mã yêu cầu R*/C*). Không xóa/skip test âm thầm; ghi lý do ở notes.
- Sáng tạo thêm chỉ ở `web/` hoặc thực thể tắt khi headless; đầu ra headless không được đổi.
- Không ghi "đạt" nếu chưa có file bằng chứng; không sửa tay output trong docs/proof.
