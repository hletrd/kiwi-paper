#!/usr/bin/env node

/**
 * kiwi-paper renderer — Markdown to HTML CLI
 *
 * Usage:
 *   node render.mjs -i <path|url> -o <dir> [--title <str>] [--no-toc] [--single]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync, realpathSync } from 'node:fs';
import { resolve, basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { program } from 'commander';
import { Marked } from 'marked';
import markedFootnote from 'marked-footnote';
import markedKatexExtension from 'marked-katex-extension';
import { markedHighlight } from 'marked-highlight';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { createHighlighter } from 'shiki';
import { renderPage, renderIndexPage } from './template.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
program
  .name('kiwi-render')
  .description('Render kiwi-paper markdown to HTML')
  .requiredOption('-i, --input <paths...>', 'Input markdown file(s), directory, or URL(s)')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('-t, --title <string>', 'Document title (default: first H1 or filename)')
  .option('--no-toc', 'Disable table of contents sidebar')
  .option('--single', 'Force single-file mode (no index page)')
  .option('--no-images', 'Disable image downloading')
  .option('--split', 'Split document into separate pages per h2 section')
  .parse();

const opts = program.opts();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const outputDir = resolve(opts.output);
  mkdirSync(outputDir, { recursive: true });

  // Collect input files
  const files = await collectInputs(opts.input);

  if (files.length === 0) {
    console.error('Error: No markdown files found.');
    process.exit(1);
  }

  // Initialize rendering pipeline
  const { marked, shikiCss } = await initMarked();

  // Read KaTeX CSS
  const katexCss = loadKatexCss();

  // Render each file
  const rendered = [];
  for (const file of files) {
    let md = file.content;
    // Download images if enabled
    if (opts.images !== false) {
      md = await processImages(md, outputDir, file.sourceUrl, file.sourceDir);
    }
    const title = opts.title || extractTitle(md) || file.name;
    const html = sanitizeHtml(await marked.parse(md));
    const headings = extractHeadings(html);
    const outName = file.name.replace(/\.md$/i, '.html');

    rendered.push({ title, html, headings, outName, srcName: file.name });
  }

  // --- Split mode: break each file into h2 sections ---
  if (opts.split && rendered.length === 1) {
    const r = rendered[0];
    const file = files[0];
    const sections = splitMarkdown(file.content, r.title);

    if (sections.length > 1) {
      // Re-render each section
      rendered.length = 0;
      for (const sec of sections) {
        let secMd = sec.content;
        if (opts.images !== false) {
          secMd = await processImages(secMd, outputDir, file.sourceUrl, file.sourceDir);
        }
        const secHtml = sanitizeHtml(await marked.parse(secMd));
        const secHeadings = extractHeadings(secHtml);
        const outName = sec.slug + '.html';
        rendered.push({
          title: sec.title,
          html: secHtml,
          headings: secHeadings,
          outName,
          srcName: sec.slug + '.md',
        });
      }
      console.log(`  ✂ Split into ${rendered.length} pages`);
    }
  }

  const isMulti = rendered.length > 1 && !opts.single;

  // Write HTML files
  for (let i = 0; i < rendered.length; i++) {
    const r = rendered[i];
    const navigation = isMulti
      ? {
          prev: i > 0 ? { href: rendered[i - 1].outName, title: rendered[i - 1].title } : undefined,
          next: i < rendered.length - 1 ? { href: rendered[i + 1].outName, title: rendered[i + 1].title } : undefined,
          index: 'index.html',
        }
      : {};

    // Build related/sub docs from sibling pages in split mode
    const siblings = (opts.split && rendered.length > 1)
      ? rendered.filter((s, j) => j !== i && s.outName !== 'index.html').map(s => ({ title: s.title, href: s.outName }))
      : [];

    const pageHtml = renderPage({
      title: r.title,
      bodyHtml: r.html,
      headings: r.headings,
      navigation,
      katexCss,
      shikiCss,
      showToc: opts.toc !== false,
      relatedDocs: siblings,
    });

    const outPath = join(outputDir, r.outName);
    writeFileSync(outPath, pageHtml, 'utf8');
    console.log(`  ✓ ${r.outName}`);
  }

  // Generate index.html for multi-file
  if (isMulti) {
    const indexHtml = renderIndexPage({
      title: opts.title || 'kiwi-paper',
      documents: rendered.map((r) => ({ href: r.outName, title: r.title })),
      katexCss,
      shikiCss,
    });
    writeFileSync(join(outputDir, 'index.html'), indexHtml, 'utf8');
    console.log('  ✓ index.html');
  }

  console.log(`\nDone! ${rendered.length} file(s) → ${outputDir}`);
}

// ---------------------------------------------------------------------------
// Input collection (files, directories, URLs)
// ---------------------------------------------------------------------------
async function collectInputs(inputs) {
  const files = [];

  for (const input of inputs) {
    if (isUrl(input)) {
      const content = await fetchUrl(input);
      const name = urlToFilename(input);
      files.push({ name, content, sourceUrl: input, sourceDir: null });
    } else {
      const p = resolve(input);
      if (!existsSync(p)) {
        console.error(`Warning: ${input} not found, skipping.`);
        continue;
      }
      const stat = statSync(p);
      if (stat.isDirectory()) {
        const mdFiles = readdirSync(p)
          .filter((f) => /\.md$/i.test(f))
          .sort();
        for (const f of mdFiles) {
          files.push({ name: f, content: readFileSync(join(p, f), 'utf8'), sourceUrl: null, sourceDir: p });
        }
      } else {
        files.push({ name: basename(p), content: readFileSync(p, 'utf8'), sourceUrl: null, sourceDir: dirname(p) });
      }
    }
  }

  return files;
}

function isUrl(s) {
  return /^https?:\/\//i.test(s);
}

function isSafeUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    return false;
  }
  // Only allow http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  // Block localhost and loopback
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
  // Block IPv6 loopback (::1 and expanded forms)
  if (host === '::1' || host === '[::1]') return false;
  if (/^\[?0{0,4}:0{0,4}:0{0,4}:0{0,4}:0{0,4}:0{0,4}:0{0,4}:0*1\]?$/.test(host)) return false;
  // Block IPv6 unique local (fc00::/7 — fc and fd prefixes)
  if (/^\[?f[cd]/i.test(host)) return false;
  // Block IPv6 link-local (fe80::/10)
  if (/^\[?fe[89ab]/i.test(host)) return false;
  // Block IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (/^\[?::ffff:/i.test(host)) return false;
  // Block all raw IPv6 addresses (bracket-enclosed) as a safe default
  if (/^\[/.test(host)) return false;
  // Block cloud metadata hostnames
  if (host === 'metadata.google.internal' || host === 'metadata.goog') return false;
  if (host === 'instance-data') return false;
  // Block link-local IPv4
  if (/^169\.254\./.test(host)) return false;
  // Block private IPv4 ranges
  if (/^10\./.test(host)) return false;
  if (/^192\.168\./.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
  return true;
}

async function fetchUrl(url, maxRedirects = 5) {
  if (!isSafeUrl(url)) throw new Error(`Blocked unsafe URL: ${url}`);
  if (maxRedirects <= 0) throw new Error(`Too many redirects fetching ${url}`);
  console.log(`  ↓ Fetching ${url} ...`);
  const res = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location') || '';
    if (!location || !isSafeUrl(location)) throw new Error(`Blocked unsafe redirect from ${url}`);
    return fetchUrl(location, maxRedirects - 1);
  }
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const contentType = res.headers.get('content-type') || '';

  // If it's already markdown or plain text, return directly
  if (contentType.includes('text/markdown') || contentType.includes('text/plain') || url.endsWith('.md')) {
    return await res.text();
  }

  // For HTML pages, do a basic extraction of text content
  const html = await res.text();
  return htmlToBasicMarkdown(html);
}

function htmlToBasicMarkdown(html) {
  // Strip scripts, styles, nav, header, footer
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // Convert common elements to markdown
  text = text
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, href, text) => {
      const decoded = href
        .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/\s/g, '').toLowerCase();
      if (/^(javascript|vbscript|data):/.test(decoded)) return text;
      return `[${text}](${href})`;
    })
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');

  // Preserve images (handles any attribute order)
  text = text.replace(/<img[^>]*?\/?>/gi, (tag) => {
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    const altMatch = tag.match(/alt=["']([^"']*?)["']/i);
    if (!srcMatch) return '';
    return `\n![${altMatch ? altMatch[1] : ''}](${srcMatch[1]})\n`;
  });

  // Handle figure elements
  text = text.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, (_, content) => {
    const imgMatch = content.match(/src=["']([^"']+)["']/i);
    const captionMatch = content.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
    if (imgMatch) {
      return `\n![${captionMatch ? captionMatch[1].replace(/<[^>]+>/g, '').trim() : ''}](${imgMatch[1]})\n`;
    }
    return '';
  });
  // Handle picture elements (use first source or img)
  text = text.replace(/<picture[^>]*>([\s\S]*?)<\/picture>/gi, (_, content) => {
    const srcMatch = content.match(/src=["']([^"']+)["']/i) || content.match(/srcset=["']([^\s"']+)/i);
    if (srcMatch) return `\n![](${srcMatch[1]})\n`;
    return '';
  });

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Clean up whitespace
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

// ---------------------------------------------------------------------------
// Image extraction and download
// ---------------------------------------------------------------------------
async function processImages(markdown, outputDir, sourceUrl, sourceDir) {
  const imgDir = join(outputDir, 'images');
  let modified = markdown;
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const matches = [...markdown.matchAll(imgRegex)];

  if (matches.length === 0) return modified;

  mkdirSync(imgDir, { recursive: true });
  let count = 0;

  for (const match of matches) {
    const [full, alt, src] = match;

    // Skip data URIs
    if (src.startsWith('data:')) continue;
    // Skip already-processed local images
    if (src.startsWith('images/')) continue;

    try {
      if (isUrl(src)) {
        // Remote image: download
        const result = await downloadRemoteImage(src, imgDir, count);
        if (result) {
          modified = modified.split(full).join(`![${alt}](images/${result})`);
          count++;
          console.log(`  ↓ Image: ${result}`);
        }
      } else if (sourceUrl && !isUrl(src)) {
        // Relative URL from web source: resolve against sourceUrl
        try {
          const resolved = new URL(src, sourceUrl).href;
          const result = await downloadRemoteImage(resolved, imgDir, count);
          if (result) {
            modified = modified.split(full).join(`![${alt}](images/${result})`);
            count++;
            console.log(`  ↓ Image: ${result}`);
          }
        } catch (e) { console.warn('  Warning: image processing failed:', e.message); }
      } else if (sourceDir) {
        // Local relative path: copy file to images/
        const localPath = resolve(sourceDir, src);
        if (existsSync(localPath)) {
          const realPath = realpathSync(localPath);
          const realSource = realpathSync(sourceDir);
          if (!realPath.startsWith(realSource + '/') && realPath !== realSource) {
            console.warn(`  Warning: path traversal blocked: ${src}`);
            continue;
          }
          const ext = extname(localPath) || '.png';
          const imgName = `img-${String(count + 1).padStart(2, '0')}${ext}`;
          const destPath = join(imgDir, imgName);
          copyFileSync(localPath, destPath);
          modified = modified.split(full).join(`![${alt}](images/${imgName})`);
          count++;
          console.log(`  → Image: ${imgName} (copied from ${basename(localPath)})`);
        }
      }
    } catch (e) {
      console.warn('  Warning: image processing failed:', e.message);
    }
  }

  if (count > 0) console.log(`  ✓ ${count} image(s) processed`);
  return modified;
}

async function downloadRemoteImage(url, imgDir, index, maxRedirects = 5) {
  if (!isSafeUrl(url)) {
    console.warn(`  Warning: blocked unsafe image URL: ${url}`);
    return null;
  }
  if (maxRedirects <= 0) {
    console.warn(`  Warning: too many redirects for image: ${url}`);
    return null;
  }
  try {
    const imgRes = await fetch(url, {
      headers: { 'User-Agent': 'kiwi-paper-renderer/1.0' },
      signal: AbortSignal.timeout(15000),
      redirect: 'manual',
    });

    if (imgRes.status >= 300 && imgRes.status < 400) {
      const location = imgRes.headers.get('location') || '';
      if (!location || !isSafeUrl(location)) {
        console.warn(`  Warning: blocked unsafe image redirect from ${url}`);
        return null;
      }
      return downloadRemoteImage(location, imgDir, index, maxRedirects - 1);
    }

    if (!imgRes.ok) return null;

    const contentType = imgRes.headers.get('content-type') || '';
    if (contentType && !contentType.startsWith('image/')) return null;

    // Block SVG downloads entirely (can contain scripts)
    if (contentType.includes('svg') || /\.svg(\?|$)/i.test(url)) {
      console.warn(`  Warning: SVG download blocked for security: ${url}`);
      return null;
    }

    const ext = getImageExt(contentType, url);
    const imgName = `img-${String(index + 1).padStart(2, '0')}${ext}`;
    const imgPath = join(imgDir, imgName);

    // Stream with hard 50MB limit
    const MAX_IMG_SIZE = 50 * 1024 * 1024;
    const chunks = [];
    let totalSize = 0;
    for await (const chunk of imgRes.body) {
      totalSize += chunk.length;
      if (totalSize > MAX_IMG_SIZE) {
        imgRes.body.cancel();
        console.warn(`  Warning: image exceeds 50MB, skipping: ${url}`);
        return null;
      }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    writeFileSync(imgPath, buffer);
    return imgName;
  } catch (e) {
    console.warn('  Warning: image processing failed:', e.message);
    return null;
  }
}

function getImageExt(contentType, url) {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
  if (contentType.includes('gif')) return '.gif';
  if (contentType.includes('webp')) return '.webp';
  // SVG downloads are blocked; no .svg case here
  // Try from URL
  const urlExt = url.match(/\.(png|jpe?g|gif|webp|bmp|tiff?)(\?|$)/i);
  if (urlExt) return '.' + urlExt[1].toLowerCase();
  return '.png'; // default
}

function urlToFilename(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    const last = path.split('/').pop() || u.hostname;
    const name = last.replace(/\.html?$/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
    return (name || 'page') + '.md';
  } catch {
    return 'page.md';
  }
}

// ---------------------------------------------------------------------------
// Marked pipeline
// ---------------------------------------------------------------------------
async function initMarked() {
  // Initialize Shiki highlighter
  const highlighter = await createHighlighter({
    themes: ['github-light', 'tokyo-night'],
    langs: [
      'python', 'javascript', 'typescript', 'bash', 'json', 'yaml', 'html',
      'css', 'c', 'cpp', 'java', 'rust', 'go', 'sql', 'latex', 'markdown',
      'diff', 'shell', 'text', 'plaintext',
    ],
  });

  let shikiCss = '';

  const marked = new Marked();

  // GFM heading IDs
  marked.use(gfmHeadingId({ prefix: '' }));

  // Footnotes
  marked.use(markedFootnote());

  // KaTeX math
  marked.use(
    markedKatexExtension({
      throwOnError: false,
      output: 'html',
    }),
  );

  // Shiki highlighting (dual theme)
  marked.use(
    markedHighlight({
      async: true,
      highlight(code, lang) {
        const language = resolveLanguage(highlighter, lang);
        try {
          const lightHtml = highlighter.codeToHtml(code, { lang: language, theme: 'github-light' });
          const darkHtml = highlighter.codeToHtml(code, { lang: language, theme: 'tokyo-night' });
          // Wrap in theme-switchable containers
          return `<div class="shiki-light">${lightHtml}</div><div class="shiki-dark">${darkHtml}</div>`;
        } catch {
          return code;
        }
      },
    }),
  );

  // Custom renderer: .md links → .html, wrap tables for overflow
  marked.use({
    renderer: {
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const resolvedHref = href && href.endsWith('.md') ? href.replace(/\.md$/, '.html') : href;
        const safeHref = escHtml(isSafeHref(resolvedHref));
        const titleAttr = title ? ` title="${escHtml(title)}"` : '';
        return `<a href="${safeHref}"${titleAttr}>${text}</a>`;
      },
      table({ header, rows }) {
        // Use default table rendering but wrapped for scroll
        const headerCells = header
          .map((cell) => {
            const content = this.parser.parseInline(cell.tokens);
            const align = cell.align ? ` style="text-align:${cell.align}"` : '';
            return `<th${align}>${content}</th>`;
          })
          .join('');
        const bodyRows = rows
          .map((row) => {
            const cells = row
              .map((cell) => {
                const content = this.parser.parseInline(cell.tokens);
                const align = cell.align ? ` style="text-align:${cell.align}"` : '';
                return `<td${align}>${content}</td>`;
              })
              .join('');
            return `<tr>${cells}</tr>`;
          })
          .join('');
        return `<div style="overflow-x:auto"><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
      },
      image({ href, title, text }) {
        const safeHref = href ? escHtml(isSafeHref(href)) : '';
        const altText = text ? escHtml(text) : '';
        const titleAttr = title ? ` title="${escHtml(title)}"` : '';
        const caption = text ? `<figcaption>${escHtml(text)}</figcaption>` : '';
        return `<figure class="wiki-figure"><img src="${safeHref}" alt="${altText}"${titleAttr} loading="lazy">${caption}</figure>`;
      },
    },
  });

  return { marked, shikiCss };
}

function resolveLanguage(highlighter, lang) {
  if (!lang) return 'text';
  const l = lang.toLowerCase().trim();
  const aliases = {
    sh: 'shell', zsh: 'shell', console: 'shell',
    js: 'javascript', ts: 'typescript',
    py: 'python', rb: 'ruby',
    yml: 'yaml',
    tex: 'latex',
    md: 'markdown',
    txt: 'text', '': 'text',
  };
  const resolved = aliases[l] || l;
  const loaded = highlighter.getLoadedLanguages();
  return loaded.includes(resolved) ? resolved : 'text';
}

// ---------------------------------------------------------------------------
// Heading extraction (from rendered HTML — guarantees IDs match gfmHeadingId)
// ---------------------------------------------------------------------------
function extractHeadings(html) {
  const headings = [];
  const regex = /<h([2-6])\s[^>]*?\bid="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const id = match[2];
    if (id === 'footnote-label') continue; // Skip auto-generated footnotes heading
    const text = match[3].replace(/<[^>]+>/g, '').trim();
    headings.push({ id, text, level });
  }
  return headings;
}

// ---------------------------------------------------------------------------
// HTML sanitization — strip dangerous tags and event handler attributes
// ---------------------------------------------------------------------------
function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<(script|iframe|object|embed|style|form|svg|link|meta|base|noscript|template)[^>]*\/?>/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Strip javascript:/vbscript:/data: from href, src, action, formaction attributes
    .replace(/\b(href|src|action|formaction)\s*=\s*"[^"]*?\b(javascript|vbscript)\s*:[^"]*"/gi, '')
    .replace(/\b(href|src|action|formaction)\s*=\s*'[^']*?\b(javascript|vbscript)\s*:[^']*'/gi, '')
    .replace(/\b(href|src|action|formaction)\s*=\s*(?:javascript|vbscript)\s*:[^\s>]*/gi, '')
    // Strip style attributes from raw HTML
    .replace(/\bstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Strip ping attribute (no legitimate use)
    .replace(/\bping\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Entity-aware URI scheme check for all URL-accepting attributes
    .replace(/\b(href|src|action|formaction|poster|background|lowsrc|dynsrc|ping|xlink:href)\s*=\s*("[^"]*"|'[^']*')/gi, (match, attr, val) => {
      const q = val[0];
      const inner = val.slice(1, -1);
      const decoded = inner
        .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);?/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, '')
        .toLowerCase();
      if (/^(javascript|vbscript|data)\s*:/.test(decoded)) return '';
      return match;
    });
}

