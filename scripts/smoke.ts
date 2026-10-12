import { findDecorations } from "../src/matchers";

const ALL = { backslash: true, htmlEntities: true, urlEncoding: true };

interface Case {
  label: string;
  input: string;
  expected: string[];
  opts?: { backslash?: boolean; htmlEntities?: boolean; urlEncoding?: boolean };
}

const cases: Case[] = [
  // 反斜杠转义
  { label: "LF", input: "hello\\nworld", expected: ["␊"] },
  { label: "TAB / CR", input: "a\\tb\\rc", expected: ["␉", "␍"] },
  { label: "NUL/BS/FF/VT", input: "\\0\\b\\f\\v", expected: ["␀", "␈", "␌", "␋"] },
  { label: "\\xHH", input: "\\x41\\x2b", expected: ["A", "+"] },
  { label: "\\uHHHH", input: "\\u003e\\u4e2d", expected: [">", "中"] },
  { label: "\\u{...}", input: "\\u{1F600}\\u{41}", expected: ["😀", "A"] },
  { label: "escaped backslash", input: "\\\\n", expected: ["\\"] },
  { label: "quote escapes", input: "\\' \\\"", expected: ["'", '"'] },
  { label: "surrogate \\uD800 invalid", input: "\\uD800", expected: [] },
  { label: "\\u{110000} out of range", input: "\\u{110000}", expected: [] },

  // HTML 实体
  { label: "core entities", input: "&lt;&gt;&amp;&quot;", expected: ["<", ">", "&", '"'] },
  { label: "nbsp", input: "&nbsp;", expected: ["\u233d"] },
  { label: "numeric entities", input: "&#62;&#x3e;&#128512;", expected: [">", ">", "😀"] },
  {
    label: "common named entities",
    input: "&copy;&hellip;&mdash;&rarr;&hearts;&euro;&trade;",
    expected: ["©", "…", "—", "→", "♥", "€", "™"],
  },
  { label: "&#0;", input: "&#0;", expected: ["␀"] },

  // URL 百分号编码
  { label: "%3C", input: "a%3Cb", expected: ["<"] },
  { label: "%20 space", input: "q=%20", expected: ["␣"] },
  { label: "utf-8 multi-byte", input: "%E4%B8%AD%E6%96%87", expected: ["中文"] },
  { label: "emoji run", input: "%F0%9F%98%80", expected: ["😀"] },
  { label: "ascii run merged", input: "%41%25", expected: ["A%"] },

  // 边界：不应误识别
  { label: "prose false positives", input: "AT&T 100%beef &unknown; %G1 &amp", expected: [] },
  { label: "plain text", input: "a<b c>d 50% off", expected: [] },
  { label: "empty", input: "", expected: [] },

  // 分类型开关
  { label: "backslash off", input: "\\n&lt;%20", expected: ["<", "␣"], opts: { backslash: false } },
  { label: "html off", input: "\\n&lt;%20", expected: ["␊", "␣"], opts: { htmlEntities: false } },
  { label: "url off", input: "\\n&lt;%20", expected: ["␊", "<"], opts: { urlEncoding: false } },
];

let failed = 0;
for (const c of cases) {
  const got = findDecorations(c.input, { ...ALL, ...c.opts }).map((d) => d.display);
  const ok = got.length === c.expected.length && got.every((g, i) => g === c.expected[i]);
  if (ok) {
    console.log(`ok   ${c.label}`);
  } else {
    failed++;
    console.error(`FAIL ${c.label}`);
    console.error(`  input:    ${JSON.stringify(c.input)}`);
    console.error(`  expected: ${JSON.stringify(c.expected)}`);
    console.error(`  got:      ${JSON.stringify(got)}`);
  }
}

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log(`\nall ${cases.length} cases passed`);
