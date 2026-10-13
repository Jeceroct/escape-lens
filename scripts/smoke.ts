import { findDecorations, decodeExact } from "../src/matchers";
import { encodeText, EscapeStyle } from "../src/encoder";

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

// ---- 编码方向：escape-lens.replace.* 使用的纯函数 ----

interface EncodeCase {
  label: string;
  input: string;
  style: EscapeStyle;
  expected: string;
}

const encodeCases: EncodeCase[] = [
  {
    label: "backslash simple controls",
    input: "\n\t\r\b\f\v\0",
    style: "backslash",
    expected: String.raw`\n\t\r\b\f\v\0`,
  },
  {
    label: "backslash quotes",
    input: "'\"`\\",
    style: "backslash",
    expected: String.raw`\'\"\`\\`,
  },
  {
    label: "backslash x/u/u{}",
    input: "a\n<中😀",
    style: "backslash",
    expected: String.raw`\x61\n\x3c\u4e2d\u{1f600}`,
  },
  {
    label: "unicode + surrogate pair",
    input: "a<中😀",
    style: "unicode",
    expected: String.raw`\u0061\u003c\u4e2d\ud83d\ude00`,
  },
  {
    label: "html named + numeric fallback",
    input: "<&>\"'中",
    style: "htmlNamed",
    expected: "&lt;&amp;&gt;&quot;&apos;&#20013;",
  },
  { label: "html decimal", input: "<中😀", style: "htmlDecimal", expected: "&#60;&#20013;&#128512;" },
  { label: "html hex", input: "<中😀", style: "htmlHex", expected: "&#x3c;&#x4e2d;&#x1f600;" },
  {
    label: "url keeps unreserved chars",
    input: "a<中 😀don't",
    style: "url",
    expected: "a%3C%E4%B8%AD%20%F0%9F%98%80don't",
  },
  { label: "empty selection", input: "", style: "url", expected: "" },
];

for (const c of encodeCases) {
  const got = encodeText(c.input, c.style);
  if (got === c.expected) {
    console.log(`ok   ${c.label}`);
  } else {
    failed++;
    console.error(`FAIL ${c.label}`);
    console.error(`  input:    ${JSON.stringify(c.input)}`);
    console.error(`  style:    ${c.style}`);
    console.error(`  expected: ${JSON.stringify(c.expected)}`);
    console.error(`  got:      ${JSON.stringify(got)}`);
  }
}

// 编码结果应能被自家解码器认出来，形成闭环
const roundTrips: Array<{ label: string; input: string; style: EscapeStyle; badge: string }> = [
  { label: "round-trip url", input: "<中", style: "url", badge: "<中" },
  { label: "round-trip backslash", input: "\n", style: "backslash", badge: "␊" },
  { label: "round-trip html hex", input: "<&", style: "htmlHex", badge: "<&" },
];

for (const rt of roundTrips) {
  const badges = findDecorations(encodeText(rt.input, rt.style), ALL).map((d) => d.display).join("");
  if (badges === rt.badge) {
    console.log(`ok   ${rt.label}`);
  } else {
    failed++;
    console.error(`FAIL ${rt.label}`);
    console.error(`  input:    ${JSON.stringify(rt.input)}`);
    console.error(`  expected: ${JSON.stringify(rt.badge)}`);
    console.error(`  got:      ${JSON.stringify(badges)}`);
  }
}

// ---- decodeExact：选中文本恰好是一整个转义序列时解码，否则 null ----

const decodeCases: Array<{ label: string; input: string; expected: string | null }> = [
  { label: "decode backslash simple", input: "\\n", expected: "\n" },
  { label: "decode backslash u{}", input: "\\u{1F600}", expected: "😀" },
  { label: "decode entity named", input: "&lt;", expected: "<" },
  { label: "decode entity numeric", input: "&#x3e;", expected: ">" },
  { label: "decode url run", input: "%E4%B8%AD%E6%96%87", expected: "中文" },
  { label: "not exact: trailing text", input: "a\\n", expected: null },
  { label: "not exact: two sequences", input: "\\n\\t", expected: null },
  { label: "not exact: escaped backslash + n", input: "\\\\n", expected: null },
  { label: "not exact: prose percent", input: "100%beef", expected: null },
  { label: "not exact: lone high byte", input: "%be", expected: null },
  { label: "not exact: surrogate escape", input: "\\uD800", expected: null },
  { label: "not exact: empty", input: "", expected: null },
];

for (const c of decodeCases) {
  const got = decodeExact(c.input);
  if (got === c.expected) {
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
console.log(`\nall ${cases.length + encodeCases.length + roundTrips.length + decodeCases.length} cases passed`);
