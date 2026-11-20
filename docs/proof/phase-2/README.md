# Bằng chứng Phase 2: truy vết yêu cầu (Ticket-02, contract v1.1)

Chạy lại toàn bộ: `npm test` và `npm run proof -- --phase 2`. Kết quả tự động nằm ở [proof-summary.md](proof-summary.md).
Mã yêu cầu, tiêu chí nghiệm thu và giả định: [docs/notes/phase-2.md](../../notes/phase-2.md).

| ID | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| S1 | Tuning = số chuẩn | Test C1 so từng giá trị | [test-report.txt](test-report.txt) | Đạt |
| S2–S10 | Thứ tự tick, đom đóm, đèn, vùng an toàn, Tỏa Sáng, Bóng Mực, bị đánh, rơi, thắng/thua, điểm | Test R2–R8 (24 test trong `tests/sim.test.js`) | [test-report.txt](test-report.txt) | Đạt |
| M1 | Đêm 1 Đảo Bến chuẩn hóa | Test C2 (tọa độ đèn, 20 đom đóm), M1, lịch sinh R5 | [test-report.txt](test-report.txt), [img/night1.png](img/night1.png) | Đạt |
| M2 | Đêm 2 Đảo Cau: cầu, bục nhảy, 6 đèn | Test M2 × 2, lịch sinh M3 | [test-report.txt](test-report.txt), [img/night2.png](img/night2.png) | Đạt |
| M3 | Đêm 3 Đảo Chuông: tầng, vách, dốc, bục, tháp, gió | Test M3 × 3, R5 chạm cao | [test-report.txt](test-report.txt), [img/night3.png](img/night3.png) | Đạt |
| F1 | Lướt | Test F1 × 3 | [test-report.txt](test-report.txt) | Đạt |
| F2 | Rơi và hồi sinh | Test F2 × 2 | [test-report.txt](test-report.txt) | Đạt |
| F3 | Gió Lạc | Test F3 × 4 (chase/cướp/flee/removed, Tỏa Sáng, sinh) | [test-report.txt](test-report.txt) | Đạt |
| F4 | Bùa Gió | Test F4 × 2 | [test-report.txt](test-report.txt) | Đạt |
| F5 | Tạm dừng | Test F5 (headless); menu tạm dừng trên giao diện | [test-report.txt](test-report.txt) | Đạt (headless), kiểm tra tay phần menu |
| F6 | Chuỗi 3 Đêm, Bình Minh | Mã `toIntro`/`toResult` trong web/main.js; ảnh menu | [img/menu.png](img/menu.png) | Kiểm tra tay khi quay video |
| F7 | Cài đặt lưu giữa các lần mở | localStorage `dao-den-long-settings` | — | Kiểm tra tay |
| F8 | Âm thanh | web/audio.js (WebAudio) | — | Kiểm tra tay |
| F9 | HUD đầy đủ | Ảnh: lửa trên trái, đồng hồ trên giữa, đèn/điểm trên phải, 10 ô dưới giữa, hồi chiêu dưới phải, mũi tên chỉ đèn | [img/night3.png](img/night3.png), [img/night2.png](img/night2.png) | Đạt (ảnh). Đỏ/nhấp nháy ≤ 30 s: kiểm tra tay |
| F10 | Bảng màu + ambient 0.15 + 0.55 × tỉ lệ | Hằng `PAL`, `ambient.intensity` trong web/main.js | ảnh | Đạt (đọc mã + ảnh) |
| C4 | Contract v1.1 (CLI, snapshot, scenario, input, event) | Test C2, CLI (`--night 2/3`, scenario v1.1 đầy đủ, 11 kiểu sai định dạng → 2) | [test-report.txt](test-report.txt) | Đạt |
| C3 | Tất định | Proof so sha256 cả 3 Đêm | [proof-summary.md](proof-summary.md) | Đạt |
| C5 | Headless 1 Đêm đầy đủ ≤ 30 s | Test C5 + proof (cả 3 Đêm) | [proof-summary.md](proof-summary.md) | Đạt (khoảng 0.25 s) |
| P1 | ≥ 30 FPS ở 1280×720 | `scripts/bench-fps.mjs` (Chrome, GPU) | [proof-summary.md](proof-summary.md) | Đạt trên GPU; rủi ro nếu máy chấm chỉ render phần mềm (khoảng 24 FPS) |
| R | Hồi quy Phase 1 với số chuẩn | Test Phase 1 chạy lại với số chuẩn; test đổi kỳ vọng có nhãn `[P2]` (notes §4) | [test-report.txt](test-report.txt) | Đạt |
