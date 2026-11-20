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

## Luật chơi và cách tính điểm (Ticket-02 + Ticket-03 "Đèn cạn dầu")

- **Mục tiêu:** giữ đảo sáng tới bình minh. Thắng khi còn sống lúc trời sáng và có ít nhất ceil(60%) số đèn đang sáng: Đêm 1 cần 3/5, Đêm 2 cần 4/6, Đêm 3 cần 5/7. Thắp đủ đèn **không** kết thúc Đêm sớm.
- Đèn chưa từng sáng cần 10 đom đóm để thắp, đèn từng sáng chỉ cần 5. Đèn đang sáng hao 1 dầu/giây (tối đa 100) và tắt khi hết dầu. Bấm `E` ở đèn đang sáng để **châm dầu**: mỗi đom đóm thêm 10 dầu.
- Đèn còn từ 30 dầu trở lên có vùng an toàn 6 m. Dưới 30 thì đèn và thanh dầu nhấp nháy, Bóng Mực vào được và **hút dầu** (5/giây).
- Sức chứa đom đóm = 10 + 2 × số lần thắp thành công trong Đêm, tối đa 20.
- Bóng Mực phát hiện Mây ở 12 m, tốc độ 4 m/s (Đêm 3: 4.5). Bị chạm: mất 1 Ngọn Lửa (có 3), rơi một nửa số đom đóm, bất tử 1.5 s. Rơi khỏi đảo: mất 1 Ngọn Lửa và toàn bộ đom đóm.
- **Gió Lạc** (Đêm 2, 3) cướp 3 đom đóm khi Mây mang từ 5 con trở lên. **Bùa Gió** cho chạy 7.2 m/s và lướt không hồi chiêu trong 10 s.

| Sự kiện | Điểm |
|---|---:|
| Mỗi đom đóm nạp hoặc châm vào đèn | +5 |
| Thắp lần đầu / thắp lại | +100 / +40 |
| Mỗi Bóng Mực trúng Tỏa Sáng (đang hút dầu) | +5 (+15) |
| Bình minh, khi thắng: mỗi đèn đang sáng | +50 + floor(dầu) |
| Bình minh, khi thắng: mỗi Ngọn Lửa còn lại | +50 |

Tổng điểm = tổng điểm các Đêm đã thắng. Quyết định thiết kế: [ADR 0001](docs/adr/0001-lantern-fuel-and-dawn-win.md) · Thay đổi phá vỡ: [CHANGELOG.md](CHANGELOG.md) · Giả định: [docs/notes/phase-3.md](docs/notes/phase-3.md).

**Cài đặt:** âm lượng, độ nhạy chuột và **Bảng màu dễ phân biệt** (viền và mắt Bóng Mực màu xanh #00B3FF, cảnh báo màu trắng kèm ⚠). Cài đặt được lưu giữa các lần mở.

## Chế độ headless (Test Contract v1.2)

```bash
node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out out/run.jsonl \
  [--scenario scenario.json] [--inputs inputs.json] [--snapshot-every 10]
```

- `--night 1|2|3`, 60 tick/s, không cần cửa sổ hay GPU. Một Đêm đầy đủ (21.600 tick) chạy dưới 0.3 s.
- Output JSONL gồm snapshot (thêm `night`, `wind`, `player.vel/grounded/invuln/dash_cd_s/pulse_cd_s/charm_s`, `motes`, `drifters`, `charms`), event (thêm `dash`, `charm_picked`, `drifter_steal`, `drifter_drop`, `night_start`, `paused`, `resumed`) và dòng cuối `end`.
- v1.2 thêm: đèn có `fuel`/`ever_lit`/`relit_count`, `player.capacity`, trạng thái bóng `drain`, event `refuel`/`lantern_out`/`fuel_drain`, `game_over.reason = dawn_survived`.
- Input có thêm `dash` và `pause`. Scenario có thêm `player.*_ticks`, `shades[].state/state_ticks_left`, `drifters`, `charms`, `random_drifters`, `wind_enabled`.
- Mã thoát: `0` khi xong; `2` khi file inputs/scenario sai định dạng; `1` khi có lỗi khác (thông báo ra stderr).

## Test và bằng chứng

```bash
npm test                     # 61 test: luật lõi, 3 bản đồ, tính năng Phase 2, luật dầu/thắng Phase 3, CLI, tất định, hiệu năng
npm run proof -- --phase 3   # chạy mọi kiểm chứng (+ đo FPS nếu có Chrome), ghi vào docs/proof/phase-3/
```

- Bảng truy vết yêu cầu → bằng chứng: [Phase 1](docs/proof/phase-1/README.md) · [Phase 2](docs/proof/phase-2/README.md) · [Phase 3](docs/proof/phase-3/README.md)
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
