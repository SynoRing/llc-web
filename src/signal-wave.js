// The drawing uses absolute Bézier coordinates. Bend its control points in place
// so the ends stay anchored and neighboring threads follow with a small phase lag.
function animateThread(path, depth, width, phases) {
  const rest = path.getAttribute("d");
  const controls = rest.split(" ").map((pair) => {
    const [commandX, y] = pair.split(",");
    const x = Number(commandX.replace(/^[MCS]/, "")) / width;
    const anchor = Math.sin(Math.PI * x);
    const swell = (22 + 8 * depth) * anchor * Math.exp(-(((x - .46) / .22) ** 2));
    const ripple = 10 * anchor * Math.exp(-(((x - .71) / .19) ** 2));
    const bend = 11 * (x - .46) - 1.65 * (depth - .5);
    const echo = 16 * (x - .71) + 1.2 * (depth - .5);
    return {
      commandX,
      y: Number(y),
      swellSin: swell * Math.cos(bend),
      swellCos: swell * Math.sin(bend),
      rippleSin: ripple * Math.cos(echo),
      rippleCos: ripple * Math.sin(echo),
    };
  });

  const poses = phases.map(([sin, cos, sin2, cos2]) => controls.map((point) => {
    const y = point.y + point.swellSin * sin + point.swellCos * cos
      + point.rippleSin * sin2 + point.rippleCos * cos2;
    return point.commandX + "," + y.toFixed(1);
  }).join(" "));

  const morph = document.createElementNS(path.namespaceURI, "animate");
  morph.setAttribute("attributeName", "d");
  morph.setAttribute("dur", "10s");
  morph.setAttribute("repeatCount", "indefinite");
  morph.setAttribute("values", [rest, ...poses, rest].join(";"));
  path.append(morph);
}

export function bindSignalWave(svg) {
  let initialized = false;
  svg.pauseAnimations();
  return (playing) => {
    if (!playing) {
      svg.pauseAnimations();
      return;
    }
    if (!initialized) {
      const steps = 24;
      const phases = [];
      for (let i = 1; i < steps; i++) {
        const t = 2 * Math.PI * i / steps;
        phases.push([Math.sin(t), Math.cos(t) - 1, Math.sin(2 * t), Math.cos(2 * t) - 1]);
      }
      const paths = svg.querySelectorAll("path");
      paths.forEach((path, i) => animateThread(path, i / (paths.length - 1), svg.viewBox.baseVal.width, phases));
      svg.setCurrentTime(0);
      initialized = true;
    }
    svg.unpauseAnimations();
  };
}