// ---------------------------------------------------------------------------
// URI scheme safety check — blocks javascript:, vbscript:, data:text/html, file:
// ---------------------------------------------------------------------------
function isSafeHref(href) {
  if (!href) return '';
  const trimmed = href.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:') ||
      trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('file:')) {
    return '';
  }
  return href;
}

// ---------------------------------------------------------------------------
// HTML escaping for safe attribute/content interpolation
// ---------------------------------------------------------------------------
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractTitle(md) {
  const match = md.match(/^#\s+(.+)$/m);
  if (!match) return null;
  return match[1]
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .trim();
}

// ---------------------------------------------------------------------------
// KaTeX CSS
// ---------------------------------------------------------------------------
function loadKatexCss() {
  const candidates = [
    join(__dirname, '..', 'node_modules', 'katex', 'dist', 'katex.min.css'),
    join(process.cwd(), 'node_modules', 'katex', 'dist', 'katex.min.css'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      let css = readFileSync(p, 'utf8');
      // Rewrite font URLs to CDN
      css = css.replace(
        /url\(fonts\//g,
        'url(https://cdn.jsdelivr.net/npm/katex@0.16.38/dist/fonts/',
      );
      return css;
    }
  }
  console.warn('Warning: KaTeX CSS not found, math styling may be missing.');
  return '';
}

// ---------------------------------------------------------------------------
// Document splitting by h2 sections
// ---------------------------------------------------------------------------
function splitMarkdown(md, baseTitle) {
  const lines = md.split('\n');
  const sections = [];
  let current = { title: baseTitle, slug: 'index', lines: [], level: 0 };
  let preamble = [];
  let foundFirstH2 = false;
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) inCodeBlock = !inCodeBlock;
    const h2Match = !inCodeBlock && line.match(/^## \s*(\d+\.?\s*)?(.+)$/);
    if (h2Match) {
      if (!foundFirstH2) {
        preamble = current.lines;
        foundFirstH2 = true;
      } else {
        sections.push(current);
      }
      const sectionTitle = h2Match[2].trim();
      const slug = sectionTitle
        .toLowerCase()
        .replace(/[^\w\s가-힣-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `section-${sections.length + 1}`;
      current = { title: sectionTitle, slug, lines: [line], level: 2 };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) sections.push(current);

  // Build section objects with preamble prepended to first or as index
  const result = [];

  // Index/overview page with preamble + TOC links
  if (preamble.length > 0 || sections.length > 1) {
    let indexMd = preamble.join('\n') + '\n\n---\n\n';
    indexMd += '## 문서 목차\n\n';
    sections.forEach((s, i) => {
      indexMd += `${i + 1}. [${s.title}](${s.slug}.html)\n`;
    });
    result.push({ title: baseTitle, slug: 'index', content: indexMd });
  }

  // Individual section pages
  sections.forEach((s) => {
    result.push({ title: s.title, slug: s.slug, content: s.lines.join('\n') });
  });

  return result;
}

// ---------------------------------------------------------------------------
main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
