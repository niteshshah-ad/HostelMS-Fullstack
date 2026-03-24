import { useEffect, useState } from "react";

function ClickWave() {
  const [waves, setWaves] = useState([]);

  useEffect(() => {
    let nextId = 0;
    const interactiveSelector = [
      "button",
      "input",
      "select",
      "textarea",
      ".card",
      ".hostel-card",
      ".student-hostel-card",
      ".warden-template-card",
      ".warden-option-card",
      ".warden-stat-card",
      ".warden-big-stat",
      ".warden-small-stat",
      ".warden-sidebar-btn",
      ".stat-card",
    ].join(", ");

    const handlePointerDown = (event) => {
      const target = event.target instanceof Element ? event.target.closest(interactiveSelector) : null;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const wave = {
        id: nextId++,
        x: event.clientX,
        y: event.clientY,
        size: Math.max(rect.width, rect.height, 56),
      };

      setWaves((prev) => [...prev, wave]);
      window.setTimeout(() => {
        setWaves((prev) => prev.filter((item) => item.id !== wave.id));
      }, 800);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className="click-wave-layer" aria-hidden="true">
      {waves.map((wave) => (
        <span
          key={wave.id}
          className="click-wave"
          style={{ left: wave.x, top: wave.y, width: wave.size, height: wave.size }}
        />
      ))}
    </div>
  );
}

export default ClickWave;
