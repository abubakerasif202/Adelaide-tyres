import { business } from "@/lib/config";

type Props = {
  /** "light" for dark backgrounds, "dark" for light backgrounds. */
  tone?: "light" | "dark";
  showWordmark?: boolean;
};

export function Logo({ tone = "dark", showWordmark = true }: Props) {
  const ink = tone === "light" ? "#ffffff" : "#090c0c";
  const sub = tone === "light" ? "rgba(255,255,255,0.72)" : "#68716d";

  return (
    <span className="flex items-center gap-3" aria-label={business.name}>
      <span
        className="display text-[34px] leading-none tracking-tight"
        style={{ color: ink }}
      >
        A<span style={{ color: "#f31217" }}>W</span>T
      </span>
      {showWordmark && (
        <span
          className="hidden sm:block h-9 w-px"
          style={{ background: tone === "light" ? "rgba(255,255,255,0.3)" : "#d6dad7" }}
        />
      )}
      {showWordmark && (
        <span className="hidden sm:flex flex-col leading-none">
          <span
            className="eyebrow text-[10px]"
            style={{ color: sub, letterSpacing: "0.18em" }}
          >
            Adelaide
          </span>
          <span
            className="display text-[17px] leading-none"
            style={{ color: ink }}
          >
            Wholesale Tyres
          </span>
        </span>
      )}
    </span>
  );
}
