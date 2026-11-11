# Contributing to RetroAmp

Thanks for helping! This is a small, friendly open-source project.

## How to contribute

1. Fork the repo and create a branch from `main`.
2. Make your change. Keep it focused — one feature or fix per PR.
3. Run the checks (see below) and make sure they pass.
4. Open a pull request with a short description of what changed and why.

## Easiest first contributions (no Rust needed)

- **A new theme** — copy `src/themes/classic-green/`, restyle it, add it under
  `src/themes/<your-theme-id>/`. See [THEMES.md](THEMES.md).
- **A new plugin** — copy `src/plugins/clock-widget/`, write your `main.js`,
  add it under `src/plugins/<your-plugin-id>/`. See [PLUGINS.md](PLUGINS.md).
- **Docs, typos, screenshots** — always welcome.

## Checks

```bash
# JavaScript syntax
node --check src/app.js
node --check src/plugins/*/main.js

# JSON validity
python3 -m json.tool src-tauri/tauri.conf.json > /dev/null
python3 -m json.tool src-tauri/capabilities/default.json > /dev/null

# Rust (requires the Rust toolchain)
cargo check
cargo fmt --check
```

## Code style

- Frontend: vanilla JS, no framework. Keep functions small and commented
  where the intent isn't obvious.
- Rust: `cargo fmt` formatting, no warnings.
- Do not commit secrets, API keys, binaries, or `node_modules`.

## Naming

"Winamp" is a trademark of its owner. Do not add Winamp logos, skin bitmaps,
or trademarked assets. If the project is renamed, the display name is
centralized in `APP_NAME` (`src/app.js`) and `productName`
(`src-tauri/tauri.conf.json`) — keep it that way.
