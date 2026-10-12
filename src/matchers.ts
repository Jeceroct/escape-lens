import { decodeBackslashEscape, decodeHtmlEntity, decodeUrlRun, toDisplayText } from "./decoder";

/**
 * 匹配层：在文档全文中找出所有转义序列，输出偏移区间与小方块展示文本。
 */

export interface EscapeDecoration {
  /** 文档中的 [start, end) 偏移 */
  start: number;
  end: number;
  /** 小方块里显示的文本 */
  display: string;
}

export interface MatcherOptions {
  backslash: boolean;
  htmlEntities: boolean;
  urlEncoding: boolean;
}

// 注意备选顺序：\u{...} 优先于 \uHHHH，再是 \xHH，最后单字符
const BACKSLASH_RE = /\\(?:u\{[0-9a-fA-F]{1,6}\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[nrtbfv0'"`\\])/g;
const ENTITY_RE = /&(?:#[xX][0-9a-fA-F]{1,6};|#[0-9]{1,7};|[a-zA-Z][a-zA-Z0-9]{1,30};)/g;
const URL_RE = /(?:%[0-9a-fA-F]{2})+/g;

type DecodeFn = (token: string) => string | null;

export function findDecorations(text: string, opts: MatcherOptions): EscapeDecoration[] {
  const out: EscapeDecoration[] = [];
  if (opts.backslash) {
    collect(text, BACKSLASH_RE, decodeBackslashEscape, out);
  }
  if (opts.htmlEntities) {
    collect(text, ENTITY_RE, decodeHtmlEntity, out);
  }
  if (opts.urlEncoding) {
    collect(text, URL_RE, decodeUrlRun, out);
  }
  return out;
}

function collect(text: string, re: RegExp, decode: DecodeFn, out: EscapeDecoration[]): void {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const decoded = decode(m[0]);
    if (decoded === null) {
      continue;
    }
    const display = toDisplayText(decoded);
    if (!display) {
      continue;
    }
    out.push({ start: m.index, end: m.index + m[0].length, display });
  }
}
