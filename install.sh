#!/bin/bash
# kiwi-paper multi-platform skill installer
# Installs to the correct skill directory for each AI coding tool
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🥝 kiwi-paper installer"
echo ""

# --- Prepare skill payload (reused across platforms) ---
copy_skill_files() {
  local dest="$1"
  mkdir -p "$dest"
  cp "$SCRIPT_DIR/SKILL.md" "$dest/SKILL.md"
  [ -f "$SCRIPT_DIR/AGENTS.md" ] && cp "$SCRIPT_DIR/AGENTS.md" "$dest/AGENTS.md"
  # Copy renderer
  if [ -d "$SCRIPT_DIR/renderer" ]; then
    rm -rf "$dest/renderer"
    mkdir -p "$dest/renderer/src"
    cp "$SCRIPT_DIR/renderer/package.json" "$dest/renderer/package.json"
    cp "$SCRIPT_DIR/renderer/package-lock.json" "$dest/renderer/package-lock.json" 2>/dev/null || true
    cp "$SCRIPT_DIR/renderer/src/render.mjs" "$dest/renderer/src/render.mjs"
    cp "$SCRIPT_DIR/renderer/src/template.mjs" "$dest/renderer/src/template.mjs"
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
# OpenCode also reads ~/.claude/skills/ as fallback, but install to native path too
OPENCODE_DIR="$HOME/.config/opencode/skills/kiwi-paper"
mkdir -p "$OPENCODE_DIR"
cp "$SCRIPT_DIR/SKILL.md" "$OPENCODE_DIR/SKILL.md"
echo "✓ OpenCode: $OPENCODE_DIR"

# --- 3. Codex CLI: ~/.agents/skills/kiwi-paper/ ---
CODEX_DIR="$HOME/.agents/skills/kiwi-paper"
mkdir -p "$CODEX_DIR"
cp "$SCRIPT_DIR/SKILL.md" "$CODEX_DIR/SKILL.md"
echo "✓ Codex CLI: $CODEX_DIR"

# --- 4. Gemini CLI: custom command ---
GEMINI_CMD_DIR="$HOME/.gemini/commands"
mkdir -p "$GEMINI_CMD_DIR"
cat > "$GEMINI_CMD_DIR/kiwi-paper.toml" << 'TOML'
description = "논문/기술문서를 나무위키 스타일로 변환"
prompt = """
You are kiwi-paper, a tool that converts technical documents into namu.wiki-style Korean documents.

Read the SKILL.md file at ~/.claude/skills/kiwi-paper/SKILL.md for the full conversion rules and pipeline.

Follow the 4-step pipeline:
1. Draft: Convert the input to namu.wiki-style markdown
2. Refine: Check structure, humor balance, add links and images
3. Humanize: Remove AI-generated writing patterns, make it natural Korean
4. Render: Generate HTML with `node ~/.claude/skills/kiwi-paper/renderer/src/render.mjs -i <file> -o <dir>`

Key rules:
- Strikethrough (~~) humor: 3-5 per section, 15+ total
- Footnotes: 8+ per document (source:humor = 6:4)
- Trivia section (여담): 5+ items
- Images: extract ALL figures from source, WebSearch if needed
- Supports 12 document types (papers, specs, API docs, manuals, news, etc.)

The user's input: $ARGUMENTS
"""
TOML
echo "✓ Gemini CLI: $GEMINI_CMD_DIR/kiwi-paper.toml (use /kiwi-paper)"

# --- 5. Gemini CLI: configure context.fileName to also read AGENTS.md ---
GEMINI_SETTINGS="$HOME/.gemini/settings.json"
if [ -f "$GEMINI_SETTINGS" ]; then
  # Check if context.fileName already configured
  if ! grep -q 'AGENTS.md' "$GEMINI_SETTINGS" 2>/dev/null; then
    echo "  ℹ Tip: Add \"AGENTS.md\" to context.fileName in $GEMINI_SETTINGS for full AGENTS.md support"
  fi
else
  mkdir -p "$HOME/.gemini"
  cat > "$GEMINI_SETTINGS" << 'JSON'
{
  "context": {
    "fileName": ["GEMINI.md", "AGENTS.md"]
  }
}
JSON
  echo "  ✓ Gemini settings: context.fileName configured to read AGENTS.md"
fi

# --- 6. Install renderer dependencies ---
if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -ge 20 ]; then
    echo ""
    echo "Installing renderer dependencies..."
    cd "$CLAUDE_DIR/renderer" && npm install --silent
    echo "✓ Renderer ready"
  else
    echo ""
    echo "⚠ Node.js >= 20 required for HTML renderer (found v$NODE_VERSION). Skipping."
  fi
else
  echo ""
  echo "⚠ Node.js not found. HTML renderer will not be available."
fi

# --- 7. Clean up cloned repo (only with --cleanup flag) ---
if [ "${1:-}" = "--cleanup" ] && [ -d "$SCRIPT_DIR/.git" ] && [ "$SCRIPT_DIR" != "$CLAUDE_DIR" ]; then
  REAL_SCRIPT=$(cd "$SCRIPT_DIR" && pwd -P)
  REAL_INSTALL=$(cd "$CLAUDE_DIR" && pwd -P)
  if [ "$REAL_SCRIPT" != "$REAL_INSTALL" ]; then
    echo ""
    echo "Cleaning up cloned repository..."
    rm -rf "$SCRIPT_DIR"
    echo "✓ Cloned repo removed"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Usage:"
echo "  Claude Code:  /kiwi-paper <file|url>"
echo "  OpenCode:     /kiwi-paper <file|url>"
echo "  Codex CLI:    \$kiwi-paper <file|url>"
echo "  Gemini CLI:   /kiwi-paper <file|url>"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
