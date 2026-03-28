/**
 * kiwi-paper HTML template — namu.wiki-styled rendering
 * Authentic namu.wiki Liberty skin styling with light/dark mode
 */

import { createHash } from 'node:crypto';

/**
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.bodyHtml
 * @param {Array<{id: string, text: string, level: number}>} opts.headings
 * @param {{prev?: {href: string, title: string}, next?: {href: string, title: string}, index?: string}} [opts.navigation]
 * @param {string} [opts.katexCss]
 * @param {string} [opts.shikiCss]
 * @param {boolean} [opts.showToc]
 * @param {Array<{title: string, href: string}>} [opts.relatedDocs]
 * @param {Array<{title: string, href: string}>} [opts.subDocs]
 * @returns {string}
 */
export function renderPage({
  title,
  bodyHtml,
  headings = [],
  navigation = {},
  katexCss = '',
  shikiCss = '',
  showToc = true,
  relatedDocs = [],
  subDocs = [],
}) {
  const tocHtml = showToc && headings.length > 0 ? buildToc(headings) : '';
  const navHtml = buildNavigation(navigation);
  const relatedHtml = buildRelatedDocs(relatedDocs, subDocs);

  const settingsJs = getSettingsScript();
  const tocJs = showToc && headings.length > 0 ? getTocScript() : '';

  function sha256(content) {
    return createHash('sha256').update(content, 'utf8').digest('base64');
  }

  const scriptHashes = [`'sha256-${sha256(settingsJs)}'`];
  if (tocJs) scriptHashes.push(`'sha256-${sha256(tocJs)}'`);
  const cspScriptSrc = scriptHashes.join(' ');

  return `<!DOCTYPE html>
<html lang="ko" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net; img-src 'self' data: https:; script-src ${cspScriptSrc}; connect-src 'none'; frame-src 'none'; object-src 'none';">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
${katexCss ? `<style>${katexCss}</style>` : ''}
${shikiCss ? `<style>${shikiCss}</style>` : ''}
<style>${getStyles()}</style>
</head>
<body>
<div class="wiki-wrapper">
  <div class="wiki-header">
    <div class="wiki-header-inner">
      <a class="wiki-logo" href="${navigation.index || '#'}">🥝<span style="margin-left:0.35em"></span>kiwi-paper</a>
      <div class="header-controls">
        <!-- KO/EN segmented toggle -->
        <div class="seg-toggle" id="lang-toggle" role="switch" aria-label="언어 전환" tabindex="0">
          <div class="seg-toggle-pill"></div>
          <div class="seg-toggle-item active" data-val="en">EN</div>
          <div class="seg-toggle-item" data-val="ko">KO</div>
        </div>
        <!-- Sun/Moon icon toggle -->
        <div class="icon-toggle" id="theme-toggle" role="switch" aria-label="테마 전환" tabindex="0">
          <div class="icon-toggle-pill"></div>
          <div class="icon-toggle-item active" data-val="light">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2" fill="none"/><g stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/></g></svg>
          </div>
          <div class="icon-toggle-item" data-val="dark">
            <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          </div>
        </div>
        <!-- Settings gear -->
        <button class="settings-toggle" aria-label="디스플레이 설정" title="디스플레이 설정">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
      </div>
    </div>
  </div>

  <div class="wiki-content-header">
    <h1 class="wiki-title">${escapeHtml(title)}</h1>
  </div>

  <div class="wiki-content">
    <article class="wiki-article">
      ${tocHtml}
      ${bodyHtml}
    </article>
    ${relatedHtml}
    ${navHtml}
  </div>

  <div class="wiki-footer">
    <p>Generated by <a href="https://github.com/hletrd/kiwi-paper">kiwi-paper</a></p>
  </div>
</div>

<div class="settings-overlay" aria-hidden="true"></div>
<div class="settings-panel" aria-hidden="true">
  <div class="settings-header">
    <span class="settings-title">디스플레이 설정</span>
    <button class="settings-close" aria-label="닫기">&times;</button>
  </div>
  <div class="settings-body">
    <div class="settings-group">
      <div class="settings-group-title">테마</div>
      <div class="settings-radio-group" data-setting="theme">
        <label><input type="radio" name="theme" value="auto" checked> 자동 (시스템 설정)</label>
        <label><input type="radio" name="theme" value="light"> 라이트</label>
        <label><input type="radio" name="theme" value="dark"> 다크</label>
        <label><input type="radio" name="theme" value="black"> 검은 화면 (AMOLED)</label>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">취소선</div>
      <div class="settings-toggle-row">
        <span>보이기</span>
        <label class="toggle"><input type="checkbox" data-setting="show-del" checked><span class="toggle-slider"></span></label>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">각주 표시 형식</div>
      <div class="settings-radio-group" data-setting="fn-mode">
        <label><input type="radio" name="fn-mode" value="popover" checked> 팝오버</label>
        <label><input type="radio" name="fn-mode" value="inline"> 인라인</label>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">이미지</div>
      <div class="settings-toggle-row">
        <span>보이기</span>
        <label class="toggle"><input type="checkbox" data-setting="show-images" checked><span class="toggle-slider"></span></label>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">글자 크기</div>
      <div class="settings-radio-group" data-setting="font-size">
        <label><input type="radio" name="font-size" value="default" checked> 기본</label>
        <label><input type="radio" name="font-size" value="small"> 작게</label>
        <label><input type="radio" name="font-size" value="large"> 크게</label>
        <label><input type="radio" name="font-size" value="xlarge"> 매우 크게</label>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">문단 접기</div>
      <div class="settings-toggle-row">
        <span>문단을 기본으로 접기</span>
        <label class="toggle"><input type="checkbox" data-setting="fold-sections"><span class="toggle-slider"></span></label>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">표</div>
      <div class="settings-toggle-row">
        <span>표 워드랩 사용</span>
        <label class="toggle"><input type="checkbox" data-setting="table-wrap" checked><span class="toggle-slider"></span></label>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">외부 링크</div>
      <div class="settings-toggle-row">
        <span>외부 링크 아이콘 표시</span>
        <label class="toggle"><input type="checkbox" data-setting="ext-link-icon" checked><span class="toggle-slider"></span></label>
      </div>
    </div>
    <div class="settings-group">
      <div class="settings-group-title">목차</div>
      <div class="settings-toggle-row">
        <span>목차 지도 활성화</span>
        <label class="toggle"><input type="checkbox" data-setting="toc-map" checked><span class="toggle-slider"></span></label>
      </div>
    </div>
  </div>
</div>

<button class="toc-fab" aria-label="목차" style="display:none">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
</button>
<div class="toc-overlay" aria-hidden="true"></div>

<script>${settingsJs}</script>
${tocJs ? `<script>${tocJs}</script>` : ''}
</body>
</html>`;
}

