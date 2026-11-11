/* RetroAmp — frontend
 * Vanilla JS. Audio goes through WebAudio so the 10-band EQ and the
 * spectrum visualizer work on every local/synth source.
 * NOTE: the display name is centralized here (APP_NAME). If the project
 * is renamed, change APP_NAME + tauri.conf.json productName + README.
 */
"use strict";

const APP_NAME = "RetroAmp";

/* ---------------- state ---------------- */
const state = {
  queue: [],            // {id, title, source, url?, file?, duration?, kind: 'local'|'embed'|'synth'}
  current: -1,
  playing: false,
  shuffle: false,
  repeat: "off",        // off | all | one
  theme: "classic-green",
  plugins: {},          // id -> {meta, enabled, api}
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const audio = $("#audio");
const fmt = (s) => {
  if (!isFinite(s) || s == null) return "0:00";
  s = Math.max(0, Math.floor(s));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};

/* ---------------- toast ---------------- */
let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------------- WebAudio: EQ + visualizer ---------------- */
let actx = null, sourceNode = null, analyser = null, eqNodes = [], gainNode = null, panNode = null;
const EQ_FREQS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
const EQ_PRESETS = {
  "Flat":        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Rock":        [4, 3, 2, 0, -1, 1, 3, 4, 4, 4],
  "Pop":         [2, 3, 3, 2, 0, 0, 1, 2, 3, 3],
  "Jazz":        [3, 2, 1, 1, 0, 1, 2, 3, 3, 2],
  "Bass":        [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  "Dangdut Koplo": [5, 4, 2, 1, 0, 1, 2, 4, 5, 5],
  "Classical":   [3, 2, 1, 0, 0, 0, 1, 2, 3, 4],
};

function ensureAudioGraph() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  sourceNode = actx.createMediaElementSource(audio);
  let node = sourceNode;
  eqNodes = EQ_FREQS.map((f) => {
    const b = actx.createBiquadFilter();
    b.type = "peaking"; b.frequency.value = f; b.Q.value = 1; b.gain.value = 0;
    node.connect(b); node = b;
    return b;
  });
  gainNode = actx.createGain();
  gainNode.gain.value = 0.8;
  panNode = actx.createStereoPanner ? actx.createStereoPanner() : null;
  analyser = actx.createAnalyser();
  analyser.fftSize = 256;
  node.connect(gainNode);
  if (panNode) { gainNode.connect(panNode); panNode.connect(analyser); }
  else gainNode.connect(analyser);
  analyser.connect(actx.destination);
  drawVisualizer();
}

function drawVisualizer() {
  const cv = $("#visualizer");
  const ctx = cv.getContext("2d");
  const buf = new Uint8Array(analyser.frequencyBinCount);
  const css = getComputedStyle(document.documentElement);
  function frame() {
    requestAnimationFrame(frame);
    analyser.getByteFrequencyData(buf);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cv.width, cv.height);
    const bars = 48, w = cv.width / bars;
    for (let i = 0; i < bars; i++) {
      const v = buf[Math.floor(i * buf.length / bars)] / 255;
      const h = Math.max(2, v * cv.height);
      ctx.fillStyle = state.playing ? css.getPropertyValue("--lcd").trim() || "#7dff5e" : "#2a4a22";
      ctx.fillRect(i * w + 1, cv.height - h, w - 2, h);
    }
  }
  frame();
}

