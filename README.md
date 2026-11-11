# RetroAmp

> "Winamp" is a registered trademark of its owner. This project is not
> affiliated with or endorsed by Winamp. RetroAmp is an original
> implementation inspired by classic-style players — no Winamp code,
> bitmaps, or logos are used. The display name lives in one place
> (`APP_NAME` in `src/app.js`, `productName` in `src-tauri/tauri.conf.json`)
> so a rename is a small change.

A classic-style desktop music player, built with [Tauri v2](https://v2.tauri.app/)
(Rust backend + vanilla HTML/CSS/JS frontend, no JS framework).

## Features

- **Classic player** — green-LCD display, spectrum visualizer, transport
  controls, volume/balance, shuffle and repeat.
- **10-band equalizer** — real WebAudio `BiquadFilter` EQ with presets:
  Flat, Rock, Pop, Jazz, Bass, Dangdut Koplo, Classical.
- **Sources**
  - Local audio files (MP3, WAV, OGG, FLAC, M4A) via drag & drop or the File menu.
  - YouTube videos and playlists through the official YouTube embed.
  - Spotify tracks, albums and playlists through the official Spotify embed.
  - Three built-in synthesized demo songs (WebAudio, no files needed).
- **Themes** — switchable skins. Ships with *Classic Green* and *Blue Steel*.
  Anyone can make a theme — see [THEMES.md](THEMES.md).
- **Plugins** — a small JS API (`window.PlayerAPI`) lets anyone add panels,
  menu items and event hooks. Ships with two examples — see [PLUGINS.md](PLUGINS.md).

## Screenshots

_Screenshots coming soon — run the app and add yours here._

## Build

Prerequisites: [Rust](https://rustup.rs/) (stable) and the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
# macOS
xcode-select --install        # if not already installed
cargo install tauri-cli       # or: cargo tauri dev
cargo tauri dev               # run in development
cargo tauri build             # production build -> src-tauri/target/release/bundle/

# Windows (PowerShell, run as admin for the WebView2 runtime if missing)
cargo tauri dev
cargo tauri build

# Linux (Debian/Ubuntu)
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf
cargo tauri dev
cargo tauri build
```

Release binaries are also built automatically by GitHub Actions on every
version tag (`v*`) — see `.github/workflows/release.yml`.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md). Themes and plugins are the easiest
first contributions — no Rust needed.

## License

MIT — see [LICENSE](LICENSE).
