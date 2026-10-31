#!/usr/bin/env node

/**
 * kiwi-paper renderer — Markdown to HTML CLI
 *
 * Usage:
 *   node render.mjs -i <path|url...> -o <dir> [--title <str>] [--no-toc] [--single] [--split] [--no-images]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync, realpathSync } from 'node:fs';
import { resolve, basename, dirname, extname, join, sep } from 'node:path';
import { createRequire } from 'node:module';
import { program } from 'commander';
import { Marked, Lexer } from 'marked';
import markedFootnote from 'marked-footnote';
import markedKatexExtension from 'marked-katex-extension';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import { createHighlighter } from 'shiki';
import { renderPage, renderIndexPage } from './template.mjs';
import { decodeEntities, escapeHtml, safeHref, sanitizeRawHtml } from './sanitize.mjs';
import { fetchSafe, readBody } from './net.mjs';
import { htmlToBasicMarkdown } from './html2md.mjs';

const require = createRequire(import.meta.url);

const MAX_IMG_SIZE = 50 * 1024 * 1024;
const MAX_PAGE_SIZE = 20 * 1024 * 1024;
const MAX_PARALLEL_DOWNLOADS = 4;

const LANG_ALIASES = {
  sh: 'shell', zsh: 'shell', console: 'shell',
  js: 'javascript', ts: 'typescript',
  py: 'python', rb: 'ruby',
  yml: 'yaml',
  tex: 'latex',
  md: 'markdown',
  txt: 'text', '': 'text',
};

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
  const { marked } = await initMarked();

  // Read KaTeX CSS
  const katexCss = loadKatexCss();

  // Render each file
  const rendered = [];
  for (const file of files) {
    // Images are downloaded/copied while marked walks the tokens
    imageContext = opts.images === false
      ? null
      : { outputDir, sourceUrl: file.sourceUrl, sourceDir: file.sourceDir };
    const md = file.content;
    const title = opts.title || extractTitle(md) || file.name;

    // --- Split mode: break this file into h2 sections ---
    if (opts.split && files.length === 1) {
      const sections = splitMarkdown(md, title);

      if (sections.length > 1) {
        for (const sec of sections) {
          const secHtml = stripTitleHeading(await marked.parse(sec.content), sec.title);
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
        continue;
      }
    }

    const html = stripTitleHeading(await marked.parse(md), title);
    const headings = extractHeadings(html);
    const outName = file.name.replace(/\.md$/i, '.html');
    rendered.push({ title, html, headings, outName, srcName: file.name });
  }

  const saved = (await Promise.all(images.cache.values())).filter(Boolean).length;
  if (saved > 0) console.log(`  ✓ ${saved} image(s) processed`);

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
      showToc: opts.toc !== false,
      relatedDocs: siblings,
    });

    const outPath = join(outputDir, r.outName);
    writeFileSync(outPath, pageHtml, 'utf8');
    console.log(`  ✓ ${r.outName}`);
  }

  // Generate index.html for multi-file (split mode already wrote its own)
  if (isMulti && !opts.split) {
    const indexHtml = renderIndexPage({
      title: opts.title || 'kiwi-paper',
      documents: rendered.map((r) => ({ href: r.outName, title: r.title })),
      katexCss,
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
      const { content, url } = await fetchUrl(input);
      // Relative image paths resolve against the final URL after redirects
      files.push({ name: urlToFilename(input), content, sourceUrl: url, sourceDir: null });
    } else {
      const p = resolve(input);
      if (!existsSync(p)) {
        console.error(`Warning: ${input} not found, skipping.`);
        continue;
      }
      const stat = statSync(p);
      if (stat.isDirectory()) {
        const mdFiles = readdirSync(p)
          .filter((f) => /\.md$/i.test(f) && !f.startsWith('.')) // skip ._* AppleDouble files
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

async function fetchUrl(url) {
  console.log(`  ↓ Fetching ${url} ...`);
  const { res, url: finalUrl } = await fetchSafe(url);
  const contentType = res.headers.get('content-type') || '';
  const text = (await readBody(res, MAX_PAGE_SIZE)).toString('utf8');

  // Markdown or plain text is used as is; HTML pages get a basic conversion
  const isMarkdown = contentType.includes('text/markdown') || contentType.includes('text/plain')
    || /\.md$/i.test(new URL(finalUrl).pathname);
  return { content: isMarkdown ? text : htmlToBasicMarkdown(text), url: finalUrl };
}

// ---------------------------------------------------------------------------
// Image localization — runs from marked's walkTokens, so only real image
// tokens are touched (not code blocks), titles and <url> forms are already
// parsed out, and names stay unique across every file in the run.
// ---------------------------------------------------------------------------
let imageContext = null;
const images = { count: 0, cache: new Map(), active: 0, waiting: [] };

function localizeImage(href, { outputDir, sourceUrl, sourceDir }) {
  if (!href || href.startsWith('data:')) return Promise.resolve(href);
  let source;
  if (isUrl(href)) {
    source = href;
  } else if (sourceUrl) {
    try {
      source = new URL(href, sourceUrl).href;
    } catch {
      return Promise.resolve(href);
    }
  } else if (sourceDir) {
    source = resolve(sourceDir, safeDecodeUri(href.split(/[?#]/)[0]));
  } else {
    return Promise.resolve(href);
  }

  // Same source → one download/copy, one file
  if (!images.cache.has(source)) {
    const index = ++images.count;
    const imgDir = join(outputDir, 'images');
    const task = isUrl(source)
      ? withDownloadSlot(() => downloadImage(source, imgDir, index))
      : copyLocalImage(source, sourceDir, imgDir, index);
    images.cache.set(source, task.catch((e) => {
      console.warn(`  Warning: image skipped (${href}): ${e.message}`);
      return null;
    }));
  }
  return images.cache.get(source).then((name) => (name ? `images/${name}` : href));
}

async function withDownloadSlot(fn) {
  while (images.active >= MAX_PARALLEL_DOWNLOADS) await new Promise((r) => images.waiting.push(r));
  images.active++;
  try {
    return await fn();
  } finally {
    images.active--;
    images.waiting.shift()?.();
  }
}

function imageName(index, ext) {
  return `img-${String(index).padStart(2, '0')}${ext}`;
}

async function downloadImage(url, imgDir, index) {
  const { res, url: finalUrl } = await fetchSafe(url, { timeout: 15000 });
  const contentType = res.headers.get('content-type') || '';
  let rejected = null;
  if (contentType && !contentType.startsWith('image/')) rejected = `not an image (${contentType})`;
  // SVG can carry scripts when opened directly
  else if (contentType.includes('svg') || /\.svg(\?|$)/i.test(finalUrl)) rejected = 'SVG blocked for security';
  if (rejected) {
    await res.body?.cancel();
    throw new Error(rejected);
  }

  const buffer = await readBody(res, MAX_IMG_SIZE);
  const imgName = imageName(index, getImageExt(contentType, finalUrl));
  mkdirSync(imgDir, { recursive: true });
  writeFileSync(join(imgDir, imgName), buffer);
  console.log(`  ↓ Image: ${imgName}`);
  return imgName;
}

async function copyLocalImage(localPath, sourceDir, imgDir, index) {
  if (!existsSync(localPath)) throw new Error('file not found');
  const realPath = realpathSync(localPath);
  if (!realPath.startsWith(realpathSync(sourceDir) + sep)) throw new Error('outside the source directory');

  mkdirSync(imgDir, { recursive: true });
  // Already in <output>/images (re-rendering into the source folder)
  if (dirname(realPath) === realpathSync(imgDir)) return basename(realPath);

  const imgName = imageName(index, extname(realPath) || '.png');
  copyFileSync(realPath, join(imgDir, imgName));
  console.log(`  → Image: ${imgName} (copied from ${basename(realPath)})`);
  return imgName;
}

function safeDecodeUri(str) {
  try {
    return decodeURI(str);
  } catch {
    return str;
  }
}

function getImageExt(contentType, url) {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
  if (contentType.includes('gif')) return '.gif';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('avif')) return '.avif';
  // SVG downloads are blocked; no .svg case here
  // Try from URL
  const urlExt = url.match(/\.(png|jpe?g|gif|webp|avif|bmp|tiff?)(\?|$)/i);
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

  const loadedLangs = new Set(highlighter.getLoadedLanguages());

  const marked = new Marked();

  // GFM heading IDs
  marked.use(gfmHeadingId({ prefix: '' }));

  // Footnotes — backRefLabel must not contain {0}: marked-footnote inserts the raw label unescaped
  marked.use(markedFootnote({ description: '각주', backRefLabel: '본문으로 돌아가기' }));

  // KaTeX math
  marked.use(
    markedKatexExtension({
      throwOnError: false,
      output: 'html',
    }),
  );

  // Download/copy images into <output>/images while marked walks the tokens
  marked.use({
    async: true,
    walkTokens(token) {
      if (token.type !== 'image' || !imageContext) return;
      return localizeImage(token.href, imageContext).then((href) => {
        token.href = href;
      });
    },
  });

  // Custom renderer: Shiki code blocks, sanitize raw HTML, .md links → .html, wrap tables for overflow
  marked.use({
    renderer: {
      code({ text, lang }) {
        // Shiki returns a complete <pre>, so don't let marked wrap it again
        const language = resolveLanguage(loadedLangs, lang?.match(/^\S*/)[0]);
        try {
          return highlighter.codeToHtml(text, {
            lang: language,
            themes: { light: 'github-light', dark: 'tokyo-night' },
          });
        } catch {
          return `<pre><code>${escapeHtml(text)}</code></pre>`;
        }
      },
      html({ text }) {
        return sanitizeRawHtml(text);
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        // Only relative links point at sibling documents; external .md links stay as they are
        const isRelative = href && !/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
        const resolvedHref = isRelative ? href.replace(/\.md(?=$|[?#])/i, '.html') : href;
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        return `<a href="${escapeHtml(safeHref(resolvedHref))}"${titleAttr}>${text}</a>`;
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
        const src = escapeHtml(safeHref(href));
        const altText = text ? escapeHtml(text) : '';
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        const caption = text ? `<figcaption>${escapeHtml(text)}</figcaption>` : '';
        return `<figure class="wiki-figure"><img src="${src}" alt="${altText}"${titleAttr} loading="lazy">${caption}</figure>`;
      },
    },
  });

  return { marked };
}

