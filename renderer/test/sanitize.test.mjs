import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeEntities, safeHref, sanitizeRawHtml } from '../src/sanitize.mjs';

test('safeHref allows relative and web URLs', () => {
  for (const href of ['https://a.b/c', 'http://a.b', 'mailto:x@y.z', '#sec', 'page.html', '/a/b', '?q=1']) {
    assert.equal(safeHref(href), href);
  }
});

test('safeHref blocks script-capable and local schemes', () => {
  for (const href of [
    'javascript:alert(1)', ' JavaScript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:x',
    '\u0001javascript:x', 'vbscript:x', 'data:text/html,x', 'blob:x', 'file:///etc/passwd',
  ]) {
    assert.equal(safeHref(href), '', href);
  }
});

test('decodeEntities handles numeric, named and out-of-range references', () => {
  assert.equal(decodeEntities('&#x6a;&#97;&colon;&Tab;&amp;'), 'ja:\t&');
  assert.equal(decodeEntities('&#99999999;'), '�');
  assert.equal(decodeEntities('&copy;'), '&copy;');
});

test('sanitizeRawHtml keeps allowed formatting tags', () => {
  assert.equal(sanitizeRawHtml('<sup>'), '<sup>');
  assert.equal(sanitizeRawHtml('</sup>'), '</sup>');
  assert.equal(sanitizeRawHtml('<br/>'), '<br>');
  assert.equal(sanitizeRawHtml('<details open><summary>x</summary>y</details>'), '<details open="">' + '<summary>x</summary>y</details>');
  assert.equal(sanitizeRawHtml('<td colspan="2" class="x">'), '<td colspan="2">');
});

test('sanitizeRawHtml strips event handlers, styles, ids and classes', () => {
  assert.equal(sanitizeRawHtml('<div onclick="x()" style="color:red" id="toc" class="settings-panel">'), '<div>');
  assert.equal(sanitizeRawHtml('<img src="a.png" onerror=alert(1) alt="A">'), '<img src="a.png" alt="A">');
});

test('sanitizeRawHtml drops dangerous URLs, including entity-obfuscated ones', () => {
  assert.equal(sanitizeRawHtml('<a href="javascript:alert(1)">'), '<a>');
  assert.equal(sanitizeRawHtml('<a href="jav&#x09;ascript:alert(1)">'), '<a>');
  assert.equal(sanitizeRawHtml('<a href="javascript&colon;alert(1)">'), '<a>');
  assert.equal(sanitizeRawHtml('<a href=javascript:alert(1)>'), '<a>');
  assert.equal(sanitizeRawHtml('<img src="data:image/svg+xml,x">'), '<img>');
  // Unknown entities are re-escaped, so the browser can't decode them into a scheme
  assert.equal(sanitizeRawHtml('<a href="x&foo;y">'), '<a href="x&amp;foo;y">');
  assert.equal(sanitizeRawHtml('<a href="https://a.b/?x=1&amp;y=2">'), '<a href="https://a.b/?x=1&amp;y=2">');
});

test('sanitizeRawHtml removes disallowed elements', () => {
  assert.equal(sanitizeRawHtml('<script>alert(1)</script>ok'), 'ok');
  assert.equal(sanitizeRawHtml('<style>body{}</style><svg onload=x><circle/></svg>ok'), 'ok');
  assert.equal(sanitizeRawHtml('<iframe src="https://x">'), '');
  assert.equal(sanitizeRawHtml('<!-- note -->ok'), 'ok');
  assert.equal(sanitizeRawHtml('<center>ok</center>'), 'ok');
});

test('sanitizeRawHtml escapes unterminated tags and stray brackets', () => {
  assert.equal(sanitizeRawHtml('<img src=x onerror=alert(1)//'), '&lt;img src=x onerror=alert(1)//');
  assert.equal(sanitizeRawHtml('a < b > c'), 'a &lt; b &gt; c');
});
