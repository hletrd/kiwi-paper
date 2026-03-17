#!/bin/bash
# kiwi-paper skill installer
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Install skill definition
SKILL_DIR="$HOME/.claude/skills/kiwi-paper"
mkdir -p "$SKILL_DIR"
cp "$SCRIPT_DIR/SKILL.md" "$SKILL_DIR/SKILL.md"
echo "✓ kiwi-paper skill installed to $SKILL_DIR"

# Install renderer dependencies (optional, requires Node.js >= 20)
if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -ge 20 ]; then
    echo "Installing renderer dependencies..."
    cd "$SCRIPT_DIR/renderer" && npm install --silent
    echo "✓ Renderer ready (node $SCRIPT_DIR/renderer/src/render.mjs)"
  else
    echo "⚠ Node.js >= 20 required for HTML renderer (found v$NODE_VERSION). Skipping."
  fi
else
  echo "⚠ Node.js not found. HTML renderer will not be available."
  echo "  Install Node.js >= 20 and re-run this script to enable HTML rendering."
fi

echo ""
echo "Usage: /kiwi-paper path/to/paper.pdf"
echo "       /kiwi-paper https://arxiv.org/abs/..."
