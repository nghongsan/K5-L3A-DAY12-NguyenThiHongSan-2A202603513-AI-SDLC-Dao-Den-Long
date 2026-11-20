# Phase 4: Ticket-04 "Bình minh: phát hành v1.0.0" (contract v1.3)

## 1. Tiêu chí nghiệm thu

| ID | Yêu cầu | Tiêu chí kiểm chứng | Bằng chứng |
|---|---|---|---|
| B1 | Cảnh benchmark chuẩn | Cửa sổ 1280×720; Đêm 1 đủ hiệu ứng; 200 Bóng Mực wander rải đều (seed 42); 100 đom đóm; L1–L3 sáng, fuel 100; tắt sinh thêm, sát thương, nhặt, hao dầu và kết thúc; Mây đứng ở (0,0,0); camera bay vòng R = 30, Y = 15, bắt đầu ở 0°, ngược chiều kim đồng hồ, 15 s/vòng; khởi động 3 s rồi đo `--duration` giây; thoát với mã 0 | `bench.json` (`scene`: 200/100/3), test B1 (chế độ bench của lõi), ảnh `img/bench.png` |
| B2 | Định nghĩa chỉ số | avg = 1000N/Σdt; p1_low = 1000/mean(k dt lớn nhất), k = max(1, ceil(0.01N)); p95 theo phân vị nearest-rank; load_ms từ lúc tiến trình bắt đầu tới khung hình bench đầu tiên | `scripts/bench.mjs` |
| B3 | Ngưỡng | avg ≥ 60, p1_low ≥ 30, load ≤ 10 s (trên máy tôi; máy chấm đo lại) | `bench.json`: 294.8 / 93.5 / 3251 ms |
| S1 | Soak test | 10 Đêm, một tiến trình, xoay vòng 1→2→3, seed 7 + i, input ngẫu nhiên theo seed với tỉ lệ đúng đề; crashes = 0; mem_end ≤ 1.2 × mem_start | `soak.json`, test S1 |
| L1 | Bảng xếp hạng | Nhập tên sau màn Bình Minh hoặc sau khi thua; tên 3–12 ký tự `[A-Za-z0-9_]` (+ tiếng Việt có dấu); mỗi mục có name, score, nights_won, achieved_at (ISO có múi giờ), seed; top 10; điểm giảm dần, bằng điểm thì ai đạt trước đứng trên; lưu trên đĩa; có màn hình từ menu; `--export-leaderboard` | Test L1–L3, `img/board.png`, curl API |
| A1 | Đổi phím | Đổi được mọi hành động; báo phím trùng; có Khôi phục mặc định; được lưu | `img/settings.png`, `bindKey()` |
| A2 | Phụ đề và chỉ báo | Bóng Mực xuất hiện (+ mũi tên ở mép màn hình), gió sắp thổi, 10 s cuối, đèn có fuel < 30 | `sub()`, `edgeArrow()` trong web/main.js; kiểm tra tay |
| A3 | Giảm chuyển động | Tắt rung camera (khi bị đánh) và chớp màn hình | `flash()`, `shake`; kiểm tra tay |
| A4 | Cỡ chữ | ≥ 18 px ở 1280×720 (`html { font-size: 18px }`, mọi chữ UI ≥ 1rem); tùy chọn ×1.25 | web/index.html, `img/settings.png` |
| P1 | Đóng gói | Clone sạch, 3 lệnh, chơi được; README đủ mục; CHANGELOG 4 phase; CREDITS; LICENSE; Release v1.0.0 có zip chạy được | §3 bên dưới |
| C7 | Contract v1.3 | `contract_version` 1.3, có `bench_cmd`, `soak_cmd`; yêu cầu v1.0–v1.2 giữ nguyên | Test C1 + toàn bộ test cũ |

## 2. Giả định và quyết định

