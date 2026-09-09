import { ImageResponse } from "next/og";
import { business } from "@/lib/config";

export const alt = `${business.name} — ${business.tagline}`;
export const size = { width: 1200, height: 630 };
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
          padding: "80px",
          background: "linear-gradient(150deg, #063b2c, #04211a)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "72px",
            height: "6px",
            background: "#df1015",
            marginBottom: "36px",
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: "920px",
          }}
        >
          {business.name}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "28px",
            fontSize: 32,
            fontWeight: 500,
            color: "#d6dad7",
            maxWidth: "860px",
          }}
        >
          {business.tagline}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "56px",
            fontSize: 26,
            fontWeight: 600,
            color: "#ffffff",
            background: "#2c3233",
            padding: "14px 28px",
            borderRadius: "6px",
            alignSelf: "flex-start",
          }}
        >
          No minimum order · Adelaide-wide delivery
        </div>
      </div>
    ),
    { ...size }
  );
}
