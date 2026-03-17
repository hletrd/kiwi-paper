#!/usr/bin/env node

/**
 * kiwi-paper renderer — Markdown to HTML CLI
 *
 * Usage:
 *   node render.mjs -i <path|url> -o <dir> [--title <str>] [--no-toc] [--single]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, basename, dirname, extname, join, relative } from 'node:path';
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
    const md = file.content;
    const headings = extractHeadings(md);
    const title = opts.title || extractTitle(md) || file.name;
    const html = await marked.parse(md);
    const outName = file.name.replace(/\.md$/i, '.html');

    rendered.push({ title, html, headings, outName, srcName: file.name });
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

    const pageHtml = renderPage({
      title: r.title,
      bodyHtml: r.html,
      headings: r.headings,
      navigation,
      katexCss,
      shikiCss,
      showToc: opts.toc !== false,
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
      files.push({ name, content });
    } else {
      const p = resolve(input);
      if (!existsSync(p)) {
        console.error(`Warning: ${input} not found, skipping.`);
        continue;
      }
      const stat = (await import('node:fs')).statSync(p);
      if (stat.isDirectory()) {
        const mdFiles = readdirSync(p)
          .filter((f) => /\.md$/i.test(f))
          .sort();
        for (const f of mdFiles) {
          files.push({ name: f, content: readFileSync(join(p, f), 'utf8') });
        }
      } else {
        files.push({ name: basename(p), content: readFileSync(p, 'utf8') });
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
  const res = await fetch(url);
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
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n');

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
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${resolvedHref}"${titleAttr}>${text}</a>`;
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
// Heading extraction
// ---------------------------------------------------------------------------
function extractHeadings(md) {
  const headings = [];
  const lines = md.split('\n');

  for (const line of lines) {
    // Skip code blocks
    if (line.trim().startsWith('```')) continue;

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const raw = match[2].trim();
      // Strip inline markdown for plain text
      const text = raw
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      const id = text
        .toLowerCase()
        .replace(/[^\w\s가-힣-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      headings.push({ id, text, level });
    }
  }

  return headings;
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
main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
