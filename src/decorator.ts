import * as vscode from "vscode";
import { findDecorations, MatcherOptions } from "./matchers";

/**
 * 装饰层：管理 decoration type、事件监听、防抖刷新与状态栏开关。
 */

const DEBOUNCE_MS = 200;
const MAX_FILE_SIZE = 2_000_000;
// 输出面板等内部文档无需处理
const SKIPPED_SCHEMES = new Set(["output", "vscode"]);

export class EscapeLens {
  private decorationType = this.createDecorationType();
  private enabled = true;
  private options: MatcherOptions = { backslash: true, htmlEntities: true, urlEncoding: true };
  private timer: ReturnType<typeof setTimeout> | undefined;
  private statusItem: vscode.StatusBarItem;
  // 超大文件需用户确认后才解析；确认结果仅本次会话有效
  private confirmedFiles = new Set<string>();
  private promptedFiles = new Set<string>();

  constructor() {
    this.statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusItem.name = "Escape Lens";
    this.statusItem.command = "escape-lens.toggle";
  }

  activate(context: vscode.ExtensionContext): void {
    this.readConfig();

    context.subscriptions.push(
      vscode.commands.registerCommand("escape-lens.toggle", () => this.toggle()),
      vscode.window.onDidChangeActiveTextEditor((editor) => this.updateEditor(editor)),
      vscode.window.onDidChangeVisibleTextEditors(() => this.updateAll()),
      vscode.workspace.onDidChangeTextDocument(() => this.scheduleUpdate()),
      // 关闭文档后清除"已询问"标记，重新打开可再次询问
      vscode.workspace.onDidCloseTextDocument((doc) => this.promptedFiles.delete(doc.uri.toString())),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("escapeLens")) {
          this.readConfig();
          this.refreshStatus();
          this.updateAll();
        }
      }),
      this.decorationType,
      this.statusItem,
      { dispose: () => this.clearTimer() }
    );

    this.refreshStatus();
    this.statusItem.show();
    this.updateAll();
  }

  private createDecorationType(): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
      // 匹配到的转义字符本身加下划线
      textDecoration: "underline",
      after: {
        margin: "0 2px",
        border: "1px solid rgba(128,128,128,0.45)",
        backgroundColor: "rgba(128,128,128,0.12)",
        color: new vscode.ThemeColor("editorGhostText.foreground"),
        // fontStyle: "italic",
      },
    });
  }

  private readConfig(): void {
    const cfg = vscode.workspace.getConfiguration("escapeLens");
    this.enabled = cfg.get("enabled", true);
    this.options = {
      backslash: cfg.get("backslash", true),
      htmlEntities: cfg.get("htmlEntities", true),
      urlEncoding: cfg.get("urlEncoding", true),
    };
  }

  private async toggle(): Promise<void> {
    const value = !this.enabled;
    this.enabled = value;
    this.refreshStatus();
    this.updateAll();
    await vscode.workspace
      .getConfiguration("escapeLens")
      .update("enabled", value, vscode.ConfigurationTarget.Global);
  }

  private refreshStatus(): void {
    this.statusItem.text = this.enabled ? "$(eye) Escape Lens" : "$(eye-closed) Escape Lens";
    this.statusItem.tooltip = this.enabled
      ? "Escape Lens is on — click to turn off"
      : "Escape Lens is off — click to turn on";
  }

  private scheduleUpdate(): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.updateAll();
    }, DEBOUNCE_MS);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private askToParseLargeFile(editor: vscode.TextEditor, size: number): void {
    const key = editor.document.uri.toString();
    if (this.promptedFiles.has(key)) {
      return; // 已询问过且未同意，等待关闭重开或下次会话
    }
    this.promptedFiles.add(key);
    const mb = (size / 1_000_000).toFixed(1);
    const name = vscode.workspace.asRelativePath(editor.document.uri);
    void vscode.window
      .showInformationMessage(
        `Escape Lens: "${name}" is ${mb} MB. Scanning a file this large may slow down the editor. Parse it anyway?`,
        "Parse Anyway",
        "Skip"
      )
      .then((choice) => {
        if (choice === "Parse Anyway") {
          this.confirmedFiles.add(key);
          this.updateAll();
        }
      });
  }

  private updateAll(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateEditor(editor);
    }
  }

  private updateEditor(editor: vscode.TextEditor | undefined): void {
    if (!editor) {
      return;
    }
    const doc = editor.document;
    if (!this.enabled || doc.isClosed || SKIPPED_SCHEMES.has(doc.uri.scheme)) {
      editor.setDecorations(this.decorationType, []);
      return;
    }
    const text = doc.getText();
    if (text.length > MAX_FILE_SIZE && !this.confirmedFiles.has(doc.uri.toString())) {
      this.askToParseLargeFile(editor, text.length);
      editor.setDecorations(this.decorationType, []);
      return;
    }
    const options: vscode.DecorationOptions[] = findDecorations(text, this.options).map((d) => ({
      range: new vscode.Range(doc.positionAt(d.start), doc.positionAt(d.end)),
      renderOptions: { after: { contentText: ` ${d.display} ` } },
    }));
    editor.setDecorations(this.decorationType, options);
  }
}
