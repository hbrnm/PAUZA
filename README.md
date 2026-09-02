# Anti-Poftă — V1

Sistem de intervenție în timp real pentru impulsurile de mâncat compulsiv.
Faza 1: recâștigarea controlului — nu numărat de calorii, nu target de greutate.

## Setup local

```bash
npm install
npm run dev
```

Deschide `http://localhost:5173` în browser pentru testare rapidă pe desktop.

## Testare pe iPhone (recomandat, ca PWA reală)

```bash
npm run build
npm run preview
```

1. Găsește IP-ul local al laptopului (ex. `ipconfig getifaddr en0` pe Mac, sau `ip addr` pe Linux).
2. Pe iPhone, conectat la același Wi-Fi, deschide Safari și accesează `http://[IP-ul-tău]:4173`.
3. Apasă Share → **Add to Home Screen**.
4. Deschide aplicația de pe ecranul principal (nu din Safari) pentru comportament PWA real.

### Ce să testezi explicit pe telefon
- **Wake Lock**: pornește protocolul, lasă telefonul nemișcat 30+ secunde — ecranul nu ar trebui să se stingă.
- **Export date**: din Jurnal, apasă „Exportă datele" — verifică dacă apare share sheet-ul nativ sau descărcarea directă.
- **Persistență**: închide complet aplicația (swipe din App Switcher), redeschide — episoadele înregistrate ar trebui să fie tot acolo.
- **Safe areas**: verifică că butoanele nu sunt tăiate de notch/Dynamic Island sau de bara de jos (Home Indicator).
- **Dynamic Type**: mărește fontul din Setări iOS → Accesibilitate, verifică că totul rămâne accesibil prin scroll.

## Iconițe

Iconițele din `public/` (`apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`) sunt
**placeholder-uri generate automat** (cerc roșu pe fundal închis, coerent cu paleta aplicației).
Le poți înlocui oricând cu un logo propriu — păstrează aceleași nume și dimensiuni.

## Structură proiect

```
src/
  types.ts                    — CravingEpisode, TriggerType, OutcomeType
  db/index.ts                 — Dexie (IndexedDB) + persistență + export
  hooks/useWakeLock.ts        — previne stingerea ecranului în timpul protocolului
  components/
    HomeView.tsx               — ecran principal, buton SOS
    CrisisOverlay.tsx          — protocolul anti-poftă (RUNNING → DECOMPRESSION → AFTERCARE)
    JournalView.tsx            — istoric episoade + tipare (cu prag minim de 10 episoade)
  App.tsx                      — asamblare ecrane
  main.tsx                     — entry point React
  index.css                    — Tailwind + reguli iOS (touch-action, overscroll)
index.html                     — meta tags PWA/iOS
vite.config.ts                 — plugin PWA + manifest
```

## Exclus intenționat din V1

AI Coach conversațional, calorii, target de greutate, cântar, notificări push, cloud/cont utilizator, social, gamification agresivă.

## Reper de verificare V1 → V2

După 3-4 săptămâni și ~20-30 episoade înregistrate: revizuiește onest dacă protocolul
a schimbat ceva comportamental, sau doar ai documentat același tipar. Abia atunci
are sens să discutăm despre identificare automată de tipare, AI Coach sau integrări
suplimentare (Apple Health, nutriție etc.).
