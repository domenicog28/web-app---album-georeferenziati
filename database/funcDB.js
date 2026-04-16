/* sono di seguito richieste le librerie installate tramite npm per l'uso di sqlite3, bcrypt per l'hash della password, il validator per verificare la validità dell'email e fs per la creazione della cartella utente.*/



const sqlite3 = require('sqlite3').verbose();
const { rejects } = require('assert');
const bcrypt = require('bcrypt');
const val = require('validator');
const fs = require('fs').promises;

/* registrazione utente nel database, se eventualmente l'email non fosse valida (questa eventualità nel server non può avvenire, perchè nella pagina html è presente l'input = 'email') o fosse già presente nel database la registrazione non va a buon fine. Inoltre la password viene memorizzata tramite hash della password realizzato con bcrypt. Se la registrazione è andata a buon fine, viene creata una cartella utente_(id_utente) per l'inserimento di un album. Eventuali errori vengono vengono tramite return inviati alla chiamata della funzione.*/


async function regUt(Nome, Cognome, Email, Password){
    
    if(!val.isEmail(Email)){
        return 'Email non valida!';
    }

    const esiste = await verificaEmail(Email);
    if (esiste){
        return 'Utente già registrato';
    }

    const pass = await hashP(Password);

    const registrazione = await registrazioneDB (Nome, Cognome, Email, pass);

    if (!registrazione){
        return 'Errore durante la registrazione';
    }
    
    const id_u = await cerc_id(Email);
  
    return {risposta:'' , id: id_u};

}


/*Verifica delle credenziali di accesso dell'utente tramite email e password. tramite una query sql sull'email dell'utente, viene restituita la password hashata da confrontare con l'hash di quella inviata dall'utente. in caso di uguaglianza il valore di ritorno e true e l'id utente, che servirà per creare il cookie per la sessione*/

async function autenticazioneUt(email, pass) {
    const passData = await new Promise ((resolve, reject) => {
        const db = new sqlite3.Database('./database/data.db');
        const query = "Select password_hash FROM utenti WHERE email = ?";
        db.get(query, email, (err,riga) => {
            if (err){
                db.close();
                return reject(err);
            } else {
                db.close();
                if (!riga){
                    resolve(false);
                } else {
                resolve(riga.password_hash);
                }
            }
        })
    })

    if (!passData){
        return false;
    }

    const accesso = await new Promise ((resolve, reject)=> {
        bcrypt.compare(pass, passData, (err, uguaglianza) => {
        if (err) {
            return reject(err);
        } else {
            resolve (uguaglianza);
        }
    })})

    if(accesso){
        const id_u = await cerc_id(email);
        return {risposta: true, id: id_u}
                
    } else {
        return false;
    }
    
}

/*Aggiunge un album nel DB e ha come variabili da inserire nel DB id_utente e città, la città sarà poi utilizzata per la ricerca delle coordinate nella dashbord e per mostrare il nome della città nella pag Album nel div dell'album.*/


async function aggiungi_album (id_utente, città, lat, lon){
    return new Promise ((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "INSERT INTO album (utente,città,lat,lon) values (?,?,?,?)";
            db.run(query, [id_utente, città, lat, lon], function (err){
                if(err){
                    db.close();
                    return reject(err);
                }
                const id_al = this.lastID;
                db.close();
                resolve (id_al);
            })
    })
}

/*Aggiunge una foto nel DB con id utente, id album e nome foto, il nome della foto è quello che viene assegnato con uuid prima della memorizzazione.*/ 

async function aggiungi_foto(id_ute, id_alb,nome_foto){
    return new Promise ((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "INSERT INTO foto (utente,album,nome_foto) values (?,?,?)";
            db.run(query, [id_ute, id_alb, nome_foto], (err)=>{
                if(err){
                    db.close();
                    return reject(err);
                }
                db.close();
                resolve(true);
            })
    })
}

/*Cambia l'immagine della copertina, riceve l'id dell'album e il nome con uuid della nuova foto della copertina, cambia il dato nella colonna nome_copertina.*/

async function cambia_copertina(foto_c, id_al){
    return new Promise ((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "UPDATE album SET nome_copertina = ? WHERE id_album = ?";
            db.run(query, [foto_c, id_al], (err)=>{
                if(err){
                    db.close();
                    return reject(err);
                }
                db.close();
                resolve(true);
            })
    })
}

//Funzione accessoria per verificare se l'email inserita non è già nel DB
function verificaEmail(email){
    return new Promise((resolve,reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "SELECT email FROM utenti WHERE email = ?";
        db.get(query, email, (err,riga) => {
            if (err) {
                db.close();
                return reject(err);
            }
            db.close();
            resolve (riga ? true : false);
        })
    })
}

