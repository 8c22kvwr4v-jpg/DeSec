# Oppsett av ansattportalen (DeSec App)

Ansattportalen (vaktplan, instrukser, avvik, maktrapport, team, arkiv, lønn) er
bygget som en egen del av nettsiden under `/app/`, og bruker **Firebase**
(gratis nivå) som database, innlogging og bildelagring — slik at alle ansatte
ser de samme dataene, på alle enheter.

Du må gjøre et engangsoppsett i Firebase-konsollet (ca. 10–15 minutter), og
sende de resulterende nøklene tilbake så de kan limes inn i koden.

## 1. Opprett Firebase-prosjekt

1. Gå til https://console.firebase.google.com/ og logg inn med en Google-konto.
2. Klikk **Legg til prosjekt**. Gi det et navn, f.eks. `desec-app`.
3. Google Analytics kan du skru **av** — trengs ikke.
4. Klikk **Opprett prosjekt**.

## 2. Skru på innlogging (e-post/passord)

1. I menyen til venstre: **Build → Authentication**.
2. Klikk **Get started**.
3. Under **Sign-in method**, velg **E-post/passord** og skru den **på** (den
   øverste bryteren er nok, du trenger ikke "e-postlenke").
4. Lagre.

## 3. Opprett database (Firestore)

1. **Build → Firestore Database → Create database**.
2. Velg **Start i produksjonsmodus**.
3. Velg en region i Europa, f.eks. `eur3 (europe-west)`.
4. Klikk **Enable**.
5. Gå til fanen **Regler** (Rules) og lim inn hele innholdet fra filen
   [`app/firebase/firestore.rules`](firebase/firestore.rules) i dette
   repoet. Klikk **Publiser**.

## 4. Opprett bildelagring (Storage)

1. **Build → Storage → Get started**.
2. Velg **Start i produksjonsmodus**, samme region som over.
3. Gå til fanen **Rules** og lim inn hele innholdet fra
   [`app/firebase/storage.rules`](firebase/storage.rules). Klikk **Publiser**.

> Merk: Firebase Storage krever et betalingskort registrert på prosjektet
> (Blaze-plan) for å fungere i produksjonsmodus, men du blir **ikke belastet**
> innenfor det gratis kvoten (5 GB lagring / 1 GB nedlasting per dag), som er
> mer enn nok for en liten bedrift. Hvis dere vokser mye kan dere sette opp
> et budsjettvarsel i Firebase for trygghet.

## 5. Hent konfigurasjonsnøklene til appen

1. Klikk tannhjulet øverst til venstre → **Prosjektinnstillinger**.
2. Under **Dine apper**, klikk web-ikonet (`</>`) for å registrere en ny app.
3. Gi den et kallenavn, f.eks. `DeSec App`. La **"Sett også opp Firebase
   Hosting"** stå **avkrysset av** (vi bruker GitHub Pages, ikke Firebase
   Hosting).
4. Klikk **Registrer app**. Du får opp et kodeeksempel med et objekt som
   ligner på dette:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "desec-app.firebaseapp.com",
     projectId: "desec-app",
     storageBucket: "desec-app.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456",
   };
   ```

5. Kopier hele dette objektet og send det tilbake (f.eks. i chatten her), så
   limes det inn i `app/js/firebase-init.js`.

## 6. Opprett din egen bruker (daglig leder)

1. **Build → Authentication → Users → Add user**.
2. Skriv inn din e-post (f.eks. `Oystein@Desec.no`) og et midlertidig
   passord du kan bytte senere.
3. Klikk **Add user**. Kopier **User UID** som vises i lista (en lang kode).
4. Gå til **Build → Firestore Database → Data**.
5. Opprett samlingen `employees` (Start collection), og bruk **User UID**
   fra steg 3 som dokument-ID.
6. Legg inn disse feltene på dokumentet:

   | Felt | Type | Verdi |
   |---|---|---|
   | `name` | string | `Øystein Johannessen` |
   | `email` | string | (samme e-post som steg 2) |
   | `role` | string | `leder` |
   | `active` | boolean | `true` |
   | `hourlyRateOverride` | null | *(la stå tom/null)* |
   | `uniform` | array | *(tom liste)* |
   | `courses` | array | *(tom liste)* |

7. Lagre. Du kan nå logge inn på `/app/` med denne e-posten og passordet.

## 7. Inviter flere ansatte

Når du er logget inn som leder: gå til **Team → Inviter ansatt**, fyll inn
navn, e-post og rolle. Den ansatte går deretter til `/app/`, klikker
**"Har du fått en invitasjon? Registrer deg her"**, og oppretter passord selv
med samme e-postadresse.

## Ferdig

Når `app/js/firebase-init.js` har fått de riktige nøklene og er pushet til
`main`, er ansattportalen live på:

`https://8c22kvwr4v-jpg.github.io/DeSec/app/`
