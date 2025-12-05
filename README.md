# Local Contract Manager - Installationsanleitung

Dies ist eine vollständige Full-Stack-Anwendung (React Frontend + Node.js Backend + SQLite + Ollama AI).

## Voraussetzungen
1. **Node.js** (v18 oder höher) installiert.
2. **Ollama** installiert und laufend (`ollama serve`).
3. Ein Modell (z.B. llama3) gepullt: `ollama pull llama3`.

## Installation & Start

### 1. Backend (Server & Datenbank)
Das Backend läuft auf Port 3001 und verwaltet die SQLite-Datenbank.

1. Öffne ein Terminal im Ordner `backend`.
2. Installiere Abhängigkeiten:
   ```bash
   npm install
   ```
   *(Falls `package.json` noch nicht existiert, führe `npm init -y` aus und installiere: `npm install express sqlite3 cors node-cron body-parser`)*.
3. Starte den Server:
   ```bash
   node server.js
   ```
   Der Server läuft nun unter `http://0.0.0.0:3001`. Die Datenbank `contracts.db` wird automatisch erstellt.

### 2. Frontend (React)
Das Frontend läuft idealerweise über Vite.

1. Öffne ein Terminal im Hauptverzeichnis (wo `index.html` liegt).
2. Installiere Abhängigkeiten (sofern Vite konfiguriert ist) oder nutze einen einfachen HTTP-Server.
   Da hier Code-Dateien bereitgestellt wurden:
   ```bash
   npm install
   npm run dev
   ```
3. Öffne den Browser unter `http://localhost:5173` (oder dem Port, den dein Tool anzeigt).

### 3. KI-Setup (Ollama)
Stelle sicher, dass Ollama läuft:
```bash
ollama serve
```
Testen:
```bash
curl http://localhost:11434/api/tags
```

## Nutzung im LAN
Um von einem anderen PC zuzugreifen:
1. Finde deine IP-Adresse heraus (z.B. `ipconfig` oder `ifconfig`), z.B. `192.168.1.50`.
2. Starte das Backend (es hört bereits auf 0.0.0.0).
3. Öffne auf dem anderen PC den Browser: `http://192.168.1.50:5173` (Frontend-Port).
   *Hinweis: Damit das Frontend mit dem Backend spricht, nutzt das Frontend automatisch `window.location.hostname`. Das sollte im LAN funktionieren.*

## Features
- **Dashboard:** Übersicht über aktive Verträge und Warnungen.
- **Verträge:** Liste aller Verträge.
- **AI Extraktion:** Klicke auf "New Contract", füge Vertragstext ein und klicke "Extract Data with AI".
- **Alerts:** Automatische Prüfung um 08:00 Uhr (simuliert im Backend).

