import { ImageResponse } from "next/og";
import { business } from "@/lib/config";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#063b2c",
          borderRadius: "12px",
          color: "#ffffff",
          fontFamily: "sans-serif",
          fontWeight: 800,
          fontSize: 30,
          letterSpacing: "-0.03em",
        }}
      >
        {business.shortName}
      </div>
    ),
    { ...size }
  );
}
