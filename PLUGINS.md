# Plugins

Plugins are small JavaScript files. A plugin is a folder with two files:

```
my-plugin/
  plugin.json  # metadata
  main.js      # your code — receives PlayerAPI
```

## Installing a plugin

- **Built-in plugins** live in `src/plugins/` in the repo.
- **Your own plugins** go in the app's data folder, created on first launch:
  - macOS: `~/Library/Application Support/dev.wellart.retroamp/plugins/`
  - Windows: `%APPDATA%\dev.wellart.retroamp\plugins\`
  - Linux: `~/.local/share/dev.wellart.retroamp/plugins/`

  Drop a plugin folder in there and restart the app. Enable/disable plugins
  in **Options → Plugins…**.

## plugin.json

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "What the plugin does.",
  "main": "main.js"
}
```

- `id` — folder-safe, unique, lowercase with dashes. Must match the folder name.
- `main` — entry file, relative to the plugin folder (usually `main.js`).

## The PlayerAPI

Your `main.js` is loaded as a function that receives one argument,
`PlayerAPI` (also available as `window.PlayerAPI`):

```js
(function (PlayerAPI) {
  PlayerAPI.addPanel({
    id: "hello",
    title: "Hello",
    html: "<p>Hello from my plugin!</p>",
  });
})(PlayerAPI);
```

### Playback

| Method | Description |
|---|---|
| `play()` | Toggle play / pause. |
| `pause()` | Pause if playing. |
| `next()` | Skip to the next track (respects shuffle/repeat). |
| `prev()` | Go to the previous track. |
| `getCurrentTrack()` | Returns the current track object or `null`. Track: `{ id, title, source, kind, duration }`. |
| `getQueue()` | Returns a copy of the queue array. |

### Events

```js
PlayerAPI.on("trackchange", (track) => { /* track changed */ });
PlayerAPI.on("playstatechange", (playing) => { /* true = playing */ });
```

Events: `trackchange`, `playstatechange`.

### UI

| Method | Description |
|---|---|
| `addPanel({ id, title, html })` | Add (or update) a panel in the sidebar under the playlist. `id` must be unique per plugin. Returns the panel element. |
| `registerMenuItem(label, cb)` | Add an item to the File menu. |
| `toast(msg)` | Show a small toast message at the bottom of the window. |

## Built-in plugins

| Plugin | What it does |
|---|---|
| `clock-widget` | Adds a live clock panel to the sidebar. |
| `now-playing` | Shows the current track with a copy-to-clipboard button. |

## Rules

- Plugins run in the app's webview with the same privileges as the app UI.
  Keep them small, don't exfiltrate data, and don't do anything the user
  didn't ask for.
- Don't override `window.PlayerAPI` or monkey-patch the player's internals.
- No network calls to unexpected hosts. If your plugin needs the network,
  say so clearly in its description.
- No secrets or credentials in plugin code.
