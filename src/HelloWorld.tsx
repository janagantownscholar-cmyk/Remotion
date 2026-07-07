import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const HelloWorld: React.FC<{
  title: string;
  subtitle: string;
}> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // A spring drives a scale/pop-in for the title.
  const scale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  // Subtitle fades in slightly after the title.
  const subtitleOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0b1020",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: 120,
          fontWeight: 800,
          color: "white",
          transform: `scale(${scale})`,
          margin: 0,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 48,
          color: "#93a4c8",
          opacity: subtitleOpacity,
          marginTop: 24,
        }}
      >
        {subtitle}
      </p>
    </AbsoluteFill>
  );
};
