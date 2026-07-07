import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";

/* ========================================================================== */
/*  Fonts — bundled locally so headless renders need no network.              */
/*  DISPLAY: Ultra (chunky Egyptian slab) · HEAD: Anton (condensed grotesque) */
/*  MONO: IBM Plex Mono (terminal readout)                                    */
/* ========================================================================== */

const DISPLAY = "Ultra";
const HEAD = "Anton";
const MONO = "IBM Plex Mono";

loadFont({ family: DISPLAY, url: staticFile("fonts/ultra-latin-400-normal.woff2"), weight: "400" });
loadFont({ family: HEAD, url: staticFile("fonts/anton-latin-400-normal.woff2"), weight: "400" });
loadFont({ family: MONO, url: staticFile("fonts/ibm-plex-mono-latin-400-normal.woff2"), weight: "400" });
loadFont({ family: MONO, url: staticFile("fonts/ibm-plex-mono-latin-600-normal.woff2"), weight: "600" });

/* ========================================================================== */
/*  Palette                                                                   */
/* ========================================================================== */

const C = {
  paper: "#EDE4D3",
  ink: "#3A2318", // deep oxblood-brown
  orange: "#D2691E", // burnt orange
  mustard: "#E4B04A", // mustard yellow
  teal: "#4A7C74", // faded teal
  signal: "#C7433A", // tomato red — WINNING ONLY
};

const EASE = Easing.out(Easing.cubic);

/* ========================================================================== */
/*  Layout constants (shared by panels + connection endpoints)                */
/* ========================================================================== */

// NOTE on coordinate origins inside <RetroPanel>: the skill lists live inside a
// position:relative wrapper that IS pushed down by the 26px panel padding, while
// the <MatchMeter> is an absolute child of the panel's inner box and IGNORES that
// padding. So list items sit at panelTop + 26 + top, the meter at panelTop + y.
// The connection endpoints below fold in the +26 (and half the font size) so the
// plotter lines land on the vertical centre of each word.
const PAD = 26;
const L = {
  // Left "YOUR SKILLS" panel
  px: 110, py: 205, pw: 520, ph: 560,
  skillTop: 145, skillGap: 70, skillFont: 26,
  attachX: 630, // right edge of left panel (line origin)
  // Right cards attach at their left edge
  cardX: 1150, cardW: 660, cardAttachX: 1150,
  cardH: 360, itemTop: 92, itemGap: 36, itemFont: 22,
  meterY: 298, // measured from panel top (meter ignores padding)
  pmY: 172,
  ccY: 552,
};

const leftY = (i: number) => L.py + PAD + L.skillTop + L.skillFont / 2 + i * L.skillGap;
const pmY = (i: number) => L.pmY + PAD + L.itemTop + L.itemFont / 2 + i * L.itemGap;
const ccY = (i: number) => L.ccY + PAD + L.itemTop + L.itemFont / 2 + i * L.itemGap;

/* ========================================================================== */
/*  Content                                                                   */
/* ========================================================================== */

const YOUR_SKILLS = ["WRITING", "STORYTELLING", "RESEARCH", "ON-CAMERA", "SYSTEMS THINKING"];
const PM_SKILLS = ["ROADMAPPING", "PRIORITIZATION", "STAKEHOLDER MGMT", "SPEC WRITING", "DATA SENSE"];
const CC_SKILLS = ["WRITING", "STORYTELLING", "RESEARCH", "AUDIENCE SENSE", "ON-CAMERA"];

// li = index in YOUR_SKILLS, ri = index in that card's list.
type Card = "pm" | "cc";
type Conn = { li: number; card: Card; ri: number; start: number; dur: number; bright: boolean };

const CONNECTIONS: Conn[] = [
  // Product Management — 2 faint matches
  { li: 0, card: "pm", ri: 3, start: 285, dur: 30, bright: false }, // WRITING ~ SPEC WRITING
  { li: 2, card: "pm", ri: 4, start: 300, dur: 30, bright: false }, // RESEARCH ~ DATA SENSE
  // Content Creation — 4 bright matches
  { li: 0, card: "cc", ri: 0, start: 318, dur: 26, bright: true }, // WRITING
  { li: 1, card: "cc", ri: 1, start: 333, dur: 26, bright: true }, // STORYTELLING
  { li: 2, card: "cc", ri: 2, start: 348, dur: 26, bright: true }, // RESEARCH
  { li: 3, card: "cc", ri: 4, start: 363, dur: 26, bright: true }, // ON-CAMERA
];