/* ---------------- EQ UI ---------------- */
function buildEq() {
  const bands = $("#eq-bands");
  EQ_FREQS.forEach((f, i) => {
    const div = document.createElement("div");
    div.className = "band";
    div.innerHTML = `<input type="range" min="-12" max="12" step="1" value="0" data-i="${i}" title="${f} Hz"><label>${f >= 1000 ? (f / 1000) + "k" : f}</label>`;
    bands.appendChild(div);
  });
  bands.addEventListener("input", (e) => {
    ensureAudioGraph();
    const i = +e.target.dataset.i;
    eqNodes[i].gain.value = +e.target.value;
    markPresetDirty();
  });
  const presets = $("#eq-presets");
  Object.keys(EQ_PRESETS).forEach((name) => {
    const b = document.createElement("button");
    b.className = "chip"; b.textContent = name; b.dataset.preset = name;
    b.addEventListener("click", () => applyPreset(name));
    presets.appendChild(b);
  });
  applyPreset("Flat");
}
function applyPreset(name) {
  ensureAudioGraph();
  const vals = EQ_PRESETS[name];
  $$("#eq-bands input").forEach((el, i) => {
    el.value = vals[i];
    if (eqNodes[i]) eqNodes[i].gain.value = vals[i];
  });
  $$("#eq-presets .chip").forEach((c) => c.classList.toggle("active", c.dataset.preset === name));
}
function markPresetDirty() {
  $$("#eq-presets .chip").forEach((c) => c.classList.remove("active"));
}

/* ---------------- queue / playback ---------------- */
function addTrack(track) {
  track.id = "t" + Date.now() + Math.floor(Math.random() * 1e6);
  state.queue.push(track);
  renderQueue();
  return state.queue.length - 1;
}
function renderQueue() {
  const pl = $("#playlist");
  if (!state.queue.length) {
    pl.innerHTML = '<p class="empty">Queue is empty.<br />Add local files, load a YouTube/Spotify link, or try a synth demo song.</p>';
    return;
  }
  pl.innerHTML = "";
  state.queue.forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "item" + (i === state.current ? " playing" : "");
    div.innerHTML = `<span class="idx">${i + 1}.</span><span>${escapeHtml(t.title)}</span><span class="dur">${t.duration ? fmt(t.duration) : ""}</span>`;
    div.addEventListener("click", () => playIndex(i));
    pl.appendChild(div);
  });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setLcd(track) {
  $("#lcd-title").textContent = track ? track.title : "No track loaded";
  $("#lcd-source").textContent = track ? track.source : "—";
  $("#lcd-duration").textContent = track && track.duration ? fmt(track.duration) : "0:00";
}

function playIndex(i) {
  if (i < 0 || i >= state.queue.length) return;
  state.current = i;
  const t = state.queue[i];
  ensureAudioGraph();
  if (actx.state === "suspended") actx.resume();
  if (t.kind === "synth") {
    audio.pause();
    playSynth(t.synthId);
  } else if (t.kind === "local") {
    stopSynth();
    audio.src = t.url;
    audio.play().catch((e) => toast("Could not play file: " + e.message));
  } else {
    // embed kinds are played inside their iframe; the queue entry is a marker
    stopSynth();
    audio.pause();
    toast("Playing in the " + t.source + " embed panel — switch to that tab.");
  }
  state.playing = true;
  $("#btn-play").textContent = "⏸";
  setLcd(t);
  renderQueue();
  emit("trackchange", currentTrack());
  emit("playstatechange", true);
}

function currentTrack() {
  return state.current >= 0 ? state.queue[state.current] : null;
}

function playPause() {
  ensureAudioGraph();
  if (state.current < 0) { if (state.queue.length) playIndex(0); return; }
  const t = currentTrack();
  if (t && t.kind === "synth") {
    if (state.playing) { stopSynth(); state.playing = false; }
    else { playSynth(t.synthId); state.playing = true; }
  } else if (t && t.kind === "local") {
    if (audio.paused) { audio.play(); state.playing = true; }
    else { audio.pause(); state.playing = false; }
  } else {
    state.playing = !state.playing; // embed: we cannot control the iframe
    toast("Embed playback is controlled inside the embedded player.");
  }
  $("#btn-play").textContent = state.playing ? "⏸" : "▶";
  emit("playstatechange", state.playing);
}

function stopAll() {
  audio.pause(); audio.currentTime = 0;
  stopSynth();
  state.playing = false;
  $("#btn-play").textContent = "▶";
  $("#lcd-time").textContent = "0:00";
  emit("playstatechange", false);
}

