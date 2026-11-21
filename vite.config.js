import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { en, zh } from "./src/copy.js";
import { crawlerFiles, pageMetadata } from "./seo.js";

const template = fileURLToPath(new URL("./index.html", import.meta.url));
const traceDrawing = new URL("./art/gesture-traces.svg", import.meta.url);

function languageOptions(current) {
  return [[zh, "中文", "简体中文"], [en, "EN", "English"]].map(([copy, short, name]) =>
    copy === current
      ? `<strong lang="${copy.lang}" aria-current="true">${short}</strong>`
      : `<a href="${copy.home}" hreflang="${copy.lang}" lang="${copy.lang}" aria-label="${name}">${short}</a>`
  ).join('<span aria-hidden="true">/</span>');
}

export default defineConfig(({ command, isPreview }) => ({
  appType: "mpa",
  plugins: [
    crawlerFiles(),
    {
      name: "syno-languages",
      transformIndexHtml: {
        order: "pre",
        handler(html, context) {
          const chinese = context.filename.endsWith("/zh/index.html");
          const locale = chinese ? zh : en;
          const productOrigin = process.env.SYNO_RING_URL ||
            (command === "serve" && !isPreview ? "http://127.0.0.1:3000" : "https://www.synoring.ai");
          const copy = {
            ...locale,
            ...pageMetadata(locale),
            gestureTraces: readFileSync(traceDrawing, "utf8"),
            languageOptions: languageOptions(locale),
            productUrl: new URL(chinese ? "/zh" : "/", productOrigin).href.replace(/\/$/, ""),
          };
          const source = chinese ? readFileSync(template, "utf8") : html;
          return source.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            if (!(key in copy)) throw new Error("Missing translation for " + key);
            return copy[key];
          });
        },
      },
    },
  ],
  build: { rollupOptions: { input: { en: "index.html", zh: "zh/index.html" } } },
}));
