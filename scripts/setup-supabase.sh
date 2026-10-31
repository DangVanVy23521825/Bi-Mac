#!/usr/bin/env bash
#
# Bí Mặc — dựng Supabase + đăng nhập Google cho môi trường local.
#
# Có một đoạn trong việc này **chỉ con người làm được** (spec §5): tạo project
# Supabase, và tạo OAuth client trên Google Cloud Console rồi dán client
# ID/secret vào Supabase. Không API nào thay thế được hai việc đó, nên thay vì
# mô tả bằng văn bản rồi để mỗi người làm sai một kiểu, script này mở đúng
# trang, nói đúng chỗ cần bấm, và nhận lại đúng giá trị cần nhận.
#
# Nguyên tắc về secret: script không bao giờ in ra, không log, không ghi vào
# đâu khác ngoài `.env.local` giá trị nào nó đọc được. `ask_secret` nhập ẩn;
# `write_env` chỉ in ra *tên* biến. Client ID/secret của Google **không** được
# nhận vào đây chút nào — nó đi trực tiếp từ Google Cloud sang dashboard
# Supabase, không đi qua máy này.
#
# Chạy: bash scripts/setup-supabase.sh
#
# Phần thư viện phía trên mốc "STAGES" là template dùng chung — không sửa tay.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────
# Wizard library: delightful, consistent UX, identical across every wizard.
# ──────────────────────────────────────────────────────────────────────────

if [[ -t 1 ]] && command -v tput >/dev/null 2>&1 && [[ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]]; then
  BOLD=$(tput bold); DIM=$(tput dim); RESET=$(tput sgr0)
  BLUE=$(tput setaf 4); GREEN=$(tput setaf 2); YELLOW=$(tput setaf 3)
else
  BOLD=""; DIM=""; RESET=""; BLUE=""; GREEN=""; YELLOW=""
fi

# Author sets this at the top of the stages section.
TOTAL_STAGES=0

_STAGE_INDEX=0
ENV_FILE="${ENV_FILE:-.env}"
WRITTEN_ENV=()    # KEYs written to ENV_FILE this run
WRITTEN_SECRET=() # secret NAMEs set this run
SKIPPED=()        # things we couldn't do (e.g. gh missing)

# _clear wipes the terminal so only the current step is on screen. No-op when
# output isn't a terminal, so piped logs stay readable.
_clear() {
  [[ -t 1 ]] || return 0
  if command -v tput >/dev/null 2>&1 && tput clear 2>/dev/null; then return 0; fi
  printf '\033[2J\033[3J\033[H'
}

# banner "Title" shows the opening frame: what this wizard does.
banner() {
  _clear
  printf '\n%s%s  %s%s\n' "$BOLD" "$BLUE" "$1" "$RESET"
  printf '%s  %s stages%s\n\n' "$DIM" "$TOTAL_STAGES" "$RESET"
  printf '%s  You drive the browser; this wizard tells you exactly what to do and\n' "$DIM"
  printf '  captures the values you copy back. Stop any time with Ctrl-C and re-run\n'
  printf '  later, since it remembers values already saved.%s\n' "$RESET"
  pause "Ready to start?"
}

# stage "Name" clears the screen, then announces a stage and shows progress.
# Clearing keeps only the current step on screen.
stage() {
  _clear
  _STAGE_INDEX=$((_STAGE_INDEX + 1))
  printf '\n%s%s▸ Stage %s/%s · %s%s\n' \
    "$BOLD" "$BLUE" "$_STAGE_INDEX" "$TOTAL_STAGES" "$1" "$RESET"
}

# say "..." prints a plain instruction line.
say()  { printf '  %s\n' "$1"; }
# step "..." is a numbered-feeling action the human takes in the browser.
step() { printf '  %s•%s %s\n' "$BLUE" "$RESET" "$1"; }
note() { printf '  %s%s%s\n' "$DIM" "$1" "$RESET"; }
warn() { printf '  %s⚠ %s%s\n' "$YELLOW" "$1" "$RESET"; }

# open_url URL opens it in the human's browser, cross-platform incl. WSL.
open_url() {
  local url="$1"
  printf '  %s↗ opening%s %s\n' "$GREEN" "$RESET" "$url"
  { if   command -v wslview     >/dev/null 2>&1; then wslview "$url"
    elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$url"
    elif command -v xdg-open    >/dev/null 2>&1; then xdg-open "$url"
    elif command -v open        >/dev/null 2>&1; then open "$url"
    else false; fi
  } >/dev/null 2>&1 || warn "couldn't open a browser, so visit it manually: $url"
}

