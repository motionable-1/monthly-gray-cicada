import {
  AbsoluteFill,
  Artifact,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadCormorantGaramond } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadWorkSans } from "@remotion/google-fonts/WorkSans";
import { type CSSProperties, type ReactNode } from "react";
import { TextAnimation } from "../library/components/text/TextAnimation";

const STATIC_STORYBOARD = false;

const sceneDurations = [96, 96, 96, 108, 126];
const sceneStarts = sceneDurations.reduce<number[]>((starts, duration, index) => {
  starts.push(index === 0 ? 0 : starts[index - 1] + sceneDurations[index - 1]);
  return starts;
}, []);

const palette = {
  paper: "#f4ecdc",
  paperLight: "#fbf4e8",
  paperDeep: "#ead9bf",
  charcoal: "#1e1b18",
  softCharcoal: "#383029",
  amber: "#b86f24",
  amberDark: "#8f4f1b",
  amberSoft: "#f4c27a",
  green: "#2e7d59",
  greenSoft: "#dceee2",
  border: "rgba(73, 55, 39, 0.14)",
  card: "rgba(255, 250, 240, 0.9)",
  cardSolid: "#fff9ec",
};

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

const textSmoothing: CSSProperties = {
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  backfaceVisibility: "hidden",
  textRendering: "geometricPrecision",
  textWrap: "balance",
  transformStyle: "preserve-3d",
  willChange: "transform, opacity",
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const localFrame = (frame: number, sceneIndex: number) => frame - sceneStarts[sceneIndex];

const sceneOpacity = (frame: number, sceneIndex: number) => {
  const from = sceneStarts[sceneIndex];
  const duration = sceneDurations[sceneIndex];
  if (STATIC_STORYBOARD) {
    return frame >= from && frame < from + duration ? 1 : 0;
  }
  return interpolate(
    frame,
    [from - 18, from + 12, from + duration - 20, from + duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut },
  );
};

const contentLife = (local: number, duration: number) => {
  if (STATIC_STORYBOARD) {
    return 1;
  }
  const intro = interpolate(local, [8, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const outro = interpolate(local, [duration - 18, duration - 4], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeIn,
  });
  return intro * outro;
};

const entrance = (
  local: number,
  fps: number,
  delay: number,
  life: number,
  x = 0,
  y = 24,
  scale = 0.96,
): CSSProperties => {
  if (STATIC_STORYBOARD) {
    return { opacity: 1, transform: "translate3d(0, 0, 0) scale3d(1, 1, 1)" };
  }
  const settled = spring({
    frame: Math.max(0, local - delay),
    fps,
    config: { damping: 19, mass: 0.72, stiffness: 118 },
  });
  const p = clamp01(settled);
  const liveOpacity = clamp01(p * life);
  const size = scale + (1 - scale) * settled;
  const ambientX = Math.sin((local + delay) / 42) * 1.2 * life * p;
  const ambientY = Math.cos((local + delay) / 47) * 0.9 * life * p;
  return {
    opacity: liveOpacity,
    transform: `translate3d(${x * (1 - settled) + ambientX}px, ${y * (1 - settled) + ambientY}px, 0) scale3d(${size}, ${size}, 1)`,
  };
};

const drift = (frame: number, amount: number, phase = 0) => {
  if (STATIC_STORYBOARD) {
    return 0;
  }
  return Math.sin(frame / 42 + phase) * amount;
};

type TextMode = "chars" | "words" | "lines";

type AnimatedTextProps = {
  children: ReactNode;
  fontFamily: string;
  style?: CSSProperties;
  mode?: TextMode;
  startFrom?: number;
  stagger?: number;
  distance?: number;
};

const AnimatedText: React.FC<AnimatedTextProps> = ({
  children,
  fontFamily,
  style,
  mode = "words",
  startFrom = 0,
  stagger = 0.045,
  distance = 18,
}) => (
  <TextAnimation
    startFrom={STATIC_STORYBOARD ? 0 : startFrom}
    style={{ ...textSmoothing, fontFamily, ...style }}
    createTimeline={({ textRef, tl, SplitText }) => {
      if (STATIC_STORYBOARD) {
        return tl;
      }
      const split = new SplitText(textRef.current, { type: mode });
      const targets =
        mode === "chars" ? split.chars : mode === "lines" ? split.lines : split.words;
      tl.from(targets, {
        opacity: 0,
        y: distance,
        filter: "blur(4px)",
        rotationX: mode === "chars" ? -12 : 0,
        duration: 0.46,
        stagger,
        ease: "power3.out",
      });
      return tl;
    }}
  >
    {children}
  </TextAnimation>
);

type FontSet = {
  heading: string;
  body: string;
};

const cardBase: CSSProperties = {
  position: "absolute",
  background: palette.card,
  border: `1px solid ${palette.border}`,
  boxShadow: "0 28px 80px rgba(75, 52, 30, 0.14)",
  backdropFilter: "blur(10px)",
};

const MiniText = ({
  children,
  fonts,
  x,
  y,
  size = 18,
  color = palette.softCharcoal,
  weight = 500,
  width,
  startFrom = 0,
}: {
  children: ReactNode;
  fonts: FontSet;
  x: number;
  y: number;
  size?: number;
  color?: string;
  weight?: number;
  width?: number;
  startFrom?: number;
}) => (
  <AnimatedText
    fontFamily={fonts.body}
    startFrom={startFrom}
    mode="words"
    stagger={0.025}
    distance={9}
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      color,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: 0,
      lineHeight: 1.18,
    }}
  >
    {children}
  </AnimatedText>
);

