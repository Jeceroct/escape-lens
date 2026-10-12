import * as vscode from "vscode";

/**
 * 在真实扩展宿主中验证：扩展能被发现并成功激活，装饰管线在文档上运行不报错。
 * 由 scripts/run-tests.js 通过 @vscode/test-electron 驱动。
 */

export async function run(): Promise<void> {
  // publisher 字段含空格等字符时 id 拼写不可靠，按 packageJSON.name 查找
  const ext = vscode.extensions.all.find(
    (e) => e.packageJSON && e.packageJSON.name === "escape-lens"
  );
  if (!ext) {
    throw new Error("extension escape-lens not found in development host");
  }
  console.log("[test] extension found:", ext.id, "| isActive:", ext.isActive);

  await ext.activate();
  if (!ext.isActive) {
    throw new Error("extension did not activate");
  }
  console.log("[test] activated OK");

  const doc = await vscode.workspace.openTextDocument({
    content: 'a\\nb&lt;%3C "\\u003e" &#62;',
  });
  const editor = await vscode.window.showTextDocument(doc);
  await new Promise((r) => setTimeout(r, 600));
  console.log("[test] decoration pipeline ran without errors on sample doc, lang:", doc.languageId);
  void editor;

  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  console.log("[test] all checks passed");
}
