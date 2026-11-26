// Tester för den engelska sidan (en/index.html) och kopplingen sv ↔ en.
// Körs med `node --test`. Inga externa anrop — allt läses från filerna.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "node-html-parser";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (...p) => parse(readFileSync(join(root, ...p), "utf8"), { comment: false });
const sv = load("index.html");
const en = load("en", "index.html");
const faq = load("faq", "index.html");

const SV_URL = "https://www.jockestaxi.se/";
const EN_URL = "https://www.jockestaxi.se/en/";

const hreflang = (doc) =>
  Object.fromEntries(
    doc.querySelectorAll('link[rel="alternate"][hreflang]')
      .map((l) => [l.getAttribute("hreflang"), l.getAttribute("href")])
  );

test("engelska sidan har lang=en, title, description och canonical mot /en/", () => {
  assert.equal(en.querySelector("html")?.getAttribute("lang"), "en");
  const title = en.querySelector("title")?.text.trim() ?? "";
  assert.ok(title.length >= 20 && title.length <= 70, `title bör vara 20–70 tecken, är ${title.length}`);
  assert.match(title, /taxi/i);
  assert.match(title, /gotland/i);
  const desc = en.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
  assert.ok(desc.length >= 50 && desc.length <= 160, `description bör vara 50–160 tecken, är ${desc.length}`);
  assert.match(desc, /gotland/i);
  assert.equal(en.querySelector('link[rel="canonical"]')?.getAttribute("href"), EN_URL);
  assert.equal(en.querySelector('meta[property="og:url"]')?.getAttribute("content"), EN_URL);
  assert.equal(en.querySelector('meta[property="og:locale"]')?.getAttribute("content"), "en_GB");
});

test("hreflang pekar åt båda håll och är identisk på sv och en", () => {
  const vantat = { sv: SV_URL, en: EN_URL, "x-default": SV_URL };
  assert.deepEqual(hreflang(sv), vantat);
  assert.deepEqual(hreflang(en), vantat);
});

test("språkväxlare finns i meny och sidfot på alla sidor", () => {
  for (const [namn, doc] of [["startsidan", sv], ["FAQ", faq]]) {
    for (const nav of ["nav#huvudmeny", "nav.footer-nav"]) {
      const a = doc.querySelector(`${nav} a[href="/en/"]`);
      assert.ok(a, `${namn}: ${nav} saknar länk till /en/`);
      assert.equal(a.getAttribute("hreflang"), "en");
      assert.equal(a.getAttribute("lang"), "en");
    }
  }
  for (const nav of ["nav#huvudmeny", "nav.footer-nav"]) {
    const a = en.querySelector(`${nav} a[href="/"]`);
    assert.ok(a, `engelska sidan: ${nav} saknar länk till svenska startsidan`);
    assert.equal(a.getAttribute("hreflang"), "sv");
    assert.equal(a.getAttribute("lang"), "sv");
  }
});

test("engelska sidan har exakt en h1 och ring-CTA", () => {
  assert.equal(en.querySelectorAll("h1").length, 1);
  assert.ok(en.querySelector('main a[href="tel:+46722108050"]'), "saknar ring-CTA i main");
  assert.ok(en.querySelector('main a[href="sms:+46722108050"]'), "saknar sms-länk i main");
});

test("engelska sidan visar telefonnumret i internationellt format", () => {
  const text = en.querySelector("body").text.replace(/ /g, " ");
  assert.match(text, /\+46 722 10 80 50/);
});

test("engelska sidan har varken omdömen eller recensionsformulär", () => {
  // Omdömena är på svenska (och delvis exempeltexter) — de ska inte översättas hit.
  assert.equal(en.querySelector(".review-card"), null);
  assert.equal(en.querySelector("form"), null);
});

test("engelska sidans interna ankarlänkar pekar på id:n som finns", () => {
  const ids = new Set(en.querySelectorAll("[id]").map((el) => el.getAttribute("id")));
  const brutna = en.querySelectorAll('a[href^="#"]')
    .map((a) => a.getAttribute("href"))
    .filter((h) => h.length > 1 && !ids.has(h.slice(1)));
  assert.deepEqual(brutna, [], `brutna ankarlänkar: ${brutna.join(", ")}`);
  assert.equal(new Set(ids).size, en.querySelectorAll("[id]").length, "dubbla id:n");
});

test("ingen svensk gränssnittstext har blivit kvar på engelska sidan", () => {
  const text = en.querySelector("body").text;
  for (const ord of ["Ring ", "Boka", "dygnet", "Kontakt", "Omdömen", "Vart vi kör", "Hoppa till", "meny", "och "]) {
    assert.ok(!text.includes(ord), `svensk text kvar: "${ord}"`);
  }
  for (const el of en.querySelectorAll("[aria-label]")) {
    assert.doesNotMatch(el.getAttribute("aria-label"), /[åäö]|meny|toppen/i);
  }
});

test("JSON-LD på engelska sidan är samma företag som på startsidan", () => {
  const ld = (doc) =>
    doc.querySelectorAll('script[type="application/ld+json"]')
      .flatMap((s) => [].concat(JSON.parse(s.text)))
      .find((d) => [].concat(d["@type"]).includes("LocalBusiness"));
  const a = ld(sv);
  const b = ld(en);
  assert.ok(a && b, "saknar LocalBusiness-JSON-LD");
  assert.ok(a["@id"], "startsidans LocalBusiness saknar @id");
  assert.equal(b["@id"], a["@id"]);
  assert.equal(b.telephone, a.telephone);
  assert.deepEqual(b.areaServed, a.areaServed);
  assert.doesNotMatch(b.description, /och|över|dygnet/);
});

test("engelska sidan laddar samma stilmallar och skript som startsidan", () => {
  const filer = (doc) => [
    ...doc.querySelectorAll('link[rel="stylesheet"]').map((l) => l.getAttribute("href")),
    ...doc.querySelectorAll("script[src]").map((s) => s.getAttribute("src")),
  ];
  assert.deepEqual(filer(en), filer(sv));
});

test("alla img på engelska sidan har alt", () => {
  for (const img of en.querySelectorAll("img")) {
    assert.ok(img.getAttribute("alt") !== undefined, `<img> saknar alt: ${img.toString().slice(0, 60)}`);
  }
});

test("sitemap.xml innehåller /en/", () => {
  const sm = readFileSync(join(root, "sitemap.xml"), "utf8");
  assert.match(sm, /<loc>https:\/\/www\.jockestaxi\.se\/en\/<\/loc>/);
});
