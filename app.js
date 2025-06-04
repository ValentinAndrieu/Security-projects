const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;
const path = require('path'); 

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'data')));



// Load the blocs.json file
let blocsData = require('./data/blocs.json');
let informationEcole = require('./data/informationEcole.json');


// connexion au base de donnée
const db = mysql.createConnection({
    host: 'localhost', // Changez cela selon votre configuration
    user: 'root',      // Changez avec votre utilisateur MySQL
    password: 'root',      // Ajoutez votre mot de passe MySQL
    database: 'questionnaire', // Assurez-vous d'avoir créé cette base de données
    port : 8001 // port de connexion
});

db.connect(err => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err); 
    } else {
        console.log('Connecté à la base de données MySQL');
        
    }
});



// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// enregistrer les réponses à partir du formulaire
app.post('/api/submit', (req, res) => {
    console.log(req.body);
    let idEtudiant;
    const formData = req.body;
    console.log('formData', formData);
   const universityId = formData.university.selectedEcole.id;
    const studentData = formData.student;

    const dateMobilite = studentData.date_mobilite.split('T')[0];

    // Insérer l'étudiant et récupérer son ID
    const studentQuery = "INSERT INTO etudiant (nom, prenom, email, semestre, departement, date_mobilite, duree_mobilite, id_universite) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    const studentValues = [studentData.nom, studentData.prenom, studentData.email, studentData.semestre, studentData.departement, dateMobilite, studentData.duree_mobilite, universityId];

    db.query(studentQuery, studentValues, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Erreur lors de l\'ajout de l\'étudiant');
        }
        console.log(result); 
        idEtudiant = result.insertId;    

        console.log('idEtudiant', idEtudiant);

        // enregistrer les réponses de fiche d'univesité
        const ficheUniversity = formData.fiche;
        insertReponse(ficheUniversity.ville, 1, idEtudiant, universityId);
        insertReponse(ficheUniversity.dateRatt, 5, idEtudiant, universityId);
        insertReponse(ficheUniversity.langue, 3, idEtudiant, universityId);
        insertReponse(ficheUniversity.langueEx, 7, idEtudiant, universityId);
        insertReponse(ficheUniversity.moyenne, 6, idEtudiant, universityId);
        insertReponse(ficheUniversity.residence, 4, idEtudiant, universityId);
        insertReponse(ficheUniversity.cadre, 2, idEtudiant, universityId);

        // enregistrer les autres réponses
        const blocs = formData.blocs;
        blocs.forEach(bloc => {
            const questions = bloc.questions;
            questions.forEach(question => {
                insertReponse(question.reponse, question.idQuestion, idEtudiant, universityId);
            });
        });

    });

    const blocs = formData.blocs;
    blocs.forEach(bloc => {
        const questions = bloc.questions;
        console.log('bloc', bloc);
        
    });

    
});


//envyouer les réponse de l'étduiant
app.get('/api/etudiant', async (req, res) => {
    try {
        const idUniversity = req.query.university;
        const selectedEcole = req.query.pays;

        if (!idUniversity) {
            return res.status(400).send('Veuillez choisir une université');
        }

        // Utiliser `map` au lieu de `forEach` pour gérer les promesses
        for (const bloc of blocsData) {
            for (const question of bloc.questions) {
                question.reponse = await getReponse(question.idQuestion, idUniversity);
            }
        }

        console.log('data', blocsData);
        res.json(blocsData); // Envoie la réponse au client

    } catch (error) {
        console.error("Erreur serveur :", error);
        res.status(500).send("Erreur lors de la récupération des réponses");
    }
});











// Fonctions pour insérer et récupérer les réponses

function insertReponse(reponse, idQuestion ,idEtudiant, idUniversity) {
    const reponseQuery = "INSERT INTO reponses (id_question, id_etudiant, id_universite, reponse) VALUES (?, ?, ?, ?)";
    const reponseValues = [idQuestion, idEtudiant, idUniversity, reponse];

    db.query(reponseQuery, reponseValues, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Erreur lors de l\'ajout de la réponse');
        }
        console.log(result); 
    });
}

function getReponse(idQuestion, idUniversity) {
    return new Promise((resolve, reject) => {
        const reponseQuery = "SELECT DISTINCT reponse FROM reponses WHERE id_question = ? AND id_universite = ?";
        db.query(reponseQuery, [idQuestion, idUniversity], (err, result) => {
            if (err) {
                console.error("Erreur SQL :", err);
                reject(err);  // Rejette l'erreur
            } else {
                const reponses = result.map(row => row.reponse);
                resolve(reponses);  // Renvoie les réponses une fois la requête terminée
            }
        });
    });
}


