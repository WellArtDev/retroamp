# Themes

Themes are pure CSS. A theme is a folder with two files:

```
my-theme/
  theme.json   # metadata
  theme.css    # overrides the CSS variables
```

## Installing a theme

- **Built-in themes** live in `src/themes/` in the repo.
- **Your own themes** go in the app's data folder, which the app creates on
  first launch:
  - macOS: `~/Library/Application Support/dev.wellart.retroamp/themes/`
  - Windows: `%APPDATA%\dev.wellart.retroamp\themes\`
  - Linux: `~/.local/share/dev.wellart.retroamp/themes/`

  Drop a theme folder in there and restart the app — it is picked up at
  startup and appears in the Options menu and the theme row at the bottom.

## theme.json

```json
{
  "id": "my-theme",
  "name": "My Theme",
  "author": "Your Name",
  "description": "A short description of the look.",
  "version": "1.0.0"
}
```

- `id` — folder-safe, unique, lowercase with dashes. Must match the folder name.
- `name` — display name shown in the theme switcher.
- `author`, `description`, `version` — shown in the theme manager.

## theme.css

Override any of the CSS variables defined in `src/styles.css`:

```css
:root {
  --bg: #101623;        /* app background */
  --panel: #1c2740;     /* cards / panels */
  --panel-2: #151d30;   /* menu bar, sidebar */
  --lcd: #8fd4ff;       /* LCD display text + visualizer bars */
  --lcd-dim: #4a7ba6;   /* dim LCD text (metadata) */
  --accent: #5aa9e6;    /* active buttons, highlights */
  --text: #e6eef7;      /* main text */
  --text-dim: #8ba0b8;  /* secondary text */
  --border: #2e3d5c;    /* borders */
  --btn: #27324d;       /* buttons */
  --btn-hover: #35446a; /* button hover */
  --slider: #5aa9e6;    /* range inputs */
  --font: "Segoe UI", system-ui, sans-serif;
  --font-mono: "Consolas", monospace;
}
```

You can also add extra rules (e.g. restyle `#lcd` or `.tbtn`) — but keep it
to CSS. Themes cannot run JavaScript.

## Built-in themes

| Theme | Look |
|---|---|
| `classic-green` | The original green-LCD look from the web player. |
| `blue-steel` | Cool blue and silver, inspired by the classic player with Playlist Editor and Media Library. |

## Rules

- Original CSS only. Do not copy skin bitmaps, logos, or trademarked assets
  from any existing player.
- Test your theme in both the light player area and the dark LCD — the LCD
  text colour (`--lcd`) must stay readable on black.
