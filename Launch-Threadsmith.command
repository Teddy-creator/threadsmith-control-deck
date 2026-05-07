#!/bin/zsh

set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PREFERRED_PORT="${THREADSMITH_PORT:-5173}"
PORT="${PREFERRED_PORT}"
APP_URL=""
APP_ORIGIN=""
APP_HOME_MODE="${THREADSMITH_APP_HOME:-0}"
DRY_RUN="${THREADSMITH_DRY_RUN:-0}"
RUNTIME_DIR="${ROOT_DIR}/.threadsmith-runtime"
LAST_PORT_FILE="${RUNTIME_DIR}/last-port"
FIRST_ARG="${1:-}"
REQUESTED_PROJECT_ROOT="${FIRST_ARG:-${THREADSMITH_PROJECT_ROOT:-}}"
TARGET_PROJECT_ROOT=""
HAS_EXPLICIT_PROJECT_ROOT="0"

mkdir -p "${RUNTIME_DIR}"

print_usage() {
  cat <<EOF
Threadsmith launcher

Usage:
  $(basename "$0") [project-root]

Examples:
  $(basename "$0")
  $(basename "$0") /path/to/MyProject

Without a project-root, Threadsmith follows the saved daily opening path.
You can also use THREADSMITH_PROJECT_ROOT=/path/to/project.
Set THREADSMITH_APP_HOME=1 to open the Threadsmith front door.
EOF
}

urlencode() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1] ?? ""))' "$1"
}

resolve_project_root() {
  local candidate="$1"

  if [[ -d "${candidate}" ]]; then
    (cd "${candidate}" && pwd)
    return 0
  fi

  if [[ -d "${ROOT_DIR}/${candidate}" ]]; then
    (cd "${ROOT_DIR}/${candidate}" && pwd)
    return 0
  fi

  printf "%s" "${candidate}"
}

refresh_app_url() {
  APP_ORIGIN="http://127.0.0.1:${PORT}"
  APP_URL="${APP_ORIGIN}"

  if [[ "${APP_HOME_MODE}" == "1" ]]; then
    APP_URL="${APP_ORIGIN}/?appHome=1"
  elif [[ -n "${TARGET_PROJECT_ROOT}" ]]; then
    APP_URL="${APP_ORIGIN}/?projectRoot=$(urlencode "${TARGET_PROJECT_ROOT}")"
  fi
}

configure_port() {
  PORT="$1"
  refresh_app_url
}

port_is_listening() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

page_looks_like_threadsmith() {
  curl -fsS --max-time 2 "http://127.0.0.1:$1/" 2>/dev/null | grep -q "<title>Threadsmith</title>"
}

open_app() {
  if [[ "${THREADSMITH_SKIP_OPEN:-0}" == "1" ]]; then
    return
  fi

  open "${APP_URL}"
}

find_existing_threadsmith_port() {
  local candidate

  if [[ -f "${LAST_PORT_FILE}" ]]; then
    candidate="$(cat "${LAST_PORT_FILE}" 2>/dev/null || true)"
    if [[ -n "${candidate}" ]] && page_looks_like_threadsmith "${candidate}"; then
      configure_port "${candidate}"
      return 0
    fi
  fi

  for candidate in $(seq "${PREFERRED_PORT}" "$((PREFERRED_PORT + 12))"); do
    if page_looks_like_threadsmith "${candidate}"; then
      configure_port "${candidate}"
      return 0
    fi
  done

  return 1
}

find_available_port() {
  local candidate="$1"

  while port_is_listening "${candidate}"; do
    candidate="$((candidate + 1))"
  done

  configure_port "${candidate}"
}

if [[ "${FIRST_ARG}" == "--help" || "${FIRST_ARG}" == "-h" ]]; then
  print_usage
  exit 0
fi

if [[ -n "${FIRST_ARG}" || -n "${THREADSMITH_PROJECT_ROOT:-}" ]]; then
  HAS_EXPLICIT_PROJECT_ROOT="1"
fi

if [[ "${APP_HOME_MODE}" != "1" && "${HAS_EXPLICIT_PROJECT_ROOT}" == "1" ]]; then
  TARGET_PROJECT_ROOT="$(resolve_project_root "${REQUESTED_PROJECT_ROOT}")"
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm was not found in PATH."
  echo "Please install Node.js and npm first, then try again."
  exit 1
fi

configure_port "${PORT}"

echo "Threadsmith launcher"
echo "Threadsmith root: ${ROOT_DIR}"
if [[ "${APP_HOME_MODE}" == "1" ]]; then
  echo "Entry: Threadsmith front door"
elif [[ "${HAS_EXPLICIT_PROJECT_ROOT}" == "1" ]]; then
  echo "Target project: ${TARGET_PROJECT_ROOT}"
else
  echo "Entry: Saved daily opening path"
fi
echo "Preferred URL: ${APP_URL}"
echo

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "Dry run: launcher configuration resolved."
  exit 0
fi

if find_existing_threadsmith_port; then
  echo "Threadsmith is already running."
  if [[ "${APP_HOME_MODE}" == "1" ]]; then
    echo "Entry: Threadsmith front door"
  elif [[ "${HAS_EXPLICIT_PROJECT_ROOT}" == "1" ]]; then
    echo "Target project: ${TARGET_PROJECT_ROOT}"
  else
    echo "Entry: Saved daily opening path"
  fi
  echo "URL: ${APP_URL}"
  echo "Threadsmith is the control deck. Keep the main coding conversation in your conductor surface."
  open_app
  exit 0
fi

find_available_port "${PREFERRED_PORT}"
printf "%s\n" "${PORT}" > "${LAST_PORT_FILE}"

if [[ "${PORT}" != "${PREFERRED_PORT}" ]]; then
  echo "Preferred port ${PREFERRED_PORT} is busy."
  echo "Falling back to ${PORT}."
  echo
fi

(
  for _ in {1..45}; do
    if curl -fsS "${APP_URL}" >/dev/null 2>&1; then
      open_app
      exit 0
    fi
    sleep 1
  done
) >/dev/null 2>&1 &

cd "${ROOT_DIR}"

echo "Starting control deck..."
if [[ "${APP_HOME_MODE}" == "1" ]]; then
  echo "Entry: Threadsmith front door"
elif [[ "${HAS_EXPLICIT_PROJECT_ROOT}" == "1" ]]; then
  echo "Target project: ${TARGET_PROJECT_ROOT}"
else
  echo "Entry: Saved daily opening path"
fi
echo "URL: ${APP_URL}"
echo "Threadsmith is the control deck. Keep the main coding conversation in your conductor surface."
echo "Keep this Terminal window open while using Threadsmith."
echo

exec npm run dev --workspace @threadsmith/control-deck -- --host 127.0.0.1 --port "${PORT}" --strictPort