| # | Quyết định | Lý do |
|---|---|---|
| G1 | `run_cmd` đổi từ `npm start` thành `node server.mjs` (`npm start` vẫn chạy như cũ) | `<run_cmd> --export-leaderboard out.json` phải truyền được tham số; npm sẽ nuốt mất cờ nếu không có `--` |
| G2 | Bảng xếp hạng lưu ở `~/.dao-den-long/leaderboard.json` (đổi bằng biến `DDL_LEADERBOARD`). Server ghi qua `/api/leaderboard`. Nếu chạy không có server thì dùng localStorage | "Lưu trên đĩa cục bộ, còn sau khi tắt mở lại" |
| G3 | Seed lưu cho mỗi mục là seed của lượt chơi (Đêm n dùng seed + n − 1) | Lượt chơi có 3 Đêm |
| G4 | Soak: "Đêm thứ i" đếm từ 0, nên Đêm đầu dùng seed 7 | Để chính seed 7 được dùng |
| G5 | Soak chạy với `--jitless` | Xem §4 |
| G6 | Bench mở Chrome dạng cửa sổ `--app`, ép khung nhìn 1280×720 qua DevTools, tắt vsync bằng `--disable-gpu-vsync --disable-frame-rate-limit`. `peak_mem_mb` là tổng RSS của cả cây tiến trình Chrome (trình duyệt, renderer, GPU), lấy mẫu mỗi 250 ms | Bản web chạy trong nhiều tiến trình |
| G7 | Trong bench, Bóng Mực theo đúng luật wander của Ticket-03 (đi về đèn tắt gần nhất là L4, L5; vào trong 12 m của Mây thì chase) nhưng không gây sát thương. HUD vẫn hiện như lúc chơi | "Bóng Mực vẫn di chuyển theo luật wander bình thường"; "đầy đủ hiệu ứng như lúc chơi" |
| G8 | Có thêm rung camera khi bị đánh để tùy chọn Giảm chuyển động có tác dụng; Giảm chuyển động cũng tắt việc camera tự xoay ở menu | |

## 3. Đóng gói: clone sạch

Clone sạch, chạy `npm install`, `npm test`, rồi `node server.mjs` và curl. Bản zip Release đã được thử: giải nén, `node server.mjs`, các file `/`, `three.module.js`, `main.js` đều trả 200 mà không cần `npm install`. Kết quả ghi ở [docs/proof/phase-4/README.md](../proof/phase-4/README.md).

## 4. Soak và bộ nhớ: vì sao dùng `--jitless`

- **Khi bật JIT:** RSS sau Đêm cuối khoảng 65 MB so với 39 MB lúc đầu (khoảng 1.67 lần, không đạt). Tôi chạy thêm 150 Đêm dài liên tiếp: `heapUsed` sau khi dọn rác ổn định ở 4.35–4.38 MB, còn RSS tăng một lần rồi đi ngang ở 52–68 MB. Như vậy dữ liệu game không rò rỉ; phần tăng là bộ nhớ mã máy mà V8 biên dịch ra (code space) cùng các trang heap được cấp một lần.
- **Khi chạy `--jitless`:** RSS 39.3 → 40.3 MB (1.03 lần). Tốc độ vẫn thừa: 10 Đêm chạy khoảng 1 s.
- `soak.json` ghi thêm `heap_start_mb`, `heap_end_mb` và `flags` để người chấm kiểm tra lại.

## 5. Đánh giá Phase 4

- **Đạt, có số đo:**
  - Bench: 294.8 / 93.5 FPS, tải 3.25 s, peak 784 MB, Apple M1.
  - Soak: 0 crash, tỉ lệ bộ nhớ 1.03.
  - 66 test xanh, Release có zip.
- **Kiểm tra tay:** phụ đề, Giảm chuyển động, Chữ lớn, đổi phím trên giao diện, lưu điểm từ màn hình kết quả. Phần lưu điểm đã thử qua API bằng curl.
- **Video:** người dùng tự quay theo [docs/demo/kich-ban-video.md](../demo/kich-ban-video.md) rồi tải lên Release.
- **Rủi ro:**
  - Máy chấm cần có Chrome, Chromium hoặc Edge để chạy bench.
  - Nếu máy chấm không có GPU (render phần mềm), FPS có thể thấp; xem số SwiftShader ở Phase 2.
- **AI sai và cách phát hiện:**
  - Soak đỏ ở lần chạy đầu. Phân tích heap cho thấy không rò rỉ (nguyên nhân là JIT), nên đổi sang `--jitless` và ghi lại lý do, thay vì nới công thức đo.
  - Ảnh bench không thấy Bóng Mực. Kiểm tra lõi thấy đủ 200 con, chụp cận thấy vẫn vẽ đúng; con số đúng, chỉ là bóng ở xa và bị sương che.