const PaperBackground = ({ frame, variant }: { frame: number; variant: number }) => {
  const hue = variant === 1 || variant === 5 ? "rgba(222, 132, 50, 0.35)" : variant === 2 ? "rgba(217, 155, 83, 0.05)" : "rgba(217, 155, 83, 0.18)";
  const second = variant === 3 ? "rgba(116, 86, 55, 0.12)" : variant === 2 ? "rgba(255, 205, 128, 0.04)" : "rgba(255, 205, 128, 0.16)";
  return (
    <AbsoluteFill style={{ background: palette.paper, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -60,
          background: `radial-gradient(circle at ${variant === 2 ? "78% 44%" : "50% 43%"}, ${hue} 0%, rgba(245, 204, 141, 0.18) 24%, transparent 54%), radial-gradient(circle at 15% 88%, ${second} 0%, transparent 44%), linear-gradient(135deg, ${palette.paperLight}, ${palette.paper} 50%, ${palette.paperDeep})`,
          transform: `translate3d(${drift(frame, 8, variant)}px, ${drift(frame, 6, variant + 2)}px, 0) scale3d(1.03, 1.03, 1)`,
          willChange: "transform",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.34,
          background:
            "radial-gradient(circle at 30% 20%, rgba(64, 43, 25, 0.16) 0 1px, transparent 1.4px), radial-gradient(circle at 66% 62%, rgba(64, 43, 25, 0.11) 0 1px, transparent 1.3px), repeating-linear-gradient(96deg, rgba(79, 57, 33, 0.045) 0 1px, transparent 1px 7px)",
          backgroundSize: "7px 7px, 10px 10px, 100% 100%",
          mixBlendMode: "multiply",
        }}
      />
      {(variant === 1 || variant === 5) && <ContourLines variant={variant} frame={frame} />}
    </AbsoluteFill>
  );
};

const ContourLines = ({ variant, frame }: { variant: number; frame: number }) => {
  const shift = drift(frame, 8, variant * 0.7);
  return (
    <svg
      viewBox="0 0 1280 720"
      style={{
        position: "absolute",
        inset: 0,
        transform: `translate3d(${shift}px, ${drift(frame, 5, variant)}px, 0)`,
        opacity: variant === 5 ? 0.42 : 0.18,
        overflow: "visible",
      }}
    >
      {variant === 1 &&
        Array.from({ length: 6 }).map((_, index) => (
          <path
            key={`left-corner-${index}`}
            d={`M -80 ${626 + index * 18} C 42 ${560 + index * 13}, 165 ${672 + index * 11}, 292 ${606 + index * 14}`}
            fill="none"
            stroke={palette.amberDark}
            strokeWidth="1"
          />
        ))}
      {variant === 1 &&
        Array.from({ length: 6 }).map((_, index) => (
          <path
            key={`right-corner-${index}`}
            d={`M 956 ${616 + index * 18} C 1050 ${560 + index * 13}, 1146 ${674 + index * 10}, 1340 ${606 + index * 14}`}
            fill="none"
            stroke={palette.amberDark}
            strokeWidth="1"
          />
        ))}
      {variant === 5 && (
        <path
          d="M 182 118 C 430 26, 850 26, 1098 118"
          fill="none"
          stroke={palette.amber}
          strokeWidth="2.2"
        />
      )}
      {variant === 5 && [0, 1, 2].map((dot) => (
        <circle key={dot} cx={424 + dot * 216} cy={58 + (dot === 1 ? -16 : 0)} r="7.5" fill={palette.amber} />
      ))}
      {variant === 5 &&
        Array.from({ length: 7 }).map((_, index) => (
          <path
            key={`dune-left-${index}`}
            d={`M -90 ${596 + index * 23} C 118 ${506 + index * 13}, 260 ${665 + index * 16}, 448 ${590 + index * 18}`}
            fill="none"
            stroke={palette.amberDark}
            strokeWidth="1.1"
          />
        ))}
      {variant === 5 &&
        Array.from({ length: 7 }).map((_, index) => (
          <path
            key={`dune-right-${index}`}
            d={`M 826 ${590 + index * 18} C 1010 ${514 + index * 13}, 1118 ${674 + index * 15}, 1360 ${586 + index * 20}`}
            fill="none"
            stroke={palette.amberDark}
            strokeWidth="1.1"
          />
        ))}
    </svg>
  );
};

const AnthropicMark = ({
  local,
  fps,
  style,
  color = palette.charcoal,
  amber = palette.amber,
}: {
  local: number;
  fps: number;
  style?: CSSProperties;
  color?: string;
  amber?: string;
}) => {
  const draw = STATIC_STORYBOARD
    ? 1
    : spring({ frame: Math.max(0, local - 12), fps, config: { damping: 20, stiffness: 94 } });
  const p = clamp01(draw);
  return (
    <svg
      viewBox="0 0 220 220"
      style={{
        position: "absolute",
        overflow: "visible",
        ...style,
        opacity: p,
        transform: `${style?.transform ?? ""} scale3d(${0.88 + 0.12 * draw}, ${0.88 + 0.12 * draw}, 1)`,
        willChange: "transform, opacity",
      }}
    >
      <defs>
        <filter id="amberGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M110 34 L48 148 L172 148 Z"
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M110 16 L26 164 L194 164 Z"
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeDasharray="2 8"
        strokeLinecap="round"
        opacity="0.58"
      />
      <path d="M110 111 L110 190" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="110" cy="110" r="19" fill={palette.paperLight} stroke={color} strokeWidth="2.6" />
      <circle cx="110" cy="110" r="7" fill={amber} filter="url(#amberGlow)" />
      {[
        [110, 16],
        [26, 164],
        [194, 164],
      ].map(([cx, cy], index) => (
        <circle key={index} cx={cx} cy={cy} r="8.5" fill={amber} filter="url(#amberGlow)" />
      ))}
    </svg>
  );
};