function nextTrack() {
  if (!state.queue.length) return;
  if (state.repeat === "one") { playIndex(state.current); return; }
  if (state.shuffle) {
    let n; do { n = Math.floor(Math.random() * state.queue.length); } while (state.queue.length > 1 && n === state.current);
    playIndex(n); return;
  }
  const n = state.current + 1;
  if (n < state.queue.length) playIndex(n);
  else if (state.repeat === "all") playIndex(0);
  else stopAll();
}
function prevTrack() {
  if (!state.queue.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  playIndex((state.current - 1 + state.queue.length) % state.queue.length);
}

audio.addEventListener("timeupdate", () => {
  $("#lcd-time").textContent = fmt(audio.currentTime);
  if (audio.duration) { $("#seek").value = (audio.currentTime / audio.duration) * 100; }
});
audio.addEventListener("loadedmetadata", () => {
  const t = currentTrack();
  if (t && t.kind === "local") { t.duration = audio.duration; $("#lcd-duration").textContent = fmt(audio.duration); renderQueue(); }
});
audio.addEventListener("ended", () => nextTrack());

/* ---------------- transport wiring ---------------- */
$("#btn-play").addEventListener("click", playPause);
$("#btn-stop").addEventListener("click", stopAll);
$("#btn-next").addEventListener("click", nextTrack);
$("#btn-prev").addEventListener("click", prevTrack);
$("#btn-shuffle").addEventListener("click", (e) => {
  state.shuffle = !state.shuffle;
  e.currentTarget.classList.toggle("active", state.shuffle);
});
$("#btn-repeat").addEventListener("click", (e) => {
  state.repeat = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
  e.currentTarget.classList.toggle("active", state.repeat !== "off");
  e.currentTarget.textContent = state.repeat === "one" ? "↻1" : "↻";
  toast("Repeat: " + state.repeat);
});
$("#seek").addEventListener("input", (e) => {
  if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
});
$("#volume").addEventListener("input", (e) => {
  ensureAudioGraph();
  if (gainNode) gainNode.gain.value = e.target.value / 100;
  audio.volume = e.target.value / 100;
});
$("#balance").addEventListener("input", (e) => {
  ensureAudioGraph();
  if (panNode) panNode.pan.value = e.target.value / 100;
});

/* ---------------- tabs ---------------- */
$$("#tabs .tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$("#tabs .tab").forEach((t) => t.classList.toggle("active", t === tab));
    $$(".tabpane").forEach((p) => p.classList.toggle("active", p.dataset.pane === tab.dataset.tab));
  });
});

/* ---------------- local files ---------------- */
const fileInput = $("#file-input");
const dropzone = $("#dropzone");
dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("over"); });
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("over"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault(); dropzone.classList.remove("over");
  addFiles(e.dataTransfer.files);
});
fileInput.addEventListener("change", () => addFiles(fileInput.files));
function addFiles(files) {
  let added = 0, first = -1;
  Array.from(files).forEach((f) => {
    if (!f.type.startsWith("audio/") && !/\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(f.name)) return;
    const i = addTrack({ title: f.name.replace(/\.[^.]+$/, ""), source: "Local file", kind: "local", url: URL.createObjectURL(f), file: f });
    if (first < 0) first = i;
    added++;
  });
  if (added) { toast(added + " file(s) added to the queue"); if (state.current < 0) playIndex(first); }
  else toast("No audio files found in that selection.");
}