/* ========================================================================== */
/*  Timeline (30fps · 480 frames ≈ 16s)                                       */
/* ========================================================================== */

const T = {
  // Beat 1
  titleStamp: 5, underlineStart: 30, underlineEnd: 55, subheadStart: 45, subheadEnd: 75,
  // Beat 2
  titlePark: 78, panelIn: 96, skillsStart: 122, skillLineFrames: 9, charFrames: 1.4,
  // Beat 3
  pmCardIn: 172, ccCardIn: 198, pmListStart: 206, ccListStart: 230,
  // Beat 4
  pmMeterStart: 300, ccMeterStart: 350,
  // Beat 5
  dimStart: 395, dimEnd: 420, stampIn: 415, kickStart: 438, kickEnd: 472, outStart: 472, outEnd: 480,
};

const KICKER = "> highest overlap = where you can be the best, not mediocre.";

const blink = (frame: number) => Math.floor(frame / 8) % 2 === 0;

/* ========================================================================== */
/*  <Scanlines> — faint horizontal lines, global                             */
/* ========================================================================== */

const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      backgroundImage:
        "repeating-linear-gradient(to bottom, rgba(58,35,24,0.06) 0px, rgba(58,35,24,0.06) 1px, transparent 1px, transparent 4px)",
    }}
  />
);

/* ========================================================================== */
/*  <Grain> — moving fractal-noise film grain, global (seed varies per frame) */
/* ========================================================================== */

const Grain: React.FC<{ boost?: number }> = ({ boost = 0 }) => {
  const frame = useCurrentFrame();
  const seed = frame % 12;
  const flicker = 0.1 + 0.03 * Math.sin(frame / 2.3) + boost;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: flicker, mixBlendMode: "multiply" }}>
      <svg width="100%" height="100%">
        <filter id="grainFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grainFilter)" />
      </svg>
    </AbsoluteFill>
  );
};

/* ========================================================================== */
/*  <Halftone> — dot shading behind headers                                   */
/* ========================================================================== */

const Halftone: React.FC<{ color: string; style?: React.CSSProperties }> = ({ color, style }) => (
  <div
    style={{
      position: "absolute",
      backgroundImage: `radial-gradient(${color} 1.1px, transparent 1.4px)`,
      backgroundSize: "7px 7px",
      opacity: 0.28,
      ...style,
    }}
  />
);

/* ========================================================================== */
/*  <RetroPanel> — thick 3px rounded border + 1px registration offset layer   */
/* ========================================================================== */

const RetroPanel: React.FC<{
  x: number; y: number; w: number; h: number;
  border: string; offset: string; enter: number; fromX?: number;
  dim?: number; scale?: number; stamped?: boolean; children: React.ReactNode;
}> = ({ x, y, w, h, border, offset, enter, fromX = 0, dim = 1, scale = 1, stamped = false, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - enter, fps, config: { damping: 12, stiffness: 120, mass: 0.85 } });
  const tx = interpolate(s, [0, 1], [fromX, 0]);
  const appear = interpolate(frame, [enter, enter + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width: w, height: h,
        opacity: appear * dim,
        transform: `translateX(${tx}px) scale(${scale})`,
        transformOrigin: "center",
      }}
    >
      {/* 1px registration-offset colour layer (misprinted-poster charm) */}
      <div style={{ position: "absolute", inset: 0, border: `3px solid ${offset}`, borderRadius: 16, transform: "translate(2px,3px)", opacity: 0.5 }} />
      {/* main ruled border */}
      <div style={{ position: "absolute", inset: 0, border: `${stamped ? 6 : 3}px solid ${border}`, borderRadius: 16, background: "rgba(255,251,242,0.4)" }} />
      <div style={{ position: "absolute", inset: 0, padding: 26, boxSizing: "border-box" }}>{children}</div>
    </div>
  );
};

