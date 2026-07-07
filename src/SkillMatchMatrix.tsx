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

// Inter is served from public/fonts (bundled locally) rather than fetched from
// Google's CDN, so headless renders never depend on outbound network access.
const fontFamily = "Inter";
(["400", "500", "600", "700"] as const).forEach((weight) => {
  loadFont({
    family: fontFamily,
    url: staticFile(`fonts/inter-latin-${weight}-normal.woff2`),
    weight,
  });
});

/* -------------------------------------------------------------------------- */
/*  Design tokens                                                             */
/* -------------------------------------------------------------------------- */

const COLORS = {
  bg: "#FAF9F6",
  ink: "#1A1A1A",
  amber: "#E8A33D", // reserved ONLY for the winning match
  muted: "#8A8A8A",
  track: "rgba(26,26,26,0.08)",
};

const EASE = Easing.out(Easing.cubic);

// Content lives inside the centre ~70% of the frame.
const CONTENT_LEFT = 300;
const CONTENT_RIGHT = 1620;
const COL_RIGHT = 1010; // right column x-origin
const CARD_W = 520;
const BAR_W = 480;

/* -------------------------------------------------------------------------- */
/*  Timeline (30fps, 360 frames ≈ 12s). One event never starts on top of      */
/*  another — everything is staggered.                                        */
/* -------------------------------------------------------------------------- */

const T = {
  // Beat 1 — title
  letterStagger: 1, // frames between letters (~30ms)
  subIn: 22,
  titleMoveStart: 52,
  titleMoveEnd: 74,
  // Beat 2 — grid
  headIn: 70,
  dividerStart: 78,
  dividerEnd: 108,
  rowsStart: 88,
  rowStagger: 9,
  // Beat 3 — cards
  card1In: 126,
  bar1Start: 138,
  bar1End: 170,
  label1In: 168,
  card2In: 182,
  bar2Start: 196, // spring origin
  label2In: 222,
  // Beat 4 — verdict
  dimStart: 244,
  dimEnd: 270,
  kickStart: 274,
  kickEnd: 322, // finishes typing with ~24 frames to hold before the fade
  outStart: 346,
  outEnd: 360,
};

const TITLE = "THE SKILL-MATCH MATRIX";
const SKILLS = [
  "Long-form writing",
  "Visual & editorial taste",
  "Audience empathy",
  "Relentless consistency",
];
const KICKER = "The matrix isn't about passion. It's about leverage.";

/* -------------------------------------------------------------------------- */
/*  Reusable <MatchBar> — rounded 4px caps, 12px tall, thin track behind.      */
/*  Presentational: the fill fraction is computed by the caller so all timing  */
/*  stays driven by useCurrentFrame()/interpolate at the composition level.    */
/* -------------------------------------------------------------------------- */

