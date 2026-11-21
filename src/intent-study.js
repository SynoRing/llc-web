import { bindPlayback } from "./playback.js";

const lab = document.querySelector("#experiment");
const desk = lab.querySelector(".desk");
const file = lab.querySelector(".source-file");
const copy = lab.querySelector(".stage-copy");
const panels = [...copy.querySelectorAll("[data-panel]")];
const stages = [...lab.querySelectorAll("[data-stage]")];
const folders = [...lab.querySelectorAll("[data-dest]")];
const speech = lab.querySelector(".speech");
const phrases = speech.dataset.speech.split("|");
const wires = [...desk.querySelectorAll(".wire")];
const travel = desk.querySelector(".travel");
const packet = desk.querySelector(".packet");

// A correction re-opens target resolution for the same file. The following pass
// illustrates the shorter path, when the original destination is confirmed.
const cues = {
  listen: { stage: 0, duration: 2700, next: "locate" },
  locate: { stage: 1, duration: 2300, next: "preview" },
  preview: { stage: 2, duration: 3500 },
  correction: { stage: 1, duration: 2300, next: "revised" },
  revised: { stage: 2, duration: 2700, next: "confirm" },
  confirm: { stage: 3, duration: 3200, next: "listen" },
};
const manualCues = ["listen", "locate", "preview", "confirm"];
let cue = "listen";
let folder = 0;
let needsCorrection = true;
let elapsed = 0;
let previous = 0;
let frame = 0;
let length = 0;
let paths = [];
let delivered = false;

function measureRoutes() {
  const box = desk.getBoundingClientRect();
  const source = file.getBoundingClientRect();
  const x = source.right - box.left;
  const y = source.top - box.top + source.height / 2;
  paths = folders.map((button, index) => {
    const target = button.getBoundingClientRect();
    const tx = target.left - box.left;
    const ty = target.top - box.top + target.height / 2;
    const mid = (x + tx) / 2;
    const path = `M ${x} ${y} C ${mid} ${y}, ${mid} ${ty}, ${tx} ${ty}`;
    wires[index].setAttribute("d", path);
    return path;
  });
  selectRoute();
}

function selectRoute() {
  if (!paths.length) return;
  travel.setAttribute("d", paths[folder]);
  length = travel.getTotalLength();
  paint();
}

function markDelivered(value) {
  delivered = value;
  lab.dataset.delivered = String(value);
  file.setAttribute("aria-hidden", String(value));
  folders.forEach((button, index) => {
    button.querySelector(".arrived").hidden = !(value && folder === index);
  });
}

function paint() {
  const { stage, duration } = cues[cue];
  const progress = Math.min(1, elapsed / duration);
  stages[stage].style.setProperty("--progress", progress);
  if (stage === 3 && !delivered && elapsed >= 1000) markDelivered(true);
  if (stage < 2 || !length) return;
  const t = stage === 3 ? Math.min(1, elapsed / 1000) : (elapsed / 1400) % 1;
  const eased = t * t * (3 - 2 * t);
  const point = travel.getPointAtLength(length * eased);
  packet.setAttribute("cx", point.x);
  packet.setAttribute("cy", point.y);
}

function enter(next, nextFolder = folder, time = 0) {
  cue = next;
  folder = nextFolder;
  elapsed = time;
  const { stage } = cues[cue];
  lab.dataset.step = String(stage);
  lab.dataset.cue = cue;
  lab.dataset.folder = String(folder);
  const panelKey = cue === "correction" ? cue : String(stage);
  panels.forEach((panel) => {
    panel.inert = panel.dataset.panel !== panelKey;
  });
  speech.textContent =
    cue === "correction"
      ? speech.dataset.correction
      : cue === "revised"
        ? speech.dataset.revised
        : phrases[stage];
  stages.forEach((button, index) => {
    button.setAttribute("aria-pressed", String(index === stage));
    button.style.removeProperty("--progress");
  });
  folders.forEach((button, index) => {
    button.disabled = stage !== 2;
    button.setAttribute("aria-pressed", String(stage >= 2 && index === folder));
  });
  markDelivered(stage === 3 && time >= 1000);
  selectRoute();
}

function advance() {
  if (cue === "preview") {
    enter(needsCorrection ? "correction" : "confirm");
  } else if (cue === "correction") {
    enter("revised", 1 - folder);
  } else if (cue === "confirm") {
    needsCorrection = !needsCorrection;
    enter("listen", 0);
  } else {
    enter(cues[cue].next);
  }
}

function tick(now) {
  if (previous) elapsed += Math.min(now - previous, 120);
  previous = now;
  if (elapsed >= cues[cue].duration) advance();
  paint();
  frame = requestAnimationFrame(tick);
}

const playback = bindPlayback(lab, lab.querySelector("#study-playback"), (active) => {
  lab.dataset.running = String(active);
  copy.setAttribute("aria-live", active ? "off" : "polite");
  cancelAnimationFrame(frame);
  previous = 0;
  if (active) frame = requestAnimationFrame(tick);
});

stages.forEach((button, index) =>
  button.addEventListener("click", () => {
    playback.pause();
    if (index === 0) needsCorrection = true;
    enter(manualCues[index], index === 0 ? 0 : folder, index === 3 ? 1000 : 0);
  }),
);
folders.forEach((button, index) =>
  button.addEventListener("click", () => {
    playback.pause();
    enter("revised", index);
  }),
);

const resize = new ResizeObserver(measureRoutes);
[desk, file, ...folders].forEach((item) => resize.observe(item));
enter("listen");
measureRoutes();