/* ---------------- YouTube / Spotify embeds ---------------- */
function ytEmbedId(url) {
  const m = url.match(/[?&]v=([\w-]{6,})|youtu\.be\/([\w-]{6,})|list=([\w-]+)/);
  return m ? (m[1] || m[2] || m[3]) : null;
}
function spEmbedUrl(url) {
  const m = url.match(/open\.spotify\.com\/(track|album|playlist)\/([\w]+)/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}
function loadEmbed(kind, url) {
  if (kind === "youtube") {
    const id = ytEmbedId(url);
    if (!id) { toast("That doesn't look like a YouTube video or playlist URL."); return; }
    const isList = url.includes("list=");
    const src = isList
      ? `https://www.youtube.com/embed/videoseries?list=${id}`
      : `https://www.youtube.com/embed/${id}`;
    $("#yt-holder").innerHTML = `<iframe src="${src}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    addTrack({ title: isList ? "YouTube playlist" : "YouTube video", source: "YouTube", kind: "embed" });
    toast("YouTube loaded — press play inside the embed.");
  } else {
    const src = spEmbedUrl(url);
    if (!src) { toast("That doesn't look like a Spotify track, album or playlist URL."); return; }
    $("#sp-holder").innerHTML = `<iframe src="${src}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    addTrack({ title: "Spotify selection", source: "Spotify", kind: "embed" });
    toast("Spotify loaded — press play inside the embed.");
  }
}
$("#yt-load").addEventListener("click", () => loadEmbed("youtube", $("#yt-url").value.trim()));
$("#yt-example").addEventListener("click", () => {
  $("#yt-url").value = "https://www.youtube.com/watch?v=jfKfPfyJRdk";
  loadEmbed("youtube", $("#yt-url").value);
});
$("#yt-url").addEventListener("keydown", (e) => { if (e.key === "Enter") loadEmbed("youtube", e.target.value.trim()); });
$("#sp-load").addEventListener("click", () => loadEmbed("spotify", $("#sp-url").value.trim()));
$("#sp-example").addEventListener("click", () => {
  $("#sp-url").value = "https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF";
  loadEmbed("spotify", $("#sp-url").value);
});
$("#sp-url").addEventListener("keydown", (e) => { if (e.key === "Enter") loadEmbed("spotify", e.target.value.trim()); });

/* ---------------- synth demo songs ---------------- */
const SYNTH_SONGS = [
  { id: "synth-1", title: "Synth Demo — Sunrise Arpeggio", bpm: 96, root: 60, pattern: [0, 4, 7, 12, 7, 4] },
  { id: "synth-2", title: "Synth Demo — Night Drive Bass", bpm: 112, root: 48, pattern: [0, 0, 7, 10, 7, 3] },
  { id: "synth-3", title: "Synth Demo — Pixel Rain", bpm: 128, root: 64, pattern: [0, 3, 7, 10, 12, 10] },
];
let synthTimer = null, synthStep = 0;
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function playSynth(id) {
  ensureAudioGraph();
  stopSynth();
  const song = SYNTH_SONGS.find((s) => s.id === id);
  if (!song) return;
  const stepDur = 60 / song.bpm / 2;
  synthStep = 0;
  synthTimer = setInterval(() => {
    if (!actx) return;
    const note = song.root + song.pattern[synthStep % song.pattern.length];
    const osc = actx.createOscillator(), g = actx.createGain();
    osc.type = "triangle";
    osc.frequency.value = midiToFreq(note);
    g.gain.setValueAtTime(0.25, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + stepDur * 0.95);
    osc.connect(g); g.connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + stepDur);
    synthStep++;
  }, stepDur * 1000);
}
function stopSynth() { if (synthTimer) { clearInterval(synthTimer); synthTimer = null; } }
(function buildSynthButtons() {
  const row = $("#synth-buttons");
  SYNTH_SONGS.forEach((s) => {
    const b = document.createElement("button");
    b.className = "tbtn"; b.textContent = "▶ " + s.title.replace("Synth Demo — ", "");
    b.addEventListener("click", () => {
      const i = addTrack({ title: s.title, source: "Synth demo", kind: "synth", synthId: s.id, duration: 0 });
      playIndex(i);
    });
    row.appendChild(b);
  });
})();

/* ---------------- themes ---------------- */
const BUILTIN_THEMES = [
  { id: "classic-green", name: "Classic Green", author: "WellArtDev", description: "The original green-LCD look." },
  { id: "blue-steel", name: "Blue Steel", author: "WellArtDev", description: "Cool blue and silver, inspired by the classic player with Playlist Editor and Media Library." },
];
let availableThemes = [...BUILTIN_THEMES];

