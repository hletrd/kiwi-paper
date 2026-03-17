#!/bin/bash
# kiwi-paper multi-platform skill installer
# Installs everything to ~/.claude/skills/kiwi-paper/ and cleans up
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="$HOME/.claude/skills/kiwi-paper"

echo "🥝 kiwi-paper installer"
echo ""

# --- Create install directory ---
mkdir -p "$INSTALL_DIR"

# --- Copy all necessary files ---
cp "$SCRIPT_DIR/SKILL.md" "$INSTALL_DIR/SKILL.md"
cp "$SCRIPT_DIR/AGENTS.md" "$INSTALL_DIR/AGENTS.md"

# Copy platform-specific instruction files
for f in OPENCODE.md CODEX.md GEMINI.md; do
  [ -f "$SCRIPT_DIR/$f" ] && cp "$SCRIPT_DIR/$f" "$INSTALL_DIR/$f"
done

# Copy renderer
if [ -d "$SCRIPT_DIR/renderer" ]; then
  rm -rf "$INSTALL_DIR/renderer"
  mkdir -p "$INSTALL_DIR/renderer/src"
  cp "$SCRIPT_DIR/renderer/package.json" "$INSTALL_DIR/renderer/package.json"
  cp "$SCRIPT_DIR/renderer/package-lock.json" "$INSTALL_DIR/renderer/package-lock.json" 2>/dev/null || true
  cp "$SCRIPT_DIR/renderer/src/render.mjs" "$INSTALL_DIR/renderer/src/render.mjs"
  cp "$SCRIPT_DIR/renderer/src/template.mjs" "$INSTALL_DIR/renderer/src/template.mjs"
fi

# Copy examples
if [ -d "$SCRIPT_DIR/examples" ]; then
  rm -rf "$INSTALL_DIR/examples"
  cp -r "$SCRIPT_DIR/examples" "$INSTALL_DIR/examples"
fi

echo "✓ Files installed to $INSTALL_DIR"

# --- Install renderer dependencies (Node.js >= 20) ---
if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -ge 20 ]; then
    echo "Installing renderer dependencies..."
    cd "$INSTALL_DIR/renderer" && npm install --silent
    echo "✓ Renderer ready"
  else
    echo "⚠ Node.js >= 20 required for HTML renderer (found v$NODE_VERSION). Skipping."
  fi
else
  echo "⚠ Node.js not found. HTML renderer will not be available."
  echo "  Install Node.js >= 20 and re-run this script to enable HTML rendering."
fi

# --- Clean up cloned repo if running from a git clone ---
# Only clean up if SCRIPT_DIR is NOT already inside the install directory
# and if it looks like a git clone (has .git/)
if [ -d "$SCRIPT_DIR/.git" ] && [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
  REAL_SCRIPT=$(cd "$SCRIPT_DIR" && pwd -P)
  REAL_INSTALL=$(cd "$INSTALL_DIR" && pwd -P)
  if [ "$REAL_SCRIPT" != "$REAL_INSTALL" ]; then
    echo ""
    echo "Cleaning up cloned repository..."
    rm -rf "$SCRIPT_DIR"
    echo "✓ Cloned repo removed"
  fi
fi

echo ""
echo "Installed to: $INSTALL_DIR"
echo ""
echo "Usage:"
echo "  Claude Code:  /kiwi-paper <file|url>"
echo "  Renderer CLI: node $INSTALL_DIR/renderer/src/render.mjs -i <file> -o <dir>"