# pause "msg" waits for the human to confirm they've done the manual part.
pause() {
  printf '  %s%s%s ' "$DIM" "${1:-Press Enter to continue}" "$RESET"
  read -r _ || true
}

# confirm "question" is a y/N gate; returns success on yes.
confirm() {
  local reply=""
  printf '  %s? %s [y/N] ' "$YELLOW" "$1"
  read -r reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# _existing KEY: current value of KEY in ENV_FILE, if any, with write_env's single
# quotes or a plain dotenv double-quoted value undone.
_existing() {
  [[ -f "$ENV_FILE" ]] || return 1
  local line value sq="'\\''"; line=$(grep -E "^${1}=" "$ENV_FILE" | tail -n1) || return 1
  value="${line#*=}"
  if [[ "$value" == \'*\' ]]; then value="${value:1:${#value}-2}"; value="${value//"$sq"/\'}"
  elif [[ "$value" == \"*\" ]]; then
    value="${value:1:${#value}-2}"
    [[ "$value" == *[\\\$\"]* ]] && return 1   # escapes, $ or ": can't decode safely; ask again
  fi
  printf '%s' "$value"
}

# ask KEY "Prompt" reads a value into $KEY. Offers the existing .env value as
# a default on re-runs (Enter keeps it). Visible input (non-secret), edited
# with Readline. Fails at EOF with no input.
ask() {
  local key="$1" prompt="$2" current input s=$'\001' e=$'\002' p rc=0
  current=$(_existing "$key" || true)
  # Readline needs the colour codes wrapped in \001..\002 to place the cursor.
  p="  $s$BOLD$e$prompt$s$RESET$e "
  [[ -n "$current" ]] && p+="$s$DIM$e[Enter keeps current]$s$RESET$e "
  read -e -r -p "$p" input || rc=1
  if (( rc )) && [[ -z "$input" ]]; then return 1; fi
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# ask_secret KEY "Prompt" is like ask, but input is hidden.
ask_secret() {
  local key="$1" prompt="$2" current input rc=0
  current=$(_existing "$key" || true)
  if [[ -n "$current" ]]; then
    printf '  %s%s%s %s[Enter keeps current]%s ' "$BOLD" "$prompt" "$RESET" "$DIM" "$RESET"
  else
    printf '  %s%s%s ' "$BOLD" "$prompt" "$RESET"
  fi
  read -rs input || rc=1
  printf '\n'
  if (( rc )) && [[ -z "$input" ]]; then return 1; fi
  [[ -z "$input" && -n "$current" ]] && input="$current"
  printf -v "$key" '%s' "$input"
}

# write_env KEY VALUE upserts KEY='VALUE' into ENV_FILE (replaces any existing
# line) and sets $KEY. Idempotent. Creates ENV_FILE at mode 0600; writes through
# a symlink and keeps an existing file's mode.
write_env() {
  local key="$1" value="$2" tmp sq="'\\''"
  [[ -e "$ENV_FILE" ]] || (umask 077 && : > "$ENV_FILE")
  tmp=$(mktemp)
  grep -vE "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf "%s='%s'\n" "$key" "${value//\'/$sq}" >> "$tmp"
  cat "$tmp" > "$ENV_FILE"
  rm -f "$tmp"
  printf -v "$key" '%s' "$value"
  WRITTEN_ENV+=("$key")
  printf '  %s✓ wrote%s %s → %s\n' "$GREEN" "$RESET" "$key" "$ENV_FILE"
}

# set_secret NAME VALUE sets a GitHub Actions repo secret via gh. Falls back
# to a warning (and records it) if gh is unavailable or unauthenticated.
set_secret() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if printf '%s' "$value" | gh secret set "$name" >/dev/null 2>&1; then
      WRITTEN_SECRET+=("$name")
      printf '  %s✓ set%s GitHub secret %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub secret $name (set it manually: gh secret set $name)")
  warn "skipped GitHub secret $name: gh not ready; set it later"
}

# set_var NAME VALUE sets a GitHub Actions repo variable (non-secret).
set_var() {
  local name="$1" value="$2"
  if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
    if gh variable set "$name" --body "$value" >/dev/null 2>&1; then
      printf '  %s✓ set%s GitHub variable %s\n' "$GREEN" "$RESET" "$name"
      return
    fi
  fi
  SKIPPED+=("GitHub variable $name")
  warn "skipped GitHub variable $name, gh not ready; set it later"
}

# finish clears, then shows a closing summary of everything configured.
finish() {
  _clear
  printf '\n%s%s  ✓ Setup complete%s\n' "$BOLD" "$GREEN" "$RESET"
  (( ${#WRITTEN_ENV[@]} ))    && note "wrote ${#WRITTEN_ENV[@]} value(s) to $ENV_FILE: ${WRITTEN_ENV[*]}"
  (( ${#WRITTEN_SECRET[@]} )) && note "set ${#WRITTEN_SECRET[@]} GitHub secret(s): ${WRITTEN_SECRET[*]}"
  if (( ${#SKIPPED[@]} )); then
    printf '\n'; warn "still to do by hand:"
    for s in "${SKIPPED[@]}"; do note "  - $s"; done
  fi
  printf '\n'
}

# ──────────────────────────────────────────────────────────────────────────
# STAGES: author this section. One stage() per step the human takes.
# Replace the example below. Set TOTAL_STAGES to match the stages you write.
# Keep every stage inside run_wizard and the last line as is: bash then parses
# the whole file before the first prompt, so an edit mid-run can't break it.
# ──────────────────────────────────────────────────────────────────────────

run_wizard() {

TOTAL_STAGES=6

# Biến đi vào `.env.local`, không phải `.env`: `.gitignore` đã bỏ qua
# `.env*.local`, và `.env.local` là file Next.js đọc ở local mà không bao giờ
# bị dùng cho build production.
ENV_FILE=".env.local"

MIGRATION="supabase/migrations/0001_account_and_closet.sql"

banner "Bí Mặc — Supabase + đăng nhập Google"

# ── Stage 1 ───────────────────────────────────────────────────────────────
stage "Tạo project Supabase"
say "App chạy được khi KHÔNG có Supabase (tủ đồ hiện trạng thái chưa cấu hình)."
say "Làm tiếp các bước dưới đây nếu bạn muốn bật tài khoản + tủ đồ cá nhân."
open_url "https://supabase.com/dashboard/projects"
step "Bấm 'New project', chọn organization của bạn."
step "Đặt tên gì cũng được — gợi ý: bi-mac."
step "Region: chọn gần người dùng nhất (Singapore nếu người dùng ở Việt Nam)."
step "Database password: sinh một mật khẩu mạnh và lưu vào password manager."
note "Project mất khoảng một, hai phút để sẵn sàng."
pause "Project đã ở trạng thái Active chưa?"

# ── Stage 2 ───────────────────────────────────────────────────────────────
stage "Lấy Project URL và anon key"
open_url "https://supabase.com/dashboard/project/_/settings/api"
step "Copy 'Project URL' (dạng https://<ref>.supabase.co)."
ask NEXT_PUBLIC_SUPABASE_URL "Dán Project URL:"
step "Copy khoá 'anon' / 'public'."
note "anon key cố ý là public — nó nằm trong bundle trình duyệt, nên nhập hiện"
note "là đúng. RLS trong migration mới là thứ chặn người này đọc dữ liệu người"
note "kia, không phải việc giữ bí mật khoá này."
ask NEXT_PUBLIC_SUPABASE_ANON_KEY "Dán anon key:"
write_env NEXT_PUBLIC_SUPABASE_URL "$NEXT_PUBLIC_SUPABASE_URL"
write_env NEXT_PUBLIC_SUPABASE_ANON_KEY "$NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Mọi URL dashboard và redirect URI phía sau suy ra từ đây, để người dùng
# không phải tự ghép chuỗi (ghép sai redirect URI là lỗi hay gặp nhất khi
# dựng Google OAuth).
SUPABASE_HOST="${NEXT_PUBLIC_SUPABASE_URL#https://}"
SUPABASE_HOST="${SUPABASE_HOST#http://}"
SUPABASE_HOST="${SUPABASE_HOST%%/*}"
PROJECT_REF="${SUPABASE_HOST%%.*}"
REDIRECT_URI="https://${SUPABASE_HOST}/auth/v1/callback"
PROJECT_DASHBOARD="https://supabase.com/dashboard/project/${PROJECT_REF}"
if [[ "$SUPABASE_HOST" != *.supabase.co ]]; then
  warn "URL không có dạng https://<ref>.supabase.co — kiểm lại nếu các bước sau mở sai trang."
fi

# ── Stage 3 ───────────────────────────────────────────────────────────────
stage "Lấy service_role key"
say "Khoá này chỉ dùng cho một việc: xoá tài khoản ở phía server."
open_url "https://supabase.com/dashboard/project/_/settings/api"
step "Vẫn trang API: tìm khoá 'service_role', bấm Reveal rồi copy."
warn "service_role BỎ QUA toàn bộ RLS."
note "Nó chỉ được đọc ở server. Không bao giờ đặt tên có tiền tố NEXT_PUBLIC_,"
note "và không bao giờ khai vào Vercel ở scope cho phép client đọc."
ask_secret SUPABASE_SERVICE_ROLE_KEY "Dán service_role key (nhập ẩn):"
write_env SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY"

# ── Stage 4 ───────────────────────────────────────────────────────────────
stage "Tạo OAuth client trên Google Cloud"
say "Đây là phần không tự động hoá được — Google bắt làm bằng tay trên console."
open_url "https://console.cloud.google.com/apis/credentials"
step "Chọn (hoặc tạo) một project Google Cloud ở thanh trên."
step "Nếu bị hỏi: cấu hình OAuth consent screen — User type 'External', điền"
step "  App name + email hỗ trợ, rồi thêm chính email của bạn vào 'Test users'."
step "Create credentials → OAuth client ID → Application type 'Web application'."
step "Authorized JavaScript origins: thêm   http://localhost:3000"
step "Authorized redirect URIs: thêm ĐÚNG chuỗi dưới đây —"
say  ""
say  "    ${REDIRECT_URI}"
say  ""
note "Redirect URI trỏ về Supabase, KHÔNG trỏ về localhost: Google trả code cho"
note "Supabase, rồi Supabase mới chuyển tiếp về app. Sai chỗ này là lỗi"
note "redirect_uri_mismatch lúc bấm đăng nhập."
step "Bấm Create. Giữ cửa sổ hiện Client ID + Client secret lại."
warn "Đừng dán client ID/secret vào script này — stage sau dán thẳng vào Supabase."
pause "Đã có Client ID và Client secret trên màn hình?"

# ── Stage 5 ───────────────────────────────────────────────────────────────
stage "Bật provider Google trong Supabase"
say "Client ID/secret đi trực tiếp từ Google sang Supabase, không qua máy này."
open_url "${PROJECT_DASHBOARD}/auth/providers"
step "Tìm 'Google', bật Enable."
step "Dán Client ID và Client Secret vừa tạo, rồi Save."
pause "Đã lưu provider Google?"
open_url "${PROJECT_DASHBOARD}/auth/url-configuration"
step "Site URL:   http://localhost:3000"
step "Redirect URLs: thêm   http://localhost:3000/auth/callback"
note "Khi deploy, thêm cả URL production vào Redirect URLs (ví dụ"
note "https://bi-mac.vercel.app/auth/callback) — thiếu nó thì đăng nhập trên"
note "production quay về trang trắng."
pause "Đã lưu URL configuration?"

# ── Stage 6 ───────────────────────────────────────────────────────────────
stage "Áp migration: bảng, RLS và bucket private"
say "Migration tạo năm bảng, bật RLS, và tạo bucket private 'closet'."
if command -v supabase >/dev/null 2>&1; then
  note "Có Supabase CLI. Repo không commit supabase/config.toml, nên cần init"
  note "trước, không thì 'link' dừng ngay:"
  note "  supabase init     # chỉ lần đầu, không ghi đè migrations/"
  note "  supabase link --project-ref ${PROJECT_REF}"
  note "  supabase db push"
  note "Hoặc bỏ qua CLI và dán tay theo hai bước dưới đây — cách nào cũng được."
else
  note "Chưa có Supabase CLI — dùng SQL editor trên dashboard là đủ."
fi
open_url "${PROJECT_DASHBOARD}/sql/new"
step "Mở file ${MIGRATION} trong repo, copy toàn bộ nội dung."
step "Dán vào SQL editor và bấm Run."
note "Migration chạy một lần. Chạy lần hai sẽ báo 'already exists' — đó là"
note "bình thường, không phải lỗi cần sửa."
pause "Migration đã chạy xong mà không có lỗi?"
open_url "${PROJECT_DASHBOARD}/storage/buckets"
step "Xác nhận bucket 'closet' có mặt và được đánh dấu Private."
warn "Nếu nó hiện Public thì dừng lại: ảnh quần áo của người dùng đang công khai."
pause "Bucket 'closet' là Private?"

finish

note "Bước tiếp theo — kiểm RLS bằng hai người dùng thật:"
note "  pnpm vitest run src/lib/supabase/rls.integration.test.ts"
note "Test đó tự bỏ qua khi thiếu env, nên nếu nó báo 'skipped' thì shell của"
note "bạn chưa đọc ${ENV_FILE} — nạp biến vào shell rồi chạy lại."
printf '\n'
note "Rồi:  pnpm dev   và mở http://localhost:3000"
printf '\n'
}

run_wizard "$@"; exit
