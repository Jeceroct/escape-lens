# Escape Lens

**See through escape sequences.** Escape Lens places a small badge right after every
escape sequence in your editor, showing the actual character it represents — and
underlines the match so it's easy to spot.

No more mentally decoding `\u003e`, `&lt;` or `%E4%B8%AD` while you read code, logs
or config files.

## Screenshot

![Escape Lens showing decoded badges next to escape sequences](https://github.com/Jeceroct/escape-lens/blob/main/docs/image.png)

## What you get

Open any file, and escape sequences light up with their decoded value:

```json
{
  "greeting": "hello\nworld",
  "html": "&lt;div class=&quot;tip&quot;&gt;",
  "url": "https://example.com/search?q=%E4%B8%AD%E6%96%87",
  "version": "\u003e= 1.0.0"
}
```

As you read it, Escape Lens shows `␊` after `\n`, `<` after `&lt;`, `"` after
`&quot;`, `中文` after the URL-encoded query, and `>` after `\u003e`.

Supported syntax families:

| Family | Examples | Badge shows |
| --- | --- | --- |
| Backslash escapes | `\n` `\t` `\r` `\0` `\x41` `\u003e` `\u{1F600}` `\\` `\'` | `␊` `␉` `␍` `␀` `A` `>` `😀` `\` `'` |
| HTML entities | `&lt;` `&amp;` `&nbsp;` `&#62;` `&#x3e;` | `<` `&` `⍽` `>` `>` |
| URL percent-encoding | `%3C` `%20` `%E4%B8%AD` | `<` `␣` `中` (consecutive escapes decoded as UTF-8) |

Control characters are drawn as Unicode control-picture symbols (`␊` `␉` `␡`),
spaces as `␣`, so nothing invisible slips past you.

## Installation

### From a VSIX

Build the package, then install it into VSCode:

```bash
npm install
npm run package
```

Command Palette → **Extensions: Install from VSIX…** → pick the generated
`escape-lens-0.2.0.vsix`.

### Try it without installing

Open this project folder in VSCode and press `F5` ("Run Extension") — a separate
Extension Development Host window starts with Escape Lens active. Open
`test-fixtures/sample.txt` there to see every feature at a glance.

## Usage

1. Open any file that contains escape sequences — source code, JSON, logs, HTML,
   query strings…
2. Badges appear automatically as you scroll and type (updates are debounced, so
   typing stays smooth).
3. Matched escape sequences are underlined in the editor.

**Turn it off or on** at any time:

- Click the **eye icon** (`Escape Lens`) in the status bar, or
- Command Palette → **Escape Lens: Toggle**.

**Fine-tune what gets decoded** in Settings (`Ctrl/Cmd + ,` → search "escape lens"):

| Setting | Default | Description |
| --- | --- | --- |
| `escapeLens.enabled` | `true` | Master switch for all badges |
| `escapeLens.backslash` | `true` | Detect backslash escapes (`\n`, `\u003e`, …) |
| `escapeLens.htmlEntities` | `true` | Detect HTML entities (`&lt;`, `&#62;`, …) |
| `escapeLens.urlEncoding` | `true` | Detect URL percent-encoding (`%3C`, `%E4%B8%AD`, …) |

For example, reading logs full of URLs but no HTML? Turn off
`escapeLens.htmlEntities` and `escapeLens.backslash` to keep only percent-decoding.

## Replace with escapes

The lens works both ways. Select some text, right-click, and open
**Escape Lens: change to ...** to swap the selection for its escaped form:

| Menu item | `<中 😀` becomes |
| --- | --- |
| Decoded character | `>` (e.g. `&lt;` → `<`, `%3C` → `<`) — offered only when the selection itself is a recognized escape sequence |
| Backslash | `\x3c\u4e2d\u{1f600}` (shortest form: `\n` `\t` `\x3c` `\u4e2d` `\u{1f600}`) |
| Unicode | `\u003c\u4e2d\ud83d\ude00` (always `\uHHHH`, emoji as surrogate pairs — JSON-safe) |
| HTML named entity | `&lt;&#20013;&#128512;` (falls back to numeric when no name exists) |
| HTML decimal | `&#60;&#20013;&#128512;` |
| HTML hex | `&#x3c;&#x4e2d;&#x1f600;` |
| URL percent-encoding | `%3C%E4%B8%AD%20%F0%9F%98%80` (same rules as `encodeURIComponent`) |

A few details:

- The submenu only appears when something is selected.
- The **Decoded character** item is smart: it only shows up when the selection is
  exactly one escape sequence the lens itself would recognize (a backslash
  escape, an HTML entity, or a run of percent escapes). Select `\n` → get a real
  newline; select `%E4%B8%AD` → get `中`. It's the badge, made editable.
- Multiple cursors? Every selection is replaced in one go.
- Replacements are ordinary edits — undo with `Ctrl/Cmd + Z`.
- Right after replacing, the new escape sequence lights up with its own badge,
  so you can see what you just did.

## Large files

Scanning a very large file can make the editor feel sluggish, so files larger than
**2 MB** are not parsed automatically. Instead, Escape Lens asks first:

> Escape Lens: "app.min.js" is 5.3 MB. Scanning a file this large may slow down the
> editor. Parse it anyway?

- **Parse Anyway** — decode this file now; the choice is remembered for the rest of
  the session.
- **Skip** — leave this file alone. Close and reopen it (or reload the window) if
  you change your mind.

## Good to know

- Matches are shown everywhere in a file — including comments and prose, not only
  inside string literals.
- Ordinary text can occasionally look like URL encoding. The common case
  (`100%beef`) is already filtered out; if you hit another one, turn off
  `escapeLens.urlEncoding`.
- Named HTML entities cover the full HTML4 set (a couple hundred, including all
  Latin-1, Greek and math symbols).
- Results longer than 12 characters are truncated with `…`; zero-width characters
  (ZWJ etc.) have no visible glyph and are skipped.

## Development

```bash
npm install
npm run watch    # build in watch mode, then F5 to debug
npm run smoke    # fast decoding/matching tests (no VSCode needed)
npm run test     # activation test in a real extension host
```

## License

MIT

---

# Escape Lens（中文说明）

**看穿转义序列。** Escape Lens 会在编辑器中每个转义序列的右侧放一个小徽章，
显示它代表的真实字符，并为匹配到的序列加下划线，方便一眼定位。

读代码、日志、配置文件时，不用再在脑内解码 `\u003e`、`&lt;` 或 `%E4%B8%AD`。

## 截图

![Escape Lens 在转义序列旁显示解码徽章](https://github.com/Jeceroct/escape-lens/blob/main/docs/image.png)

## 你会看到什么

打开任意文件，转义序列就会亮出解码结果：

```json
{
  "greeting": "hello\nworld",
  "html": "&lt;div class=&quot;tip&quot;&gt;",
  "url": "https://example.com/search?q=%E4%B8%AD%E6%96%87",
  "version": "\u003e= 1.0.0"
}
```

阅读时，Escape Lens 会在 `\n` 后显示 `␊`、`&lt;` 后显示 `<`、`&quot;` 后显示
`"`、URL 编码的查询串后显示 `中文`、`\u003e` 后显示 `>`。

支持的语法家族：

| 家族 | 示例 | 徽章显示 |
| --- | --- | --- |
| 反斜杠转义 | `\n` `\t` `\r` `\0` `\x41` `\u003e` `\u{1F600}` `\\` `\'` | `␊` `␉` `␍` `␀` `A` `>` `😀` `\` `'` |
| HTML 实体 | `&lt;` `&amp;` `&nbsp;` `&#62;` `&#x3c;` | `<` `&` `⍽` `>` `>` |
| URL 百分号编码 | `%3C` `%20` `%E4%B8%AD` | `<` `␣` `中`（连续转义按 UTF-8 解码） |

控制字符用 Unicode 控制符图形（`␊` `␉` `␡`）表示，空格显示为 `␣`，
任何隐形字符都逃不过你的眼睛。

## 安装

### 通过 VSIX

构建安装包，然后装入 VSCode：

```bash
npm install
npm run package
```

命令面板 → **Extensions: Install from VSIX…** → 选择生成的
`escape-lens-0.2.0.vsix`。

### 不安装直接体验

在 VSCode 中打开本仓库目录并按 `F5`（"Run Extension"）——会启动一个扩展
开发宿主窗口，Escape Lens 已在其中生效。打开 `test-fixtures/sample.txt`
即可一览全部功能。

## 使用

1. 打开任何包含转义序列的文件——源代码、JSON、日志、HTML、查询串……
2. 徽章随滚动和输入自动出现（更新有防抖，输入依旧流畅）。
3. 匹配到的转义序列在编辑器中显示下划线。

**随时开关**：

- 点击状态栏的**眼睛图标**（`Escape Lens`），或
- 命令面板 → **Escape Lens: Toggle**。

在设置中**微调解码范围**（`Ctrl/Cmd + ,` → 搜索 "escape lens"）：

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| `escapeLens.enabled` | `true` | 所有徽章的总开关 |
| `escapeLens.backslash` | `true` | 识别反斜杠转义（`\n`、`\u003e` 等） |
| `escapeLens.htmlEntities` | `true` | 识别 HTML 实体（`&lt;`、`&#62;` 等） |
| `escapeLens.urlEncoding` | `true` | 识别 URL 百分号编码（`%3C`、`%E4%B8%AD` 等） |

比如只读 URL 多、没有 HTML 的日志？关掉 `escapeLens.htmlEntities` 和
`escapeLens.backslash`，只保留百分号解码。

## 替换为转义序列

镜头是双向的。选中一段文本，右键打开 **Escape Lens: change to ...**，
即可把选区换成对应的转义形式：

| 菜单项 | `<中 😀` 变成 |
| --- | --- |
| Decoded character | `>`（如 `&lt;` → `<`、`%3C` → `<`）——仅当选中的恰好是可识别的转义序列时出现 |
| Backslash | `\x3c\u4e2d\u{1f600}`（自动选最短形式：`\n` `\t` `\x3c` `\u4e2d` `\u{1f600}`） |
| Unicode | `\u003c\u4e2d\ud83d\ude00`（一律 `\uHHHH`，emoji 拆成代理对——JSON 安全） |
| HTML named entity | `&lt;&#20013;&#128512;`（无对应名称时回退为数字形式） |
| HTML decimal | `&#60;&#20013;&#128512;` |
| HTML hex | `&#x3c;&#x4e2d;&#x1f600;` |
| URL percent-encoding | `%3C%E4%B8%AD%20%F0%9F%98%80`（与 `encodeURIComponent` 规则一致） |

几个细节：

- 子菜单只在选中内容时出现。
- **Decoded character** 项是智能的：只有当选中区恰好是一整个徽章本身能识别的
  转义序列（反斜杠转义、HTML 实体或连续百分号编码）时才会出现。
  选中 `\n` → 得到真实换行；选中 `%E4%B8%AD` → 得到 `中`。相当于把徽章变成可编辑的。
- 多光标时，所有选区一次性替换。
- 替换是普通编辑操作，`Ctrl/Cmd + Z` 可撤销。
- 替换完成后，新的转义序列会立刻亮起自己的徽章，做了什么一目了然。

## 大文件

扫描超大文件可能让编辑器变卡，因此超过 **2 MB** 的文件不会自动解析，
Escape Lens 会先询问（界面原文为英文）：

> Escape Lens: "app.min.js" is 5.3 MB. Scanning a file this large may slow down the
> editor. Parse it anyway?

- **Parse Anyway** — 立即解析；该选择在本次会话内会被记住。
- **Skip** — 跳过此文件。改变主意的话，关闭再重新打开（或重载窗口）即可。

## 值得了解

- 匹配会显示在文件中的任何位置——包括注释和普通文本，不限于字符串字面量。
- 普通文本偶尔会长得像 URL 编码。常见情形（`100%beef`）已被过滤；
  再遇到其他误报，可关闭 `escapeLens.urlEncoding`。
- 命名 HTML 实体覆盖 HTML4 全集（约两百多个，含全部 Latin-1、希腊字母与
  数学符号）。
- 解码结果超过 12 个字符会以 `…` 截断；零宽字符（ZWJ 等）没有可见字形，
  会被跳过。

## 开发

```bash
npm install
npm run watch    # watch 模式构建，随后 F5 调试
npm run smoke    # 快速解码/匹配测试（无需 VSCode）
npm run test     # 真实扩展宿主中的激活测试
```

## 许可证

MIT
