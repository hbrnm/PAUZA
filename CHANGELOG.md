# CHANGELOG — PAUZĂ

## 1.0.1 — Stabilization (producție)

Release unic cu **toate modificările de azi**. Deploy: branch `main` / tag `v1.0.1`.

### Inclus

- Spec înghețată PAUZĂ + branding indigo (fără roșu)
- Polish iOS: puls buton, progress ring, tranziții, haptic
- Timer wall-clock (continuă corect după background)
- Sesiune activă în **IndexedDB** (reluare după refresh / PWA reopen)
- Data model: `startedAt`, `completedAt`, `extendedTime`, `protocolVersion`
- Compatibilitate date legacy
- Jurnal: Intervenții / Amânate / Consumate / Ieșiri rapide
- Ore vulnerabile pe `startedAt`
- Export JSON: `exportVersion`, `exportedAt`, `appVersion`, `episodes`
- Accesibilitate: `role="dialog"`, `aria-modal`, `role="timer"`, focus-visible
- Erori Dexie cu retry; sesiunea nu se pierde dacă salvarea eșuează
- PWA: icon.svg valid, SW update + reload, safe-area
- Vitest: 13 teste (timer, +2 min, early exit, Dexie, export, legacy)
- Branding: `package.name = pauza`, README PAUZĂ V1

### Nu include (intenționat)

AI, cloud/auth, analytics, calorii/greutate, localStorage pentru sesiune, notificări push.

### Deploy

```bash
git checkout main
git pull
git checkout v1.0.1   # opțional, același conținut
npm ci
npm test
npm run build
# publică dist/
```

După deploy pe iPhone: șterge PWA de pe Home Screen → Add to Home Screen din nou.
