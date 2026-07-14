# FAQ-sektion för SEO — design

**Datum:** 2026-07-14
**Sajt:** Jockes Taxi (statisk one-pager, `index.html` + `styles.css`)

## Bakgrund

Google Search Console visar vilka sökningar sajten faktiskt exponeras för:
`fårö taxi`, `taxi fårösund`, `taxi fårö`, `limo gotland`, `gotland taxi`,
`taxi gotland`, `taxi gotland nummer`. En FAQ-sektion med `FAQPage`-strukturerad
data besvarar dessa frågor direkt på sidan och kan ge rich results i Google.

## Mål

- Fånga upp de platsspecifika sökningarna (Fårö/Fårösund) och intent kring
  telefonnummer, pris och limo.
- Synligt innehåll på sidan + matchande `FAQPage` JSON-LD (Googles krav: markup
  får inte innehålla text som saknas synligt).

## Innehåll (8 frågor)

1. **Kör ni taxi på Fårö och Fårösund?** — Ja, till/från Fårö, Fårösund och
   Fårö-färjan, precis som till resten av Gotland. Hela ön, dygnet runt.
2. **Vilka orter på Gotland kör ni till?** — Hela ön: Visby, Tofta, Hemse, Slite,
   Fårösund, Fårö, Klintehamn, Roma m.fl. Ring även om orten saknas.
3. **Vad är Jockes Taxis telefonnummer?** — 072-210 80 50, dygnet runt. Går även
   att boka via SMS.
4. **Kör ni dygnet runt?** — Ja, dygnet runt året om.
5. **Vad kostar en taxiresa på Gotland?** — Fast pris innan resan, inga
   överraskningar. Ring för pris.
6. **Kan jag boka taxi till färjan eller flyget?** — Ja, till/från färjeläget i
   Visby och Visby flygplats. Boka i förväg.
7. **Hur många passagerare får plats?** — Två bilar, 4 resp. 6 passagerare.
8. **Erbjuder ni limousine på Gotland?** — Vanlig taxi, inte limo — men större
   bil tar 6 personer bekvämt.

## Teknisk design

- **Markup:** native `<details>`/`<summary>` accordion. Ingen JavaScript.
  Svaret finns alltid i DOM:en (nödvändigt för SEO + JSON-LD-matchning).
- **Strukturerad data:** en andra `<script type="application/ld+json">` med
  `FAQPage`-schema, identisk text som den synliga, placerad i FAQ-sektionen.
- **Placering:** `<section id="faq">` sist i `<main>`, efter Kontakt, före footer.
- **Meny:** länk "Vanliga frågor" (`#faq`) i toppmenyn efter Omdömen.
- **Styling:** nya regler i `styles.css` som återanvänder befintliga
  design-tokens (`--sea`, `--sand`, `--surface`, `--line`).

## Filer som ändras

- `index.html` — meny-länk, FAQ-sektion, JSON-LD.
- `styles.css` — accordion-stil.

Inga nya beroenden, ingen JS.

## Utanför scope

- Limo-tjänst (finns inte — besvaras ärligt).
- Betalsätt-fråga (kan läggas till senare vid behov).
