# Bằng chứng Phase 3: truy vết yêu cầu (Ticket-03 "Đèn cạn dầu", contract v1.2)

Chạy lại toàn bộ: `npm test` và `npm run proof -- --phase 3 --no-fps`. Kết quả tự động nằm ở [proof-summary.md](proof-summary.md).
Tiêu chí và giả định: [docs/notes/phase-3.md](../../notes/phase-3.md). ADR: [0001](../../adr/0001-lantern-fuel-and-dawn-win.md). Breaking changes: [CHANGELOG.md](../../../CHANGELOG.md).

| ID | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| U1–U5 | Dầu: hao, tắt, châm, chọn đèn, thắp lại | Test U1–U5 (`tests/phase3.test.js`) | [test-report.txt](test-report.txt) | Đạt |
| K1 | Sức chứa tăng dần (tối đa 20) | Test K1; HUD "7/16" | [test-report.txt](test-report.txt), [img/fuel.png](img/fuel.png) | Đạt |
| D1–D4 | Bóng hút dầu, ngưỡng 30, thoát drain, châm lên ≥ 30 thì đẩy bóng ra | Test D1–D4 (tính tay từng tick theo đơn vị 1/60) | [test-report.txt](test-report.txt) | Đạt |
| W1–W4 | Luật thắng ở bình minh, ngưỡng 60%, không thắng sớm, no_flames xét trước | Test W1–W4; bot Đêm 1 thắng 9/10 bằng `dawn_survived`; phát lại qua CLI | [test-report.txt](test-report.txt), [proof-summary.md](proof-summary.md) | Đạt |
| Điểm | Công thức điểm mới | Test R4, U3, U5, D3, W1 | [test-report.txt](test-report.txt) | Đạt |
| C1, C6 | Contract v1.2: tuning, scenario, snapshot, event | Test C1, C2, C6, CLI | [test-report.txt](test-report.txt) | Đạt |
| R | Hồi quy Phase 1–2 (luật không bị thay) | Toàn bộ test cũ vẫn chạy; test bị thay được sửa hoặc xóa có lý do (notes §3) | [test-report.txt](test-report.txt) | Đạt (61/61) |
| C3, C5 | Tất định; 1 Đêm ≤ 30 s | Proof (sha256 ×3 Đêm; ≤ 0.3 s mỗi Đêm) | [proof-summary.md](proof-summary.md) | Đạt |
| G1 | Thanh dầu, nhấp nháy 1 Hz khi dầu dưới 30 | Ảnh: L1 dầu 25 có thanh ngắn đỏ | [img/fuel.png](img/fuel.png) | Đạt (ảnh); nhấp nháy: kiểm tra tay |
| G2 | Chế độ mù màu (lưu) | Ảnh `?cb`; mã `applyPalette` + localStorage | [img/fuel-cb.png](img/fuel-cb.png) | Đạt (ảnh + mã); lưu cài đặt: kiểm tra tay |
| DoD | ADR + changelog breaking changes | Có file | [ADR 0001](../../adr/0001-lantern-fuel-and-dawn-win.md), [CHANGELOG.md](../../../CHANGELOG.md) | Đạt |
