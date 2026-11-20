# Đảo Đèn Lồng

> **Video demo:** _sẽ cập nhật ở Phase 4 (Release `v1.0.0`)._
> Bài cá nhân Day 12 AI SDLC: Nguyen Thi Hong San (2A202603513). Đề bài: [docs/lab/](docs/lab/README.md)

Game 3D góc nhìn thứ ba. Bạn vào vai **Mây**, người giữ đèn nhỏ tuổi đội nón lá treo một chiếc đèn lồng. Mây gom đom đóm và thắp lại **5 Đèn Lồng Lớn** của Đảo Bến trước bình minh, đồng thời né **Bóng Mực** trong sương đen.

## Cài đặt và chạy

Cần Node.js ≥ 20 và trình duyệt có WebGL (Chrome, Edge, Firefox, Safari). Chạy được trên macOS và Linux.

```bash
git clone https://github.com/nghongsan/K5-L3A-DAY12-NguyenThiHongSan-2A202603513-AI-SDLC-Dao-Den-Long.git && cd K5-L3A-DAY12-NguyenThiHongSan-2A202603513-AI-SDLC-Dao-Den-Long
npm install
npm start          # rồi mở http://localhost:5173
```

Các tham số URL tùy chọn: `?seed=7` vào thẳng ván với seed cố định; `?bot` để bot tự chơi.

## Điều khiển

| Phím | Hành động |
|---|---|
| `W A S D` / `↑ ↓` | Di chuyển (theo hướng camera) |
| `← →` / kéo chuột | Xoay camera |
| `Space` | Nhảy |
| `E` | Nạp đom đóm vào đèn gần nhất |
| `F` | Tỏa sáng: choáng và đẩy lùi Bóng Mực xung quanh (tốn 1 đom đóm, hồi chiêu 1 s) |
| `Enter` / `R` | Bắt đầu / chơi lại |
| `B` | Bật/tắt bot chơi thử |

## Luật chơi và cách tính điểm

- Đom đóm tự được nhặt khi Mây đến gần (bán kính 1.5 m). Mang tối đa 5 con.
- Đứng gần đèn chưa thắp (2.5 m) và nhấn `E` để nạp. Mỗi đèn cần 5 đom đóm.
- Bóng Mực đuổi theo Mây với tốc độ 4.5 m/s, chậm hơn Mây (6 m/s). Bị chạm thì mất 1 lửa (có 3 lửa) và rơi mất một nửa số đom đóm đang mang, sau đó được bất tử 1.5 s.
- Bóng Mực không vào được vòng 6 m quanh đèn **đã thắp**. Tỏa sáng làm choáng mọi Bóng Mực trong 6 m trong 3 s và đẩy chúng ra 4 m.
- **Thắng** khi thắp đủ 5 đèn. **Thua** khi hết lửa hoặc khi trời sáng (sau 5 phút).

| Sự kiện | Điểm |
|---|---:|
| Nhặt 1 đom đóm | +10 |
| Thắp 1 đèn | +100 |
| Mỗi Bóng Mực bị choáng | +20 |
| Khi thắng: mỗi giây còn lại | +2 |
| Khi thắng: mỗi lửa còn lại | +50 |

Mọi con số nằm trong [game.contract.json](game.contract.json); game đọc trực tiếp từ file này. Các giả định cho chỗ đề bài chưa nói rõ: [docs/notes/phase-1.md](docs/notes/phase-1.md).

## Chế độ headless (Test Contract v1.0)

```bash
node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out out/run.jsonl \
  [--scenario scenario.json] [--inputs inputs.json] [--snapshot-every 10]
```

- 60 tick/s, không cần cửa sổ hay GPU. Output JSONL gồm `snapshot`, `event` và dòng cuối `end`.
- Mã thoát: `0` khi xong; `2` khi file inputs/scenario sai định dạng; `1` khi có lỗi khác (thông báo ra stderr).
- Khai báo tuning khác mặc định:
  - `fall_enabled: false`: đảo có lan can nên không rơi được, không có event `by: "fall"`.
  - `hit_drop_ratio: 0.5`: số rơi làm tròn xuống.
  - `dash`: không có, input `dash` được nhận nhưng bỏ qua.

## Test và bằng chứng

```bash
npm test                     # 26 test: luật game + CLI end-to-end + tất định
npm run proof -- --phase 1   # chạy mọi kiểm chứng, ghi vào docs/proof/phase-1/
```

- Bảng truy vết yêu cầu → bằng chứng: [docs/proof/phase-1/README.md](docs/proof/phase-1/README.md)
- CI: GitHub Actions chạy `npm test` và một lần chạy headless kiểm tra tất định ở mỗi lần push ([.github/workflows/ci.yml](.github/workflows/ci.yml))

## Cấu trúc

```text
game.contract.json      Test Contract + tuning (nguồn số liệu duy nhất)
src/core/               lõi tất định: sim.js (luật), io.js (kiểm tra file), runner.js (JSONL), bot.js
src/headless/cli.js     CLI headless
web/                    giao diện Three.js (chỉ vẽ trạng thái lõi)
server.mjs              static server cho npm start
tests/                  node:test
scenarios/              input/scenario mẫu
scripts/                proof.mjs (bằng chứng), token-usage.mjs (đếm token)
docs/notes/             giả định, đánh giá từng phase, nhật ký AI
docs/proof/phase-N/     bằng chứng từng phase
docs/lab/               đề bài gốc của lab
```

## Harness AI

- [AGENTS.md](AGENTS.md): lệnh, bố cục, quy tắc cho agent. [CLAUDE.md](CLAUDE.md) import file này.
- [.claude/settings.json](.claude/settings.json): hook `Stop` chạy `npm test`, chặn agent kết thúc khi test đỏ ([script](.claude/hooks/stop-if-tests-red.sh)).
- [.claude/skills/verify-phase](.claude/skills/verify-phase/SKILL.md): quy trình chạy kiểm chứng, lưu bằng chứng và gắn tag.
- Nhật ký dùng AI và token: [docs/notes/ai-log.md](docs/notes/ai-log.md).

## Sáng tạo của tôi

- **Bot chơi thử** (`B` hoặc `?bot`): bot chỉ dùng input như người chơi (di chuyển, nạp đèn, tỏa sáng), giúp xem nhanh một ván và cân chỉnh độ khó. Bot không có trong headless nên không làm đổi đầu ra của contract. Bằng chứng: bảng 10 seed trong [proof-summary.md](docs/proof/phase-1/proof-summary.md); `npm test` vẫn xanh.
- **Vòng an toàn phát sáng** quanh đèn đã thắp, giúp người chơi thấy rõ chỗ Bóng Mực không vào được. Chỉ ở phần hiển thị.

## Giấy phép

MIT: [LICENSE](LICENSE). Nguồn tài nguyên và công cụ: [CREDITS.md](CREDITS.md).
