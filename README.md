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
`escape-lens-0.1.0.vsix`.

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
