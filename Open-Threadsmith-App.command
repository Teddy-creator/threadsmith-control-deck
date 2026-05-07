#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

THREADSMITH_APP_HOME=1 exec "${ROOT_DIR}/Launch-Threadsmith.command"
