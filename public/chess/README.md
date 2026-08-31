# 少女前线-战术棋 (Chess) v0.1.2 — Unity WebGL rebuild

Rebuilt from the original `chess-v0.1.2.unity3d` (Unity 4.6.6f2 Web Player bundle) into a
modern Unity 2022.3.62f3 WebGL build (IL2CPP, WebGL 2.0). See `CHANGELOG.md` for the full
extraction → import → fix → build → verify pipeline.

## Contents

| File | Purpose |
|---|---|
| `index.html` | Entry page (1024×576 canvas) |
| `Build/chess-v0.1.2.{loader.js, framework.js.gz, wasm.gz, data.gz}` | The Unity WebGL player (Gzip-compressed) |
| `_headers` | EdgeOne Pages response headers (`Content-Encoding: gzip` etc.) |
| `TemplateData/` | Unity WebGL template assets |
| `CHANGELOG.md` | Full change log (Phases A–E) |

## Hosting

Serve this folder over HTTP (any static server). Example:

```bash
cd deploy && python3 -m http.server 8080
# or: npx serve .
```

Open `http://localhost:8080` in Chrome / Edge / Firefox (a GPU-backed browser is required
for the first frame; the build targets WebGL 2.0).

**Cache note:** Unity caches the `.data` file in the browser's IndexedDB (`UnityCache`).
After deploying a new build, do a hard refresh or clear site data, otherwise the old data
file may be served.

## Under 25 MB per file (e.g. EdgeOne Pages)

The build is shipped **Gzip-compressed** so no single file exceeds 25 MB (an upload-size
limit EdgeOne Pages enforces — it aborts the build if any file is larger). `.wasm` was
29.4 MB raw; it is now `chess-v0.1.2.wasm.gz` at **7.8 MB**, and `data.gz` is **17 MB**
(raw 21.9 MB). **No slicing or reassembly is needed — Unity's compression alone satisfies
the limit.**

Because the compressed `loader.js` does **not** decompress in JS, the files must be served
so the correct `Content-Encoding` reaches the browser, or the game will not start:

- **`chess-v0.1.2.wasm.gz`** → `Content-Encoding: gzip`, `Content-Type: application/wasm`
- **`chess-v0.1.2.data.gz`** → `Content-Encoding: gzip`, `Content-Type: application/octet-stream`
- **`chess-v0.1.2.framework.js.gz`** → `Content-Encoding: gzip`, `Content-Type: application/javascript`

Use the bundled **`_headers`** file for EdgeOne Pages (Cloudflare-Pages-compatible); it sets
these headers automatically. If EdgeOne Pages already serves `.gz` with
`Content-Encoding: gzip` you can leave it out. The launcher's `createUnityInstance` config
points at the `.gz` URLs. Local testing with `work/scripts/serve.mjs` sets these headers too.

> If a host cannot set per-file `Content-Encoding`, use an EdgeOne Function to add it for the
> three `.gz` requests — the common failure symptom is `Content-Type`/`Content-Encoding`
> mismatch (the wasm arriving as `application/gzip` instead of `application/wasm`).

## Launcher page (`index.html`)

Postmodern-flat launcher in a **grey + orange** palette (matching the in-game icons), with
layered geometric titling and auto day/night (`prefers-color-scheme`) + manual toggle. Both
tabs share the same layout (game card + compact note below) so switching is seamless:

- **`重置版 · WebGL`** — the playable rebuild (`Build/chess-v0.1.2.*` + `canvas`), with its own
  rebuild note.
- **`原版 · Web Player`** — the original game embedded via `UnityObject2.js` + `chess-v0.1.2.unity3d`
  (loaded with `jquery.min.js`, which UnityObject2 requires), with the original flavor/comment
  text. In browsers that enable the Web Player plugin (e.g. **360 browser**) it runs the original
  directly; otherwise a plugin-missing notice points to the rebuild.

Scripts: `jquery.min.js`, `UnityObject2.js`, `chess-v0.1.2.unity3d` are bundled at the deploy root.

## Verified in-container

- Imports with **0 compile errors**, 0 missing-script warnings.
- Game logic runs: 7×5 board, 15 units, bread economy, PvE (alpha-beta AI) and local 2P,
  zero exceptions in editor play tests.
- World rendering confirmed in the Linux Mono player (Xvfb + software GL frame grabs):
  board, unit cards, the character portrait (full-body, correctly anchored), UI panels all
  render, matching the original game's layout.
- Engine boot in browser: progress 100%, WebGL 2.0 context created, **0 JS/console errors**
  (Chrome 131, Chrome 151, Firefox 153).
- Final first-frame render must be confirmed on a real GPU machine (this container's
  software-GL stack cannot complete the WebGL engine's first frame — engine-level issue,
  reproduced with an empty project; see CHANGELOG Phase E).

## Known limitations

- Online (Photon) mode cannot connect: the original servers/AppId are defunct; the game's
  own error path is shown instead. Local PvE/PvP is fully preserved.
- CJK text uses the embedded Noto Sans CJK subset (no OS font fallback in WebGL).
- Audio starts after a user gesture (browser autoplay policy; the engine resumes the
  AudioContext on the first click).
- Enemy-turn (PvE): fixed — the AI now runs its search on the main thread (WebGL has no
  background thread by default), so the agent's turn always completes. The enemy waits for
  the player to tap **回合结束 / END TURN** before acting (the battle-start "ON HOLD"
  banner is normal turn‑1 behavior).