function applyTheme(id) {
  const theme = availableThemes.find((t) => t.id === id);
  const link = $("#theme-link");
  if (theme && theme.user) {
    // User themes live in the app-data dir, not in src/ — inject their CSS.
    loadUserThemeCss(id);
  } else {
    const style = document.getElementById("user-theme-style");
    if (style) style.remove();
    link.href = "themes/" + id + "/theme.css";
  }
  state.theme = id;
  try { localStorage.setItem("wr-theme", id); } catch (e) { /* private mode */ }
  $$("#theme-select, #theme-select-footer").forEach((sel) => { sel.value = id; });
  document.title = APP_NAME + (theme ? " — " + theme.name : "");
}

async function loadUserThemeCss(id) {
  try {
    const tauri = window.__TAURI__;
    if (!tauri || !tauri.fs) return;
    const { readTextFile } = tauri.fs;
    const { appDataDir } = tauri.path;
    const base = await appDataDir();
    const css = await readTextFile(base + "themes/" + id + "/theme.css");
    let style = document.getElementById("user-theme-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "user-theme-style";
      document.head.appendChild(style);
    }
    style.textContent = css;
  } catch (e) { console.warn("could not load user theme css:", id, e); }
}
function renderThemeSelectors() {
  $$("#theme-select, #theme-select-footer").forEach((sel) => {
    sel.innerHTML = "";
    availableThemes.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.id; o.textContent = t.name + (t.author ? " — " + t.author : "");
      sel.appendChild(o);
    });
    sel.value = state.theme;
  });
}
$("#theme-select").addEventListener("change", (e) => applyTheme(e.target.value));
$("#theme-select-footer").addEventListener("change", (e) => applyTheme(e.target.value));
$("#theme-manage").addEventListener("click", () => openModal("themes"));
$("#menu-open-themes-folder").addEventListener("click", () => openUserDir("themes"));

async function loadUserThemes() {
  // In the Tauri build, scan the app-data themes dir via the fs plugin.
  // In a plain browser (dev preview) this silently no-ops.
  try {
    const tauri = window.__TAURI__;
    if (!tauri || !tauri.fs) return;
    const { readDir, readTextFile } = tauri.fs;
    const { appDataDir } = tauri.path;
    const base = await appDataDir();
    const entries = await readDir(base + "themes");
    for (const e of entries) {
      if (!e.isDirectory) continue;
      try {
        const meta = JSON.parse(await readTextFile(base + "themes/" + e.name + "/theme.json"));
        if (meta && meta.id && !availableThemes.some((t) => t.id === meta.id)) {
          availableThemes.push({ id: meta.id, name: meta.name || meta.id, author: meta.author || "", description: meta.description || "", user: true });
        }
      } catch (err) { console.warn("theme skipped:", e.name, err); }
    }
  } catch (e) { /* no fs access — built-ins only */ }
  renderThemeSelectors();
}

/* ---------------- plugin system ---------------- */
const listeners = {};
function on(event, cb) {
  (listeners[event] = listeners[event] || []).push(cb);
}
function emit(event, data) {
  (listeners[event] || []).forEach((cb) => { try { cb(data); } catch (e) { console.warn("plugin listener error", e); } });
}

const PlayerAPI = {
  play: () => playPause(),
  pause: () => { if (state.playing) playPause(); },
  next: () => nextTrack(),
  prev: () => prevTrack(),
  getCurrentTrack: () => currentTrack(),
  getQueue: () => state.queue.slice(),
  on,
  addPanel({ id, title, html }) {
    let panel = document.getElementById("plugin-panel-" + id);
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "plugin-panel";
      panel.id = "plugin-panel-" + id;
      $("#panels").appendChild(panel);
    }
    panel.innerHTML = `<h3>${escapeHtml(title)}</h3><div class="body">${html}</div>`;
    return panel;
  },
  registerMenuItem(label, cb) {
    const menu = document.querySelector('[data-menu="file"] .dropdown');
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    b.addEventListener("click", cb);
    menu.appendChild(b);
  },
  toast,
};
window.PlayerAPI = PlayerAPI;

