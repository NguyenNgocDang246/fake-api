import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE, SITE } from "@/app/libs/seo";

export const alt = "Fake API, mock REST endpoints in seconds";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            padding: "10px 26px",
            marginBottom: 40,
            borderRadius: 999,
            background: "rgba(255,255,255,0.18)",
            color: "#e0e7ff",
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          No backend required
        </div>

        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.1,
          }}
        >
          Mock APIs in seconds
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            color: "#dbeafe",
            fontSize: 36,
            lineHeight: 1.4,
          }}
        >
          Custom methods, status codes, response bodies and latency.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 70,
            color: "#ffffff",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          {SITE.name}
        </div>
      </div>
    ),
    size
  );
}
