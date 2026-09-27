import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, toPlainText } from '../src/ui/markdown.js';

test('HTML is always escaped (no XSS from users or Claude)', () => {
  const evil = [
    '<img src=x onerror=alert(1)>',
    '<script>alert(1)</script>',
    '[click](javascript:alert(1))',
    '[x](data:text/html,<script>alert(1)</script>)',
    '**<b onmouseover=alert(1)>hi</b>**',
    '`<script>`',
    '```\n<script>alert(1)</script>\n```',
    '"><svg onload=alert(1)>',
    '[a](https://example.com" onmouseover="alert(1))',
  ];
  for (const e of evil) {
    const html = renderMarkdown(e);
    assert.doesNotMatch(html, /<(?:img|script|svg|b )/i, e);
    assert.doesNotMatch(html, /href="(?:javascript|data):/i, e);
    assert.doesNotMatch(html, /<[^>]*\son\w+=/i, e); // event handlers inside a real tag
  }
});

test('the supported Markdown subset renders', () => {
  assert.equal(renderMarkdown('**bold** and *it* and `code`'), '<p><strong>bold</strong> and <em>it</em> and <code>code</code></p>');
  assert.equal(renderMarkdown('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
  assert.equal(renderMarkdown('1. one\n2. two'), '<ol><li>one</li><li>two</li></ol>');
  assert.match(renderMarkdown('[site](https://example.com)'), /<a href="https:\/\/example\.com" target="_blank" rel="noopener noreferrer">site<\/a>/);
  assert.match(renderMarkdown('see https://example.com/x.'), /href="https:\/\/example\.com\/x"/);
  assert.equal(renderMarkdown('```js\nlet a = 1 < 2;\n```'), '<pre><code data-lang="js">let a = 1 &lt; 2;</code></pre>');
  assert.equal(renderMarkdown('line one\nline two'), '<p>line one<br>line two</p>');
  assert.equal(renderMarkdown('2 * 3 * 4'), '<p>2 * 3 * 4</p>');
  assert.match(renderMarkdown('```\nunclosed while streaming'), /<pre><code>unclosed while streaming<\/code><\/pre>/);
});

test('plain text for speech drops markup and emoji', () => {
  assert.equal(toPlainText('**Hi** 👋 [there](https://x.y)! `code`'), 'Hi there! code');
});