const Icon = ({ type, color = palette.amberDark }: { type: string; color?: string }) => {
  const common = { fill: "none", stroke: color, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 44 44" style={{ position: "absolute", inset: 9, width: 26, height: 26 }}>
      {type === "shield" && <path {...common} d="M22 6 L34 11 V21 C34 29 29 34 22 38 C15 34 10 29 10 21 V11 Z M16 22 L21 27 L30 17" />}
      {type === "search" && <path {...common} d="M20 11 A9 9 0 1 1 19.9 11 M27 27 L35 35" />}
      {type === "people" && <path {...common} d="M16 22 A6 6 0 1 0 16 10 A6 6 0 0 0 16 22 Z M6 35 C7 28 12 25 16 25 C20 25 25 28 26 35 M29 21 A5 5 0 1 0 29 11 M28 25 C33 25 37 28 38 35" />}
      {type === "list" && <path {...common} d="M14 13 H33 M14 22 H33 M14 31 H33 M8 13 H8.1 M8 22 H8.1 M8 31 H8.1" />}
      {type === "branch" && <path {...common} d="M12 12 A5 5 0 1 0 12 22 A5 5 0 0 0 12 12 Z M31 7 A5 5 0 1 0 31 17 A5 5 0 0 0 31 7 Z M31 27 A5 5 0 1 0 31 37 A5 5 0 0 0 31 27 Z M17 17 C22 17 24 12 26 12 M17 17 C23 17 24 32 26 32" />}
      {type === "check" && <path {...common} d="M22 5 A17 17 0 1 0 22 39 A17 17 0 0 0 22 5 Z M14 23 L20 29 L31 16" />}
      {type === "lock" && <path {...common} d="M13 20 H31 V36 H13 Z M17 20 V15 A5 5 0 0 1 27 15 V20 M22 27 V31" />}
      {type === "star" && <path {...common} d="M22 6 L25 18 L37 22 L25 26 L22 38 L18 26 L7 22 L18 18 Z" />}
      {type === "chart" && <path {...common} d="M10 34 H35 M13 29 L20 22 L26 25 L34 14" />}
    </svg>
  );
};

const SceneTitle = ({
  fonts,
  from,
  lines,
  x,
  y,
  size,
  lineHeight,
}: {
  fonts: FontSet;
  from: number;
  lines: { text: string; color?: string }[];
  x: number;
  y: number;
  size: number;
  lineHeight: number;
}) => (
  <div style={{ position: "absolute", left: x, top: y, width: 520, height: lines.length * size * lineHeight }}>
    {lines.map((line, index) => (
      <AnimatedText
        key={line.text}
        fontFamily={fonts.heading}
        mode="lines"
        startFrom={from + 14 + index * 5}
        style={{
          position: "absolute",
          left: 0,
          top: index * size * lineHeight,
          color: line.color ?? palette.charcoal,
          fontSize: size,
          fontWeight: 700,
          letterSpacing: 0,
          lineHeight,
        }}
      >
        {line.text}
      </AnimatedText>
    ))}
  </div>
);

const FeatureItem = ({
  fonts,
  local,
  fps,
  from,
  index,
  type,
  label,
  x,
  y,
}: {
  fonts: FontSet;
  local: number;
  fps: number;
  from: number;
  index: number;
  type: string;
  label: string;
  x: number;
  y: number;
}) => {
  const delay = 28 + index * 5;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + index * 66,
        width: 330,
        height: 48,
        ...entrance(local, fps, delay, 1, -20, 10),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "rgba(255, 248, 235, 0.82)",
          border: `1px solid ${palette.border}`,
          boxShadow: "0 12px 32px rgba(99, 61, 28, 0.1)",
        }}
      >
        <Icon type={type} />
      </div>
      <AnimatedText
        fontFamily={fonts.body}
        startFrom={from + delay + 2}
        style={{
          position: "absolute",
          left: 64,
          top: 12,
          color: palette.softCharcoal,
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        {label}
      </AnimatedText>
    </div>
  );
};

const LineChart = ({
  local,
  fps,
  color = palette.amber,
  area = true,
}: {
  local: number;
  fps: number;
  color?: string;
  area?: boolean;
}) => {
  const draw = STATIC_STORYBOARD
    ? 1
    : spring({ frame: Math.max(0, local - 42), fps, config: { damping: 23, stiffness: 88 } });
  const length = 230;
  return (
    <svg viewBox="0 0 260 100" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {area && <path d="M15 78 C45 64, 65 68, 88 50 S132 30, 158 42 S205 23, 238 18 L238 88 L15 88 Z" fill={color} opacity="0.13" />}
      <path
        d="M15 78 C45 64, 65 68, 88 50 S132 30, 158 42 S205 23, 238 18"
        fill="none"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        style={{ strokeDasharray: length, strokeDashoffset: length * (1 - clamp01(draw)) }}
      />
      {area && [15, 88, 158, 238].map((cx, index) => (
        <circle key={index} cx={cx} cy={[78, 50, 42, 18][index]} r="3.5" fill={color} opacity={0.52} />
      ))}
    </svg>
  );
};

const BarChart = ({ local, fps }: { local: number; fps: number }) => (
  <svg viewBox="0 0 160 78" style={{ position: "absolute", inset: 0 }}>
    {[42, 56, 33, 66, 48].map((height, index) => {
      const grow = STATIC_STORYBOARD
        ? 1
        : spring({ frame: Math.max(0, local - 48 - index * 3), fps, config: { damping: 18, stiffness: 95 } });
      return (
        <rect
          key={index}
          x={18 + index * 26}
          y={70 - height * clamp01(grow)}
          width="13"
          height={height * clamp01(grow)}
          rx="6"
          fill={index === 3 ? "rgba(188, 134, 75, 0.42)" : "rgba(115, 99, 82, 0.2)"}
        />
      );
    })}
  </svg>
);

const ProgressRing = ({ local, fps }: { local: number; fps: number }) => {
  const draw = STATIC_STORYBOARD
    ? 0.96
    : 0.96 * spring({ frame: Math.max(0, local - 46), fps, config: { damping: 18, stiffness: 88 } });
  const circumference = 138;
  return (
    <svg viewBox="0 0 60 60" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
      <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(46, 125, 89, 0.15)" strokeWidth="8" />
      <circle
        cx="30"
        cy="30"
        r="22"
        fill="none"
        stroke={palette.green}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamp01(draw))}
      />
    </svg>
  );
};