//funzione accessoria per creare l'hash da una password
function hashP(pass){
        const salto = 10;
        return bcrypt.hash(pass, salto);
}

//funzione accessoria per cercare l'id utente per la creazione della cartella dell'utente appena registrato in storage

function cerc_id(email){
    return new Promise((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "SELECT id_Utente FROM utenti WHERE email = ?";
        
        db.get(query, email, (err, riga)=>{
            if(err){
                db.close();
                return reject(err);
            }
            db.close();
            resolve (riga.id_Utente);
        })
    })
}

/*funzione accessoria per la registrazione dell'utente nel database, questo tipo di funzione, essendo una funzione che accede al database, deve essere async.*/

async function registrazioneDB(Nome, Cognome, Email, Password) {
    return new Promise ((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const utente = "INSERT INTO utenti (nome, cognome, email, password_hash) values (?,?,?,?)";
            db.run(utente, [Nome,Cognome,Email,Password], (err) => {
                if (err) {
                    db.close()
                    return reject(err);
                }
                db.close();
                return resolve(true);  
                })

    })
}


/*Effettua la verifica della password, riceve la password in chiaro inserita dall'utente, ricerca l'hash memorizzato nel db e confronta questi dati tramite bycrypt.compare*/

async function verifica_pass(id_ut, pass){ 

    const pass_h = await new Promise((resolve,reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "SELECT password_hash FROM utenti WHERE id_Utente = ?";
        db.get(query, id_ut, (err,riga)=>{
            if(err){
                db.close();
                return reject(err);
            }
            db.close();
            resolve(riga.password_hash);
        })
    })

    return bcrypt.compare(pass,pass_h);
    
}

/*Cambia l'hash nel db con l'hash della nuova password*/

async function cambia_pass(id, pass_n){
    const pass_n_hash = await hashP(pass_n);
    return new Promise((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "UPDATE utenti SET password_hash = ? WHERE id_Utente = ?";
        db.run(query, [pass_n_hash,id ], (err)=>{
             if(err){
                db.close();
                return reject(err);
            }
            db.close();
            return resolve(true);

        })

    })
}

/*Ricerca gli album dalll'id dell'utente*/ 

function albumXut(id_ut){
    return new Promise((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "SELECT * FROM album WHERE utente = ?";
        db.all(query, id_ut, (err,album)=>{
            if(err){
                db.close();
                return reject(err);
            }
            db.close();
            return resolve(album);

        })
    })
}

/*Ricerca le foto dall'id dell'album*/

function fotoXalb(id_al){
    return new Promise((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "SELECT * FROM foto WHERE album = ?";
        db.all(query,id_al, (err,foto)=>{
            if(err){
                db.close();
                return reject(err);
            }
            db.close();
            return resolve(foto);
        })
    })
}

/*Cancella le foto dal DB tramite l'id della foto.*/ 

function cancella_foto(id){
    return new Promise((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "DELETE FROM foto WHERE id_foto = ?";
        db.run(query, id, (err)=>{
            if(err){
                db.close();
                return reject(err);
            }
            db.close();
            return resolve(true);
        })
    })
}

/*Cancella un album dal server dal suo id.*/

function cancella_album(id){
     return new Promise((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "DELETE FROM album WHERE id_Album = ?";
        db.run(query, id, (err)=>{
            if(err){
                db.close();
                return reject(err);
            }
            db.close();
            return resolve(true);
        })
    })
}

/*Ricerca sul DB il nome della foto dal suo id*/ 

function nome_fXid(id){
    return new Promise((resolve,reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "SELECT nome_foto FROM foto WHERE id_foto = ?";
        db.get(query, id, (err,nome)=>{
            if(err){
                db.close();
                return reject(err);
            }
            db.close();
            if(!nome){
                return resolve({risp:false, nome:null});
            }
            return resolve ({risp: true, nome: nome.nome_foto});
        })
    })
}

/*Elimina il record dell'utente dal suo id*/

function elimina_ut(id){
    return new Promise((resolve, reject)=>{
        const db = new sqlite3.Database('./database/data.db');
        const query = "DELETE FROM utenti WHERE id_Utente = ?";
        db.run(query, id, (err)=>{
            if(err){
                db.close();
                return reject(err);
            }
            db.close();
            return resolve(true);
        })
    })
}









module.exports = {regUt, autenticazioneUt, cerc_id, aggiungi_album, aggiungi_foto, cambia_copertina, verifica_pass, cambia_pass, albumXut, fotoXalb, cancella_foto, cancella_album, nome_fXid, elimina_ut};




