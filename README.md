# Đảo Đèn Lồng

> **Video demo:** _sẽ cập nhật ở Phase 4 (Release `v1.0.0`)._
> Bài cá nhân Day 12 AI SDLC: Nguyen Thi Hong San (2A202603513). Đề bài: [docs/lab/](docs/lab/README.md)

Game 3D góc nhìn thứ ba. Bạn vào vai **Mây**, người giữ đèn nhỏ tuổi đội nón lá treo một chiếc đèn lồng. Mây gom đom đóm và thắp lại các Đèn Lồng Lớn trên **ba hòn đảo**, đồng thời né **Bóng Mực** trong sương đen và **Gió Lạc** chuyên cướp đom đóm:

| Đêm | Đảo | Đèn | Thời gian | Điểm mới |
|---|---|---:|---:|---|
| 1 | Đảo Bến | 5 | 5:00 | Đảo tròn, không lan can (ra mép là rơi) |
| 2 | Đảo Cau | 6 | 5:30 | Hai đảo nối bằng cầu tre, bục nhảy, Gió Lạc, Bùa Gió |
| 3 | Đảo Chuông | 7 | 6:00 | Ba tầng, dốc, bục lên tháp chuông, gió mạnh mỗi 30 s |

## Cài đặt và chạy

Cần Node.js ≥ 20 và trình duyệt có WebGL (Chrome, Edge, Firefox, Safari). Chạy được trên macOS và Linux.

```bash
git clone https://github.com/nghongsan/K5-L3A-DAY12-NguyenThiHongSan-2A202603513-AI-SDLC-Dao-Den-Long.git && cd K5-L3A-DAY12-NguyenThiHongSan-2A202603513-AI-SDLC-Dao-Den-Long
npm install
npm start          # rồi mở http://localhost:5173
```

Các tham số URL tùy chọn: `?night=2&seed=7` vào thẳng Đêm 2 với seed cố định; `?bot` để bot tự chơi; `?fps` để hiện FPS (hoặc phím `F3`).

## Điều khiển

| Phím | Hành động |
|---|---|
| `W A S D` / `↑ ↓` | Di chuyển (theo hướng camera) |
| `← →` / kéo chuột | Xoay camera (độ nhạy chỉnh trong Cài đặt) |
| `Space` | Nhảy (chỉ khi chạm đất) |
| `Shift` | Lướt: 14 m/s trong 0.2 s, hồi chiêu 1.5 s |
| `E` | Nạp ánh sáng vào đèn gần nhất (trong 2 m) |
| `F` | Tỏa Sáng: tốn 3 đom đóm, choáng và đẩy lùi Bóng Mực trong 5 m, hồi chiêu 3 s |
| `Esc` / `P` | Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |
| `Enter` | Chọn mặc định ở các màn hình |
| `B` | Bật/tắt bot chơi thử |

## Luật chơi và cách tính điểm (số chuẩn Ticket-02)

- Đom đóm tự được nhặt khi Mây đến gần (1 m). Mang tối đa 10 con. Mỗi đèn cần 10 đom đóm và được nạp nhiều lần.
- Bóng Mực xuất hiện từ giây thứ 5. Chúng lang thang, phát hiện Mây ở 12 m và bỏ đuổi khi Mây ra xa quá 18 m. Tốc độ 4 m/s (Đêm 3: 4.5 m/s), Mây chạy 6 m/s.
- Bị chạm: mất 1 Ngọn Lửa (có 3), rơi một nửa số đom đóm ra quanh mình (nhặt lại được trong 8 s), bất tử 1.5 s.
- Rơi khỏi đảo: mất 1 Ngọn Lửa và toàn bộ đom đóm, sau 1 s hồi sinh ở điểm xuất phát.
- Đèn đã sáng tạo vùng an toàn 6 m: Bóng Mực không vào được.
- **Gió Lạc** (Đêm 2, 3) đuổi theo khi Mây mang từ 5 đom đóm trở lên, chạm vào thì cướp 3 con rồi bay đi. Tỏa Sáng trúng thì nó bỏ chạy, hoặc thả lại số đã cướp.
- **Bùa Gió**: trong 10 s chạy 7.2 m/s và lướt không cần hồi chiêu. Bùa xuất hiện lại sau 45 s.
- **Thắng** khi mọi đèn sáng. **Thua** khi hết Ngọn Lửa hoặc khi trời sáng. Thắng Đêm 3 thì tới màn **Bình Minh**.

