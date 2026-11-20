# Kịch bản video demo (dưới 5 phút)

Quay bằng Cmd + Shift + 5 (macOS), cửa sổ 1280×720. Nén video và đưa lên Release bằng các lệnh ở cuối file.

| Thời điểm | Nội dung | Lệnh / thao tác |
|---|---|---|
| 0:00–0:20 | Giới thiệu: repo, tag phase-1…4, Release v1.0.0 | Trang GitHub của repo, mục Tags và Releases |
| 0:20–1:50 | **Chơi trực tiếp** Đêm 1: menu → lời Ông Đăng → nhặt đom đóm → thắp đèn → châm dầu khi đèn nhấp nháy → Tỏa Sáng xua Bóng Mực → lướt. Mở Cài đặt cho thấy đổi phím, Bảng màu dễ phân biệt, Chữ lớn, Giảm chuyển động | `npm start` → http://localhost:5173. Bấm `B` nếu muốn bot chơi nhanh một đoạn |
| 1:50–2:20 | Đêm 2 và 3 (`?night=2`, `?night=3`): cầu tre, bục nhảy, tầng, gió | http://localhost:5173/?night=3&seed=3 |
| 2:20–2:50 | Bảng xếp hạng: thua hoặc thắng → nhập tên → màn Bảng xếp hạng; rồi xuất ra file | `node server.mjs --export-leaderboard out.json && cat out.json` |
| 2:50–3:30 | **Bằng chứng chạy đúng:** test xanh, headless tất định | `npm test` · `node src/headless/cli.js --seed 1 --night 1 --ticks 600 --out out/a.jsonl && tail -1 out/a.jsonl` |
| 3:30–4:20 | **Bench và soak:** chạy và đọc kết quả | `node scripts/bench.mjs --seed 42 --duration 10 --out /tmp/b.json && cat /tmp/b.json` · `node --expose-gc --jitless scripts/soak.mjs --seed 7 --nights 10 --out /tmp/s.json` |
| 4:20–4:50 | Lướt qua harness AI và lịch sử git | `AGENTS.md`, `.claude/settings.json` (hook), `.claude/skills/verify-phase`, `git log --oneline \| head -20` |

```bash
ffmpeg -i input.mov -t 290 -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k demo.mp4
gh release upload v1.0.0 demo.mp4 --repo nghongsan/K5-L3A-DAY12-NguyenThiHongSan-2A202603513-AI-SDLC-Dao-Den-Long
```

Máy chưa có ffmpeg thì cài bằng `brew install ffmpeg`, hoặc dùng QuickTime: File → Export As → 720p.
