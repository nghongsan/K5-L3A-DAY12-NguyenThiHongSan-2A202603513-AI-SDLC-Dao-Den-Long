#!/bin/sh
# Hook Stop của Claude Code: không cho agent kết thúc lượt khi `npm test` đang đỏ.
# Exit 2 + stderr => Claude Code chặn việc dừng và đưa lỗi test cho agent sửa tiếp.
input=$(cat)
# Đã bị chặn một lần trong lượt này thì cho dừng, tránh vòng lặp vô hạn.
if printf '%s' "$input" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if out=$(npm test --silent 2>&1); then
  exit 0
fi
echo "npm test đang ĐỎ — sửa cho xanh rồi mới kết thúc (không được skip/xóa test để qua):" >&2
printf '%s\n' "$out" | grep -E "^not ok|AssertionError|error:|expected|actual|# (pass|fail)" | head -40 >&2
exit 2
