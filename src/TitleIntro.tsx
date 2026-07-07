import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

// The schema powers editable props in the Remotion Studio right-hand panel
// and validates props passed via --props on the CLI.
export const titleIntroSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  accentColor: z.string(),
  backgroundColor: z.string(),
});

export const TitleIntro: React.FC<z.infer<typeof titleIntroSchema>> = ({
  title,
  subtitle,
  accentColor,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();

  // Animated glowing accent ring that scales up and rotates.
  const ringProgress = spring({
    frame,
    fps,
    config: { damping: 200, mass: 1.5 },
    durationInFrames: 90,
  });
  const ringScale = interpolate(ringProgress, [0, 1], [0.2, 1]);
  const rotation = interpolate(frame, [0, durationInFrames], [0, 40]);

  // Title characters animate in one after another (staggered spring).
  const chars = title.split("");

  // Subtitle slides up and fades in after the title lands.
  const subtitleProgress = spring({
    frame: frame - 45,
    fps,
    config: { damping: 20 },
  });
  const subtitleY = interpolate(subtitleProgress, [0, 1], [40, 0]);
  const subtitleOpacity = subtitleProgress;

  // A subtle fade-out at the very end so loops feel clean.
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        opacity: fadeOut,
      }}
    >
      {/* Radial glow behind everything */}
      <div
        style={{
          position: "absolute",
          width: width * 0.9,
          height: width * 0.9,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}22 0%, transparent 60%)`,
        }}
      />

      {/* Rotating accent ring */}
      <div
        style={{
          position: "absolute",
          width: Math.min(width, height) * 0.75,
          height: Math.min(width, height) * 0.75,
          borderRadius: "50%",
          border: `4px solid ${accentColor}`,
          borderTopColor: "transparent",
          borderRightColor: "transparent",
          transform: `scale(${ringScale}) rotate(${rotation}deg)`,
          opacity: 0.5,
        }}
      />

      {/* Title with per-character stagger */}
      <div style={{ display: "flex", zIndex: 1 }}>
        {chars.map((char, i) => {
          const charProgress = spring({
            frame: frame - i * 3,
            fps,
            config: { damping: 14, stiffness: 140 },
          });
          const y = interpolate(charProgress, [0, 1], [80, 0]);
          return (
            <span
              key={i}
              style={{
                fontSize: 130,
                fontWeight: 800,
                color: "white",
                display: "inline-block",
                transform: `translateY(${y}px)`,
                opacity: charProgress,
                whiteSpace: "pre",
              }}
            >
              {char}
            </span>
          );
        })}
      </div>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 44,
          color: accentColor,
          letterSpacing: 8,
          textTransform: "uppercase",
          marginTop: 24,
          zIndex: 1,
          transform: `translateY(${subtitleY}px)`,
          opacity: subtitleOpacity,
        }}
      >
        {subtitle}
      </p>
    </AbsoluteFill>
  );
};
