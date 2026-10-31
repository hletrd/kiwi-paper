/**
 * kiwi-paper sanitizer — escaping helpers and an allowlist sanitizer for
 * raw HTML embedded in markdown.
 *
 * Only raw HTML tokens are untrusted. Everything else (marked text, KaTeX,
 * Shiki) is escaped by its producer and must keep its inline styles, so
 * sanitization happens per token instead of on the rendered page.
 */

// ---------------------------------------------------------------------------
// HTML escaping for safe attribute/content interpolation
// ---------------------------------------------------------------------------
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  colon: ':', tab: '\t', newline: '\n',
};

/**
 * Decode numeric and a few named character references. Anything left
 * undecoded is re-escaped on output, so the browser never decodes it either.
 */
export function decodeEntities(str) {
  return str.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));?/gi, (match, hex, dec, name) => {
    if (name) {
      const ch = NAMED_ENTITIES[name.toLowerCase()];
      return ch === undefined ? match : ch;
    }
    const code = hex ? parseInt(hex, 16) : parseInt(dec, 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '�';
  });
}

// ---------------------------------------------------------------------------
// URI scheme allowlist — relative URLs plus http(s), mailto, tel
// ---------------------------------------------------------------------------
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

export function safeHref(href) {
  if (!href) return '';
  // Browsers drop tabs/newlines anywhere and leading controls/spaces before parsing
  const normalized = href.replace(/[\t\n\r]/g, '').replace(/^[\u0000- ]+/, '');
  const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme && !SAFE_SCHEMES.has(scheme[1].toLowerCase())) return '';
  return href;
}

// ---------------------------------------------------------------------------
// Raw HTML allowlist sanitizer
// ---------------------------------------------------------------------------
const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'blockquote', 'br', 'caption', 'cite', 'code',
  'col', 'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em',
  'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
  'ins', 'kbd', 'li', 'mark', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby', 's',
  'samp', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr',
]);

// Elements whose content is code or markup, not readable text
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|textarea|title|xmp|noembed|noframes|svg|math)\b[\s\S]*?<\/\1\s*>/gi;

const GLOBAL_ATTRS = new Set(['title', 'lang', 'dir']);
const TAG_ATTRS = {
  a: new Set(['href']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  col: new Set(['span']),
  colgroup: new Set(['span']),
  ol: new Set(['start', 'reversed', 'type']),
  li: new Set(['value']),
  details: new Set(['open']),
  time: new Set(['datetime']),
};
const URL_ATTRS = new Set(['href', 'src']);

const TOKEN_RE = /<!--[\s\S]*?(?:-->|$)|<(\/?)([a-z][a-z0-9-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>|[<>]/gi;
const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function sanitizeAttrs(tag, attrStr) {
  const allowed = TAG_ATTRS[tag];
  let out = '';
  for (const [, rawName, dq, sq, uq] of attrStr.matchAll(ATTR_RE)) {
    const name = rawName.toLowerCase();
    if (!GLOBAL_ATTRS.has(name) && !allowed?.has(name)) continue;
    let value = decodeEntities(dq ?? sq ?? uq ?? '');
    if (URL_ATTRS.has(name)) {
      value = safeHref(value);
      if (!value) continue;
    }
    out += ` ${name}="${escapeHtml(value)}"`;
  }
  return out;
}

/**
 * Sanitize a raw HTML fragment from a marked `html` token. Inline tokens are
 * single tags (`<sup>`, `</sup>`), so every tag is handled on its own.
 * Disallowed tags are dropped, stray angle brackets are escaped.
 */
export function sanitizeRawHtml(html) {
  return html
    .replace(DROP_WITH_CONTENT, '')
    .replace(TOKEN_RE, (match, close, rawTag, attrStr) => {
      if (match === '<') return '&lt;';
      if (match === '>') return '&gt;';
      if (!rawTag) return ''; // comment
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return '';
      if (close) return `</${tag}>`;
      return `<${tag}${sanitizeAttrs(tag, attrStr || '')}>`;
    });
}