const BUILTIN_PLUGINS = [
  { id: "clock-widget", name: "Clock Widget", version: "1.0.0", author: "WellArtDev", description: "Adds a small live clock panel to the sidebar.", main: "plugins/clock-widget/main.js" },
  { id: "now-playing", name: "Now Playing", version: "1.0.0", author: "WellArtDev", description: "Shows the current track with a copy-to-clipboard button.", main: "plugins/now-playing/main.js" },
];

async function loadPluginScript(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const code = await res.text();
  const fn = new Function("PlayerAPI", "window", code);
  fn(PlayerAPI, window);
}

async function loadPlugins() {
  const saved = {};
  try { Object.assign(saved, JSON.parse(localStorage.getItem("wr-plugins") || "{}")); } catch (e) { /* ignore */ }
  const all = [...BUILTIN_PLUGINS];
  // User plugins from the app-data plugins dir (Tauri build only).
  try {
    const tauri = window.__TAURI__;
    if (tauri && tauri.fs) {
      const { readDir, readTextFile } = tauri.fs;
      const { appDataDir } = tauri.path;
      const base = await appDataDir();
      const entries = await readDir(base + "plugins");
      for (const e of entries) {
        if (!e.isDirectory) continue;
        try {
          const meta = JSON.parse(await readTextFile(base + "plugins/" + e.name + "/plugin.json"));
          if (meta && meta.id && !all.some((p) => p.id === meta.id)) {
            all.push({ ...meta, user: true, userCode: await readTextFile(base + "plugins/" + e.name + "/" + (meta.main || "main.js")) });
          }
        } catch (err) { console.warn("plugin skipped:", e.name, err); }
      }
    }
  } catch (e) { /* no fs access — built-ins only */ }
  for (const meta of all) {
    const enabled = saved[meta.id] !== false;
    state.plugins[meta.id] = { meta, enabled };
    if (enabled) {
      try {
        if (meta.userCode) {
          const fn = new Function("PlayerAPI", "window", meta.userCode);
          fn(PlayerAPI, window);
        } else {
          await loadPluginScript(meta.main);
        }
      } catch (e) { console.warn("plugin failed:", meta.id, e); toast("Plugin failed to load: " + meta.name); }
    }
  }
  updatePluginCount();
}

function updatePluginCount() {
  const on = Object.values(state.plugins).filter((p) => p.enabled).length;
  $("#plugin-count").textContent = on + " plugin(s) active";
}

function savePluginPrefs() {
  const prefs = {};
  Object.values(state.plugins).forEach((p) => { prefs[p.meta.id] = p.enabled; });
  try { localStorage.setItem("wr-plugins", JSON.stringify(prefs)); } catch (e) { /* ignore */ }
}

async function openUserDir(kind) {
  try {
    const tauri = window.__TAURI__;
    if (tauri && tauri.core && tauri.core.invoke) {
      const dir = await tauri.core.invoke("user_data_dir");
      toast(kind + " folder: " + dir + "/" + kind);
      return;
    }
  } catch (e) { /* fall through */ }
  toast("User " + kind + " live in the app-data folder — see THEMES.md / PLUGINS.md.");
}
$("#menu-open-plugins-folder").addEventListener("click", () => openUserDir("plugins"));
$("#menu-plugins").addEventListener("click", () => openModal("plugins"));

