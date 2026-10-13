import { TextDecoder } from "util";

/**
 * 解码层：把匹配到的转义文本还原为真实字符串。
 * 全部为纯函数，便于独立测试。
 */

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  v: "\v",
  "0": "\0",
  "\\": "\\",
  "'": "'",
  '"': '"',
  "`": "`",
};

function isValidCodePoint(cp: number): boolean {
  return Number.isInteger(cp) && cp >= 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff);
}

function codePointToString(cp: number): string | null {
  return isValidCodePoint(cp) ? String.fromCodePoint(cp) : null;
}

function parseCodePoint(hexOrDec: string, radix: number): string | null {
  const cp = parseInt(hexOrDec, radix);
  return isValidCodePoint(cp) ? codePointToString(cp) : null;
}

/** `\n`、`\x41`、`\u003e`、`\u{1F600}` 等 */
export function decodeBackslashEscape(token: string): string | null {
  const body = token.slice(1);
  if (body.length === 1) {
    return SIMPLE_ESCAPES[body] ?? null;
  }
  if (body[0] === "x") {
    return parseCodePoint(body.slice(1), 16);
  }
  if (body.startsWith("u{")) {
    return parseCodePoint(body.slice(2, -1), 16);
  }
  // \uHHHH
  return parseCodePoint(body.slice(1), 16);
}

/** `&lt;`、`&#62;`、`&#x3e;` 等；未知实体返回 null */
export function decodeHtmlEntity(token: string): string | null {
  const inner = token.slice(1, -1);
  if (inner.startsWith("#x") || inner.startsWith("#X")) {
    return parseCodePoint(inner.slice(2), 16);
  }
  if (inner.startsWith("#")) {
    return parseCodePoint(inner.slice(1), 10);
  }
  return NAMED_ENTITIES[inner] ?? null;
}

/** `%3C`、`%E4%B8%AD` 等连续百分号编码串 */
const utf8Decoder = new TextDecoder("utf-8");

export function decodeUrlRun(token: string): string | null {
  const bytes: number[] = [];
  for (let i = 0; i < token.length; i += 3) {
    bytes.push(parseInt(token.slice(i + 1, i + 3), 16));
  }
  const decoded = utf8Decoder.decode(Uint8Array.from(bytes));
  if (!decoded.includes("\ufffd")) {
    return decoded;
  }
  // 无效 UTF-8 序列。单个高位字节（如普通文本 "100%beef" 中的 %be）
  // 极可能是误匹配，直接跳过；多字节序列回退为逐字节 Latin-1。
  if (bytes.length === 1 && bytes[0] >= 0x80) {
    return null;
  }
  return bytes.map((b) => String.fromCharCode(b)).join("");
}

const MAX_DISPLAY_CHARS = 12;

/** 把解码结果转成可展示文本：控制字符用 Unicode 图形符号，超长截断 */
export function toDisplayText(decoded: string): string | null {
  if (!decoded) {
    return null;
  }
  let out = "";
  for (const ch of decoded) {
    out += displayChar(ch.codePointAt(0)!);
    if (out.length >= MAX_DISPLAY_CHARS) {
      return out.slice(0, MAX_DISPLAY_CHARS) + "…";
    }
  }
  return out;
}

function displayChar(cp: number): string {
  if (cp === 0x20) {
    return "␣"; // OPEN BOX
  }
  if (cp === 0xa0) {
    return "\u233d"; // NBSP 常用替代符号 ⍽
  }
  if (cp < 0x20) {
    return String.fromCodePoint(0x2400 + cp); // Control Pictures: LF→␊ TAB→␉
  }
  if (cp === 0x7f) {
    return "␡"; // DEL
  }
  if ((cp >= 0x200b && cp <= 0x200f) || cp === 0xfeff) {
    return ""; // 零宽字符无可视形符，跳过
  }
  return String.fromCodePoint(cp);
}

