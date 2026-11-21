import { en, zh } from "./src/copy.js";

const origin = new URL(process.env.SYNO_LABS_URL || "https://synolabs.org").origin;
const home = origin + "/";
const organization = home + "#organization";
const website = home + "#website";

export function pageMetadata(locale) {
  const canonical = new URL(locale.home, home).href;
  const graph = [
    {
      "@type": "Organization", "@id": organization,
      name: "Syno Labs", legalName: "Syno Labs LLC", url: home,
      logo: origin + "/assets/syno-logo.png", email: "contact@synolabs.org",
    },
    {
      "@type": "WebSite", "@id": website, name: "Syno Labs", url: home,
      publisher: { "@id": organization }, inLanguage: [en.lang, zh.lang],
    },
    {
      "@type": "WebPage", "@id": canonical + "#webpage", url: canonical,
      name: locale.title, description: locale.description, inLanguage: locale.lang,
      isPartOf: { "@id": website }, about: { "@id": organization },
    },
  ];
  return {
    siteOrigin: origin, canonical,
    ogLocale: locale === zh ? "zh_CN" : "en_US",
    ogAlternateLocale: locale === zh ? "en_US" : "zh_CN",
    structuredData: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c"),
  };
}

// Serve the same crawler files locally that Vite emits for static hosting.
export function crawlerFiles() {
  const entries = [en, zh].map(({ home: path }) => `  <url><loc>${origin}${path}</loc></url>`);
  const files = new Map([
    ["/robots.txt", {
      type: "text/plain",
      source: `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
    }],
    ["/sitemap.xml", {
      type: "application/xml",
      source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`,
    }],
  ]);
  return {
    name: "syno-crawler-files",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const file = files.get(request.url?.split("?")[0]);
        if (!file || !["GET", "HEAD"].includes(request.method)) return next();
        response.setHeader("Content-Type", file.type + "; charset=utf-8");
        response.end(request.method === "HEAD" ? undefined : file.source);
      });
    },
    generateBundle() {
      for (const [path, file] of files) {
        this.emitFile({ type: "asset", fileName: path.slice(1), source: file.source });
      }
    },
  };
}
