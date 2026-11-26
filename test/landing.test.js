// Tester för ortssidorna (/taxi-faro/, /taxi-visby/) och länkningen till dem.
// Körs med `node --test`. Inga externa anrop — allt läses från filerna.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "node-html-parser";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (...p) => parse(readFileSync(join(root, ...p), "utf8"), { comment: false });
const start = load("index.html");
const faq = load("faq", "index.html");
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");

const jsonLd = (doc) =>
  doc.querySelectorAll('script[type="application/ld+json"]').flatMap((s) => [].concat(JSON.parse(s.text)));
const ofType = (doc, t) => jsonLd(doc).find((d) => [].concat(d["@type"]).includes(t));
const normalize = (s) => s.replace(/\s+/g, " ").trim();

const SIDOR = [
  { slug: "taxi-faro", ort: /fårö/i, platser: ["Fårö", "Fårösund"] },
  { slug: "taxi-visby", ort: /visby/i, platser: ["Visby"] },
];

for (const { slug, ort, platser } of SIDOR) {
  const doc = load(slug, "index.html");
  const url = `https://www.jockestaxi.se/${slug}/`;

  test(`${slug}: lang=sv, title, description och canonical`, () => {
    assert.equal(doc.querySelector("html")?.getAttribute("lang"), "sv");
    const title = doc.querySelector("title")?.text.trim() ?? "";
    assert.ok(title.length >= 20 && title.length <= 70, `title bör vara 20–70 tecken, är ${title.length}`);
    assert.match(title, /^taxi /i);
    assert.match(title, ort);
    const desc = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    assert.ok(desc.length >= 50 && desc.length <= 160, `description bör vara 50–160 tecken, är ${desc.length}`);
    assert.match(desc, ort);
    assert.equal(doc.querySelector('link[rel="canonical"]')?.getAttribute("href"), url);
    assert.equal(doc.querySelector('meta[property="og:url"]')?.getAttribute("content"), url);
    assert.equal(doc.querySelectorAll('link[hreflang]').length, 0, "sidan finns bara på svenska");
  });

  test(`${slug}: exakt en h1 som nämner orten, och ring-/sms-CTA`, () => {
    const h1 = doc.querySelectorAll("h1");
    assert.equal(h1.length, 1);
    assert.match(h1[0].text, /taxi/i);
    assert.match(h1[0].text, ort);
    assert.ok(doc.querySelector('main a[href="tel:+46722108050"]'), "saknar ring-CTA i main");
    assert.ok(doc.querySelector('main a[href="sms:+46722108050"]'), "saknar sms-länk i main");
  });

  test(`${slug}: tjänsten i JSON-LD hör till samma företag som startsidan`, () => {
    const foretag = ofType(start, "LocalBusiness");
    const tjanst = ofType(doc, "TaxiService");
    assert.ok(tjanst, "saknar TaxiService-JSON-LD");
    assert.equal(tjanst.provider["@id"], foretag["@id"]);
    assert.equal(tjanst.url, url);
    assert.deepEqual(tjanst.areaServed.map((p) => p.name), platser);
    const smulor = ofType(doc, "BreadcrumbList");
    assert.equal(smulor.itemListElement.at(-1).item, url);
  });

  test(`${slug}: FAQPage-JSON-LD matchar de synliga frågorna`, () => {
    const data = ofType(doc, "FAQPage");
    const items = doc.querySelectorAll("details.faq-item");
    assert.ok(items.length >= 3, "för få frågor");
    assert.equal(data.mainEntity.length, items.length);
    items.forEach((item, i) => {
      assert.equal(normalize(data.mainEntity[i].name), normalize(item.querySelector("summary").text));
      assert.equal(
        normalize(data.mainEntity[i].acceptedAnswer.text),
        normalize(item.querySelector(".faq-answer").text)
      );
    });
  });

  test(`${slug}: header, sidfot, stilmallar och skript som på startsidan`, () => {
    assert.ok(doc.querySelector("nav#huvudmeny"), "saknar huvudmeny");
    assert.ok(doc.querySelector(".nav-toggle"), "saknar mobilmeny-knapp");
    assert.ok(doc.querySelector("footer.site-footer"), "saknar sidfot");
    assert.equal(doc.querySelector("[aria-current]"), null, "ingen menypunkt ska vara markerad");
    const filer = (d) => [
      ...d.querySelectorAll('link[rel="stylesheet"]').map((l) => l.getAttribute("href")),
      ...d.querySelectorAll("script[src]").map((s) => s.getAttribute("src")),
    ];
    assert.deepEqual(filer(doc), filer(start));
  });

  test(`${slug}: ankarlänkar pekar på id:n som finns, inga dubbla id:n`, () => {
    const startIds = new Set(start.querySelectorAll("[id]").map((el) => el.getAttribute("id")));
    const egna = doc.querySelectorAll("[id]").map((el) => el.getAttribute("id"));
    assert.equal(new Set(egna).size, egna.length, "dubbla id:n");
    const brutna = [];
    for (const a of doc.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href");
      if (href.startsWith("/#") && !startIds.has(href.slice(2))) brutna.push(href);
      if (href.startsWith("#") && href.length > 1 && !egna.includes(href.slice(1))) brutna.push(href);
    }
    assert.deepEqual(brutna, [], `brutna ankarlänkar: ${brutna.join(", ")}`);
  });

  test(`${slug}: alla img har alt`, () => {
    for (const img of doc.querySelectorAll("img")) {
      assert.ok(img.getAttribute("alt") !== undefined, `<img> saknar alt: ${img.toString().slice(0, 60)}`);
    }
  });

  test(`${slug}: finns i sitemap och länkas från startsidan och FAQ`, () => {
    assert.ok(sitemap.includes(`<loc>${url}</loc>`), "saknas i sitemap.xml");
    assert.ok(start.querySelector(`main a[href="/${slug}/"]`), "startsidan länkar inte hit");
    assert.ok(faq.querySelector(`main a[href="/${slug}/"]`), "FAQ-sidan länkar inte hit");
  });
}

test("ortssidorna länkar till varandra", () => {
  assert.ok(load("taxi-faro", "index.html").querySelector('main a[href="/taxi-visby/"]'));
  assert.ok(load("taxi-visby", "index.html").querySelector('main a[href="/taxi-faro/"]'));
});
