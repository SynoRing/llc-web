import { bindPlayback } from "./playback.js";
import { bindSignalWave } from "./signal-wave.js";

const hero = document.querySelector(".hero");
const video = hero.querySelector(".gesture-film");
const toggle = hero.querySelector(".hero-playback");
const setWavePlaying = bindSignalWave(hero.querySelector(".gesture-traces svg"));

const playback = bindPlayback(hero, toggle, (active) => {
  setWavePlaying(active);
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
