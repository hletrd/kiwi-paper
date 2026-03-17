#!/bin/bash
# kiwi-paper skill installer
set -e

SKILL_DIR="$HOME/.claude/skills/kiwi-paper"
mkdir -p "$SKILL_DIR"
cp SKILL.md "$SKILL_DIR/SKILL.md"
echo "kiwi-paper skill installed to $SKILL_DIR"
echo "Usage: /kiwi-paper path/to/paper.pdf"
