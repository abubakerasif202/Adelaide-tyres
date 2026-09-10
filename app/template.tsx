/**
 * A template (unlike a layout) re-mounts on every navigation, so this is what
 * gives each route change its entrance. Kept deliberately short — content is
 * in the DOM immediately and only opacity/transform animate, so navigation
 * never feels gated behind the animation. Disabled under reduced motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-transition">{children}</div>;
}
