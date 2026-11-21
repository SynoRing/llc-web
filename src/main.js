import "./studies.js";
import "./intent-study.js";

const menu = document.querySelector(".menu-button");
const nav = document.querySelector(".main-nav");
const narrow = matchMedia("(max-width: 860px)");

function closeMenu() {
  nav.classList.remove("expanded");
  menu.setAttribute("aria-expanded", "false");
}
function updateMenu() {
  menu.hidden = !narrow.matches;
  closeMenu();
}
menu.addEventListener("click", () => {
  menu.setAttribute("aria-expanded", String(nav.classList.toggle("expanded")));
});
nav.addEventListener("click", closeMenu);
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest("header")) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav.classList.contains("expanded")) {
    closeMenu();
    menu.focus();
  }
});
narrow.addEventListener("change", updateMenu);
updateMenu();

for (const link of document.querySelectorAll("header a[hreflang]")) {
  link.addEventListener("click", () => { link.hash = window.location.hash; });
}

for (const [selector, count] of [
  [".waves", 15],
  [".waveform", 39],
]) {
  const wave = document.querySelector(selector);
  for (let i = 0; i < count; i++) {
    const bar = document.createElement("i");
    const envelope = Math.sin((Math.PI * (i + 0.5)) / count);
    const sample = Math.abs(Math.sin(i * 0.82) * 0.54 + Math.cos(i * 0.42) * 0.46);
    bar.style.setProperty("--height", 12 + envelope * (19 + sample * 69) + "%");
    bar.style.setProperty("--phase", (-i * 0.14).toFixed(2) + "s");
    wave.append(bar);
  }
}