/* ---------------- modal (settings / about / themes) ---------------- */
function openModal(kind) {
  const body = $("#modal-body");
  const title = $("#modal-title");
  if (kind === "plugins") {
    title.textContent = "Plugins";
    body.innerHTML = '<p class="note">Enable or disable plugins. Changes apply after a restart. Write your own — see PLUGINS.md.</p>';
    Object.values(state.plugins).forEach((p) => {
      const row = document.createElement("div");
      row.className = "plugin-row";
      row.innerHTML = `<div class="info"><div class="name">${escapeHtml(p.meta.name)} <span style="color:var(--text-dim);font-weight:400">v${escapeHtml(p.meta.version || "")}</span></div><div class="desc">${escapeHtml(p.meta.description || "")} — ${escapeHtml(p.meta.author || "")}</div></div>`;
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = p.enabled;
      cb.addEventListener("change", () => {
        p.enabled = cb.checked; savePluginPrefs(); updatePluginCount();
        toast(p.meta.name + (p.enabled ? " enabled — restart to load." : " disabled — restart to unload."));
      });
      row.appendChild(cb);
      body.appendChild(row);
    });
  } else if (kind === "themes") {
    title.textContent = "Themes";
    body.innerHTML = '<p class="note">Pick a theme below, or drop a new theme folder into the app-data themes folder (see THEMES.md) and restart.</p>';
    availableThemes.forEach((t) => {
      const row = document.createElement("div");
      row.className = "plugin-row";
      row.innerHTML = `<div class="info"><div class="name">${escapeHtml(t.name)}</div><div class="desc">${escapeHtml(t.description || "")} — ${escapeHtml(t.author || "")}${t.user ? " (user theme)" : ""}</div></div>`;
      const b = document.createElement("button");
      b.className = "chip" + (t.id === state.theme ? " active" : "");
      b.textContent = t.id === state.theme ? "Active" : "Apply";
      b.addEventListener("click", () => { applyTheme(t.id); openModal("themes"); });
      row.appendChild(b);
      body.appendChild(row);
    });
  } else if (kind === "about") {
    title.textContent = "About " + APP_NAME;
    body.innerHTML = `<p class="note">${APP_NAME} is a classic-style desktop music player: local files, YouTube and Spotify embeds, a 10-band equalizer, switchable themes and a plugin system.</p><p class="note">Version 0.1.0 · Built with Tauri v2 · MIT licensed · by WellArtDev.</p><p class="note">This project is not affiliated with or endorsed by Winamp or its owners.</p>`;
  }
  $("#modal-backdrop").classList.add("show");
}
$("#modal-close").addEventListener("click", () => $("#modal-backdrop").classList.remove("show"));
$("#modal-backdrop").addEventListener("click", (e) => { if (e.target.id === "modal-backdrop") e.target.classList.remove("show"); });
$("#menu-about").addEventListener("click", () => openModal("about"));
$("#menu-open-readme").addEventListener("click", () => {
  toast("See THEMES.md and PLUGINS.md in the project repo to make your own.");
});

/* ---------------- file menu ---------------- */
$("#menu-open-files").addEventListener("click", () => fileInput.click());
$("#menu-open-folder").addEventListener("click", async () => {
  try {
    const tauri = window.__TAURI__;
    if (tauri && tauri.dialog) {
      const picked = await tauri.dialog.open({ multiple: true, filters: [{ name: "Audio", extensions: ["mp3", "wav", "ogg", "flac", "m4a"] }] });
      if (picked) toast("Picked " + (Array.isArray(picked) ? picked.length : 1) + " file(s) — drag them into the drop zone to play in this build.");
      return;
    }
  } catch (e) { /* fall through */ }
  fileInput.click();
});
$("#menu-clear-queue").addEventListener("click", () => {
  stopAll(); state.queue = []; state.current = -1; setLcd(null); renderQueue();
  toast("Queue cleared.");
});

/* ---------------- menu dropdown behaviour ---------------- */
$$(".menu > button").forEach((b) => {
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = b.parentElement;
    const wasOpen = menu.classList.contains("open");
    $$(".menu").forEach((m) => m.classList.remove("open"));
    if (!wasOpen) menu.classList.add("open");
  });
});
document.addEventListener("click", () => $$(".menu").forEach((m) => m.classList.remove("open")));

/* ---------------- menu clock ---------------- */
function tickClock() {
  const el = $("#menu-clock");
  if (el) el.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
setInterval(tickClock, 1000);

/* ---------------- boot ---------------- */
$("#brand-name").textContent = APP_NAME;
buildEq();
renderThemeSelectors();
try {
  const savedTheme = localStorage.getItem("wr-theme");
  if (savedTheme && BUILTIN_THEMES.some((t) => t.id === savedTheme)) applyTheme(savedTheme);
} catch (e) { /* ignore */ }
loadUserThemes();
loadPlugins();
tickClock();
