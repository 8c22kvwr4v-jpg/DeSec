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
regodkjenning/ (øvingsprøve for vektere)
```

## Øvingsprøve (`/regodkjenning/`)

Øvingsprøve for vektere som skal opp til regodkjenning. Prøven trekker 80
tilfeldige spørsmål fra en bank på 900, med stokket rekkefølge på
svaralternativene, slik at ingen to prøver blir like.

- **Prøvemodus** — 80 spørsmål, 90 minutter, fasit først etter levering.
  Beståttgrensen er satt til 75 % (60 av 80).
- **Øvingsmodus** — velg antall spørsmål og temaer, fasit og forklaring
  med én gang, ingen klokke.
- Resultat per tema, gjennomgang av alle spørsmål med forklaring, og
  «øv på de du bommet på».
- Pågående prøve og resultathistorikk lagres i `localStorage`. Ingenting
  sendes ut av nettleseren, og siden krever ingen innlogging.

Spørsmålsbanken ligger som ES-moduler i `regodkjenning/js/data/`, ett tema
per fil, på formatet `[spørsmål, [fire alternativer], fasitindeks, forklaring]`.
`js/bank.js` setter dem sammen og gir hvert spørsmål en stabil id. Nye
spørsmål legges til ved å utvide en temafil — ingen andre endringer trengs.

Innholdet er skrevet som øvingsmateriell ut fra pensum i vekterutdanningen.
Det er ikke en offisiell prøve, og bør gjennomgås av en instruktør før det
brukes i formell opplæring.

## Ansattportal (`/app/`)

Egen app for ansatte, med innlogging (e-post/passord) og delt database via
Firebase. Krever et engangsoppsett i Firebase-konsollet før den fungerer —
se [`app/SETUP.md`](app/SETUP.md) for full oppskrift.