function resolveLanguage(loadedLangs, lang) {
  if (!lang) return 'text';
  const l = lang.toLowerCase().trim();
  const resolved = LANG_ALIASES[l] || l;
  return loadedLangs.has(resolved) ? resolved : 'text';
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
    const text = decodeEntities(
      match[3]
        .replace(/<sup><a [^>]*data-footnote-ref[\s\S]*?<\/sup>/g, '')
        .replace(/<[^>]+>/g, ''),
    ).trim();
    headings.push({ id, text, level });
  }
  return headings;
}

function extractTitle(md) {
  // Lex instead of regex so `# comments` inside code blocks are ignored
  const h1 = Lexer.lex(md).find((t) => t.type === 'heading' && t.depth === 1);
  return h1 ? plainText(h1.tokens).trim() || null : null;
}

function plainText(tokens = []) {
  return tokens.map((t) => (t.tokens ? plainText(t.tokens) : t.text ?? '')).join('');
}

// The page header already shows the title, so drop a leading H1 that repeats it
function stripTitleHeading(html, title) {
  const match = html.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*/);
  if (!match) return html;
  const text = decodeEntities(match[1].replace(/<[^>]+>/g, '')).trim();
  return text === title ? html.slice(match[0].length) : html;
}

// ---------------------------------------------------------------------------
// KaTeX CSS
// ---------------------------------------------------------------------------
function loadKatexCss() {
  try {
    const css = readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf8');
    const { version } = JSON.parse(readFileSync(require.resolve('katex/package.json'), 'utf8'));
    // Rewrite font URLs to the CDN copy of the installed KaTeX version
    return css.replace(/url\(fonts\//g, `url(https://cdn.jsdelivr.net/npm/katex@${version}/dist/fonts/`);
  } catch {
    console.warn('Warning: KaTeX CSS not found, math styling may be missing.');
    return '';
  }
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
  let fenceType = '';
  // Footnote definitions are pulled out and re-attached to every page that cites them
  const footnotes = new Map();
  let footnoteLabel = null;
  const usedSlugs = new Set(['index']);

  for (const line of lines) {
    const fenceMatch = !inCodeBlock && line.trim().match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      fenceType = fenceMatch[1][0];
      inCodeBlock = true;
    } else if (inCodeBlock && line.trim().startsWith(fenceType.repeat(3))) {
      inCodeBlock = false;
      fenceType = '';
    }
    if (!inCodeBlock) {
      const def = line.match(/^\[\^([^\]]+)\]:/);
      if (def) {
        footnoteLabel = def[1];
        footnotes.set(footnoteLabel, [line]);
        continue;
      }
      // Blank or indented lines continue the current definition
      if (footnoteLabel !== null) {
        if (!line.trim() || /^(\s{2,}|\t)/.test(line)) {
          footnotes.get(footnoteLabel).push(line);
          continue;
        }
        footnoteLabel = null;
      }
    }
    const h2Match = !inCodeBlock && line.match(/^## \s*(\d+\.?\s*)?(.+)$/);
    if (h2Match) {
      if (!foundFirstH2) {
        preamble = current.lines;
        foundFirstH2 = true;
      } else {
        sections.push(current);
      }
      const sectionTitle = h2Match[2].trim();
      const baseSlug = sectionTitle
        .toLowerCase()
        .replace(/[^\w\s가-힣-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `section-${sections.length + 1}`;
      // Repeated titles (or one named "index") must not overwrite another page
      let slug = baseSlug;
      for (let n = 2; usedSlugs.has(slug); n++) slug = `${baseSlug}-${n}`;
      usedSlugs.add(slug);
      current = { title: sectionTitle, slug, lines: [line], level: 2 };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) sections.push(current);

  const withFootnotes = (content) => {
    const cited = new Set([...content.matchAll(/\[\^([^\]]+)\](?!:)/g)].map((m) => m[1]));
    const defs = [...cited].filter((l) => footnotes.has(l)).map((l) => footnotes.get(l).join('\n').trimEnd());
    return defs.length > 0 ? `${content}\n\n${defs.join('\n\n')}\n` : content;
  };

  // Build section objects with preamble prepended to first or as index
  const result = [];

  // Index/overview page with preamble + TOC links
  if (preamble.length > 0 || sections.length > 1) {
    let indexMd = preamble.join('\n') + '\n\n---\n\n';
    indexMd += '## 문서 목차\n\n';
    sections.forEach((s, i) => {
      indexMd += `${i + 1}. [${s.title}](${s.slug}.html)\n`;
    });
    result.push({ title: baseTitle, slug: 'index', content: withFootnotes(indexMd) });
  }

  // Individual section pages
  sections.forEach((s) => {
    result.push({ title: s.title, slug: s.slug, content: withFootnotes(s.lines.join('\n')) });
  });

  return result;
}

// ---------------------------------------------------------------------------
main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
