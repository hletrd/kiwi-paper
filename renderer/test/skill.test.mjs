import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const skill = readFileSync(new URL('SKILL.md', root), 'utf8');

test('SKILL.md body fits the 24,000 bytes Antigravity CLI loads', () => {
  const body = skill.replace(/^---\n[\s\S]*?\n---\n/, '');
  assert.ok(Buffer.byteLength(body) <= 24000, `${Buffer.byteLength(body)} bytes`);
});

test('every references/ file named in SKILL.md exists', () => {
  const refs = [...new Set(skill.match(/references\/[\w.-]+\.md/g))];
  assert.ok(refs.length > 0);
  for (const ref of refs) assert.ok(existsSync(new URL(ref, root)), ref);
});
