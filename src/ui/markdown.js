// A tiny, safe Markdown renderer for chat bubbles. Everything is HTML-escaped
// first, then a small subset of Markdown is turned back into tags, so neither
// the user nor Claude can inject HTML or scripts.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

const SAFE_URL = /^(?:https?:\/\/|mailto:)[^\s"'<>]+$/i;

function inline(text) {
  const slots = [];
  const stash = (html) => `\u0000${slots.push(html) - 1}\u0000`;
  let s = text;
  // Inline code first, so nothing inside it gets formatted.
  s = s.replace(/`([^`\n]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`));
  // Links: [label](https://…)
  s = s.replace(/\[([^\]\n]{1,200})\]\(([^)\s]{1,2000})\)/g, (m, label, url) => (SAFE_URL.test(url)
    ? stash(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`)
    : m));
  // Bare links.
  s = s.replace(/\bhttps?:\/\/[^\s<>"'`)\]]+[^\s<>"'`)\].,!?;:]/g, (url) => stash(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`));
  s = escapeHtml(s);
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
  // Italics need text hugging the markers, so "2 * 3 * 4" stays maths.
  s = s.replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^\w_])_(?!\s)([^_\n]+?)(?<!\s)_(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[+i]);
}

/** Renders a Markdown subset to safe HTML. */
export function renderMarkdown(src) {
  const text = String(src ?? '').replace(/\r\n?/g, '\n');
  const blocks = [];
  // Fenced code blocks (an unclosed fence while streaming still renders as code).
  const withoutFences = text.replace(/```([\w+-]*)[^\S\n]*\n?([\s\S]*?)(?:```|$(?![\s\S]))/g, (_, lang, code) => {
    blocks.push(`<pre><code${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`);
    return `\n\u0001${blocks.length - 1}\u0001\n`;
  });
  const out = [];
  let list = null;
  let para = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  for (const line of withoutFences.split('\n')) {
    const block = line.match(/^\u0001(\d+)\u0001$/);
    const bullet = line.match(/^\s*(?:[-*•])\s+(.*)$/);
    const numbered = line.match(/^\s*\d{1,3}[.)]\s+(.*)$/);
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (block) { flushPara(); flushList(); out.push(blocks[+block[1]]); continue; }
    if (bullet || numbered) {
      flushPara();
      const tag = bullet ? 'ul' : 'ol';
      if (list && list.tag !== tag) flushList();
      list ??= { tag, items: [] };
      list.items.push((bullet ?? numbered)[1]);
      continue;
    }
    flushList();
    if (quote) { flushPara(); out.push(`<blockquote>${inline(quote[1])}</blockquote>`); continue; }
    if (!line.trim()) { flushPara(); continue; }
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) { flushPara(); out.push(`<p><strong>${inline(heading[1])}</strong></p>`); continue; }
    para.push(line);
  }
  flushPara();
  flushList();
  return out.join('');
}

/** Plain text for speech synthesis and notifications. */
export function toPlainText(src) {
  return String(src ?? '')
    .replace(/```[\s\S]*?```/g, ' (code) ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~#>]/g, '')
    .replace(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
