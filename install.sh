#!/bin/bash
# kiwi-paper multi-platform skill installer
# Installs to the correct skill directory for each AI coding tool
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"

echo "🥝 kiwi-paper installer"
echo ""

# --- Prepare skill payload (reused across platforms) ---
# SKILL.md and the references/ it points to
copy_skill_doc() {
  local dest="$1"
  mkdir -p "$dest"
  cp "$SCRIPT_DIR/SKILL.md" "$dest/SKILL.md"
  rm -rf "$dest/references"
  cp -r "$SCRIPT_DIR/references" "$dest/references"
}

copy_skill_files() {
  local dest="$1"
  copy_skill_doc "$dest"
  [ -f "$SCRIPT_DIR/AGENTS.md" ] && cp "$SCRIPT_DIR/AGENTS.md" "$dest/AGENTS.md"
  # Copy renderer
  if [ -d "$SCRIPT_DIR/renderer" ]; then
    rm -rf "$dest/renderer"
    mkdir -p "$dest/renderer/src"
    cp "$SCRIPT_DIR/renderer/package.json" "$dest/renderer/package.json"
    if [ -f "$SCRIPT_DIR/renderer/package-lock.json" ]; then
      cp "$SCRIPT_DIR/renderer/package-lock.json" "$dest/renderer/package-lock.json"
    else
      echo "  ⚠ Warning: renderer/package-lock.json not found, skipping"
    fi
    cp "$SCRIPT_DIR"/renderer/src/*.mjs "$dest/renderer/src/"
  fi
  # Copy examples
  if [ -d "$SCRIPT_DIR/examples" ]; then
    rm -rf "$dest/examples"
    cp -r "$SCRIPT_DIR/examples" "$dest/examples"
  fi
}

# --- 1. Claude Code: ~/.claude/skills/kiwi-paper/ ---
CLAUDE_DIR="$HOME/.claude/skills/kiwi-paper"
copy_skill_files "$CLAUDE_DIR"
echo "✓ Claude Code: $CLAUDE_DIR"

# --- 2. OpenCode: ~/.config/opencode/skills/kiwi-paper/ ---
# OpenCode also reads ~/.claude/skills/ and ~/.agents/skills/, but install to native path too
OPENCODE_DIR="$HOME/.config/opencode/skills/kiwi-paper"
copy_skill_doc "$OPENCODE_DIR"
echo "✓ OpenCode: $OPENCODE_DIR"

# --- 3. Codex CLI, Cursor: ~/.agents/skills/kiwi-paper/ ---
CODEX_DIR="$HOME/.agents/skills/kiwi-paper"
copy_skill_doc "$CODEX_DIR"
echo "✓ Codex CLI, Cursor: $CODEX_DIR"

# --- 4. Antigravity app and CLI (agy): ~/.gemini/config/skills/kiwi-paper/ ---
# agy turns each skill into a slash command. Gemini CLI stopped serving
# individual accounts on 2026-06-18, so it gets no command of its own.
ANTIGRAVITY_DIR="$HOME/.gemini/config/skills/kiwi-paper"
copy_skill_doc "$ANTIGRAVITY_DIR"
echo "✓ Antigravity (app, agy CLI): $ANTIGRAVITY_DIR"

# --- 5. Install renderer dependencies ---
if command -v node >/dev/null 2>&1; then
  # commander 15 requires Node.js >= 22.12
  if node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 22 || (a === 22 && b >= 12) ? 0 : 1)'; then
    echo ""
    echo "Installing renderer dependencies..."
    if [ -f "$CLAUDE_DIR/renderer/package-lock.json" ]; then
      (cd "$CLAUDE_DIR/renderer" && npm ci --silent)
    else
      (cd "$CLAUDE_DIR/renderer" && npm install --silent)
    fi
    echo "✓ Renderer ready"
  else
    echo ""
    echo "⚠ Node.js >= 22.12 required for HTML renderer (found $(node -v)). Skipping."
  fi
else
  echo ""
  echo "⚠ Node.js not found. HTML renderer will not be available."
fi

# --- 6. Clean up cloned repo (only with --cleanup flag) ---
if [ "${1:-}" = "--cleanup" ] && [ -d "$SCRIPT_DIR/.git" ] && [ "$SCRIPT_DIR" != "$CLAUDE_DIR" ]; then
  REAL_SCRIPT=$(cd "$SCRIPT_DIR" && pwd -P)
  REAL_INSTALL=$(cd "$CLAUDE_DIR" && pwd -P)
  if [ "$REAL_SCRIPT" != "$REAL_INSTALL" ]; then
    echo ""
    echo "Cleaning up cloned repository..."
    if [ -f "$SCRIPT_DIR/SKILL.md" ] && [ -f "$SCRIPT_DIR/install.sh" ]; then
      rm -rf "$SCRIPT_DIR"
      echo "✓ Cloned repo removed"
    else
      echo "  ⚠ Warning: expected files not found in $SCRIPT_DIR, skipping cleanup"
    fi
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Usage:"
echo "  Claude Code:  /kiwi-paper <file|url>"
echo "  OpenCode:     \"kiwi-paper로 변환해줘\" (skill 도구로 자동 로드)"
echo "  Codex CLI:    \$kiwi-paper <file|url>"
echo "  Cursor:       Agent 채팅에서 /kiwi-paper"
echo "  Antigravity:  /kiwi-paper <file|url> (앱, agy CLI)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
