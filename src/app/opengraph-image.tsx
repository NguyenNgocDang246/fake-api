import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE, SITE } from "@/app/libs/seo";

export const alt = "Fake API, mock REST endpoints in seconds";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

const SIGNALS = [
  "Fresh AI data on every call",
  "Any status code, any delay",
  "Hosted URL, no server to run",
];

const GRADIENT = "linear-gradient(90deg, #4f46e5 0%, #3b82f6 100%)";

// Satori has no blur filter, so the three washes `HeroGlow` paints with blur-3xl are drawn here
// as radial gradients fading to transparent instead.
const GLOWS = [
  { color: "147,197,253", alpha: 0.32, width: 880, height: 880, left: 160, top: -460 },
  { color: "165,180,252", alpha: 0.26, width: 400, height: 400, left: 830, top: -210 },
  { color: "233,213,255", alpha: 0.22, width: 360, height: 360, left: 30, top: -230 },
];

function SparklesIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1d4ed8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2563eb"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 90px",
          backgroundColor: "#ffffff",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        {GLOWS.map(({ color, alpha, width, height, left, top }) => (
          <div
            key={color}
            style={{
              position: "absolute",
              display: "flex",
              width,
              height,
              left,
              top,
              backgroundImage: `radial-gradient(circle, rgba(${color},${alpha}) 0%, rgba(${color},0) 70%)`,
            }}
          />
        ))}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 24px",
            marginBottom: 36,
            borderRadius: 999,
            background: "#dbeafe",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          <SparklesIcon />
          No backend required
        </div>

        <div
          style={{
            display: "flex",
            color: "#000000",
            fontSize: 90,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.1,
          }}
        >
          Build a fake API in
        </div>
        <div
          style={{
            display: "flex",
            marginBottom: 40,
            fontSize: 90,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1.1,
            backgroundImage: GRADIENT,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          seconds
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 900,
            rowGap: 14,
            columnGap: 40,
            color: "#6b7280",
            fontSize: 26,
            fontWeight: 500,
          }}
        >
          {SIGNALS.map((signal) => (
            <div key={signal} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckIcon />
              {signal}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 56,
            color: "#9ca3af",
            fontSize: 28,
            fontWeight: 500,
          }}
        >
          {new URL(SITE.url).host}
        </div>
      </div>
    ),
    size
  );
}
