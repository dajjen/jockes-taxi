# Deploy & drift – Jockes Taxi

Statisk sajt som deployas till **Oderland** via **GitHub Actions** (rsync över SSH).
Flödet: du pushar till `main` → tester körs → vid grönt läggs sajten upp automatiskt.

---

## Engångsuppsättning

### 1. Lägg upp koden på GitHub

```bash
# I projektmappen (/srv/www/jockes-taxi)
git init
git add .
git commit -m "Init: Jockes Taxi"
git branch -M main
git remote add origin git@github.com:DITT-KONTO/jockes-taxi.git
git push -u origin main
```

### 2. Skapa en SSH-nyckel för deploy

Skapa ett nyckelpar som *bara* används för deploy (lösenordslöst):

```bash
ssh-keygen -t ed25519 -C "github-deploy-jockestaxi" -f ~/.ssh/jockestaxi_deploy -N ""
```

Det ger två filer:
- `~/.ssh/jockestaxi_deploy` → **privat** nyckel (till GitHub-secret)
- `~/.ssh/jockestaxi_deploy.pub` → **publik** nyckel (till Oderland)

### 3. Lägg den publika nyckeln på Oderland

I Oderlands kundpanel / DirectAdmin:
1. Aktivera **SSH-åtkomst** för kontot om det inte redan är på (finns under kontoinställningar; hör med Oderlands support om det inte syns).
2. Lägg in innehållet i `jockestaxi_deploy.pub` under **SSH Keys** (DirectAdmin → *Advanced Features → SSH Keys → Add Key*).

Testa att nyckeln funkar från din dator:

```bash
ssh -i ~/.ssh/jockestaxi_deploy -p 22 DITT-ODERLAND-ANVANDARNAMN@ssh.jockestaxi.se
```

> Hostnamn och port hittar du i Oderlands panel. Ofta `ssh.<domän>` eller serverns
> hostnamn, port `22`.

### 4. Ta reda på sökvägen till webbroten

På Oderland/DirectAdmin ligger sajten oftast i:

```
domains/jockestaxi.se/public_html
```

(räknat från hemkatalogen). Logga in med SSH och kör `ls domains/jockestaxi.se/`
för att bekräfta att `public_html` finns.

### 5. Lägg in GitHub-secrets

I GitHub-repot: **Settings → Secrets and variables → Actions → New repository secret**.
Skapa dessa fem:

| Namn              | Värde (exempel)                          |
|-------------------|------------------------------------------|
| `SSH_PRIVATE_KEY` | Hela innehållet i `~/.ssh/jockestaxi_deploy` (inkl. BEGIN/END-raderna) |
| `SSH_HOST`        | `ssh.jockestaxi.se` (ditt SSH-hostnamn)  |
| `SSH_PORT`        | `22`                                     |
| `SSH_USER`        | ditt Oderland-användarnamn               |
| `REMOTE_PATH`     | `domains/jockestaxi.se/public_html`      |

### 6. Slå på gratis SSL (Let's Encrypt)

I DirectAdmin: **SSL Certificates** → välj *Let's Encrypt* för `jockestaxi.se`
och `www.jockestaxi.se`. `.htaccess` tvingar sedan HTTPS + www automatiskt.

> När HTTPS bekräftat fungerar kan du avkommentera HSTS-raden i `.htaccess`.

---

## Daglig användning

Ändra något, testa lokalt och pusha — resten sköts av GitHub Actions:

```bash
npm install        # första gången
npm test           # kör HTML-, SEO- och länktester lokalt

git add .
git commit -m "Uppdatera telefonnummer"
git push           # → tester + deploy körs automatiskt
```

Följ körningen under fliken **Actions** i GitHub-repot.

---

## Tester

`npm test` kör tre kontroller:

| Kommando          | Vad den kollar                                            |
|-------------------|-----------------------------------------------------------|
| `npm run test:html` | Att HTML:en är giltig (`html-validate`)                 |
| `npm run test:seo`  | Titel, meta description, canonical, `lang`, Open Graph, JSON-LD och att alla `#`-ankare pekar rätt |
| `npm run test:links`| Inga brutna länkar/resurser (`linkinator`)              |

Externa länkar (Facebook/Instagram) och den ännu ej live-satta domänen hoppas över
i `.linkinator.config.json` tills de är riktiga.

---

## Kvar att fylla i innan lansering

Sök på `FYLL-I` i `index.html`:
telefonnummer, e-post, Facebook/Instagram, org.nr, riktiga omdömen samt en
`og-image.png` (1200×630) för snygg delning på sociala medier.
