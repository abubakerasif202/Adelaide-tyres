#!/usr/bin/env node
// Gate for the rotating hero wheel asset.
//
// The hero spins the tyre about its own centre with rotateZ. That only reads
// as an axle turning if the asset is genuinely head-on and centred: a 3/4
// product shot has an elliptical silhouette and an off-centre rim, so
// rotating it tumbles the tyre instead (verified — a supplied 3/4 render
// measured 0.690 silhouette ratio with the axle 86px right and 161px high,
// and no 2D correction rescues it, because a tyre is a torus and you are
// seeing the tread band wrap around the shoulder).
//
// Run before swapping a new asset into components/HeroArtwork.tsx:
//   node scripts/check-hero-tyre.mjs [path]
//
// Default path is the asset the hero currently ships.
import { statSync } from "node:fs";
import sharp from "sharp";

const DEFAULT_ASSET = "public/images/hero/hero-truck-tyre.webp";

/** Head-on silhouette is a circle. Anything outside this is an angled shot. */
const SILHOUETTE_RATIO = { min: 0.95, max: 1.05 };
/**
 * How far the silhouette may sit off the canvas centre, as a fraction of the
 * canvas. Pure geometry, so this can be strict — it is what the CSS rotates
 * about.
 */
const MAX_SILHOUETTE_OFFSET = 0.01;
/**
 * How far the rim may sit off the SILHOUETTE centre. Deliberately looser: the
 * rim is located by brightness, and a strong specular highlight drags that
 * centroid toward the key light even on a perfectly centred wheel. It exists
 * to catch a 3/4 shot, where the rim is genuinely pushed to one side (the
 * supplied 3/4 render measured 7.1% / -12.8%), not to police lighting.
 */
const MAX_RIM_OFFSET = 0.06;
/** Below this the wheel is soft once it fills a desktop bay. */
const MIN_EDGE = 1000;
/** Luma above which a pixel is treated as polished rim rather than rubber. */
const RIM_LUMA = 150;
/** Alpha above which a pixel counts as part of the tyre. */
const OPAQUE = 40;

async function measure(file) {
  const meta = await sharp(file).metadata();
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;

  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  let rimX = 0, rimY = 0, rimN = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * c;
      if (data[i + 3] <= OPAQUE) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (luma > RIM_LUMA) { rimX += x; rimY += y; rimN++; }
    }
  }
  if (x1 < 0) throw new Error("no opaque pixels — the asset is fully transparent");
  if (rimN === 0) throw new Error("no bright rim pixels found — is this a wheel?");

  const corner = (x, y) => data[(y * w + x) * c + 3];
  return {
    meta,
    canvas: { w, h },
    silhouette: {
      w: x1 - x0 + 1,
      h: y1 - y0 + 1,
      ratio: (x1 - x0 + 1) / (y1 - y0 + 1),
      cx: (x0 + x1) / 2,
      cy: (y0 + y1) / 2,
    },
    rim: { x: rimX / rimN, y: rimY / rimN },
    cornersTransparent: [corner(1, 1), corner(w - 2, 1), corner(1, h - 2), corner(w - 2, h - 2)].every((a) => a === 0),
    bytes: statSync(file).size,
  };
}

const file = process.argv[2] || DEFAULT_ASSET;
const m = await measure(file);
const checks = [];
const check = (ok, label, detail) => checks.push({ ok, label, detail });

check(m.canvas.w === m.canvas.h, "canvas is square", `${m.canvas.w}x${m.canvas.h}`);
check(m.canvas.w >= MIN_EDGE, `canvas is at least ${MIN_EDGE}px`, `${m.canvas.w}px`);
check(m.meta.hasAlpha, "has an alpha channel", String(m.meta.hasAlpha));
check(m.cornersTransparent, "corners are fully transparent", m.cornersTransparent ? "all 4 clear" : "opaque background present");
check(
  m.silhouette.ratio >= SILHOUETTE_RATIO.min && m.silhouette.ratio <= SILHOUETTE_RATIO.max,
  "silhouette is circular (head-on, not 3/4)",
  `ratio ${m.silhouette.ratio.toFixed(3)} (want ${SILHOUETTE_RATIO.min}-${SILHOUETTE_RATIO.max}), ${m.silhouette.w}x${m.silhouette.h}`,
);
const sx = (m.silhouette.cx - m.canvas.w / 2) / m.canvas.w;
const sy = (m.silhouette.cy - m.canvas.h / 2) / m.canvas.h;
check(
  Math.abs(sx) <= MAX_SILHOUETTE_OFFSET && Math.abs(sy) <= MAX_SILHOUETTE_OFFSET,
  "wheel is centred on the canvas",
  `offset ${(sx * 100).toFixed(1)}% x, ${(sy * 100).toFixed(1)}% y (want within ${MAX_SILHOUETTE_OFFSET * 100}%)`,
);
const rx = (m.rim.x - m.silhouette.cx) / m.canvas.w;
const ry = (m.rim.y - m.silhouette.cy) / m.canvas.h;
check(
  Math.abs(rx) <= MAX_RIM_OFFSET && Math.abs(ry) <= MAX_RIM_OFFSET,
  "rim is concentric with the tyre (not pushed aside by a 3/4 angle)",
  `offset ${(rx * 100).toFixed(1)}% x, ${(ry * 100).toFixed(1)}% y (want within ${MAX_RIM_OFFSET * 100}%; brightness-based, so a strong highlight biases it)`,
);

console.log(`\n${file}  (${(m.bytes / 1024).toFixed(1)} KB)\n`);
for (const c of checks) console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.label}\n        ${c.detail}`);

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.log(`\n${failed.length} check(s) failed — this asset will not rotate believably.\n`);
  process.exit(1);
}
console.log("\nAll checks passed — safe to rotate about the axle.\n");
