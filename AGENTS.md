# AGENTS.md — Đảo Đèn Lồng

Game 3D (Three.js) + lõi tất định chạy headless theo **Test Contract v1.2** (Ticket-03 "Đèn cạn dầu"). Quyết định thiết kế: `docs/adr/`. Thay đổi phá vỡ: `CHANGELOG.md`. Node ≥ 20, lõi không phụ thuộc thư viện.

## Lệnh
- Cài: `npm install` · Chơi: `npm start` → http://localhost:5173 (`?night=2&seed=7` vào thẳng Đêm, `?scenario={json}` dựng tình huống, `?cb` bảng màu dễ phân biệt, `?bot`, `?fps`)
- Test: `npm test` — PHẢI xanh trước khi kết thúc (hook Stop chặn nếu đỏ)
- Bằng chứng: `npm run proof -- --phase N` → `docs/proof/phase-N/` (skill `verify-phase`; thêm `--no-fps` để bỏ đo FPS)
- Headless: `node src/headless/cli.js --seed 1 --night <1|2|3> --ticks 600 --out out/run.jsonl [--scenario f] [--inputs f]`
- FPS: `npm start` rồi `node scripts/bench-fps.mjs --night 3 [--uncapped] [--software]`
- Token: `npm run tokens -- --since <ISO>` (ghi vào docs/notes/ai-log.md)
- Bench (Ticket-04): `node scripts/bench.mjs --seed 42 --duration 30 --out bench.json [--headless]` · Soak: `node --expose-gc --jitless scripts/soak.mjs --seed 7 --nights 10 --out soak.json`
- Giao diện: `node scripts/ui-smoke.mjs` (Chrome headless qua DevTools; chạy sau khi sửa web/) · Server: `node server.mjs [--no-open]`
- Bảng xếp hạng: `node server.mjs --export-leaderboard out.json` (file ~/.dao-den-long/leaderboard.json, biến DDL_LEADERBOARD để test) · Release: `npm run release`

## Bố cục
- `src/core/sim.js`: class Game. `step()` = 1 tick theo đúng 12 bước của Ticket-02 (pause → bộ đếm → di chuyển + rơi → nhặt → đèn → vùng an toàn → Tỏa Sáng → AI → chạm → sinh → thắng/thua). Hằng số chuẩn không có trong contract nằm ở `STD`.
- `src/core/maps.js`: 3 bản đồ chuẩn (`NIGHTS`), `groundAt` (null = biển mây), `inTower`. Góc: x = r·cosθ, z = r·sinθ.
- `io.js` kiểm tra scenario/inputs (sai thì ném FormatError → mã 2). `runner.js` ra JSONL. `bot.js` bot chơi thử.
- `web/main.js` chỉ VẼ trạng thái lõi + đọc bàn phím (màu lấy theo `PAL`, bảng màu chuẩn). `web/audio.js` âm thanh WebAudio.
- `game.contract.json`: nguồn tuning duy nhất, phải khớp số chuẩn Ticket-02 (test C1 kiểm tra).

## Quy tắc
- Yêu cầu: `docs/notes/phase-N.md` (trích từ lab board). Không bịa yêu cầu; chỗ mơ hồ ghi giả định (B*) vào file đó.
- Lõi: không DOM, không `Math.random`/`Date` (dùng `this.rng`), 60 tick/s, tọa độ ra làm tròn 3 số.
- Trạng thái Bóng Mực chỉ được dùng: spawning, wander, chase, recoil, stunned, drain. Gió Lạc: idle, chase, flee, removed.
- Dầu đèn là số nguyên đơn vị 1/60 (`FUEL_UNIT`); chỉ làm tròn khi xuất (`fuelOut`). Vùng an toàn = `isSafe(l)` (sáng và fuel >= 30). Thắng chỉ ở bình minh (`checkEnd`).
- Đổi luật lõi → viết ADR mới trong `docs/adr/` + mục breaking trong `CHANGELOG.md`.
- Đổi luật → viết/sửa test trước (`tests/*.test.js`, đặt tên theo mã R*/C*/F*/M*; helper ở `tests/helpers.js`). Test cũ bị luật mới thay thế: sửa và ghi nhãn `[Pn: lý do]` + bảng trong notes. Không skip âm thầm.
- Sáng tạo thêm chỉ ở `web/` hoặc thực thể tắt khi headless; đầu ra headless và cảnh bench (`benchMode`) không được đổi.
- UI: chữ >= 1rem (18 px); mọi phím đọc từ `settings.keys`; chỉ báo quan trọng phải có `sub()` (chữ + biểu tượng), không chỉ màu/âm thanh; tôn trọng `settings.reducedMotion`.
- Không ghi "đạt" nếu chưa có file bằng chứng; không sửa tay output trong docs/proof.
