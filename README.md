# PAUZĂ V1

Sistem de intervenție în timp real pentru impulsurile de mâncat compulsiv.
Faza 1: recâștigarea controlului — nu numărat de calorii, nu target de greutate.

**Versiune:** 1.0.1 (stabilization)

## Setup local

```bash
npm install
npm run dev
```

Deschide `http://localhost:5173` în browser pentru testare rapidă pe desktop.

```bash
npm test
npm run build
```

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
- **Background**: ieși din app 30–60s, revino — timer-ul reflectă timpul real.
- **Refresh mid-protocol**: reîncarcă pagina — protocolul se reia din IndexedDB.
- **Export date**: din Jurnal, apasă „Exportă datele" — share sheet nativ sau descărcare.
- **Persistență**: închide din App Switcher, redeschide — episoadele rămân.
- **Safe areas**: butoanele nu sunt tăiate de notch / Home Indicator.
- **Dynamic Type**: font mărit — conținutul rămâne scrollabil.

## Iconițe

Iconițele din `public/` (`apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`, `icon.svg`)
sunt placeholder-uri indigo pe fundal `#020617`.

## Structură proiect

```
src/
  types.ts                     — CravingEpisode, sesiune activă, versiuni
  db/index.ts                  — Dexie (episoade + sesiune activă) + export
  hooks/useWakeLock.ts         — previne stingerea ecranului
  hooks/useWallClockTimer.ts   — timer pe timp real (background-safe)
  components/
    HomeView.tsx
    CrisisOverlay.tsx
    JournalView.tsx
    TimerDisplay.tsx
  App.tsx
  main.tsx
  index.css
```

## Exclus intenționat din V1

AI Coach, calorii, target de greutate, cântar, notificări push, cloud/cont,
analytics, social, gamification agresivă, localStorage pentru sesiune.

## Reper V1 → V2

După 3–4 săptămâni și ~20–30 episoade: evaluează dacă protocolul a schimbat
ceva comportamental, sau doar a documentat tiparul.