const MatchBar: React.FC<{ fill: number; color: string; width: number }> = ({
  fill,
  color,
  width,
}) => {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <div
      style={{
        position: "relative",
        width,
        height: 12,
        borderRadius: 4,
        background: COLORS.track,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${pct}%`,
          background: color,
          borderRadius: 4,
        }}
      />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Reusable <Row> — self-timed 8px upward drift + fade. Used for the skill    */
/*  list. `dim` lets Beat 4 fade it back without touching its own animation.   */
/* -------------------------------------------------------------------------- */

const Row: React.FC<{
  enter: number;
  x: number;
  y: number;
  dim?: number;
  children: React.ReactNode;
}> = ({ enter, x, y, dim = 1, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [enter, enter + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const ty = interpolate(p, [0, 1], [8, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: p * dim,
        transform: `translateY(${ty}px)`,
        fontFamily,
        color: COLORS.ink,
        fontSize: 24,
        fontWeight: 400,
        letterSpacing: 0.2,
      }}
    >
      {children}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Composition                                                               */
/* -------------------------------------------------------------------------- */

export const SkillMatchMatrix: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global exit fade to background.
  const globalOpacity = interpolate(frame, [T.outStart, T.outEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Beat 4 dim: everything except the winning row eases to 40%.
  const dim = interpolate(frame, [T.dimStart, T.dimEnd], [1, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  // Winning row scales up ~1.05×.
  const winScale = interpolate(frame, [T.dimStart, T.dimEnd], [1, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  // Shared entrance helper (fade + small rise) for one-off elements.
  const entrance = (enter: number, rise = 10, dur = 16) => {
    const p = interpolate(frame, [enter, enter + dur], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: EASE,
    });
    return { opacity: p, ty: interpolate(p, [0, 1], [rise, 0]) };
  };

  /* --- Beat 1: title move (centre → top-left) ---------------------------- */
  const mv = interpolate(frame, [T.titleMoveStart, T.titleMoveEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const titleLeft = interpolate(mv, [0, 1], [960, CONTENT_LEFT]);
  const titleTop = interpolate(mv, [0, 1], [470, 88]);
  const titleTx = interpolate(mv, [0, 1], [-50, 0]); // % self-translate
  const titleSize = interpolate(mv, [0, 1], [84, 28]);
  const titleTrack = interpolate(mv, [0, 1], [-3, -1]);

  const subOpacity = interpolate(
    frame,
    [T.subIn, T.subIn + 18, T.titleMoveStart, T.titleMoveEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  /* --- Beat 2: grid ------------------------------------------------------ */
  const head = entrance(T.headIn, 6);
  const dividerScale = interpolate(
    frame,
    [T.dividerStart, T.dividerEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE },
  );

  /* --- Beat 3: bars ------------------------------------------------------ */
  // Partial match — plain eased interpolate to 45%.
  const fill1 = interpolate(frame, [T.bar1Start, T.bar1End], [0, 0.45], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  // Winning match — spring() only, so it overshoots past then settles at 95%.
  const spring2 = spring({
    frame: frame - T.bar2Start,
    fps,
    config: { damping: 11, stiffness: 120, mass: 0.9 },
  });
  const fill2 = Math.min(1, 0.95 * spring2);

  const card1 = entrance(T.card1In);
  const card2 = entrance(T.card2In);
  const label1Op = interpolate(frame, [T.label1In, T.label1In + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const label2Op = interpolate(frame, [T.label2In, T.label2In + 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  /* --- Beat 4: kicker types on ------------------------------------------- */
  const kickChars = Math.round(
    interpolate(frame, [T.kickStart, T.kickEnd], [0, KICKER.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const kickText = KICKER.slice(0, kickChars);
  const kickTyping = frame >= T.kickStart && frame < T.kickEnd;
  const caretOn = Math.floor(frame / 8) % 2 === 0;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg, opacity: globalOpacity }}>
      {/* ---------------- Title ---------------- */}
      <div
        style={{
          position: "absolute",
          left: titleLeft,
          top: titleTop,
          transform: `translateX(${titleTx}%)`,
          display: "flex",
          fontFamily,
          fontWeight: 700,
          fontSize: titleSize,
          letterSpacing: titleTrack,
          color: COLORS.ink,
          opacity: dim, // dims in Beat 4
          whiteSpace: "pre",
        }}
      >
        {TITLE.split("").map((ch, i) => {
          const p = interpolate(
            frame,
            [i * T.letterStagger, i * T.letterStagger + 12],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE },
          );
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: p,
                transform: `translateY(${interpolate(p, [0, 1], [14, 0])}px)`,
                whiteSpace: "pre",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      {/* ---------------- Subtitle ---------------- */}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 568,
          transform: "translateX(-50%)",
          fontFamily,
          fontSize: 26,
          fontWeight: 400,
          color: "#6B6B6B",
          opacity: subOpacity,
          letterSpacing: 0.2,
        }}
      >
        Where do you have an unfair advantage?
      </div>

      {/* ---------------- Column headers ---------------- */}
      {(
        [
          ["YOUR SKILLS", CONTENT_LEFT],
          ["ROLE DEMANDS", COL_RIGHT],
        ] as const
      ).map(([label, x]) => (
        <div
          key={label}
          style={{
            position: "absolute",
            left: x,
            top: 300,
            opacity: head.opacity * dim,
            transform: `translateY(${head.ty}px)`,
            fontFamily,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 2,
            color: COLORS.muted,
          }}
        >
          {label}
        </div>
      ))}

      {/* ---------------- Divider (grows from centre, scaleX) ---------------- */}
      <div
        style={{
          position: "absolute",
          left: CONTENT_LEFT,
          top: 338,
          width: CONTENT_RIGHT - CONTENT_LEFT,
          height: 1,
          background: COLORS.ink,
          opacity: 0.85 * dim,
          transform: `scaleX(${dividerScale})`,
          transformOrigin: "center",
        }}
      />

      {/* ---------------- Left column: skill rows ---------------- */}
      {SKILLS.map((skill, i) => (
        <Row
          key={skill}
          enter={T.rowsStart + i * T.rowStagger}
          x={CONTENT_LEFT}
          y={392 + i * 62}
          dim={dim}
        >
          {skill}
        </Row>
      ))}

      {/* ---------------- Right column: Card 1 — Partial ---------------- */}
      <div
        style={{
          position: "absolute",
          left: COL_RIGHT,
          top: 388,
          width: CARD_W,
          opacity: card1.opacity * dim,
          transform: `translateY(${card1.ty}px)`,
          fontFamily,
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: 1,
            color: COLORS.ink,
            marginBottom: 16,
          }}
        >
          PRODUCT MANAGEMENT
        </div>
        <MatchBar fill={fill1} color={COLORS.ink} width={BAR_W} />
        <div
          style={{
            marginTop: 12,
            fontSize: 15,
            fontWeight: 500,
            letterSpacing: 1.5,
            color: COLORS.muted,
            opacity: label1Op,
          }}
        >
          PARTIAL MATCH
        </div>
      </div>

      {/* ---------------- Right column: Card 2 — Winning ---------------- */}
      <div
        style={{
          position: "absolute",
          left: COL_RIGHT,
          top: 548,
          width: CARD_W,
          opacity: card2.opacity, // NOT dimmed in Beat 4
          transform: `translateY(${card2.ty}px) scale(${winScale})`,
          transformOrigin: "left center",
          fontFamily,
        }}
      >
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 1,
            color: COLORS.ink,
            marginBottom: 16,
          }}
        >
          CONTENT CREATION
        </div>
        <MatchBar fill={fill2} color={COLORS.amber} width={BAR_W} />
        <div
          style={{
            marginTop: 12,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: COLORS.amber,
            opacity: label2Op,
          }}
        >
          OVERWHELMING MATCH
        </div>
      </div>

      {/* ---------------- Beat 4: kicker (types on) ---------------- */}
      <div
        style={{
          position: "absolute",
          left: COL_RIGHT,
          top: 748,
          width: 640,
          fontFamily,
          fontSize: 30,
          fontWeight: 500,
          lineHeight: 1.5,
          color: COLORS.ink,
          opacity: interpolate(frame, [T.kickStart, T.kickStart + 6], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {kickText}
        {kickTyping && caretOn ? (
          <span style={{ color: COLORS.amber }}>|</span>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
