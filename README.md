# project-calculator

Prototyp konfigurátora nacenenia projektov. UI obsahuje kalkulačku aj
konfiguračný panel, kde si vieš priamo v prehliadači pridávať, upravovať a
mazať typy projektov, modifikátory aj položky katalógu.

## Spustenie

Stačí otvoriť `src/index.html` v prehliadači.

## Čo je pripravené

- Konfigurovateľný katalóg položiek a typov projektov (`src/config.js`).
- Kalkulačný engine so škálovateľnými cenovými módmi (unit, tiered, volume).
- Moderný UI layout s Config panelom, ktorý ukladá dáta do LocalStorage.

## Ďalšie kroky

- Napojenie na databázu (Supabase, Firebase, ...).
- Ukladanie projektov + export do PDF.
- Autentifikácia pre zdieľanie konfigurácie s klientom.
