/*In seguito sono richieste la funzione per l'inizializzazione del db, registrazione utente e autenticazione.Il server è stato creato con express. Avviato il server è possibile dal browser richiamare la prima pagina da http:localhost:3000/ .
la libreria path è utilizzata per indirizzare su alcune richieste il server alla directory pubblico, questo perchè il template engine per l'invio di pagine .ejs lo prevedeva.
la libreria cookie-session è stata utilizzata per i cookie di sessione da inviare all'utente una volta autentificato o dopo l'avvenuta registrazione.*/ 

const inizializzazioneDB = require('./database/initDB.js');
const {regUt, autenticazioneUt, aggiungi_album, aggiungi_foto, cambia_copertina, verifica_pass, cambia_pass, albumXut, fotoXalb, cancella_foto, cancella_album, nome_fXid, elimina_ut} = require('./database/funcDB.js');
const express = require ('express');
const app = express();
const port = 3000;
const path = require('path');
const fs = require('fs');
const cookieSession = require('cookie-session');
const {v4 : uuidv4} = require('uuid');



/*multer è utulizzato per le req del client che hanno file (foto), si per la lettura dei file in ingresso e sia per la memorizzazione del file in una directory si utilizza multer. Le successive righe di codice inizializzano e configurano il multer per la memorizzazione nella directory storage. Inoltre viene utilizzato un uuid V4 per la codifica del nome del file e viene aggiunta l'estenzione.  */

const multer = require('multer');
const storage = multer.diskStorage({
    destination : (req,file,cb)=>{
        cb(null, path.join(__dirname,'storage'));
    },
    filename : (req, file, cb)=>{
        const estensione = path.extname(file.originalname);
        cb(null, uuidv4()+estensione);
    }})

//const temp = multer.memoryStorage() per la memorizzazione del file in memoria
//const visual_req = multer({temp}) per la visualizzazione dei dati delle foto memorizzati in memoria con temp.
const upload = multer({storage})


