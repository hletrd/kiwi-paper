/**
 * kiwi-paper HTML → Markdown — a basic converter for URL inputs.
 * Output still goes through marked and the raw HTML sanitizer.
 */

import { decodeEntities, safeHref } from './sanitize.mjs';

// `<b` must not match <br>, <body> or <button>; `<i` must not match <img>
const open = (name) => `<${name}(?=[\\s>/])[^>]*>`;

function convertElement(html, name, fn) {
  return html.replace(new RegExp(`${open(name)}([\\s\\S]*?)</${name}\\s*>`, 'gi'), (_, inner) => fn(inner));
}

function attr(tag, name) {
  if (!tag) return '';
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decodeEntities(m[1] ?? m[2] ?? m[3]).trim() : '';
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

// Markdown pieces must not contain < or >: the final pass strips anything tag-like
function mdUrl(url) {
  return url.replace(/[\s()<>]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
}

function mdText(str) {
  return str.replace(/[[\]<>]/g, '');
}

function image(alt, src) {
  return src ? `\n![${mdText(alt)}](${mdUrl(src)})\n` : '';
}

export function htmlToBasicMarkdown(html) {
  let text = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(head|script|style|noscript|template|svg|nav|header|footer)(?=[\s>/])[\s\S]*?<\/\1\s*>/gi, '');

  // Figures and pictures first, while their <img> tags are still intact
  text = convertElement(text, 'figure', (inner) => {
    const img = inner.match(new RegExp(open('img'), 'i'))?.[0];
    if (!img) return inner;
    const caption = inner.match(/<figcaption(?=[\s>])[^>]*>([\s\S]*?)<\/figcaption\s*>/i);
    return image(caption ? decodeEntities(stripTags(caption[1])).trim() : attr(img, 'alt'), attr(img, 'src'));
  });
  text = convertElement(text, 'picture', (inner) => {
    const img = inner.match(new RegExp(open('img'), 'i'))?.[0];
    const source = inner.match(new RegExp(open('source'), 'i'))?.[0];
    return image(attr(img, 'alt'), attr(img, 'src') || attr(source, 'srcset').split(/\s/)[0]);
  });
  text = text.replace(new RegExp(open('img'), 'gi'), (img) => image(attr(img, 'alt'), attr(img, 'src')));

  // Code blocks before inline formatting; entities stay encoded until the final pass
  text = convertElement(text, 'pre', (inner) => `\n\`\`\`\n${stripTags(inner).replace(/\n+$/, '')}\n\`\`\`\n`);

  for (let level = 1; level <= 6; level++) {
    text = convertElement(text, `h${level}`, (inner) => `\n${'#'.repeat(level)} ${stripTags(inner).trim()}\n`);
  }
  for (const name of ['strong', 'b']) text = convertElement(text, name, (inner) => `**${inner}**`);
  for (const name of ['em', 'i']) text = convertElement(text, name, (inner) => `*${inner}*`);
  text = convertElement(text, 'code', (inner) => `\`${inner}\``);

  text = text.replace(/<a(?=[\s>])([^>]*)>([\s\S]*?)<\/a\s*>/gi, (_, attrs, inner) => {
    const href = safeHref(attr(attrs, 'href'));
    return href ? `[${inner}](${mdUrl(href)})` : inner;
  });

  text = text.replace(new RegExp(open('br'), 'gi'), '\n');
  text = convertElement(text, 'p', (inner) => `\n${inner}\n`);
  text = convertElement(text, 'li', (inner) => `- ${inner.trim()}\n`);
  text = convertElement(text, 'blockquote', (inner) => `\n> ${inner.trim()}\n`);

  return decodeEntities(stripTags(text))
    .replace(/ /g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
