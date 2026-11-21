import { bindPlayback } from "./playback.js";

const hero = document.querySelector(".hero");
const video = hero.querySelector(".gesture-film");
const toggle = hero.querySelector(".hero-playback");

const playback = bindPlayback(hero, toggle, (active) => {
  hero.classList.toggle("is-playing", active);
  if (!active) {
    video.pause();
    return;
  }
  video.play().catch((error) => {
    if (error.name !== "AbortError" && video.paused) playback.pause();
  });
});
video.addEventListener("error", () => {
  playback.pause();
  toggle.hidden = true;
});
