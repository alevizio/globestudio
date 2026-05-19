import { useEffect, useState } from "react";

// Dev-only perf HUD. Polls a metrics ref maintained by the per-frame animate
// loop in globe-background.jsx — keeps React out of the hot path so the
// display itself doesn't skew the numbers. Vite strips `import.meta.env.DEV`
// branches in production builds, so this component costs zero bytes in the
// shipped bundle when its parent guards the mount on that flag.
//
// Display fields:
//   FPS         — exponentially smoothed frames/second
//   calls       — renderer.info.render.calls (draw calls last frame)
//   geo         — renderer.info.memory.geometries (live geometry count)
//   dots        — instanced dot count for the current dot layer
//
// Position: absolute, top-right of the globe canvas. pointer-events: none
// so the globe still receives drag input through the chip.
export const PerfMonitor = ({ metricsRef }) => {
  const [snapshot, setSnapshot] = useState(null);

  useEffect(() => {
    if (!metricsRef) return undefined;
    const tick = () => {
      const current = metricsRef.current;
      if (current) {
        setSnapshot({
          fps: current.fps,
          calls: current.calls,
          geometries: current.geometries,
          dots: current.dots,
        });
      }
    };
    // 4 Hz update — fast enough to feel live, slow enough that re-render
    // cost doesn't show up in the FPS reading.
    const id = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(id);
  }, [metricsRef]);

  if (!snapshot) return null;

  return (
    <div className="perf-monitor" role="status" aria-label="Performance HUD">
      <span className="perf-monitor-row">
        <span className="perf-monitor-label">FPS</span>
        <span className="perf-monitor-value">{snapshot.fps.toFixed(0)}</span>
      </span>
      <span className="perf-monitor-row">
        <span className="perf-monitor-label">calls</span>
        <span className="perf-monitor-value">{snapshot.calls}</span>
      </span>
      <span className="perf-monitor-row">
        <span className="perf-monitor-label">geo</span>
        <span className="perf-monitor-value">{snapshot.geometries}</span>
      </span>
      <span className="perf-monitor-row">
        <span className="perf-monitor-label">dots</span>
        <span className="perf-monitor-value">{snapshot.dots}</span>
      </span>
    </div>
  );
};
