const sqlite3 = require('sqlite3').verbose();
const fs = require("node:fs");
const path = require('path');


/* è stata creata la funzione async per l'inizializzazione del database all'avvio del server, solo nel caso questo non fosse già stato creato. Nella tabella album è inserita la colonna id_foto_copertina, che fa riferimento alla copertine dell'album. Non poteva essere creata al momento della definizione della tabella album, perchè ancora la tabella foto non era stata creata. la funzione db.serialize() permette la sincronicità delle funzioni al suo interno. Di base le varie funzioni sul database sono asincrone.*/ 


async function inizializzazioneDB(){
    return new Promise ((resolve, reject)=>{

        const path_cartella = path.join(__dirname, '../storage');

        const db = new sqlite3.Database('./database/data.db', (err)=>{
            if (err){
                return reject(err);
            }
        });
        
        try {
            if(!fs.existsSync(path_cartella)){
                fs.mkdirSync(path_cartella);
            }
        } catch (err) {
            console.error(err);
        }

    
    
    db.serialize(() => {

        db.run('PRAGMA foreign_keys = ON');

        db.run('CREATE TABLE IF NOT EXISTS utenti(id_Utente INTEGER PRIMARY KEY AUTOINCREMENT, nome VARCHAR(20), cognome VARCHAR(20), email VARCHAR(255), password_hash VARCHAR(255))');

        db.run('CREATE TABLE IF NOT EXISTS album(id_Album INTEGER PRIMARY KEY AUTOINCREMENT, utente INTEGER NOT NULL REFERENCES utenti(id_Utente), città VARCHAR(20), lat VARCHAR(255), lon VARCHAR(255), nome_copertina VARCHAR(255) DEFAULT NULL)');

        db.run('CREATE TABLE IF NOT EXISTS foto(id_foto INTEGER PRIMARY KEY AUTOINCREMENT, utente INTEGER NOT NULL REFERENCES utenti(id_Utente), album INTEGER NOT NULL REFERENCES album(id_Album), nome_foto VARCHAR(255))', (err)=>{
        if (err){
            db.close();
            reject(err);
        }
        db.close()
        resolve(true);

        })
        })
    })  
}

module.exports = inizializzazioneDB;


        
          
    