/** 常用 HTML 命名实体表（HTML4 全集 + 常用 HTML5 补充） */
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  iexcl: "¡",
  cent: "¢",
  pound: "£",
  curren: "¤",
  yen: "¥",
  brvbar: "¦",
  sect: "§",
  uml: "¨",
  copy: "©",
  ordf: "ª",
  laquo: "«",
  not: "¬",
  shy: "\u00ad",
  reg: "®",
  macr: "¯",
  deg: "°",
  plusmn: "±",
  sup2: "²",
  sup3: "³",
  acute: "´",
  micro: "µ",
  para: "¶",
  middot: "·",
  cedil: "¸",
  sup1: "¹",
  ordm: "º",
  raquo: "»",
  frac14: "¼",
  frac12: "½",
  frac34: "¾",
  iquest: "¿",
  times: "×",
  divide: "÷",
  Agrave: "À",
  Aacute: "Á",
  Acirc: "Â",
  Atilde: "Ã",
  Auml: "Ä",
  Aring: "Å",
  AElig: "Æ",
  Ccedil: "Ç",
  Egrave: "È",
  Eacute: "É",
  Ecirc: "Ê",
  Euml: "Ë",
  Igrave: "Ì",
  Iacute: "Í",
  Icirc: "Î",
  Iuml: "Ï",
  ETH: "Ð",
  Ntilde: "Ñ",
  Ograve: "Ò",
  Oacute: "Ó",
  Ocirc: "Ô",
  Otilde: "Õ",
  Ouml: "Ö",
  Oslash: "Ø",
  Ugrave: "Ù",
  Uacute: "Ú",
  Ucirc: "Û",
  Uuml: "Ü",
  Yacute: "Ý",
  THORN: "Þ",
  szlig: "ß",
  agrave: "à",
  aacute: "á",
  acirc: "â",
  atilde: "ã",
  auml: "ä",
  aring: "å",
  aelig: "æ",
  ccedil: "ç",
  egrave: "è",
  eacute: "é",
  ecirc: "ê",
  euml: "ë",
  igrave: "ì",
  iacute: "í",
  icirc: "î",
  iuml: "ï",
  eth: "ð",
  ntilde: "ñ",
  ograve: "ò",
  oacute: "ó",
  ocirc: "ô",
  otilde: "õ",
  ouml: "ö",
  oslash: "ø",
  ugrave: "ù",
  uacute: "ú",
  ucirc: "û",
  uuml: "ü",
  yacute: "ý",
  thorn: "þ",
  yuml: "ÿ",
  OElig: "Œ",
  oelig: "œ",
  Scaron: "Š",
  scaron: "š",
  Yuml: "Ÿ",
  fnof: "ƒ",
  circ: "ˆ",
  tilde: "˜",
  ensp: "\u2002",
  emsp: "\u2003",
  thinsp: "\u2009",
  zwnj: "\u200c",
  zwj: "\u200d",
  lrm: "\u200e",
  rlm: "\u200f",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  sbquo: "‚",
  ldquo: "“",
  rdquo: "”",
  bdquo: "„",
  dagger: "†",
  Dagger: "‡",
  permil: "‰",
  lsaquo: "‹",
  rsaquo: "›",
  euro: "€",
  bull: "•",
  hellip: "…",
  prime: "′",
  Prime: "″",
  oline: "‾",
  frasl: "⁄",
  weierp: "℘",
  image: "ℑ",
  real: "ℜ",
  trade: "™",
  alefsym: "ℵ",
  larr: "←",
  uarr: "↑",
  rarr: "→",
  darr: "↓",
  harr: "↔",
  crarr: "↵",
  lArr: "⇐",
  uArr: "⇑",
  rArr: "⇒",
  dArr: "⇓",
  hArr: "⇔",
  forall: "∀",
  part: "∂",
  exist: "∃",
  empty: "∅",
  nabla: "∇",
  isin: "∈",
  notin: "∉",
  ni: "∋",
  prod: "∏",
  sum: "∑",
  minus: "−",
  lowast: "∗",
  radic: "√",
  prop: "∝",
  infin: "∞",
  ang: "∠",
  and: "∧",
  or: "∨",
  cap: "∩",
  cup: "∪",
  int: "∫",
  there4: "∴",
  sim: "∼",
  cong: "≅",
  asymp: "≈",
  ne: "≠",
  equiv: "≡",
  le: "≤",
  ge: "≥",
  sub: "⊂",
  sup: "⊃",
  nsub: "⊄",
  sube: "⊆",
  supe: "⊇",
  oplus: "⊕",
  otimes: "⊗",
  perp: "⊥",
  sdot: "⋅",
  lceil: "⌈",
  rceil: "⌉",
  lfloor: "⌊",
  rfloor: "⌋",
  lang: "〈",
  rang: "〉",
  loz: "◊",
  spades: "♠",
  clubs: "♣",
  hearts: "♥",
  diams: "♦",
  Alpha: "Α",
  Beta: "Β",
  Gamma: "Γ",
  Delta: "Δ",
  Epsilon: "Ε",
  Zeta: "Ζ",
  Eta: "Η",
  Theta: "Θ",
  Iota: "Ι",
  Kappa: "Κ",
  Lambda: "Λ",
  Mu: "Μ",
  Nu: "Ν",
  Xi: "Ξ",
  Omicron: "Ο",
  Pi: "Π",
  Rho: "Ρ",
  Sigma: "Σ",
  Tau: "Τ",
  Upsilon: "Υ",
  Phi: "Φ",
  Chi: "Χ",
  Psi: "Ψ",
  Omega: "Ω",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  omicron: "ο",
  pi: "π",
  rho: "ρ",
  sigmaf: "ς",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  thetasym: "ϑ",
  upsih: "ϒ",
  piv: "ϖ",
};

/** 反查表：字符 → 实体名（同名冲突时取最短名），供编码方向使用 */
export const NAMED_ENTITY_BY_CHAR: Readonly<Record<string, string>> = (() => {
  const byChar: Record<string, string> = {};
  for (const [name, ch] of Object.entries(NAMED_ENTITIES)) {
    const prev = byChar[ch];
    if (prev === undefined || name.length < prev.length) {
      byChar[ch] = name;
    }
  }
  return byChar;
})();
