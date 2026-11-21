const frame = document.querySelector("iframe");
const choices = [...document.querySelectorAll('input[name="face"]')];
const requested = new URL(location.href).searchParams.get("font");
const initial = choices.find((radio) => radio.value === requested) ?? choices[0];
initial.checked = true;

const sheetUrl = new URL("./fonts.css", location.href).href;
let activeDocument;

function applySelection() {
  const choice = choices.find((radio) => radio.checked);
  // External product pages can be opened from the embedded homepage.
  if (!activeDocument || activeDocument !== frame.contentDocument) return;
  const root = activeDocument.documentElement;
  if (choice.value === "figtree") {
    root.style.removeProperty("--sans");
    return;
  }
  const family = choice.closest("label").style.getPropertyValue("--face");
  root.style.setProperty(
    "--sans",
    family + ', "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
  );
}

function preparePage() {
  const doc = frame.contentDocument;
  if (!doc || !doc.querySelector(".hero") || doc === activeDocument) return;
  activeDocument = doc;
  const sheet = doc.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = sheetUrl;
  sheet.addEventListener("load", applySelection, { once: true });
  doc.head.append(sheet);
  const playback = doc.querySelector(".playback");
  if (playback && !playback.hidden && !playback.classList.contains("paused")) {
    playback.click();
  }
  for (const link of doc.links) {
    if (link.protocol === "https:" && link.origin !== location.origin) {
      link.target = "_blank";
      link.rel = "noopener";
    }
  }
}
frame.addEventListener("load", preparePage);
if (frame.contentDocument?.readyState === "complete") preparePage();
for (const choice of choices) {
  choice.addEventListener("change", () => {
    const url = new URL(location.href);
    url.searchParams.set("font", choice.value);
    history.replaceState(null, "", url);
    applySelection();
  });
}
