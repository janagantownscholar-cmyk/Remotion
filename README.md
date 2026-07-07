# Remotion Video

Create videos programmatically with [Remotion](https://www.remotion.dev) — write React components, get MP4s.

## Setup

```bash
npm install
```

## Preview (interactive studio)

Opens a browser-based editor where you can scrub the timeline and live-edit props.

```bash
npm run dev
```

## Render to MP4

```bash
npm run render         # renders the HelloWorld composition -> out/video.mp4
npm run render-intro   # renders the TitleIntro composition -> out/intro.mp4
```

Render any composition with custom props:

```bash
npx remotion render TitleIntro out/custom.mp4 --props='{"title":"My Title","subtitle":"Tagline","accentColor":"#ff4f8c","backgroundColor":"#101014"}'
```

Export a single frame as a still image:

```bash
npm run still   # -> out/still.png
```

## Project structure

| File | Purpose |
| --- | --- |
| `src/index.ts` | Entry point — registers the root. |
| `src/Root.tsx` | Registers every `<Composition>` (id, dimensions, fps, duration, default props). |
| `src/HelloWorld.tsx` | Simple spring-animated title card. |
| `src/TitleIntro.tsx` | Polished, schema-driven intro with staggered text and animated accent ring. |
| `remotion.config.ts` | Render/preview configuration. |

## How Remotion works

- A video is a React component rendered once per frame.
- `useCurrentFrame()` tells you which frame you're on; you drive all animation from it.
- `interpolate()` maps a frame range to a value range (e.g. fade opacity 0 → 1).
- `spring()` gives natural, physics-based motion.
- The renderer runs your component headlessly in Chromium and stitches frames with FFmpeg.

## Adding a new video

1. Create `src/MyVideo.tsx` exporting a React component.
2. Register it with a `<Composition>` in `src/Root.tsx`.
3. Preview with `npm run dev`, then `npx remotion render MyVideo out/my.mp4`.
