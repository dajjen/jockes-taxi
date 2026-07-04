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

Externa länkar (Facebook) och den ännu ej live-satta domänen hoppas över
i `.linkinator.config.json` tills de är riktiga.

> OBS: `send-review.php` körs bara på en riktig PHP-server (Oderland), inte på den
> lokala python-servern eller i testerna. Testa recensionsformuläret först efter deploy.

---

## Recensionsformulär (e-post)

Formuläret i Omdömen-sektionen POSTar till `send-review.php`, som mailar recensionen
till **recension@jockestaxi.se** via serverns PHP `mail()`.

Innan det fungerar i skarpt läge:

1. **Skapa e-postkontot** `recension@jockestaxi.se` i DirectAdmin (*E-Mail Accounts*).
2. **Avsändaradress:** skriptet skickar `From: no-reply@jockestaxi.se`. Skapa det kontot
   (eller ändra `$FROM` högst upp i `send-review.php` till en adress som finns). Att skicka
   från en @jockestaxi.se-adress minskar risken att mailen hamnar i skräpposten.
3. Skydd mot spam finns inbyggt: en dold honungsfälla + skydd mot header-injektion.

Vill du ändra mottagaradressen: byt `$TO` överst i `send-review.php`.

---

## Kvar att fylla i innan lansering

Sök på `FYLL-I` i `index.html`:
e-post (kontaktlistan), Facebook-länk, riktig domän samt riktiga omdömen. Lägg även till
en `og-image.png` (1200×630) i projektroten för snygg delning på sociala medier.
Telefonnummer (0722108050) och Instagram är redan hanterade.