const SceneOne = ({ frame, fonts }: { frame: number; fonts: FontSet }) => {
  const { fps } = useVideoConfig();
  const local = localFrame(frame, 0);
  const life = contentLife(local, sceneDurations[0]);
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(frame, 0), overflow: "hidden" }}>
      <PaperBackground frame={frame} variant={1} />
      <div
        style={{
          position: "absolute",
          left: 250,
          top: -26,
          width: 780,
          height: 780,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(235, 142, 47, 0.38), rgba(246, 192, 114, 0.24) 36%, rgba(246, 192, 114, 0.09) 56%, transparent 76%)",
          filter: "blur(1px)",
          transform: `translate3d(${drift(frame, 9, 1.2)}px, ${drift(frame, 5, 2.3)}px, 0)`,
        }}
      />
      <div style={{ position: "absolute", inset: 0, opacity: life }}>
        <AnthropicMark local={local} fps={fps} style={{ left: 530, top: 126, width: 220, height: 220 }} />
        <AnimatedText
          fontFamily={fonts.body}
          mode="chars"
          startFrom={sceneStarts[0] + 28}
          stagger={0.025}
          style={{
            position: "absolute",
            left: 0,
            top: 360,
            width: 1280,
            color: palette.charcoal,
            fontSize: 86,
            fontWeight: 600,
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {"ANTHROP\\C"}
        </AnimatedText>
        <AnimatedText
          fontFamily={fonts.body}
          mode="words"
          startFrom={sceneStarts[0] + 44}
          stagger={0.05}
          style={{
            position: "absolute",
            left: 0,
            top: 462,
            width: 1280,
            color: palette.softCharcoal,
            fontSize: 21,
            fontWeight: 600,
            lineHeight: 1,
            textAlign: "center",
            letterSpacing: 7,
          }}
        >
          AI SAFETY. REAL IMPACT.
        </AnimatedText>
      </div>
    </AbsoluteFill>
  );
};

const AssistantCard = ({ fonts, local, from }: { fonts: FontSet; local: number; from: number }) => (
  <div style={{ ...cardBase, left: 26, top: 28, width: 282, height: 124, borderRadius: 22, boxShadow: "0 18px 45px rgba(65, 42, 24, 0.1)" }}>
    <MiniText fonts={fonts} x={22} y={22} size={18} weight={700} color={palette.charcoal} startFrom={from + 34}>Chat Assistant</MiniText>
    <div style={{ position: "absolute", right: 18, top: 19, width: 74, height: 28, borderRadius: 999, background: palette.greenSoft }}>
      <MiniText fonts={fonts} x={14} y={7} size={12} weight={700} color={palette.green} startFrom={from + 36}>Running</MiniText>
    </div>
    <MiniText fonts={fonts} x={22} y={59} size={14} color="rgba(54, 43, 33, 0.68)" width={220} startFrom={from + 38}>Model: Claude 3.5 Sonnet</MiniText>
    <div style={{ position: "absolute", left: 22, top: 88, width: 228, height: 10, borderRadius: 999, background: "rgba(181, 111, 36, 0.12)" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: `${74 + Math.sin(local / 18) * 2}%`, height: 10, borderRadius: 999, background: palette.amber }} />
    </div>
  </div>
);

const RequestsCard = ({ fonts, local, fps, from }: { fonts: FontSet; local: number; fps: number; from: number }) => (
  <div style={{ ...cardBase, left: 330, top: 28, width: 254, height: 124, borderRadius: 22, boxShadow: "0 18px 45px rgba(65, 42, 24, 0.1)" }}>
    <MiniText fonts={fonts} x={22} y={18} size={15} weight={700} color={palette.softCharcoal} startFrom={from + 36}>Requests</MiniText>
    <MiniText fonts={fonts} x={22} y={43} size={34} weight={700} color={palette.charcoal} startFrom={from + 38}>24,569</MiniText>
    <MiniText fonts={fonts} x={128} y={52} size={15} weight={700} color={palette.green} startFrom={from + 40}>+18%</MiniText>
    <MiniText fonts={fonts} x={180} y={52} size={13} color="rgba(65, 50, 38, 0.52)" startFrom={from + 42}>24h</MiniText>
    <div style={{ position: "absolute", left: 116, top: 74, width: 112, height: 44 }}>
      <LineChart local={local} fps={fps} color={palette.amber} area={false} />
    </div>
  </div>
);

const TracesCard = ({ fonts, from }: { fonts: FontSet; from: number }) => {
  const rows = [
    ["User message", "1.2s"],
    ["Model reasoning", "4.3s"],
    ["Tool use: search", "0.8s"],
    ["Model response", "1.1s"],
    ["Human review", "0.6s"],
  ];
  return (
    <div style={{ ...cardBase, left: 26, top: 174, width: 334, height: 294, borderRadius: 24, boxShadow: "0 18px 45px rgba(65, 42, 24, 0.1)" }}>
      <MiniText fonts={fonts} x={22} y={20} size={18} weight={700} color={palette.charcoal} startFrom={from + 42}>Recent traces</MiniText>
      <div style={{ position: "absolute", left: 29, top: 62, width: 2, height: 180, background: "rgba(30, 27, 24, 0.34)" }} />
      {rows.map(([name, time], index) => (
        <div key={name} style={{ position: "absolute", left: 0, top: 58 + index * 39, width: 334, height: 34 }}>
          {index === 1 && <div style={{ position: "absolute", left: 16, top: -3, width: 302, height: 38, borderRadius: 12, background: "rgba(184, 111, 36, 0.11)", border: "1px solid rgba(184, 111, 36, 0.14)" }} />}
          <div style={{ position: "absolute", left: 24, top: 9, width: 12, height: 12, borderRadius: 999, background: palette.charcoal, border: `2px solid ${palette.cardSolid}` }} />
          <MiniText fonts={fonts} x={50} y={5} size={14} weight={index === 1 ? 700 : 500} color={index === 1 ? palette.charcoal : "rgba(54, 43, 33, 0.72)"} startFrom={from + 45 + index * 2}>{name}</MiniText>
          <MiniText fonts={fonts} x={286} y={5} size={13} color="rgba(54, 43, 33, 0.58)" width={44} startFrom={from + 45 + index * 2}>{time}</MiniText>
        </div>
      ))}
      <div style={{ position: "absolute", left: 178, top: 213, width: 84, height: 27, borderRadius: 999, background: palette.greenSoft }}>
        <MiniText fonts={fonts} x={17} y={7} size={12} weight={700} color={palette.green} startFrom={from + 57}>Approved</MiniText>
      </div>
    </div>
  );
};

