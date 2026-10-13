import * as vscode from "vscode";
import { decodeExact } from "./matchers";
import { encodeText, EscapeStyle } from "./encoder";

/**
 * 命令层：右键菜单「Escape Lens: change to ...」，把选中文本替换为指定风格的转义序列，
 * 或在选中的恰好是转义序列时替换为解码后的真实字符。
 */

const REPLACE_COMMANDS: ReadonlyArray<{ command: string; style: EscapeStyle }> = [
  { command: "escape-lens.replace.backslash", style: "backslash" },
  { command: "escape-lens.replace.unicode", style: "unicode" },
  { command: "escape-lens.replace.htmlNamed", style: "htmlNamed" },
  { command: "escape-lens.replace.htmlDecimal", style: "htmlDecimal" },
  { command: "escape-lens.replace.htmlHex", style: "htmlHex" },
  { command: "escape-lens.replace.url", style: "url" },
];

// 控制「替换为真实字符」菜单项是否出现
const DECODE_CONTEXT_KEY = "escapeLens.selectionIsEscape";

export function registerReplaceCommands(context: vscode.ExtensionContext): void {
  for (const { command, style } of REPLACE_COMMANDS) {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, () => replaceSelection(style))
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("escape-lens.replace.decode", () => replaceWithDecoded()),
    vscode.window.onDidChangeTextEditorSelection(() => updateDecodeContext()),
    vscode.window.onDidChangeActiveTextEditor(() => updateDecodeContext()),
    // 会话内清理上下文键
    { dispose: () => void vscode.commands.executeCommand("setContext", DECODE_CONTEXT_KEY, undefined) }
  );
  updateDecodeContext();
}

async function replaceSelection(style: EscapeStyle): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return false;
  }
  // 走 edit builder 而非 applyEdit，多光标选区一并替换且可 Ctrl/Cmd+Z 撤销
  return editor.edit((builder) => {
    for (const sel of editor.selections) {
      if (!sel.isEmpty) {
        builder.replace(sel, encodeText(editor.document.getText(sel), style));
      }
    }
  });
}

async function replaceWithDecoded(): Promise<boolean> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return false;
  }
  let decodedAny = false;
  const applied = await editor.edit((builder) => {
    for (const sel of editor.selections) {
      if (sel.isEmpty) {
        continue;
      }
      const decoded = decodeExact(editor.document.getText(sel));
      if (decoded !== null) {
        builder.replace(sel, decoded);
        decodedAny = true;
      }
    }
  });
  if (applied && !decodedAny) {
    void vscode.window.showWarningMessage(
      "Escape Lens: the selection is not a recognized escape sequence (\\n, &lt;, %3C, …)"
    );
  }
  return applied;
}

let lastEscapeContext: boolean | undefined;

function updateDecodeContext(): void {
  const editor = vscode.window.activeTextEditor;
  const sel = editor?.selection;
  const isEscape =
    editor !== undefined && sel !== undefined && !sel.isEmpty && decodeExact(editor.document.getText(sel)) !== null;
  // 值未变化时跳过，避免每次移动光标都发起一次 setContext
  if (isEscape !== lastEscapeContext) {
    lastEscapeContext = isEscape;
    void vscode.commands.executeCommand("setContext", DECODE_CONTEXT_KEY, isEscape);
  }
}
