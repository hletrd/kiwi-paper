#!/bin/bash
# kiwi-paper multi-platform skill installer
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🥝 kiwi-paper installer"
echo ""

# --- Claude Code ---
if [ -d "$HOME/.claude" ]; then
  SKILL_DIR="$HOME/.claude/skills/kiwi-paper"
  mkdir -p "$SKILL_DIR"
  cp "$SCRIPT_DIR/SKILL.md" "$SKILL_DIR/SKILL.md"
  echo "✓ Claude Code: skill installed to $SKILL_DIR"
else
  echo "- Claude Code: ~/.claude not found, skipping"
fi

# --- OpenCode ---
if [ -d "$HOME/.opencode" ] || command -v opencode >/dev/null 2>&1; then
  echo "✓ OpenCode: OPENCODE.md and AGENTS.md available in repo root"
fi

# --- Codex ---
if command -v codex >/dev/null 2>&1; then
  echo "✓ Codex: CODEX.md and AGENTS.md available in repo root"
fi

# --- Gemini CLI ---
if command -v gemini >/dev/null 2>&1; then
  echo "✓ Gemini CLI: GEMINI.md available in repo root"
fi

# --- Renderer (Node.js) ---
if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -ge 20 ]; then
    echo ""
    echo "Installing renderer dependencies..."
    cd "$SCRIPT_DIR/renderer" && npm install --silent
    echo "✓ Renderer ready (node $SCRIPT_DIR/renderer/src/render.mjs)"
  else
    echo ""
    echo "⚠ Node.js >= 20 required for HTML renderer (found v$NODE_VERSION). Skipping."
  fi
else
  echo ""
  echo "⚠ Node.js not found. HTML renderer will not be available."
  echo "  Install Node.js >= 20 and re-run this script to enable HTML rendering."
fi

echo ""
echo "Usage:"
echo "  Claude Code:  /kiwi-paper <file|url>"
echo "  OpenCode:     Read OPENCODE.md → SKILL.md, then follow pipeline"
echo "  Codex:        Read CODEX.md → SKILL.md, then follow pipeline"
echo "  Gemini CLI:   Read GEMINI.md → SKILL.md, then follow pipeline"
