import * as vscode from "vscode";
import { EscapeLens } from "./decorator";

export function activate(context: vscode.ExtensionContext): void {
  console.log("[escape-lens] activating…");
  try {
    const lens = new EscapeLens();
    lens.activate(context);
    console.log("[escape-lens] activated");
  } catch (e) {
    console.error("[escape-lens] activation failed:", e);
    throw e;
  }
}

export function deactivate(): void {
  // 清理已通过 context.subscriptions 完成
}
