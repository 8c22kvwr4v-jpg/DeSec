# DeSec

Nettside for DeSec — vekterselskap i Bergen og omegn.

**Live:** https://8c22kvwr4v-jpg.github.io/DeSec/ (publiseres automatisk fra `main` via GitHub Pages)

Statisk side bygget med HTML, CSS og vanilla JS. Ingen build-steg.

## Kjøre lokalt

```
python3 -m http.server 8080
```

Åpne http://localhost:8080

## Struktur

```
index.html
assets/
  css/style.css
  js/main.js
  img/        (logo og favikoner)
app/          (ansattportal: vaktplan, instrukser, avvik, maktrapport, team, arkiv, lønn)
```

## Ansattportal (`/app/`)

Egen app for ansatte, med innlogging (e-post/passord) og delt database via
Firebase. Krever et engangsoppsett i Firebase-konsollet før den fungerer —
se [`app/SETUP.md`](app/SETUP.md) for full oppskrift.
