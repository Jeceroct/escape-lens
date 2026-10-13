import { NAMED_ENTITY_BY_CHAR } from "./decoder";

/**
 * 编码层：把真实字符替换为各种转义形式。与 decoder 互为逆操作，全部为纯函数。
 */

export type EscapeStyle =
  | "backslash"
  | "unicode"
  | "htmlNamed"
  | "htmlDecimal"
  | "htmlHex"
  | "url";

export function encodeText(text: string, style: EscapeStyle): string {
  switch (style) {
    case "backslash":
      return encodeBackslash(text);
    case "unicode":
      return encodeUnicode(text);
    case "htmlNamed":
      return encodeHtmlNamed(text);
    case "htmlDecimal":
      return encodeHtmlDecimal(text);
    case "htmlHex":
      return encodeHtmlHex(text);
    case "url":
      return encodeUrl(text);
  }
}

const SIMPLE_BY_CHAR: Readonly<Record<string, string>> = {
  "\n": "n",
  "\t": "t",
  "\r": "r",
  "\b": "b",
  "\f": "f",
  "\v": "v",
  "\0": "0",
  "\\": "\\",
  "'": "'",
  '"': '"',
  "`": "`",
};

function hex(cp: number, width: number): string {
  return cp.toString(16).padStart(width, "0");
}

/** `\n`、`\x3c`、`\u4e2d`、`\u{1f600}`：优先短形式 */
function encodeBackslash(text: string): string {
  let out = "";
  for (const ch of text) {
    const simple = SIMPLE_BY_CHAR[ch];
    if (simple !== undefined) {
      out += "\\" + simple;
      continue;
    }
    const cp = ch.codePointAt(0)!;
    if (cp <= 0xff) {
      out += "\\x" + hex(cp, 2);
    } else if (cp <= 0xffff) {
      out += "\\u" + hex(cp, 4);
    } else {
      out += "\\u{" + cp.toString(16) + "}";
    }
  }
  return out;
}

/** 一律 `\uHHHH`；astral 字符拆成代理对，JSON 字符串安全 */
function encodeUnicode(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0xffff) {
      out += "\\u" + hex(cp, 4);
    } else {
      const v = cp - 0x10000;
      out += "\\u" + hex(0xd800 + (v >> 10), 4) + "\\u" + hex(0xdc00 + (v & 0x3ff), 4);
    }
  }
  return out;
}

/** `&lt;`；没有命名实体的字符回退为十进制数字引用 */
function encodeHtmlNamed(text: string): string {
  let out = "";
  for (const ch of text) {
    const name = NAMED_ENTITY_BY_CHAR[ch];
    out += name !== undefined ? `&${name};` : `&#${ch.codePointAt(0)!};`;
  }
  return out;
}

function encodeHtmlDecimal(text: string): string {
  let out = "";
  for (const ch of text) {
    out += `&#${ch.codePointAt(0)!};`;
  }
  return out;
}

function encodeHtmlHex(text: string): string {
  let out = "";
  for (const ch of text) {
    out += `&#x${ch.codePointAt(0)!.toString(16)};`;
  }
  return out;
}

/** encodeURIComponent 语义：字母数字与 `-_.!~*'()` 原样保留，其余按 UTF-8 百分号编码 */
function encodeUrl(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    // 孤立代理无法编码，原样保留以免抛错
    out += cp >= 0xd800 && cp <= 0xdfff ? ch : encodeURIComponent(ch);
  }
  return out;
}
