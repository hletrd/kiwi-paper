import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToBasicMarkdown } from '../src/html2md.mjs';

test('keeps figure images with their captions', () => {
  const md = htmlToBasicMarkdown('<figure><img src="f.png" alt="x"><figcaption>Figure 1: arch</figcaption></figure>');
  assert.equal(md, '![Figure 1: arch](f.png)');
});

test('does not confuse <b>/<i> with <br>, <body> or <img>', () => {
  const md = htmlToBasicMarkdown('<body><p>one<br>two <b>bold</b></p><p>see <img src="a.png" alt="A"> <i>it</i></p></body>');
  assert.equal(md, 'one\ntwo **bold**\n\nsee \n![A](a.png)\n *it*');
});

test('drops head content and converts pre to fenced code', () => {
  const md = htmlToBasicMarkdown('<head><title>T</title></head><pre><code>a &lt; b &amp;&amp; c</code></pre>');
  assert.equal(md, '```\na < b && c\n```');
});

test('picture falls back to source srcset', () => {
  assert.equal(htmlToBasicMarkdown('<picture><source srcset="p.webp 1x"><img alt="P"></picture>'), '![P](p.webp)');
});

test('links: unsafe schemes keep only text, URLs are escaped for markdown', () => {
  assert.equal(htmlToBasicMarkdown('<a href="javascript:alert(1)">js</a>'), 'js');
  assert.equal(htmlToBasicMarkdown('<a href="https://a.b/x (1).html">p</a>'), '[p](https://a.b/x%20%281%29.html)');
});

test('out-of-range numeric entities do not throw', () => {
  assert.doesNotThrow(() => htmlToBasicMarkdown('<a href="&#99999999;">x</a> &#99999999;'));
});
