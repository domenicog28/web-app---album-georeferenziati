# Web App — Album Georeferenziati

Applicazione web per la creazione e gestione di album fotografici georeferenziati. Il backend è sviluppato in Node.js e espone API REST per la gestione degli album, delle foto e delle coordinate geografiche associate.

## Tecnologie utilizzate

- **Backend**: Node.js, Express
- **Database**: SQLite
- **Frontend**: HTML, CSS, JavaScript
- **Mappe**: Leaflet, Nominatim

## Funzionalità principali

- Creazione e rimozione di album fotografici
- Associazione di un luogo geografico ad ogni album
- Visualizzazione degli album su mappa interattiva
- Marker dinamici sulla mappa per ogni album creato

## Come avviare il progetto tramite docker o avvio locale

### Setup iniziale (obligatorio per Docker e Locale)
1- Apri il terminale(cmd) nella cartella del progetto e esegui: `copy .env.example .env`
2- Modificare l'email nel `.env` con la **tua email** (per Nominatim)

inserisci un email valida nella funzione cerca.

### Prerequisiti

**Per Docker**
- Docker Desktop installato

**Per avvio locale:**
- Node.js v24.x (o superiore)
- npm


### Avvio con Docker (CONSIGLIATO)

```bash
docker-compose up
```

### Avvio locale

```bash
npm install
node main.js
```

Apri il browser su: http://localhost:3000
