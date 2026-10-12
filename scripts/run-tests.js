const path = require("path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  const root = path.join(__dirname, "..");
  try {
    await runTests({
      extensionDevelopmentPath: root,
      extensionTestsPath: path.join(root, "dist", "test-suite.js"),
    });
    console.log("TESTS PASSED");
  } catch (e) {
    console.error("TESTS FAILED:", (e && e.message) || e);
    process.exit(1);
  }
}

main();
