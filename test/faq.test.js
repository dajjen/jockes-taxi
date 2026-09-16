// Tester för FAQ-sidan (faq/index.html) och att FAQ är borttagen från startsidan.
// Körs med `node --test`. Inga externa anrop — allt läses från filerna.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "node-html-parser";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const faqPath = join(root, "faq", "index.html");
const start = parse(readFileSync(join(root, "index.html"), "utf8"), { comment: false });
const faq = existsSync(faqPath)
  ? parse(readFileSync(faqPath, "utf8"), { comment: false })
  : null;

const jsonLd = (doc) =>
  doc.querySelectorAll('script[type="application/ld+json"]').map((s) => JSON.parse(s.text));

const normalize = (s) => s.replace(/\s+/g, " ").trim();

test("faq/index.html finns", () => {
  assert.ok(faq, "saknar faq/index.html");
});

test("startsidan har ingen FAQ-sektion och ingen FAQPage-markup", () => {
  assert.equal(start.querySelector("#faq"), null, "startsidan har fortfarande #faq");
  assert.equal(start.querySelector(".faq"), null, "startsidan har fortfarande .faq");
  const types = jsonLd(start).flatMap((d) => [].concat(d["@type"]));
  assert.ok(!types.includes("FAQPage"), "startsidan har fortfarande FAQPage-JSON-LD");
});

test("startsidans meny och sidfot länkar till /faq/", () => {
  const header = start.querySelectorAll('nav#huvudmeny a[href="/faq/"]');
  const footer = start.querySelectorAll('nav.footer-nav a[href="/faq/"]');
  assert.equal(header.length, 1, "huvudmenyn saknar länk till /faq/");
  assert.equal(footer.length, 1, "sidfoten saknar länk till /faq/");
  assert.equal(start.querySelectorAll('a[href="#faq"]').length, 0, "det finns kvar #faq-länkar");
});

test("FAQ-sidan har lang=sv, title, description och canonical mot /faq/", () => {
  assert.equal(faq.querySelector("html")?.getAttribute("lang"), "sv");
  const title = faq.querySelector("title")?.text.trim() ?? "";
  assert.ok(title.length >= 20 && title.length <= 70, `title bör vara 20–70 tecken, är ${title.length}`);
  assert.match(title, /fråg/i);
  assert.match(title, /gotland/i);
  const desc = faq.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  assert.ok(desc.length >= 50 && desc.length <= 320, `description bör vara 50–320 tecken, är ${desc.length}`);
  assert.equal(
    faq.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    "https://www.jockestaxi.se/faq/"
  );
  assert.equal(
    faq.querySelector('meta[property="og:url"]')?.getAttribute("content"),
    "https://www.jockestaxi.se/faq/"
  );
});

test("FAQ-sidan har exakt en h1 och ingen h2 för FAQ-rubriken", () => {
  const h1 = faq.querySelectorAll("h1");
  assert.equal(h1.length, 1);
  assert.match(h1[0].text, /fråg/i);
});

test("FAQ-sidan har åtta frågor som details/summary", () => {
  const items = faq.querySelectorAll("details.faq-item");
  assert.equal(items.length, 8);
  for (const item of items) {
    assert.ok(item.querySelector("summary")?.text.trim(), "fråga saknar summary");
    assert.ok(item.querySelector(".faq-answer p")?.text.trim(), "fråga saknar svar");
  }
});

test("FAQPage-JSON-LD på FAQ-sidan matchar de synliga frågorna", () => {
  const data = jsonLd(faq).find((d) => [].concat(d["@type"]).includes("FAQPage"));
  assert.ok(data, "FAQ-sidan saknar FAQPage-JSON-LD");
  const items = faq.querySelectorAll("details.faq-item");
  assert.equal(data.mainEntity.length, items.length);
  items.forEach((item, i) => {
    const q = data.mainEntity[i];
    assert.equal(q["@type"], "Question");
    assert.equal(normalize(q.name), normalize(item.querySelector("summary").text));
    assert.equal(
      normalize(q.acceptedAnswer.text),
      normalize(item.querySelector(".faq-answer").text)
    );
  });
});

test("FAQ-sidan har header-meny, sidfot, telefon-CTA och samma stilmallar", () => {
  assert.ok(faq.querySelector("nav#huvudmeny"), "saknar huvudmeny");
  assert.ok(faq.querySelector(".nav-toggle"), "saknar mobilmeny-knapp");
  assert.ok(faq.querySelector("footer.site-footer"), "saknar sidfot");
  assert.ok(faq.querySelector('main a[href="tel:+46722108050"]'), "saknar ring-CTA i main");
  assert.ok(faq.querySelector('link[rel="stylesheet"][href^="/styles.css"]'), "saknar styles.css");
  assert.ok(faq.querySelector('link[rel="stylesheet"][href^="/components/logo/logo.css"]'), "saknar logo.css");
  assert.ok(faq.querySelector('script[src^="/main.js"]'), "saknar main.js");
});

test("FAQ-sidans länkar till startsidans ankare pekar på id:n som finns", () => {
  const ids = new Set(start.querySelectorAll("[id]").map((el) => el.getAttribute("id")));
  const localIds = new Set(faq.querySelectorAll("[id]").map((el) => el.getAttribute("id")));
  const brutna = [];
  for (const a of faq.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (href.startsWith("/#")) {
      if (!ids.has(href.slice(2))) brutna.push(href);
    } else if (href.startsWith("#")) {
      if (href.length > 1 && !localIds.has(href.slice(1))) brutna.push(href);
    }
  }
  assert.deepEqual(brutna, [], `brutna ankarlänkar: ${brutna.join(", ")}`);
  assert.ok(faq.querySelector('nav#huvudmeny a[href="/#kontakt"]'), "menyn saknar länk till /#kontakt");
});

test("alla img på FAQ-sidan har alt", () => {
  for (const img of faq.querySelectorAll("img")) {
    assert.ok(img.getAttribute("alt") !== undefined, `<img> saknar alt: ${img.toString().slice(0, 60)}`);
  }
});

test("sitemap.xml innehåller /faq/", () => {
  const sm = readFileSync(join(root, "sitemap.xml"), "utf8");
  assert.match(sm, /<loc>https:\/\/www\.jockestaxi\.se\/faq\/<\/loc>/);
});