| Sự kiện | Điểm |
|---|---:|
| Mỗi đom đóm nạp vào đèn | +10 |
| Thắp 1 đèn | +100 |
| Mỗi Bóng Mực trúng Tỏa Sáng | +5 |
| Khi thắng: mỗi giây còn lại | +2 |
| Khi thắng: mỗi Ngọn Lửa còn lại | +50 |

Tổng điểm = tổng điểm các Đêm đã thắng. Mọi con số nằm trong [game.contract.json](game.contract.json) và [src/core/sim.js](src/core/sim.js) (`STD`). Giả định cho chỗ đề bài chưa nói rõ: [docs/notes/phase-2.md](docs/notes/phase-2.md).

## Chế độ headless (Test Contract v1.1)

```bash
node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out out/run.jsonl \
  [--scenario scenario.json] [--inputs inputs.json] [--snapshot-every 10]
```

- `--night 1|2|3`, 60 tick/s, không cần cửa sổ hay GPU. Một Đêm đầy đủ (21.600 tick) chạy dưới 0.3 s.
- Output JSONL gồm snapshot (thêm `night`, `wind`, `player.vel/grounded/invuln/dash_cd_s/pulse_cd_s/charm_s`, `motes`, `drifters`, `charms`), event (thêm `dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `night_start`, `paused`, `resumed`) và dòng cuối `end`.
- Input có thêm `dash` và `pause`. Scenario có thêm `player.*_ticks`, `shades[].state/state_ticks_left`, `drifters`, `charms`, `random_drifters`, `wind_enabled`.
- Mã thoát: `0` khi xong; `2` khi file inputs/scenario sai định dạng; `1` khi có lỗi khác (thông báo ra stderr).

## Test và bằng chứng

```bash
npm test                     # 48 test: luật lõi, 3 bản đồ, tính năng mới, CLI end-to-end, tất định, hiệu năng
npm run proof -- --phase 2   # chạy mọi kiểm chứng + đo FPS, ghi vào docs/proof/phase-2/
```

- Bảng truy vết yêu cầu → bằng chứng: [Phase 1](docs/proof/phase-1/README.md) · [Phase 2](docs/proof/phase-2/README.md)
- Đo FPS ở 1280×720: `npm start`, rồi `node scripts/bench-fps.mjs --night 3 --uncapped`
- CI: GitHub Actions chạy `npm test` và một lần chạy headless kiểm tra tất định ở mỗi lần push ([.github/workflows/ci.yml](.github/workflows/ci.yml))

## Cấu trúc

```text
game.contract.json      Test Contract + tuning (nguồn số liệu duy nhất)
src/core/               lõi tất định: sim.js (luật), maps.js (3 bản đồ), io.js (kiểm tra file), runner.js (JSONL), bot.js
src/headless/cli.js     CLI headless
web/                    giao diện Three.js (chỉ vẽ trạng thái lõi) + audio.js (WebAudio)
server.mjs              static server cho npm start
tests/                  node:test
scenarios/              input/scenario mẫu
scripts/                proof.mjs (bằng chứng), bench-fps.mjs (đo FPS), token-usage.mjs (đếm token)
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

Mọi phần thêm chỉ nằm ở giao diện; đầu ra headless không đổi (bằng chứng: `npm test` xanh, tất định cả 3 Đêm trong [proof-summary](docs/proof/phase-2/proof-summary.md)).

- **Ông Đăng** dẫn chuyện ở màn giới thiệu từng Đêm và màn Bình Minh.
- **Bot chơi thử** (`B` hoặc `?bot`): bot chỉ dùng input như người chơi, biết qua cầu, lên dốc và dùng bục nhảy. Dùng để xem demo và cân chỉnh. Bot không có trong headless.
- **Vòng an toàn phát sáng** quanh đèn đã thắp, và **lá bay** báo trước cơn gió ở Đêm 3.
- **Âm thanh tự tổng hợp** bằng WebAudio (không dùng file ngoài): nhạc nền ngũ cung và các hiệu ứng.

## Giấy phép

MIT: [LICENSE](LICENSE). Nguồn tài nguyên và công cụ: [CREDITS.md](CREDITS.md).