/**
 * Render an index page listing multiple documents.
 */
export function renderIndexPage({ title, documents, katexCss = '', shikiCss = '' }) {
  const listHtml = documents
    .map(
      (d) =>
        `<li class="doc-item"><a href="${escapeHtml(d.href)}">${escapeHtml(d.title)}</a>${d.description ? `<p class="doc-desc">${escapeHtml(d.description)}</p>` : ''}</li>`,
    )
    .join('\n');

  const bodyHtml = `<ul class="doc-list">${listHtml}</ul>`;

  return renderPage({
    title,
    bodyHtml,
    headings: [],
    showToc: false,
    katexCss,
    shikiCss,
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildToc(headings) {
  const minLevel = Math.min(...headings.map((h) => h.level));

  // Build numbered entries (namu.wiki style: 1., 1.1., 1.1.1.)
  const counters = [0, 0, 0, 0, 0, 0];
  const items = headings.map((h) => {
    const depth = h.level - minLevel;
    counters[depth]++;
    // Reset deeper counters
    for (let i = depth + 1; i < counters.length; i++) counters[i] = 0;
    // Build number string
    const num = counters.slice(0, depth + 1).join('.');
    const cleanText = h.text.replace(/^\d+(\.\d+)*\.\s*/, '');
    return `<div class="toc-entry toc-depth-${depth}"><a href="#${escapeHtml(h.id)}"><span class="toc-num">${num}.</span> ${escapeHtml(cleanText)}</a></div>`;
  });

  return `<div class="wiki-toc" id="toc">
  <div class="toc-title">목차</div>
  <div class="toc-body">${items.join('')}</div>
</div>`;
}

function buildNavigation(nav) {
  if (!nav || (!nav.prev && !nav.next && !nav.index)) return '';
  const parts = [];
  if (nav.prev) parts.push(`<a class="nav-prev" href="${escapeHtml(nav.prev.href)}">&larr; ${escapeHtml(nav.prev.title)}</a>`);
  if (nav.index) parts.push(`<a class="nav-index" href="${escapeHtml(nav.index)}">목록</a>`);
  if (nav.next) parts.push(`<a class="nav-next" href="${escapeHtml(nav.next.href)}">${escapeHtml(nav.next.title)} &rarr;</a>`);
  return `<nav class="page-nav">${parts.join('')}</nav>`;
}

function buildRelatedDocs(relatedDocs, subDocs) {
  if ((!relatedDocs || relatedDocs.length === 0) && (!subDocs || subDocs.length === 0)) return '';
  let html = '<div class="wiki-related">';
  if (subDocs && subDocs.length > 0) {
    html += '<div class="related-section"><div class="related-title">하위 문서</div><ul class="related-list">';
    html += subDocs.map(d => `<li><a href="${escapeHtml(d.href)}">${escapeHtml(d.title)}</a></li>`).join('');
    html += '</ul></div>';
  }
  if (relatedDocs && relatedDocs.length > 0) {
    html += '<div class="related-section"><div class="related-title">관련 문서</div><ul class="related-list">';
    html += relatedDocs.map(d => `<li><a href="${escapeHtml(d.href)}">${escapeHtml(d.title)}</a></li>`).join('');
    html += '</ul></div>';
  }
  html += '</div>';
  return html;
}

const STYLES = `
/* ============================================================
   kiwi-paper — namu.wiki Liberty skin inspired theme
   ============================================================ */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* --- CSS Custom Properties (Light — default) --- */
:root, [data-theme="light"] {
  --namu-brand: #00a495;
  --namu-brand-hover: #007a6e;

  --bg-page: #f5f5f5;
  --bg-content: #ffffff;
  --bg-header: #f5f8fa;
  --bg-code: #eeeeee;
  --bg-blockquote: #eeeeee;
  --bg-toc-title: #f5f8fa;
  --bg-table-header: #f5f5f5;

  --text-primary: #212529;
  --text-muted: #6e7478;
  --text-del: gray;

  --border: #e1e8ed;
  --border-heading: #cccccc;
  --border-blockquote: #71bc6d;
  --border-footnote: #777777;

  --link-color: #0275d8;
  --link-external: #009900;
  --link-hover: #014c8c;

  --radius: 0.35rem;
  --shadow-category: 0.15rem 0.15rem 0 0 #cfdae2;
}

/* --- Dark Theme --- */
[data-theme="dark"] {
  --bg-page: #1a1a1a;
  --bg-content: #1e1e1e;
  --bg-header: #2d2f34;
  --bg-code: #2d2f34;
  --bg-blockquote: #2a2a2a;
  --bg-toc-title: #1f2023;
  --bg-table-header: #2d2f34;

  --text-primary: #dddddd;
  --text-muted: #999999;
  --text-del: #aaaaaa;

  --border: #444444;
  --border-heading: #555555;
  --border-blockquote: #666c75;
  --border-footnote: #666666;

  --link-color: #E69720;
  --link-external: #E69720;
  --link-hover: #b3771d;

  --shadow-category: 0.15rem 0.15rem 0 0 #333;
}

/* --- AMOLED Black Theme --- */
[data-theme="black"] {
  --bg-page: #000000;
  --bg-content: #000000;
  --bg-header: #111111;
  --bg-code: #0d0d0d;
  --bg-blockquote: #0a0a0a;
  --bg-toc-title: #0d0d0d;
  --bg-table-header: #111111;

  --text-primary: #e0e0e0;
  --text-muted: #888888;
  --text-del: #666666;

  --border: #222222;
  --border-heading: #333333;
  --border-blockquote: #444444;
  --border-footnote: #444444;

  --link-color: #E69720;
  --link-external: #E69720;
  --link-hover: #b3771d;

  --shadow-category: none;
}

/* --- Base --- */
html { font-size: 15px; scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }

body {
  font-family: 'Pretendard JP Variable', 'Pretendard JP', 'Pretendard Variable', Pretendard, -apple-system, system-ui, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Noto Sans CJK KR', NanumBarunGothic, Roboto, 'Segoe UI', 'Malgun Gothic', sans-serif;
  font-size: 15px;
  background: var(--bg-page);
  color: var(--text-primary);
  line-height: 1.5;
  word-break: keep-all;
  overflow-wrap: break-word;
  transition: background 0.2s, color 0.2s;
}

/* --- Wiki Wrapper --- */
.wiki-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
  background: var(--bg-content);
  min-height: 100vh;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

/* --- Header Bar --- */
.wiki-header {
  background: var(--namu-brand);
  padding: 0;
  margin: 0 -16px;
}
.wiki-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
}
.wiki-logo {
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
  text-decoration: none;
}
.wiki-logo:hover { color: #fff; text-decoration: none; opacity: 0.9; }

/* --- Content Header (Title Bar) --- */
.wiki-content-header {
  border-bottom: 1px solid var(--border);
  background: var(--bg-header);
  padding: 0.8rem 1.2rem;
  margin: 0 -16px;
}
.wiki-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  padding: 0;
  border: none;
  color: var(--text-primary);
}

/* --- Content Area --- */
.wiki-content {
  padding: 1.2rem 1.5rem 2rem;
}

/* --- Typography --- */
h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
  color: var(--text-primary);
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-heading);
  scroll-margin-top: 1rem;
  line-height: 1.5;
}
.wiki-article h1 { font-size: 36px; }
.wiki-article h2 { font-size: 27px; margin: 32.4px 0 21.6px; }
.wiki-article h3 { font-size: 24px; margin: 28.8px 0 19.2px; }
.wiki-article h2 > a[href="#toc"], .wiki-article h3 > a[href="#toc"] { color: var(--namu-brand); text-decoration: none; font-weight: 600; margin-right: 0.3em; }
.wiki-article h2 > a[href="#toc"]:hover, .wiki-article h3 > a[href="#toc"]:hover { text-decoration: underline; }
.wiki-article h4 { font-size: 22.5px; border-bottom: none; }
.wiki-article h5 { font-size: 19.5px; border-bottom: none; }
.wiki-article h6 { font-size: 16.5px; border-bottom: none; }

p { margin: 0; font-size: 14.4px; line-height: 21.6px; }

a { color: var(--link-color); text-decoration: none; transition: color 0.1s; }
a:hover { color: var(--link-hover); text-decoration: underline; }

.wiki-article a:not([href^="http"]):not(.footnote-ref):not(.footnote-backref):not([href="#toc"]):not([data-footnote-ref]):not(.fn-num) {
  color: var(--text-primary);
  font-weight: 700;
}
.wiki-article a:not([href^="http"]):not(.footnote-ref):not(.footnote-backref):not([href="#toc"]):not([data-footnote-ref]):not(.fn-num):hover {
  color: var(--link-color);
}

/* External links get a subtle icon */
a[href^="http"]:not([href*="kiwi-paper"])::after {
  content: " ↗";
  font-size: 0.75em;
  color: var(--link-external);
  vertical-align: super;
  line-height: 0;
}

strong { font-weight: 700; }
em { font-style: italic; }
del { color: var(--text-del); text-decoration: line-through; }
mark { background: #fef08a; padding: 0.1em 0.2em; border-radius: 2px; }

hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 7.5px 0;
  height: 0;
}

/* --- Lists --- */
ul, ol { padding: 0 0 0 1.5em; margin: 0; }
li { margin: 0; padding: 0; line-height: 21.6px; }
li > ul, li > ol { margin: 0.15em 0; }

/* --- Blockquotes (namu.wiki style: green left border) --- */
blockquote {
  border-left: 5px solid var(--border-blockquote);
  background: var(--bg-blockquote);
  padding: 15px;
  margin: 15px 0;
  border-radius: 0;
  color: var(--text-primary);
}
blockquote p { margin: 0.3em 0; }
blockquote blockquote { margin: 0.5em 0; }

/* --- Code --- */
code {
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 15px;
  background: var(--bg-code);
  border: 1px solid var(--border);
  padding: 0.12em 0.35em;
  border-radius: var(--radius);
}

pre {
  background: var(--bg-code);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.8rem;
  overflow-x: auto;
  margin: 0.8em 0;
  line-height: 1.55;
}
pre code {
  background: none;
  border: none;
  padding: 0;
  font-size: 15px;
}

/* Shiki dual theme */
.shiki-light { display: block; }
.shiki-dark { display: none; }
[data-theme="dark"] .shiki-light, [data-theme="black"] .shiki-light { display: none; }
[data-theme="dark"] .shiki-dark, [data-theme="black"] .shiki-dark { display: block; }
pre.shiki { border: 1px solid var(--border); border-radius: var(--radius); }

/* --- Tables (namu.wiki: tight cells, thin borders) --- */
table {
  border-collapse: collapse;
  width: auto;
  margin: 0.8em 0;
  font-size: 0.92em;
}
th, td {
  padding: 5px 10px;
  border: 1px solid var(--border);
  text-align: left;
}
th {
  background: var(--bg-table-header);
  font-weight: 600;
}

/* Responsive table wrapper */
div:has(> table) { overflow-x: auto; }

/* --- TOC (namu.wiki box style) --- */
.wiki-toc {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin: 1em 0 1.5em;
  overflow: hidden;
}
.toc-title {
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.5rem 1rem;
  background: var(--bg-toc-title);
  border-bottom: 1px solid var(--border);
}
.toc-body { padding: 0.6rem 1rem; }
.toc-entry { margin: 0.15em 0; }
.toc-entry a {
  color: var(--link-color);
  text-decoration: none;
  display: inline-block;
  padding: 0.1em 0;
  font-size: 0.9rem;
  transition: color 0.1s;
}
.toc-entry a:hover { text-decoration: underline; }
.toc-entry.active > a { font-weight: 700; color: var(--namu-brand); }
.toc-num { color: var(--namu-brand); font-weight: 600; }
.toc-depth-1 { padding-left: 1.2em; }
.toc-depth-2 { padding-left: 2.4em; }
.toc-depth-3 { padding-left: 3.6em; }
.toc-depth-4 { padding-left: 4.8em; }

/* --- Footnotes (namu.wiki: small text, top border) --- */
section.footnotes {
  margin-top: 2.5em;
  padding-top: 1em;
  border-top: 1px solid var(--border-footnote);
  font-size: 0.8em;
  line-height: 2em;
  color: var(--text-muted);
}
section.footnotes ol { padding-left: 1.5em; list-style: none; }
section.footnotes li { margin: 0.3em 0; }
section.footnotes li .fn-num {
  color: var(--namu-brand);
  font-weight: 600;
  text-decoration: none;
  margin-right: 0.2em;
}
section.footnotes li .fn-num:hover { text-decoration: underline; }
.footnote-ref {
  font-size: 0.75em;
  vertical-align: super;
  line-height: 0;
}
.footnote-ref a { color: var(--namu-brand); font-size: 12px; font-weight: normal; }
a[data-footnote-ref] { color: var(--namu-brand) !important; font-weight: 600; }
.footnote-backref, [data-footnote-backref] { display: none; }

/* --- KaTeX --- */
.katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.4em 0; }

/* --- Images / Figures --- */
img { max-width: 100%; height: auto; }
.wiki-figure {
  margin: 1em 0;
  text-align: center;
}
.wiki-figure img {
  max-width: 100%;
  height: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.wiki-figure figcaption {
  margin-top: 0.5em;
  font-size: 0.88em;
  color: var(--text-muted);
  text-align: center;
}

/* --- Navigation --- */
.page-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1em;
  margin-top: 2.5em;
  padding: 0.8em 1em;
  background: var(--bg-header);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 0.9em;
}
.nav-prev, .nav-next { flex: 1; }
.nav-next { text-align: right; }
.nav-index { flex: 0 0 auto; }

/* --- Footer --- */
.wiki-footer {
  border-top: 1px solid var(--border);
  background: var(--bg-header);
  padding: 0.8rem 1.2rem;
  text-align: center;
  font-size: 0.8em;
  color: var(--text-muted);
}

/* --- Index page (doc list) --- */
.doc-list { list-style: none; padding: 0; }
.doc-item {
  margin: 0.4em 0;
  padding: 0.8em 1em;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-category);
  transition: box-shadow 0.15s;
}
.doc-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.doc-item a { font-weight: 600; font-size: 1rem; }
.doc-desc { margin-top: 0.2em; font-size: 0.88em; color: var(--text-muted); }

/* --- Mobile TOC FAB --- */
.toc-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 1001;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: var(--namu-brand);
  color: #fff;
  box-shadow: 0 2px 10px rgba(0,0,0,0.25);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.toc-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 998;
  background: rgba(0,0,0,0.4);
}
.toc-overlay.open { display: block; }

/* --- Settings Panel --- */
.settings-toggle {
  background: rgba(255,255,255,0.15);
  border: none;
  padding: 5px 8px;
  cursor: pointer;
  border-radius: 4px;
  color: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.settings-toggle:hover { background: rgba(255,255,255,0.25); color: #fff; }

/* --- Header Toggle Controls --- */
.header-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Segmented pill toggle (KO/EN) */
.seg-toggle {
  position: relative;
  display: flex;
  background: rgba(0,0,0,0.2);
  border-radius: 20px;
  padding: 3px;
  cursor: pointer;
  user-select: none;
}
.seg-toggle-item {
  position: relative;
  z-index: 1;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.6);
  border-radius: 17px;
  transition: color 0.3s;
  text-align: center;
  line-height: 1.5;
}
.seg-toggle-item.active { color: var(--namu-brand); }
.seg-toggle-pill {
  position: absolute;
  top: 3px;
  left: 3px;
  height: calc(100% - 6px);
  width: calc(50% - 3px);
  background: #fff;
  border-radius: 17px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.seg-toggle.right .seg-toggle-pill { transform: translateX(100%); }

/* Icon pill toggle (theme) */
.icon-toggle {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(0,0,0,0.2);
  border-radius: 20px;
  padding: 3px;
  cursor: pointer;
  user-select: none;
}
.icon-toggle-item {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 17px;
  transition: color 0.3s;
  color: rgba(255,255,255,0.5);
}
.icon-toggle-item.active { color: var(--namu-brand); }
.icon-toggle-item svg { width: 14px; height: 14px; fill: currentColor; }
.icon-toggle-pill {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 28px;
  height: calc(100% - 6px);
  background: #fff;
  border-radius: 17px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.icon-toggle.right .icon-toggle-pill { transform: translateX(100%); }

.settings-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 1998;
  background: rgba(0,0,0,0.4);
}
.settings-overlay.open { display: block; }

.settings-panel {
  position: fixed;
  top: 0;
  right: -360px;
  width: 340px;
  height: 100vh;
  z-index: 1999;
  background: var(--bg-content);
  border-left: 1px solid var(--border);
  box-shadow: -4px 0 16px rgba(0,0,0,0.15);
  transition: right 0.25s ease;
  overflow-y: auto;
  font-size: 14px;
}
.settings-panel.open { right: 0; }

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-header);
  position: sticky;
  top: 0;
  z-index: 1;
}
.settings-title { font-weight: 700; font-size: 15px; }
.settings-close {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: var(--text-muted);
  padding: 0 4px;
}
.settings-close:hover { color: var(--text-primary); }

.settings-body { padding: 8px 0; }

.settings-group {
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
}
.settings-group-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.settings-radio-group label {
  display: block;
  padding: 4px 0;
  cursor: pointer;
  font-size: 14px;
}
.settings-radio-group input { margin-right: 6px; accent-color: var(--namu-brand); }

.settings-toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}

/* Toggle switch */
.toggle { position: relative; display: inline-block; width: 40px; height: 22px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--border);
  border-radius: 22px;
  transition: 0.2s;
}
.toggle-slider::before {
  content: "";
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
}
.toggle input:checked + .toggle-slider { background: var(--namu-brand); }
.toggle input:checked + .toggle-slider::before { transform: translateX(18px); }

/* --- Related/Sub Documents --- */
.wiki-related {
  margin-top: 2em;
  padding: 1em;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-header);
}
.related-section { margin-bottom: 0.8em; }
.related-section:last-child { margin-bottom: 0; }
.related-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--namu-brand);
  margin-bottom: 0.4em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border);
}
.related-list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 0.4em 1em; }
.related-list li { font-size: 14px; }
.related-list a { color: var(--link-color); }

/* --- Body classes for settings --- */
body.hide-del del { color: transparent; text-decoration: none; background: var(--bg-code); border-radius: 2px; cursor: pointer; }
body.hide-del del:hover { color: var(--text-del); text-decoration: line-through; }
body.hide-images .wiki-figure, body.hide-images img:not(.settings-panel img) { display: none; }
body.no-table-wrap td, body.no-table-wrap th { white-space: nowrap; }
body.no-ext-icon a[href^="http"]::after { display: none; }
body.no-toc-map .toc-entry.active > a { font-weight: inherit; color: var(--link-color); }
/* Section collapse */
.wiki-article > h2, .wiki-article h3 { cursor: pointer; position: relative; display: flex; align-items: center; }
.wiki-article > h2::after, .wiki-article h3::after {
  content: "";
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-right: 2px solid var(--text-muted);
  border-bottom: 2px solid var(--text-muted);
  transform: rotate(45deg);
  margin-left: 10px;
  transition: transform 0.25s ease;
}
.wiki-article > h2.collapsed::after, .wiki-article h3.collapsed::after {
  transform: rotate(-45deg);
}
.wiki-article .section-content {}
.wiki-article .section-content.collapsed { display: none; }
body.font-small { font-size: 13px; }
body.font-large { font-size: 17px; }
body.font-xlarge { font-size: 19px; }

/* --- Inline Footnote Mode --- */
body.fn-inline .footnote-ref a {
  cursor: default;
  pointer-events: none;
}
body.fn-inline .footnote-ref::after {
  content: attr(data-fn-text);
  display: inline;
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-blockquote);
  padding: 2px 6px;
  border-radius: var(--radius);
  margin-left: 4px;
  vertical-align: baseline;
  font-weight: normal;
  line-height: 1.5;
}

/* --- Footnote Popover --- */
.fn-popover {
  z-index: 2000;
  max-width: 400px;
  padding: 10px 14px;
  background: var(--bg-content);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
  pointer-events: none;
}

/* --- Mobile --- */
@media (max-width: 768px) {
  .wiki-wrapper { border: none; }
  .wiki-content { padding: 1rem; }
  .wiki-article h2 { font-size: 1.4rem; }
  .wiki-article h3 { font-size: 1.25rem; }
  table { font-size: 0.82em; }

  .toc-fab { display: flex !important; }

  .wiki-toc {
    position: fixed;
    top: 0;
    right: -300px;
    width: 280px;
    height: 100vh;
    z-index: 999;
    margin: 0;
    border-radius: 0;
    border: none;
    border-left: 1px solid var(--border);
    background: var(--bg-content);
    box-shadow: -4px 0 16px rgba(0,0,0,0.15);
    transition: right 0.25s ease;
    overflow-y: auto;
  }
  .wiki-toc.open { right: 0; }
}

/* --- Print --- */
@media print {
  body { background: #fff; color: #000; }
  .wiki-wrapper { border: none; max-width: 100%; }
  .wiki-header, .settings-toggle, .settings-panel, .settings-overlay, .toc-fab, .toc-overlay, .page-nav, .wiki-footer { display: none !important; }
  .wiki-article > * { display: block !important; }
  .wiki-article > h2::after { display: none; }
  .wiki-content-header { background: none; border: none; }
  .wiki-content { padding: 0; }
  a { color: #000; }
  a[href]::after { content: " (" attr(href) ")"; font-size: 0.75em; color: #666; }
  a[href^="http"]::after { content: " (" attr(href) ")"; }
  a[href^="#"]::after { content: ""; }
  h1, h2, h3 { break-after: avoid; }
  table, pre, blockquote { break-inside: avoid; }
  .wiki-toc { break-inside: avoid; }
}
`;

function getStyles() { return STYLES; }

const TOC_SCRIPT = `
(function() {
  var toc = document.querySelector('.wiki-toc');
  var fab = document.querySelector('.toc-fab');
  var overlay = document.querySelector('.toc-overlay');
  if (!toc || !fab) return;

  function openToc() { toc.classList.add('open'); overlay.classList.add('open'); }
  function closeToc() { toc.classList.remove('open'); overlay.classList.remove('open'); }

  fab.addEventListener('click', function() {
    toc.classList.contains('open') ? closeToc() : openToc();
  });
  overlay.addEventListener('click', closeToc);

  // Close on entry click (mobile)
  toc.querySelectorAll('.toc-entry a').forEach(function(a) {
    a.addEventListener('click', function() {
      if (window.innerWidth <= 768) closeToc();
    });
  });

  // IntersectionObserver for active section
  var entries = toc.querySelectorAll('.toc-entry');
  var observed = [];
  entries.forEach(function(entry) {
    var href = entry.querySelector('a').getAttribute('href');
    if (href && href.startsWith('#')) {
      var el = document.getElementById(href.slice(1));
      if (el) observed.push({ el: el, entry: entry });
    }
  });
  if (observed.length === 0) return;

  var current = null;
  var observer = new IntersectionObserver(function(items) {
    items.forEach(function(item) {
      if (item.isIntersecting) {
        var match = observed.find(function(o) { return o.el === item.target; });
        if (match) {
          if (current) current.classList.remove('active');
          match.entry.classList.add('active');
          current = match.entry;
        }
      }
    });
  }, { rootMargin: '-5% 0px -85% 0px', threshold: 0 });

  observed.forEach(function(o) { observer.observe(o.el); });
})();
`;

function getTocScript() { return TOC_SCRIPT; }

const SETTINGS_SCRIPT = `
(function() {
  var panel = document.querySelector('.settings-panel');
  var overlay = document.querySelector('.settings-overlay');
  var toggleBtn = document.querySelector('.settings-toggle');
  var closeBtn = document.querySelector('.settings-close');
  if (!panel || !toggleBtn) return;

  function openPanel() { panel.classList.add('open'); overlay.classList.add('open'); }
  function closePanel() { panel.classList.remove('open'); overlay.classList.remove('open'); }
  toggleBtn.addEventListener('click', function() { panel.classList.contains('open') ? closePanel() : openPanel(); });
  overlay.addEventListener('click', closePanel);
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // --- Settings persistence ---
  var STORE_KEY = 'kiwi-paper-settings';
  var defaults = {
    theme: 'auto',
    'show-del': true,
    'fn-mode': 'popover',
    'show-images': true,
    'font-size': 'default',
    'fold-sections': false,
    'table-wrap': true,
    'ext-link-icon': true,
    'toc-map': true
  };

  function loadSettings() {
    try { return Object.assign({}, defaults, JSON.parse(localStorage.getItem(STORE_KEY))); }
    catch(e) { return Object.assign({}, defaults); }
  }
  function saveSettings(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

  var settings = loadSettings();

  function applyTheme(theme) {
    if (theme === 'auto') {
      var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  function applyAll() {
    applyTheme(settings.theme);
    document.body.classList.toggle('hide-del', !settings['show-del']);
    document.body.classList.toggle('hide-images', !settings['show-images']);
    document.body.classList.toggle('no-table-wrap', !settings['table-wrap']);
    document.body.classList.toggle('no-ext-icon', !settings['ext-link-icon']);
    document.body.classList.toggle('fold-sections', settings['fold-sections']);
    document.body.classList.toggle('fn-inline', settings['fn-mode'] === 'inline');
    document.body.classList.toggle('no-toc-map', !settings['toc-map']);
    updateFolding();
    document.body.classList.remove('font-small', 'font-large', 'font-xlarge');
    if (settings['font-size'] !== 'default') document.body.classList.add('font-' + settings['font-size']);

    // Sync UI
    panel.querySelectorAll('input[type=radio]').forEach(function(r) {
      var key = r.name;
      r.checked = (settings[key] === r.value);
    });
    panel.querySelectorAll('input[type=checkbox]').forEach(function(c) {
      var key = c.getAttribute('data-setting');
      if (key && settings[key] !== undefined) c.checked = settings[key];
    });
  }

  // Radio inputs
  panel.querySelectorAll('input[type=radio]').forEach(function(r) {
    r.addEventListener('change', function() {
      settings[r.name] = r.value;
      saveSettings(settings);
      applyAll();
    });
  });

  // Toggle inputs
  panel.querySelectorAll('input[type=checkbox]').forEach(function(c) {
    c.addEventListener('change', function() {
      var key = c.getAttribute('data-setting');
      if (key) { settings[key] = c.checked; saveSettings(settings); applyAll(); }
    });
  });

  // System theme change listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (settings.theme === 'auto') applyTheme('auto');
  });

  // --- Header Theme Toggle (sun/moon) ---
  var themeToggle = document.getElementById('theme-toggle');

  function isDarkActive() {
    var t = document.documentElement.getAttribute('data-theme');
    return t === 'dark' || t === 'black';
  }

  function syncThemeSlider() {
    if (!themeToggle) return;
    var dark = isDarkActive();
    themeToggle.classList.toggle('right', dark);
    themeToggle.querySelector('[data-val="light"]').classList.toggle('active', !dark);
    themeToggle.querySelector('[data-val="dark"]').classList.toggle('active', dark);
  }

  if (themeToggle) {
    syncThemeSlider();
    themeToggle.addEventListener('click', function() {
      settings.theme = isDarkActive() ? 'light' : 'dark';
      saveSettings(settings);
      applyAll();
      syncThemeSlider();
    });
  }

  // --- Header Lang Toggle (KO/EN) ---
  var langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    var currentLang = 'ko';
    function syncLangToggle() {
      var isKo = currentLang === 'ko';
      langToggle.classList.toggle('right', isKo);
      langToggle.querySelector('[data-val="en"]').classList.toggle('active', !isKo);
      langToggle.querySelector('[data-val="ko"]').classList.toggle('active', isKo);
      document.documentElement.setAttribute('lang', currentLang);
    }
    syncLangToggle();
    langToggle.addEventListener('click', function() {
      currentLang = currentLang === 'ko' ? 'en' : 'ko';
      syncLangToggle();
    });
  }

  // Insert clickable footnote numbers in footnotes section
  document.querySelectorAll('section.footnotes ol li').forEach(function(li, i) {
    var num = i + 1;
    var refId = 'footnote-ref-' + num;
    var link = document.createElement('a');
    link.className = 'fn-num';
    link.href = '#' + refId;
    link.textContent = num + '. ';
    var p = li.querySelector('p');
    if (p) {
      p.insertBefore(link, p.firstChild);
    } else {
      li.insertBefore(link, li.firstChild);
    }
  });

  // Populate footnote inline text (for inline mode)
  document.querySelectorAll('.footnote-ref').forEach(function(ref) {
    var link = ref.querySelector('a');
    if (!link) return;
    var id = link.getAttribute('href')?.replace('#', '');
    var fn = document.getElementById(id);
    if (fn) {
      var text = fn.textContent?.replace(/\\s+/g, ' ').replace(/↩$/, '').trim();
      if (text) ref.setAttribute('data-fn-text', text);
    }
  });

  // Footnote popover — single element, created once and reused
  var pop = document.createElement('div');
  pop.className = 'fn-popover';
  pop.style.position = 'absolute';
  pop.style.display = 'none';
  document.body.appendChild(pop);

  document.querySelectorAll('.footnote-ref a').forEach(function(a) {
    a.addEventListener('mouseenter', function() {
      if (settings['fn-mode'] !== 'popover') return;
      var id = a.getAttribute('href')?.replace('#', '');
      var fn = document.getElementById(id);
      if (!fn) return;
      pop.textContent = fn.textContent;
      pop.style.display = '';
      var rect = a.getBoundingClientRect();
      pop.style.left = (rect.left + window.scrollX) + 'px';
      pop.style.top = (rect.bottom + window.scrollY + 4) + 'px';
      var popRect = pop.getBoundingClientRect();
      if (popRect.right > window.innerWidth) {
        pop.style.left = (window.innerWidth - popRect.width - 8 + window.scrollX) + 'px';
      }
      if (popRect.bottom > window.innerHeight) {
        pop.style.top = (rect.top + window.scrollY - popRect.height - 4) + 'px';
      }
    });
    a.addEventListener('mouseleave', function() {
      pop.style.display = 'none';
    });
  });

  // Add back-to-TOC links on section heading numbers
  document.querySelectorAll('.wiki-article h2[id], .wiki-article h3[id]').forEach(function(h) {
    var text = h.textContent;
    var match = text.match(/^(\d+(\.\d+)*\.)\s*/);
    if (!match) return;
    var num = match[1];
    var rest = text.slice(match[0].length);
    h.innerHTML = '<a href="#toc">' + num + '</a> ' + rest;
  });

  // Section collapse: wrap content after h2/h3 headings into .section-content divs
  function setupCollapse(parent, headingSelector, stopTags) {
    var headings = parent.querySelectorAll(headingSelector);
    headings.forEach(function(h) {
      var wrapper = document.createElement('div');
      wrapper.className = 'section-content';
      var next = h.nextElementSibling;
      while (next && stopTags.indexOf(next.tagName) === -1 && !next.classList.contains('wiki-toc') && !next.classList.contains('wiki-related')) {
        var curr = next;
        next = next.nextElementSibling;
        wrapper.appendChild(curr);
      }
      if (wrapper.childNodes.length > 0) {
        h.after(wrapper);
      }
      h.addEventListener('click', function(e) {
        if (e.target.closest('a')) return;
        var content = h.nextElementSibling;
        if (!content || !content.classList.contains('section-content')) return;
        h.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
      });
    });
  }

  var article = document.querySelector('.wiki-article');
  if (article) {
    setupCollapse(article, ':scope > h3', ['H2', 'H3']);
    setupCollapse(article, ':scope > h2', ['H2']);
  }

  applyAll();
  syncThemeSlider();
})();
`;

function getSettingsScript() { return SETTINGS_SCRIPT; }