/* ========================================================================== */
/*  <SkillList> — monospace typewriter with per-line landing + blinking caret */
/*  Lines are absolutely positioned so connection endpoints line up exactly.  */
/* ========================================================================== */

const SkillList: React.FC<{
  items: string[];
  start: number; lineFrames: number; charFrames: number;
  y0: number; gap: number; fontSize: number; color: string;
  flash?: (i: number) => { intensity: number; color: string } | null;
  check?: (i: number) => { on: number; color: string } | null; // spring pop 0..1
}> = ({ items, start, lineFrames, charFrames, y0, gap, fontSize, color, flash, check }) => {
  const frame = useCurrentFrame();
  const charW = fontSize * 0.6;
  return (
    <>
      {items.map((item, i) => {
        const lineStart = start + i * lineFrames;
        if (frame < lineStart) return null;
        const typed = Math.floor((frame - lineStart) / charFrames);
        const shown = item.slice(0, Math.min(item.length, typed));
        const done = typed >= item.length;
        const land = interpolate(frame, [lineStart, lineStart + 4], [-6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const fl = flash?.(i);
        const ck = check?.(i);
        return (
          <div
            key={i}
            style={{
              position: "absolute", top: y0 + i * gap, left: 0, right: 0,
              transform: `translateX(${land}px)`,
              display: "flex", alignItems: "center",
              fontFamily: MONO, fontSize, fontWeight: 400, lineHeight: 1,
              color: fl && fl.intensity > 0.5 ? fl.color : color,
              whiteSpace: "pre",
            }}
          >
            {/* flash highlight block behind the word */}
            {fl && fl.intensity > 0 ? (
              <div
                style={{
                  position: "absolute", left: -6, top: -6, height: fontSize + 12,
                  width: item.length * charW + 12, background: fl.color,
                  opacity: fl.intensity * 0.22, borderRadius: 3,
                }}
              />
            ) : null}
            <span>{shown}</span>
            {!done ? <span style={{ opacity: blink(frame) ? 1 : 0 }}>▌</span> : null}
            {ck && ck.on > 0 ? (
              <span
                style={{
                  marginLeft: 12, color: ck.color, fontWeight: 400,
                  display: "inline-block",
                  transform: `scale(${interpolate(ck.on, [0, 1], [2.2, 1])})`,
                  opacity: interpolate(ck.on, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
                }}
              >
                ✓
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
};

/* ========================================================================== */
/*  <MatchMeter> — segmented LED gauge, springs up with staggered blocks      */
/* ========================================================================== */

const MatchMeter: React.FC<{
  y: number; width: number; segments: number; fill: number;
  color: string; start: number; label: string; dim?: number;
}> = ({ y, width, segments, fill, color, start, label, dim = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 90, mass: 1 } });
  const anim = fill * s;
  const litExact = segments * anim;
  const litSegs = Math.round(litExact);
  const gapPx = 4;
  const segW = (width - gapPx * (segments - 1)) / segments;
  return (
    <div style={{ position: "absolute", top: y, left: 26, right: 26, opacity: dim }}>
      <div style={{ display: "flex", gap: gapPx }}>
        {Array.from({ length: segments }).map((_, i) => {
          const on = i < litSegs;
          // newest-lit block pops slightly
          const pop = on && i === litSegs - 1 ? interpolate(litExact - i, [0, 1], [1.18, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
          return (
            <div
              key={i}
              style={{
                width: segW, height: 18, borderRadius: 2,
                border: `2px solid ${C.ink}`,
                background: on ? color : "transparent",
                transform: `scaleY(${pop})`,
                transformOrigin: "bottom",
              }}
            />
          );
        })}
      </div>
      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 15, color: C.ink }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color }}>{Math.round(anim * 100)}%</span>
      </div>
    </div>
  );
};

/* ========================================================================== */
/*  <ConnectionLine> — dotted retro-plotter line that draws on via an animated */
/*  strokeDashoffset mask (the visible stroke stays dotted; the mask reveals). */
/* ========================================================================== */

const ConnectionLine: React.FC<{
  id: number; x1: number; y1: number; x2: number; y2: number;
  color: string; start: number; dur: number; bright: boolean; dim?: number;
}> = ({ id, x1, y1, x2, y2, color, start, dur, bright, dim = 1 }) => {
  const frame = useCurrentFrame();
  const len = Math.hypot(x2 - x1, y2 - y1);
  const p = interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const connected = frame >= start + dur;
  // subtle travelling pulse once bright lines connect
  const pulse = bright && connected ? 0.75 + 0.25 * Math.sin((frame - start) / 3) : 1;
  if (frame < start) return null;
  const maskId = `reveal-${id}`;
  return (
    <>
      <defs>
        <mask id={maskId}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth={8}
            strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
        </mask>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color}
        strokeWidth={bright ? 3 : 1.5} strokeLinecap="round"
        strokeDasharray={bright ? "2 9" : "2 11"}
        opacity={(bright ? 0.95 : 0.4) * pulse * dim}
        mask={`url(#${maskId})`} />
      {/* plotter node dots at each end once drawing starts */}
      <circle cx={x1} cy={y1} r={bright ? 4 : 3} fill={color} opacity={0.8 * dim} />
      {connected ? <circle cx={x2} cy={y2} r={bright ? 4 : 3} fill={color} opacity={0.9 * dim} /> : null}
    </>
  );
};

/* ========================================================================== */
/*  <Stamp> — rubber-stamp slam (spring), diagonal, ink-bleed                  */
/* ========================================================================== */

const Stamp: React.FC<{ text: string; x: number; y: number; enter: number; rotation: number; color: string }> = ({
  text, x, y, enter, rotation, color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < enter) return null;
  const s = spring({ frame: frame - enter, fps, config: { damping: 9, stiffness: 190, mass: 1.3 } });
  const scale = interpolate(s, [0, 1], [2.6, 1]);
  const rot = interpolate(s, [0, 1], [rotation - 8, rotation]);
  const opacity = interpolate(frame, [enter, enter + 3], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute", left: x, top: y,
        transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${scale})`,
        opacity,
        border: `5px solid ${color}`, borderRadius: 10,
        padding: "10px 30px",
        fontFamily: DISPLAY, fontSize: 58, color,
        letterSpacing: 1,
        // ink bleed: soft coloured halo + faint double
        textShadow: `1.5px 1.5px 0 ${color}55, 0 0 6px ${color}44`,
        boxShadow: `0 0 0 2px ${color}55 inset`,
        background: "rgba(237,228,211,0.15)",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
};

/* ========================================================================== */
/*  Composition                                                               */
/* ========================================================================== */

export const SkillMatchMatrixRetro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  /* ---- Beat 1: title stamp + underline + subhead ---------------------- */
  const stampS = spring({ frame: frame - T.titleStamp, fps, config: { damping: 10, stiffness: 170, mass: 1.1 } });
  const titleScaleIn = interpolate(stampS, [0, 1], [1.08, 1]);
  const titleRotIn = interpolate(stampS, [0, 1], [-2.5, 0]);
  const titleOpacity = interpolate(frame, [T.titleStamp, T.titleStamp + 5], [0, 1], { extrapolateRight: "clamp" });

  // Title parks top-centre in Beat 2.
  const park = interpolate(frame, [T.titlePark, T.titlePark + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const titleTop = interpolate(park, [0, 1], [330, 46]);
  const titleSize = interpolate(park, [0, 1], [104, 46]);
  const underlineW = interpolate(frame, [T.underlineStart, T.underlineEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });

  const subChars = Math.floor(interpolate(frame, [T.subheadStart, T.subheadEnd], [0, 38], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const subText = "> where do you have an unfair advantage?".slice(0, subChars);
  const subOpacity = interpolate(frame, [T.subheadStart, T.subheadStart + 3, T.titlePark, T.titlePark + 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  /* ---- Beat 5: dim + winner scale + fade ------------------------------ */
  const dim = interpolate(frame, [T.dimStart, T.dimEnd], [1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const winScale = interpolate(frame, [T.dimStart, T.dimEnd], [1, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const stamped = frame >= T.dimStart;
  const globalOut = interpolate(frame, [T.outStart, T.outEnd], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const grainBoost = interpolate(frame, [T.outStart - 10, T.outEnd], [0, 0.12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  /* ---- Beat 4: per-item flash + check helpers ------------------------- */
  const connectFrame = (c: Conn) => c.start + c.dur;
  const flashAt = (cf: number, color: string) => ({
    intensity: interpolate(frame, [cf - 2, cf + 2, cf + 20], [0, 1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    color,
  });
  const checkAt = (cf: number, color: string) => {
    if (frame < cf) return null;
    return { on: spring({ frame: frame - cf, fps, config: { damping: 10, stiffness: 200 } }), color };
  };

  // Left-panel flash: earliest connection touching left item i (bright wins colour).
  const leftFlash = (i: number) => {
    const cs = CONNECTIONS.filter((c) => c.li === i);
    if (!cs.length) return null;
    const bright = cs.some((c) => c.bright);
    const cf = Math.min(...cs.map(connectFrame));
    return flashAt(cf, bright ? C.signal : C.mustard);
  };
  // Right-card flash/check per card.
  const rightFlash = (card: Card) => (ri: number) => {
    const c = CONNECTIONS.find((x) => x.card === card && x.ri === ri);
    if (!c) return null;
    return flashAt(connectFrame(c), c.bright ? C.signal : C.mustard);
  };
  const rightCheck = (card: Card) => (ri: number) => {
    const c = CONNECTIONS.find((x) => x.card === card && x.ri === ri);
    if (!c) return null;
    return checkAt(connectFrame(c), c.bright ? C.signal : C.mustard);
  };

  const yFor = (c: Conn) => (c.card === "pm" ? pmY(c.ri) : ccY(c.ri));

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, opacity: globalOut }}>
      {/* ============================ TITLE ============================ */}
      <div
        style={{
          position: "absolute", top: titleTop, left: 0, right: 0,
          textAlign: "center", opacity: titleOpacity * dim,
          transform: `scale(${titleScaleIn}) rotate(${titleRotIn}deg)`,
          transformOrigin: "center top",
        }}
      >
        <Halftone color={C.ink} style={{ left: "50%", transform: "translateX(-50%)", top: -6, width: 900, height: interpolate(park, [0, 1], [130, 60]), opacity: 0.16 }} />
        <div
          style={{
            fontFamily: DISPLAY, fontSize: titleSize, color: C.ink,
            letterSpacing: 1, lineHeight: 1,
            // registration / chromatic offset
            textShadow: `2px 0 0 ${C.orange}77, -2px 1px 0 ${C.teal}77`,
          }}
        >
          THE SKILL-MATCH MATRIX
        </div>
        {/* ruled underline sweeps left→right */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <div style={{ width: interpolate(park, [0, 1], [760, 520]), height: 5, background: C.ink, transform: `scaleX(${underlineW})`, transformOrigin: "left center", borderRadius: 3 }} />
        </div>
      </div>

      {/* subhead (mono, types out) */}
      <div style={{ position: "absolute", top: 500, left: 0, right: 0, textAlign: "center", fontFamily: MONO, fontSize: 30, color: C.orange, opacity: subOpacity }}>
        {subText}
        <span style={{ opacity: blink(frame) ? 1 : 0 }}>▌</span>
      </div>

      {/* ======================= LEFT: YOUR SKILLS ======================= */}
      <RetroPanel x={L.px} y={L.py} w={L.pw} h={L.ph} border={C.ink} offset={C.orange} enter={T.panelIn} dim={dim}>
        <div style={{ position: "relative", height: "100%" }}>
          <Halftone color={C.orange} style={{ left: 0, top: 4, width: 260, height: 46 }} />
          <div style={{ fontFamily: HEAD, fontSize: 40, color: C.ink, letterSpacing: 1 }}>YOUR SKILLS</div>
          <div style={{ height: 4, background: C.orange, width: 300, marginTop: 6, marginBottom: 4, borderRadius: 2 }} />
          {/* skillY0 is a GLOBAL y; convert to panel-local by subtracting panel top+padding */}
          <SkillList
            items={YOUR_SKILLS}
            start={T.skillsStart} lineFrames={T.skillLineFrames} charFrames={T.charFrames}
            y0={L.skillTop} gap={L.skillGap} fontSize={L.skillFont} color={C.ink}
            flash={leftFlash}
          />
        </div>
      </RetroPanel>

      {/* ======================= RIGHT: PM CARD ========================= */}
      <RetroPanel x={L.cardX} y={L.pmY} w={L.cardW} h={L.cardH} border={C.ink} offset={C.mustard} enter={T.pmCardIn} fromX={520} dim={dim}>
        <div style={{ position: "relative", height: "100%" }}>
          <div style={{ fontFamily: HEAD, fontSize: 32, color: C.mustard, letterSpacing: 1, WebkitTextStroke: `0.5px ${C.ink}` }}>PRODUCT MANAGEMENT</div>
          <SkillList
            items={PM_SKILLS}
            start={T.pmListStart} lineFrames={7} charFrames={1.2}
            y0={L.itemTop} gap={L.itemGap} fontSize={L.itemFont} color={C.ink}
            flash={rightFlash("pm")} check={rightCheck("pm")}
          />
        </div>
        <MatchMeter y={L.meterY} width={L.cardW - 52} segments={20} fill={0.4} color={C.mustard} start={T.pmMeterStart} label="MATCH METER" dim={dim} />
      </RetroPanel>

      {/* ==================== RIGHT: CONTENT CARD (winner) ============== */}
      <RetroPanel x={L.cardX} y={L.ccY} w={L.cardW} h={L.cardH} border={stamped ? C.signal : C.ink} offset={C.teal} enter={T.ccCardIn} fromX={520} scale={winScale} stamped={stamped}>
        <div style={{ position: "relative", height: "100%" }}>
          <div style={{ fontFamily: HEAD, fontSize: 32, color: C.teal, letterSpacing: 1, WebkitTextStroke: `0.5px ${C.ink}` }}>CONTENT CREATION</div>
          <SkillList
            items={CC_SKILLS}
            start={T.ccListStart} lineFrames={7} charFrames={1.2}
            y0={L.itemTop} gap={L.itemGap} fontSize={L.itemFont} color={C.ink}
            flash={rightFlash("cc")} check={rightCheck("cc")}
          />
        </div>
        <MatchMeter y={L.meterY} width={L.cardW - 52} segments={20} fill={0.9} color={C.signal} start={T.ccMeterStart} label="MATCH METER" />
      </RetroPanel>

      {/* ==================== CONNECTION LINES (SVG overlay) =========== */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {CONNECTIONS.map((c, i) => (
          <ConnectionLine
            key={i}
            id={i}
            x1={L.attachX}
            y1={leftY(c.li)}
            x2={L.cardAttachX}
            y2={yFor(c)}
            color={c.bright ? C.signal : C.mustard}
            start={c.start}
            dur={c.dur}
            bright={c.bright}
            dim={c.bright ? 1 : dim}
          />
        ))}
      </svg>

      {/* ==================== BEAT 5: STAMP + KICKER =================== */}
      <Stamp text="IDEAL PATH" x={L.cardX + L.cardW / 2} y={L.ccY + L.cardH / 2} enter={T.stampIn} rotation={-11} color={C.signal} />

      <div style={{ position: "absolute", left: L.cardX, top: L.ccY + L.cardH + 26, width: L.cardW + 40, fontFamily: MONO, fontSize: 24, color: C.ink, lineHeight: 1.4 }}>
        {KICKER.slice(0, Math.floor(interpolate(frame, [T.kickStart, T.kickEnd], [0, KICKER.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })))}
        {frame >= T.kickStart && frame < T.kickEnd && blink(frame) ? <span>▌</span> : null}
      </div>

      {/* ==================== GLOBAL TEXTURE OVERLAYS ================== */}
      <Scanlines />
      <Grain boost={grainBoost} />
    </AbsoluteFill>
  );
};
