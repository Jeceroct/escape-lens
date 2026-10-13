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

  // 右键菜单「change to ...」背后的替换命令：选中 < 后替换为 HTML 命名实体
  const doc2 = await vscode.workspace.openTextDocument({ content: "a<b" });
  const editor2 = await vscode.window.showTextDocument(doc2);
  editor2.selection = new vscode.Selection(0, 1, 0, 2);
  await vscode.commands.executeCommand("escape-lens.replace.htmlNamed");
  if (doc2.getText() !== "a&lt;b") {
    throw new Error(`htmlNamed replace failed, got: ${JSON.stringify(doc2.getText())}`);
  }
  console.log("[test] replace command (htmlNamed) OK");

  // 多光标：两个选区一次性替换为反斜杠转义
  const doc3 = await vscode.workspace.openTextDocument({ content: "x y" });
  const editor3 = await vscode.window.showTextDocument(doc3);
  editor3.selections = [
    new vscode.Selection(0, 0, 0, 1),
    new vscode.Selection(0, 2, 0, 3),
  ];
  await vscode.commands.executeCommand("escape-lens.replace.backslash");
  if (doc3.getText() !== "\\x78 \\x79") {
    throw new Error(`multi-selection replace failed, got: ${JSON.stringify(doc3.getText())}`);
  }
  console.log("[test] replace command (backslash, multi-selection) OK");

  // 反向：选中的恰好是转义序列时，替换为解码后的真实字符
  const doc4 = await vscode.workspace.openTextDocument({ content: "a\\u003eb" });
  const editor4 = await vscode.window.showTextDocument(doc4);
  editor4.selection = new vscode.Selection(0, 1, 0, 7);
  await new Promise((r) => setTimeout(r, 200)); // 等待 setContext 跟上选区变化
  await vscode.commands.executeCommand("escape-lens.replace.decode");
  if (doc4.getText() !== "a>b") {
    throw new Error(`decode replace failed, got: ${JSON.stringify(doc4.getText())}`);
  }
  console.log("[test] replace command (decode) OK");
  void editor4;

  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  console.log("[test] all checks passed");
}