async function avviaServer(){
    try {const db = await inizializzazioneDB(); //inizializzazione del database
        if (db){
            console.log('Database Pronto');
        } else {
            console.log('Errore sul database');
        }

        /*le funzioni utilizzate qui di seguito servono per fornire ad express gli strumenti per comprendere meglio le request dal client e fornire le adeguate risposte.*/

        app.use(express.static(path.join(__dirname, 'storage')));
        app.use(express.static(path.join(__dirname, 'pubblico'))); //per l'invio di pagine statiche .html
        app.set('views', path.join(__dirname, 'pubblico')); //indica a express dove trovare le views
        app.set('view engine', 'ejs'); // template engine
        /*permette di convertire i dati ricevuti all'interno di un req in un oggetto js e utilizzare il req.body per l'utilizzo di questi dati*/ 
        app.use(express.urlencoded({ extended: true })); 
        /*codifica il cookie da inviare al client tramite le keys che possono essere qualsiasi stringa. ha un età che se scaduta invalida il cookie.*/
        app.use(cookieSession({
            name: 'session',
            keys: ['unaStringaCasualeLunga123!', 'unaStringaCasualeLunga456!'],
            httpOnly: true,
            maxAge: 120*60*1000
        }))
        
        /*questa è la prima richiesta del cliente, viene inviata la pagina login.ejs presente nella cartella pubblico, viene inviato lo stato http 200, la pagina e un messaggio di errore vuoto, questo perchè nella pagina è previsto un messaggio d'errore in caso di autorizzazione negata.*/
        app.get('/', (req, res) => {
            res.status(200).render('login', {errore : ''});
        })

        /*nella pagina di login è presente un tasto che richiede la pagina per la registrazione*/ 

        app.get('/registrazione', (req,res) => {
            res.status(200).render('registrazione', {errore: ''});
        })

        /* quando l'utente inserisce i dati per l'accesso e clicca sul bottone "accedi invia una req con metodo post al server, il server con questa funzione cattura i dati parsati in un oggetto js da express.urlencode e e verifica l'identità dell'utente. in caso positivo invia la pagina dashboard.html con un codice http 200 oppure un messaggio d'errore che modificherà la pagina." */

        app.post('/accedi', async(req,res) =>{
            const {email, password} = req.body;
            const ritorno = await autenticazioneUt(email,password);
            
            if(ritorno.risposta){
                req.session.id_utente = ritorno.id;
                res.status(200).sendFile(path.join(__dirname,'pubblico/dashboard.html'));
            } else {
                res.status(401).render('login', {errore: 'Credenziali Errate!'});
            }
        })

        /* anche in questo caso il server riceverà i dati del form per la registrazione, e provvederà a registrare l'utente. in caso di registrazione avvenuta, sarà invita la pagina dashboard.html altrimenti saranno ricevuti i messaggi d'errore.*/

        app.post('/registrazione', async(req, res)=>{
            const {Nome, Cognome, Email, Password} = req.body;
            const errore = await regUt(Nome, Cognome, Email, Password);
            if (errore.risposta == ''){
                req.session.id_utente = errore.id;
                res.status(200).sendFile(path.join(__dirname,'pubblico/dashboard.html'));
                
            } else {
                res.status(401).render('registrazione', {errore : errore});
            }
        })

        /*in tutte le pagine inivate dal server dopo l'autenticazione sono previsti dei bottoni, uno per la dashboard, uno per gli album e uno per il profilo. Queste 3 righe alla richiesta inviano le pagine corrette.
        la funzione auth è il middleware del server e cioè controlla l'autenticità dei cookie prima di inviare le pagine.*/

        app.get('/dashboard', auth, (req,res) =>{
            res.status(200).sendFile(path.join(__dirname,'pubblico/dashboard.html'));
        })

        app.get('/album',auth, async(req,res)=>{
            res.status(200).render('album');
        })

        app.get('/profilo', auth, (req,res)=>{
            res.status(200).render('profilo', {risposta:''});
        })

        /*La barra di ricerca presente nella dashboard permette di spostare la visuale della mappa ricercando un indirizzo. Ciò avviene perchè nella richiesta è presente la stringa (stato). con la funzione cerca(stato) definita in seguito vengono trovate latitudine e longitudine e inviate come risposta. la pagina html si occupera di modificare la visuale della mappa. */ 

        app.get('/cerca/:stato',auth , async(req,res)=>{
            const stato = req.params.stato;   //la funzione cerca(stato) è stata modificata, adesso effettua ricerche anche di città
            const risp = await cerca(stato); //per non modificare il codice il parametro è rimasto "stato".
            req.params = risp;
            res.send(req.params)
            
        })

        /*il logout distrugge il cookie di sessione e rimanda alla pagina del login*/ 

        app.get('/logout', auth, (req,res)=>{
            req.session = null;
            res.status(200).render('login', {errore:''});
        })

        /*Invia la pagina ejs per creare un album*/ 

        app.get('/crea_a', auth, (req,res)=>{
            res.status(200).sendFile(path.join(__dirname,'pubblico/crea_a.html'));
        })

        /* Carica le foto, che l'utente invia quando crea un album e crea un album, nel server, il middleware upload.array('foto') salva le foto nella directory prima di passare il controllo alla funzione principale per la registrazione dell'album e delle foto nel DB*/

        app.post('/carica', auth, upload.array('foto'), async (req, res) => {
            
            let ft_cop; //questa variabile dopo il ciclo for conterrà il nome della foto di copertina dopo l'uuidv4
            const id_ut = req.session.id_utente;
            const città = req.body.citta;
            const risp= await cerca(città);
            const alb = await aggiungi_album(id_ut, città, risp.lat, risp.lon);
            
            for (var i = 0; i < req.files.length; i++){
                await aggiungi_foto(id_ut, alb, req.files[i].filename);
                if (req.body.foto_copertina === req.files[i].originalname){
                    ft_cop = req.files[i].filename;
                }

            }

            const ok = await cambia_copertina(ft_cop,alb);
            if (ok){
                res.status(200).send('ok');
            }

            risposta = false;

           
        })

        /*Riceve password da cambiare dal client verifica la correttezza con quella inserita nel DB e in caso positivo cambia la password con la nuova nel DB*/


        app.post('/cambia_p', auth, async(req,res)=>{
            const id = req.session.id_utente;
            const {vecchia_password, nuova_pass} = req.body;
            const pass = await verifica_pass(id, vecchia_password);
            if (pass){
                risp = await cambia_pass(id, nuova_pass);
                if(risp){
                    res.status(200).render('profilo', {risposta: 'La password è stata cambiata correttamente!'});
                } else {
                    res.status(500).render('profilo', {risposta:'Errore interno del Server!'});
                }
            } else {
                res.status(401).render('profilo', {risposta:'La password inserita non è corretta!'});
            }

        })

        /*Ricerca e restituisce tutti gli album di un utente tramite il suo id. E utilizzato sia nella dashbord per la visualizzazione dei marker nel punto giusto e sia nella pagina degli album per la creazione dinamica della pagina. */ 

        app.get('/albumUtente', auth, async(req,res)=>{
            try {
                const id_ut = req.session.id_utente;
                const lista_album = await albumXut(id_ut);
                res.status(200).json(lista_album);
            } catch (err){
                res.status(500).send('Errore interno del server!')
            }
        })

        /*Restituisce la pafina foto e nell'url è presente anche l'id dell'album, così la pagina può richiedere tutte le foto per un album e mostrarle dinamicamente*/ 

        app.get('/foto/:id', auth, (req,res)=>{
            res.status(200).sendFile(path.join(__dirname, 'pubblico/foto.html'));
        })

        /*Invia il json con le foto di un Album dal suo ID.*/

        app.get('/fotoAlbum/:id_a', auth, async(req,res)=>{
            try{
                const id = req.params.id_a;
                const foto = await fotoXalb(id);
                res.status(200).json(foto);
            } catch (err) {
                res.status(500).send('Errore interno del server!');
            }


        })

        /*Invia la pagina per cambiare la copertina dell'album*/

        app.get('/cambia_cop/:id', auth, (req,res)=>{
            res.status(200).render('cambia_cop', {risposta: false});
        })

        /*Cambia la copertina dell'album*/

        app.post('/cambia_copertina', auth, async(req,res)=>{
            const{id_album, foto_copertina} = req.body;
            const risp = await cambia_copertina(foto_copertina, id_album);
            if(risp){
                res.status(200).render('cambia_cop', {risposta: true});
            } else {
                res.status(500).send('Errore interno del server!');
            }
        })

        /*Elimina tutte le foto sia dalla memoria che dal database che hanno come id_Album l'id inviato dal client come parametro e successivamente cancella l'album dal DB.*/

        app.delete('/elimina_album/:id', auth, async(req,res)=>{
            const id_album = req.params.id;
            const foto = await fotoXalb(id_album);

            for(var i = 0; i<foto.length;i++){
                const prom = await cancella_foto(foto[i].id_foto);
                if(prom){
                    const percorso = path.join(__dirname,'storage', foto[i].nome_foto); 
                    await fs.promises.unlink(percorso);
                }
            }

            const risp = await cancella_album(id_album);
            if (risp){
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }
            
        })

        /*Invia la pagina per aggiungere foto ad un album*/

        app.get('/agg_f/:id', auth, (req,res)=>{
            res.status(200).render('aggiungi_foto', {risposta: ''});
        })

        /*Aggiunge le foto in un album memorizzandole sul DB e salvandole nella directory storage*/ 

        app.post('/aggiungi_foto', auth, upload.array('foto'), async(req,res)=>{
            const id_album = req.body.id_album;
            const id_ut = req.session.id_utente;
            const foto = req.files;


            for (var i = 0; i < req.files.length; i++){
                await aggiungi_foto(id_ut,id_album,foto[i].filename);
            }

            res.status(200).render('aggiungi_foto', {risposta: true});

        })

        /*Cancella le foto tramite l'id esia dalla memoria che dal DB*/

        app.delete('/cancella_foto', auth, async(req,res)=>{
            let id = req.query.id;
            if (!Array.isArray(id)) id = [id];
            for(var i = 0; i< id.length; i++){
                const nome = await nome_fXid(id[i]);
                const prom = await cancella_foto(id[i]);
                if(nome.risp){
                    if(prom){
                        const percorso = path.join(__dirname,'storage', nome.nome);  
                        await fs.promises.unlink(percorso);
                    } else {
                        return res.sendStatus(500);
                    }
                } else {
                    return res.sendStatus(500);
                }
            }
                
            res.sendStatus(200);

        })

        /*Questa funzione elimina tutti i dati dell'utente dal DB e tutte le foto inserite dall'utente dalla memoria.*/

        app.delete('/eliminaAcc', auth, async(req,res)=>{
            const id_utente = req.session.id_utente;
            const album = await albumXut(id_utente);
            for(var i = 0 ; i< album.length; i++){
                const id_al = album[i].id_Album;
                const foto = await fotoXalb(id_al);
                for(var j=0; j<foto.length; j++){
                    const prom = await cancella_foto(foto[j].id_foto);
                    if(prom){
                    const percorso = path.join(__dirname,'storage', foto[j].nome_foto);  
                    await fs.promises.unlink(percorso);
                }
                }

                await cancella_album(id_al);
            }

            const risultato = await elimina_ut(id_utente);
            if(risultato){
                res.sendStatus(200);
            } else {
                res.sendStatus(500);
            }


        })

        

        

        app.listen(port, ()=>{
            console.log(`Server in ascolto alla porta: ${port}`);
        })

        
        /*Questa funzione serve per il middleware e cioè verifica la validità del cookie prima di passare alla funzione in cui e stata richiamata, altrimenti invia la pagina di login con un messaggio d'errore.*/ 

        function auth(req,res, next){
            if (req.session.id_utente){
                next();
            } else {
                res.status(401).render('login', {errore: 'Cookie scaduto effettuare nuovamente il login!'})
            }
        }

    

        


        /* Funzione accessoria per richiedere ad un api esterna 'nominatim'(OpenStreetMap) la latitudine e la longitudine di uno stato immesso nel campo di ricerca. la richiesta viene fatta tramite metodo get e grazie alla funzione js fetch. La funzione ritorna un oggetto js con latitudine e longitudine come proprietà.*/ 
        async function cerca(città){
            let lat,lon;
            
            const risposta = await fetch(`http://nominatim.openstreetmap.org/search?q=${città}&format=json&limit=1`, { headers: { 'User-Agent': 'Mozilla/5.0 (Node.js) tuaemail@aaa.it' }});
            
            const arr = await risposta.json();
            
            //console.log(JSON.stringify(arr));
            lat = arr[0].lat;
            lon = arr[0].lon;
            
            return {lat: lat, lon:lon}
        }
    } catch (e){
        console.error(e);
    }
}

avviaServer();
