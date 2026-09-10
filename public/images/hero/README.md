# Hero wheel asset handoff

`hero-truck-tyre.webp` is the wheel the homepage hero rotates: a photoreal
head-on commercial truck wheel on a polished alloy rim, 1000 x 1000, transparent.

Measured on the shipping asset: silhouette ratio **0.994** (a circle), wheel
centred to **0.1%**, rim concentric to **0.1% / -0.7%**, and rim brightness even
to within **3.2 luma** across quadrants — so no baked-in highlight sweeps around
as it turns.

Keep those properties if you ever replace it. The rest of this file is the spec
and the gate.

## Why the geometry is non-negotiable

The hero spins the wheel about its own centre with `rotateZ`. That only reads as
an axle turning if the asset is genuinely head-on and centred.

A three-quarter product shot cannot be used, however good the photography is. Its
silhouette is an ellipse and its rim sits off to one side, so rotating it tumbles
the tyre — at 90° it looks like it is lying flat on the ground. This was measured
on a supplied 3/4 render: silhouette ratio **0.690** (head-on is 1.000), rim
**7% right and 13% high** of the tyre centre. Un-squashing the X axis to force the
silhouette circular does not rescue it either: a tyre is a torus, and at that angle
you are seeing the tread band wrap around the shoulder, which no 2D transform
removes.

Do not reach for `rotateY` to compensate. Animating a flat photograph in 3D looks
worse than the problem it solves.

## What to supply

- **View:** dead-on, straight at the wheel face. Not angled, not three-quarter.
- **Centring:** axle exactly at the centre of a **square** canvas.
- **Canvas:** 1000 x 1000 minimum, transparent background (real alpha, not white).
- **Padding:** keep the whole tyre inside the canvas with ~3% transparent margin.
- **Subject:** commercial truck tyre, dark black rubber, visible tread, metallic
  commercial rim. Not a passenger-car sports wheel.
- **Lighting:** soft and even. Directional highlights baked into the image rotate
  with it, so a hard key light will visibly sweep around as the wheel turns.
- **Clean:** no watermark, no brand text, no promotional labels, no background
  rectangle.
- **Delivery:** transparent WebP at `public/images/hero/hero-truck-tyre.webp`,
  ideally under 150 KB.

### Prompt for regenerating it

> Photorealistic commercial truck tyre on a polished aluminium rim, photographed
> perfectly head-on — straight at the wheel face, zero angle, perfectly circular
> silhouette, axle exactly centred. Deep black rubber with visible circumferential
> tread grooves and sidewall detail, polished 10-stud commercial alloy rim. Soft
> even studio lighting with no strong directional highlight. Fully transparent
> background, square 1:1 framing, no watermark, no text, no branding, no shadow
> on the ground.

Reject any result where the wheel face is an ellipse rather than a circle.

## Verifying a candidate before swapping it in

```
npm run check:hero-tyre -- path/to/candidate.webp
```

It measures canvas squareness and size, real transparency, silhouette circularity,
wheel centring and rim concentricity, and exits non-zero if the asset would tumble.
Run it on the file itself — you cannot eyeball a 5% ellipse, and 5% is visible once
it is rotating.

## Swapping it in

One line, in `components/HeroArtwork.tsx`:

```ts
const HERO_WHEEL = { src: "/images/hero/hero-truck-tyre.webp", width: 1000, height: 1000 };
```

Keep the path and the declared dimensions if the replacement is also 1000 x 1000 —
then it is a straight file replacement with no code change at all. The declared
`width`/`height` are what hold CLS at zero, so update them if the canvas size
changes.

Afterwards, re-run the homepage browser checks at 320, 375, 390, 430, 768, 1024,
1280 and 1440 px, including reduced motion, and confirm the wheel stays centred
through a full revolution.

## A note on the product label

The bay reads FEATURED WHOLESALE STOCK / RALSON RMR61 · 295/80R22.5, and that text
is catalogue-driven. The wheel image is decorative (`alt=""`, `aria-hidden`) so it
is never announced as that SKU — but a generic wheel still sits directly above a
specific product name. If that matters commercially, supply an actual RMR61 shot,
photographed head-on to the same spec above.
