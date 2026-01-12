# project-calculator

Konfigurátor nacenenia projektov podľa archetypov stránok. UI obsahuje
kalkulačku aj konfiguračný panel, kde si vieš priamo v prehliadači pridávať,
upravovať a mazať typy projektov, archetypy a multipliere.

## Spustenie

Stačí otvoriť `src/index.html` v prehliadači.

## Čo je pripravené

- Typy projektov so sadzbou €/jednotka (podľa Google sheet logiky).
- Archetypy stránok s koeficientmi + možnosť override v projekte.
- Multipliere (mobil, wireframe, DPH) a ručné úpravy ceny.
- Config panel s uložením do LocalStorage.

## Ďalšie kroky

- Napojenie na databázu (Supabase, Firebase, ...).
- Ukladanie projektov + export do PDF.
- Autentifikácia pre zdieľanie konfigurácie s klientom.