const SafetyCard = ({ fonts, local, fps, from }: { fonts: FontSet; local: number; fps: number; from: number }) => (
  <div style={{ ...cardBase, left: 382, top: 174, width: 202, height: 178, borderRadius: 24, boxShadow: "0 18px 45px rgba(65, 42, 24, 0.1)" }}>
    <MiniText fonts={fonts} x={20} y={18} size={15} weight={700} color={palette.softCharcoal} startFrom={from + 48}>Safety score</MiniText>
    <MiniText fonts={fonts} x={20} y={49} size={44} weight={700} color={palette.charcoal} startFrom={from + 50}>98%</MiniText>
    <MiniText fonts={fonts} x={23} y={100} size={15} weight={700} color={palette.green} startFrom={from + 52}>Excellent</MiniText>
    <div style={{ position: "absolute", left: 23, top: 119, width: 148, height: 48 }}>
      <BarChart local={local} fps={fps} />
    </div>
  </div>
);

const ReviewCard = ({ fonts, from }: { fonts: FontSet; from: number }) => (
  <div style={{ ...cardBase, left: 382, top: 368, width: 202, height: 104, borderRadius: 24, boxShadow: "0 18px 45px rgba(65, 42, 24, 0.1)" }}>
    <MiniText fonts={fonts} x={20} y={16} size={15} weight={700} color={palette.softCharcoal} startFrom={from + 54}>Human review</MiniText>
    <MiniText fonts={fonts} x={20} y={38} size={22} weight={700} color={palette.charcoal} startFrom={from + 56}>2 pending</MiniText>
    <div style={{ position: "absolute", right: 16, top: 66, width: 76, height: 28, borderRadius: 999, background: "linear-gradient(135deg, #d8943c, #b86f24)" }}>
      <MiniText fonts={fonts} x={20} y={8} size={12} weight={700} color="#fff7e8" startFrom={from + 58}>Review</MiniText>
    </div>
  </div>
);

