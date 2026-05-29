/**
 * PageTransition
 *
 * Previously this component briefly set opacity:0 during route changes (10ms
 * window). On slow Android devices the JS event loop can stretch that window
 * to 100-500ms, creating a visible white flash — which some users reported as
 * "blank white screen after logo appears".
 *
 * Fix: render children directly. The per-route error boundaries in App.tsx now
 * provide crash isolation; we don't need a flash-based transition on top.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
