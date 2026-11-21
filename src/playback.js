// Pausing freezes the local playhead. Leaving the section only suspends its clock.
export function bindPlayback(section, button, onActiveChange) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let enabled = !reduced.matches;
  let visible = false;
  let active = false;

  function sync() {
    const label = enabled ? button.dataset.pause : button.dataset.play;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.classList.toggle("paused", !enabled);
    const text = button.querySelector("span");
    if (text) text.textContent = label;
    const next = enabled && visible && !document.hidden;
    if (next !== active) {
      active = next;
      onActiveChange(active);
    }
  }
  function setEnabled(value) {
    enabled = value;
    sync();
  }
  button.hidden = false;
  button.addEventListener("click", () => setEnabled(!enabled));
  reduced.addEventListener("change", () => setEnabled(!reduced.matches));
  document.addEventListener("visibilitychange", sync);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(section);
  sync();
  return { pause: () => setEnabled(false) };
}