const SceneTwo = ({ frame, fonts }: { frame: number; fonts: FontSet }) => {
  const { fps } = useVideoConfig();
  const from = sceneStarts[1];
  const local = localFrame(frame, 1);
  const life = contentLife(local, sceneDurations[1]);
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(frame, 1), overflow: "hidden" }}>
      <PaperBackground frame={frame} variant={2} />
      <div style={{ position: "absolute", inset: 0, opacity: life }}>
        <SceneTitle
          fonts={fonts}
          from={from}
          x={82}
          y={124}
          size={68}
          lineHeight={0.98}
          lines={[{ text: "Powerful models." }, { text: "Safe by design.", color: palette.amber }]}
        />
        {[
          ["shield", "Guardrails built-in"],
          ["search", "Transparent traces"],
          ["people", "Human in the loop"],
        ].map(([type, label], index) => (
          <FeatureItem key={label} fonts={fonts} local={local} fps={fps} from={from} index={index} type={type} label={label} x={92} y={362} />
        ))}
        <div
          style={{
            ...cardBase,
            left: 552,
            top: 72,
            width: 622,
            height: 562,
            borderRadius: 34,
            background: "rgba(255, 250, 241, 0.72)",
            ...entrance(local, fps, 22, 1, 26, 24, 0.975),
          }}
        >
          <AssistantCard fonts={fonts} local={local} from={from} />
          <RequestsCard fonts={fonts} local={local} fps={fps} from={from} />
          <TracesCard fonts={fonts} from={from} />
          <SafetyCard fonts={fonts} local={local} fps={fps} from={from} />
          <ReviewCard fonts={fonts} from={from} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const CubeNetwork = ({ local, fps }: { local: number; fps: number }) => {
  const pop = STATIC_STORYBOARD
    ? 1
    : spring({ frame: Math.max(0, local - 30), fps, config: { damping: 18, stiffness: 86 } });
  const points = [
    [90, 128],
    [178, 86],
    [268, 130],
    [178, 178],
    [88, 230],
    [268, 230],
    [178, 282],
  ];
  return (
    <svg viewBox="0 0 360 350" style={{ position: "absolute", left: 448, top: 166, width: 390, height: 360, overflow: "visible", opacity: clamp01(pop), transform: `scale3d(${0.94 + 0.06 * pop}, ${0.94 + 0.06 * pop}, 1)` }}>
      <defs>
        <filter id="cubeGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      {[
        [0, 1],
        [1, 2],
        [0, 3],
        [2, 3],
        [3, 4],
        [3, 5],
        [4, 6],
        [5, 6],
      ].map(([a, b], index) => (
        <line key={index} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} stroke="rgba(75, 54, 35, 0.3)" strokeWidth="1.4" />
      ))}
      {points.map(([cx, cy], index) => (
        <g key={index} transform={`translate(${cx} ${cy})`}>
          <circle r={index === 3 ? 54 : 34} fill={index === 3 ? palette.amber : "rgba(255, 250, 240, 0.34)"} opacity={index === 3 ? 0.3 : 0.42} filter={index === 3 ? "url(#cubeGlow)" : undefined} />
          <path d="M0 -34 L36 -14 L0 6 L-36 -14 Z" fill={index === 3 ? "rgba(226, 145, 48, 0.72)" : "rgba(255, 253, 247, 0.38)"} stroke={index === 3 ? "rgba(151, 83, 24, 0.58)" : "rgba(88, 65, 42, 0.32)"} strokeWidth="1.5" />
          <path d="M-36 -14 L0 6 L0 46 L-36 24 Z" fill={index === 3 ? "rgba(188, 106, 31, 0.58)" : "rgba(238, 221, 194, 0.22)"} stroke={index === 3 ? "rgba(151, 83, 24, 0.5)" : "rgba(88, 65, 42, 0.24)"} strokeWidth="1.5" />
          <path d="M36 -14 L0 6 L0 46 L36 24 Z" fill={index === 3 ? "rgba(207, 124, 39, 0.62)" : "rgba(246, 234, 216, 0.26)"} stroke={index === 3 ? "rgba(151, 83, 24, 0.5)" : "rgba(88, 65, 42, 0.24)"} strokeWidth="1.5" />
          <circle cx="0" cy="6" r={index === 3 ? 6 : 4} fill={index === 3 ? "#fff1d5" : "rgba(136, 93, 50, 0.36)"} />
        </g>
      ))}
      {[
        [0, 1],
        [1, 2],
        [0, 3],
        [2, 3],
        [3, 4],
        [3, 5],
        [4, 6],
        [5, 6],
      ].map(([a, b], index) => (
        <circle
          key={`node-${index}`}
          cx={(points[a][0] + points[b][0]) / 2}
          cy={(points[a][1] + points[b][1]) / 2}
          r="5"
          fill={index === 2 || index === 3 ? palette.amber : "rgba(91, 65, 39, 0.55)"}
          stroke={palette.paperLight}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
};

const ReasoningLabel = ({ fonts, from, index, label, icon }: { fonts: FontSet; from: number; index: number; label: string; icon: string }) => (
  <div style={{ position: "absolute", left: 930, top: 168 + index * 86, width: 210, height: 58, borderRadius: 18, background: "rgba(255, 250, 241, 0.82)", border: `1px solid ${palette.border}`, boxShadow: "0 16px 48px rgba(72, 50, 29, 0.1)" }}>
    <div style={{ position: "absolute", left: 11, top: 8, width: 42, height: 42, borderRadius: 13, background: "rgba(184, 111, 36, 0.12)" }}>
      <Icon type={icon} />
    </div>
    <MiniText fonts={fonts} x={70} y={18} size={20} weight={600} color={palette.softCharcoal} startFrom={from + 34 + index * 4}>{label}</MiniText>
  </div>
);

const SceneThree = ({ frame, fonts }: { frame: number; fonts: FontSet }) => {
  const { fps } = useVideoConfig();
  const from = sceneStarts[2];
  const local = localFrame(frame, 2);
  const life = contentLife(local, sceneDurations[2]);
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(frame, 2), overflow: "hidden" }}>
      <PaperBackground frame={frame} variant={3} />
      <svg viewBox="0 0 1280 720" style={{ position: "absolute", inset: 0, opacity: 0.58 }}>
        {[0, 1, 2, 3].map((index) => (
          <path key={index} d={`M760 ${198 + index * 86} L930 ${198 + index * 86}`} fill="none" stroke={palette.amberDark} strokeWidth="1.4" strokeDasharray="4 8" />
        ))}
      </svg>
      <div style={{ position: "absolute", inset: 0, opacity: life }}>
        <SceneTitle
          fonts={fonts}
          from={from}
          x={74}
          y={106}
          size={68}
          lineHeight={0.96}
          lines={[{ text: "Structured" }, { text: "reasoning." }, { text: "Clear answers.", color: palette.amber }]}
        />
        <div style={{ position: "absolute", left: 78, top: 374, width: 358, height: 112, borderRadius: 22, border: `1px solid rgba(143, 79, 27, 0.32)`, background: "rgba(255, 249, 238, 0.42)" }}>
          <div style={{ position: "absolute", left: 20, top: 20, width: 44, height: 44, borderRadius: 15, background: "rgba(184, 111, 36, 0.12)" }}>
            <Icon type="star" />
          </div>
          <MiniText fonts={fonts} x={82} y={22} size={19} weight={600} color={palette.softCharcoal} width={224} startFrom={from + 42}>Decomposes complex</MiniText>
          <MiniText fonts={fonts} x={82} y={48} size={19} weight={600} color={palette.softCharcoal} width={224} startFrom={from + 44}>problems into safe,</MiniText>
          <MiniText fonts={fonts} x={82} y={74} size={19} weight={600} color={palette.softCharcoal} width={224} startFrom={from + 46}>verifiable steps.</MiniText>
        </div>
        <CubeNetwork local={local} fps={fps} />
        {[
          ["Plan", "list"],
          ["Reason", "branch"],
          ["Verify", "shield"],
          ["Answer", "check"],
        ].map(([label, icon], index) => (
          <ReasoningLabel key={label} fonts={fonts} from={from} index={index} label={label} icon={icon} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const MetricCard = ({ fonts, from, x, title, value, delta }: { fonts: FontSet; from: number; x: number; title: string; value: string; delta: string }) => (
  <div style={{ position: "absolute", left: x, top: 78, width: 116, height: 88, borderRadius: 0, background: "transparent", borderLeft: x === 16 ? "none" : `1px solid ${palette.border}` }}>
    <MiniText fonts={fonts} x={13} y={13} size={12} weight={700} color="rgba(54, 43, 33, 0.58)" startFrom={from + 38}>{title}</MiniText>
    <MiniText fonts={fonts} x={13} y={34} size={24} weight={700} color={palette.charcoal} startFrom={from + 40}>{value}</MiniText>
    <MiniText fonts={fonts} x={13} y={63} size={13} weight={700} color={delta.startsWith("+") ? palette.green : palette.amberDark} startFrom={from + 42}>{delta}</MiniText>
  </div>
);

const EnterpriseDashboard = ({ fonts, frame, from, local, fps }: { fonts: FontSet; frame: number; from: number; local: number; fps: number }) => (
  <div style={{ ...cardBase, left: 520, top: 56, width: 700, height: 590, borderRadius: 30, background: "rgba(255, 250, 241, 0.78)", ...entrance(local, fps, 20, 1, 28, 24, 0.975) }}>
    <div style={{ position: "absolute", left: 24, top: 22, width: 722, height: 54, borderRadius: 18, background: "rgba(255, 253, 248, 0.82)", border: `1px solid ${palette.border}` }}>
      <MiniText fonts={fonts} x={22} y={18} size={15} weight={700} color={palette.softCharcoal} startFrom={from + 30}>Projects / Customer Support Agent</MiniText>
      <MiniText fonts={fonts} x={552} y={15} size={20} weight={700} color="rgba(54, 43, 33, 0.46)" startFrom={from + 32}>...</MiniText>
      <div style={{ position: "absolute", right: 14, top: 10, width: 112, height: 34, borderRadius: 999, background: palette.amber }}>
        <MiniText fonts={fonts} x={22} y={9} size={13} weight={700} color="#fff7e8" startFrom={from + 34}>Deploy →</MiniText>
      </div>
    </div>
    <div style={{ position: "absolute", left: 24, top: 94, width: 166, height: 278, borderRadius: 20, background: "rgba(255, 253, 248, 0.78)", border: `1px solid ${palette.border}` }}>
      <MiniText fonts={fonts} x={18} y={18} size={15} weight={700} color={palette.charcoal} startFrom={from + 36}>Environments</MiniText>
      {["Development", "Staging", "Production"].map((item, index) => (
        <div key={item} style={{ position: "absolute", left: 16, top: 58 + index * 42, width: 134, height: 32, borderRadius: 11, background: index === 2 ? "rgba(46, 125, 89, 0.1)" : "transparent" }}>
          {index === 2 && <div style={{ position: "absolute", left: 10, top: 11, width: 8, height: 8, borderRadius: 999, background: palette.green }} />}
          <MiniText fonts={fonts} x={index === 2 ? 26 : 10} y={8} size={12} weight={600} color={palette.softCharcoal} startFrom={from + 38 + index * 2}>{item}</MiniText>
        </div>
      ))}
      <MiniText fonts={fonts} x={18} y={196} size={15} weight={700} color={palette.charcoal} startFrom={from + 46}>Team</MiniText>
      {['AK', 'JL', 'SP', '+6'].map((name, index) => (
        <div key={name} style={{ position: "absolute", left: 18 + index * 32, top: 226, width: 34, height: 34, borderRadius: 999, background: index === 3 ? "rgba(255, 250, 241, 0.96)" : "rgba(184, 111, 36, 0.16)", border: `1px solid ${palette.border}` }}>
          <MiniText fonts={fonts} x={index === 3 ? 8 : 7} y={10} size={11} weight={700} color={palette.amberDark} startFrom={from + 48 + index}>{name}</MiniText>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 208, top: 94, width: 332, height: 360, borderRadius: 20, background: "rgba(255, 253, 248, 0.78)", border: `1px solid ${palette.border}` }}>
      <MiniText fonts={fonts} x={18} y={18} size={15} weight={700} color={palette.charcoal} startFrom={from + 36}>Performance</MiniText>
      <MetricCard fonts={fonts} from={from} x={16} title="Accuracy" value="92%" delta="+7%" />
      <MetricCard fonts={fonts} from={from} x={124} title="Latency (p95)" value="1.2s" delta="-18%" />
      <MetricCard fonts={fonts} from={from} x={232} title="Cost / 1K tokens" value="$0.42" delta="-11%" />
      <MiniText fonts={fonts} x={18} y={190} size={15} weight={700} color={palette.charcoal} startFrom={from + 50}>Conversation volume</MiniText>
      <div style={{ position: "absolute", left: 45, top: 225, width: 248, height: 92 }}>
        <LineChart local={local} fps={fps} color={palette.amber} area={false} />
      </div>
      {["6K", "4K", "2K"].map((label, index) => (
        <MiniText key={label} fonts={fonts} x={16} y={222 + index * 31} size={10} color="rgba(54, 43, 33, 0.46)" startFrom={from + 52}>{label}</MiniText>
      ))}
      {["May 1", "May 8", "May 15", "May 22", "May 29"].map((label, index) => (
        <MiniText key={label} fonts={fonts} x={50 + index * 53} y={326} size={10} color="rgba(54, 43, 33, 0.46)" startFrom={from + 54}>{label}</MiniText>
      ))}
    </div>
    <div style={{ position: "absolute", left: 558, top: 94, width: 188, height: 116, borderRadius: 20, background: "rgba(255, 253, 248, 0.78)", border: `1px solid ${palette.border}` }}>
      <MiniText fonts={fonts} x={18} y={18} size={15} weight={700} color={palette.charcoal} startFrom={from + 38}>Status</MiniText>
      <MiniText fonts={fonts} x={18} y={48} size={19} weight={500} color={palette.softCharcoal} startFrom={from + 40}>• Healthy</MiniText>
      <MiniText fonts={fonts} x={18} y={78} size={12} color="rgba(54, 43, 33, 0.58)" startFrom={from + 42}>All systems operational</MiniText>
    </div>
    <div style={{ position: "absolute", left: 558, top: 228, width: 188, height: 126, borderRadius: 20, background: "rgba(255, 253, 248, 0.78)", border: `1px solid ${palette.border}` }}>
      <MiniText fonts={fonts} x={18} y={16} size={15} weight={700} color={palette.charcoal} startFrom={from + 46}>Evaluations</MiniText>
      <MiniText fonts={fonts} x={18} y={49} size={13} color="rgba(54, 43, 33, 0.6)" startFrom={from + 48}>Pass rate</MiniText>
      <MiniText fonts={fonts} x={18} y={70} size={29} weight={700} color={palette.charcoal} startFrom={from + 50}>96%</MiniText>
      <div style={{ position: "absolute", right: 22, top: 42, width: 64, height: 64 }}>
        <ProgressRing local={local} fps={fps} />
      </div>
    </div>
    <div style={{ position: "absolute", left: 558, top: 372, width: 188, height: 82, borderRadius: 20, background: "rgba(255, 253, 248, 0.78)", border: `1px solid ${palette.border}` }}>
      <MiniText fonts={fonts} x={18} y={14} size={15} weight={700} color={palette.charcoal} startFrom={from + 54}>Alerts</MiniText>
      <MiniText fonts={fonts} x={18} y={38} size={27} weight={700} color={palette.charcoal} startFrom={from + 56}>0</MiniText>
      <MiniText fonts={fonts} x={52} y={47} size={12} color="rgba(54, 43, 33, 0.58)" startFrom={from + 58}>No active alerts</MiniText>
    </div>
    <svg viewBox="0 0 770 590" style={{ position: "absolute", inset: 0, opacity: STATIC_STORYBOARD ? 0.13 : 0.13 + Math.sin(frame / 38) * 0.025 }}>
      <path d="M24 496 C190 470, 260 540, 438 510 S635 490, 746 528" fill="none" stroke={palette.amberDark} strokeWidth="1" strokeDasharray="4 10" />
    </svg>
  </div>
);

const SceneFour = ({ frame, fonts }: { frame: number; fonts: FontSet }) => {
  const { fps } = useVideoConfig();
  const from = sceneStarts[3];
  const local = localFrame(frame, 3);
  const life = contentLife(local, sceneDurations[3]);
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(frame, 3), overflow: "hidden" }}>
      <PaperBackground frame={frame} variant={4} />
      <div style={{ position: "absolute", inset: 0, opacity: life }}>
        <SceneTitle
          fonts={fonts}
          from={from}
          x={58}
          y={102}
          size={54}
          lineHeight={1.02}
          lines={[{ text: "Built for enterprise." }, { text: "Ready for impact.", color: palette.amberDark }]}
        />
        {[
          ["lock", "Secure by default"],
          ["shield", "SOC 2 Type II"],
          ["check", "Privacy focused"],
        ].map(([type, label], index) => (
          <FeatureItem key={label} fonts={fonts} local={local} fps={fps} from={from} index={index} type={type} label={label} x={72} y={332} />
        ))}
        <EnterpriseDashboard fonts={fonts} frame={frame} from={from} local={local} fps={fps} />
      </div>
    </AbsoluteFill>
  );
};

const SceneFive = ({ frame, fonts }: { frame: number; fonts: FontSet }) => {
  const { fps } = useVideoConfig();
  const from = sceneStarts[4];
  const local = localFrame(frame, 4);
  const life = contentLife(local, sceneDurations[4]);
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(frame, 4), overflow: "hidden" }}>
      <PaperBackground frame={frame} variant={5} />
      <div style={{ position: "absolute", inset: 0, opacity: life }}>
        <AnthropicMark local={local} fps={fps} style={{ left: 538, top: 112, width: 204, height: 204 }} />
        <AnimatedText
          fontFamily={fonts.body}
          mode="chars"
          startFrom={from + 30}
          stagger={0.025}
          style={{
            position: "absolute",
            left: 0,
            top: 342,
            width: 1280,
            color: palette.charcoal,
            fontSize: 90,
            fontWeight: 600,
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {"ANTHROP\\C"}
        </AnimatedText>
        <AnimatedText
          fontFamily={fonts.body}
          mode="lines"
          startFrom={from + 48}
          style={{
            position: "absolute",
            left: 0,
            top: 446,
            width: 1280,
            color: palette.softCharcoal,
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          Building reliable AI that
        </AnimatedText>
        <AnimatedText
          fontFamily={fonts.body}
          mode="lines"
          startFrom={from + 54}
          style={{
            position: "absolute",
            left: 0,
            top: 490,
            width: 1280,
            color: palette.amberDark,
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          advances humanity.
        </AnimatedText>
        <div
          style={{
            position: "absolute",
            left: 519,
            top: 568,
            width: 242,
            height: 56,
            borderRadius: 999,
            background: palette.charcoal,
            boxShadow: "0 18px 44px rgba(45, 31, 19, 0.22)",
            ...entrance(local, fps, 62, life, 0, 16, 0.96),
          }}
        >
          <AnimatedText
            fontFamily={fonts.body}
            startFrom={from + 66}
            style={{
              position: "absolute",
              left: 0,
              top: 16,
              width: 242,
              color: "#fff7e8",
              fontSize: 19,
              fontWeight: 700,
              textAlign: "center",
              lineHeight: 1,
            }}
          >
            Build with Claude →
          </AnimatedText>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Main: React.FC = () => {
  const { fontFamily: heading } = loadCormorantGaramond("normal", {
    weights: ["600", "700"],
  });
  const { fontFamily: body } = loadWorkSans("normal", {
    weights: ["400", "500", "600", "700"],
  });
  const frame = useCurrentFrame();
  const fonts = { heading, body };

  return (
    <>
      {frame === 0 && <Artifact content={Artifact.Thumbnail} filename="thumbnail.jpeg" />}
      <AbsoluteFill style={{ background: palette.paper, overflow: "hidden" }}>
        <SceneOne frame={frame} fonts={fonts} />
        <SceneTwo frame={frame} fonts={fonts} />
        <SceneThree frame={frame} fonts={fonts} />
        <SceneFour frame={frame} fonts={fonts} />
        <SceneFive frame={frame} fonts={fonts} />
      </AbsoluteFill>
    </>
  );
};
