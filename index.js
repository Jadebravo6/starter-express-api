const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');
const mkdirp = require('mkdirp');


const likesFilePath = path.join(__dirname, 'likes.json');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, 'public', 'userpics'));
    },
    filename: function (req, file, cb) {
      const userId = uuidv4();
      cb(null, `${file.originalname}`);
    },
  }),
});

const dataFilePath = path.join(__dirname, 'data.json');



// ...

// Route pour obtenir les données de l'utilisateur connecté
app.get('/api/userdata', (req, res) => {
  const userId = req.cookies.userId;

  fs.readFile(dataFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier de données :', err);
      res.status(500).send('Erreur lors de la récupération des données de l\'utilisateur.');
      return;
    }

    const users = JSON.parse(data);
    const user = users.find((u) => u.id === userId);

    if (!user) {
      console.error('Utilisateur non trouvé');
      res.status(404).send('Utilisateur non trouvé.');
      return;
    }

    // Mettez à jour le chemin de la photo de profil avec le chemin complet
    user.profilePic = `/userpics/${user.profilePic}`;

    // Envoyer les données de l'utilisateur au client
    res.json(user);
  });
});








// Nouvelle route pour obtenir toutes les données des livres
app.get('/api/allbookdata', (req, res) => {
  // Lisez le fichier "book.json" pour obtenir la liste de tous les livres
  const bookFilePath = path.join(__dirname, 'books', 'book.json');
  fs.readFile(bookFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier book.json :', err);
      res.status(500).send('Erreur lors de la récupération des données de livres.');
      return;
    }

    const allBooks = JSON.parse(data);

    res.json(allBooks);
  });
});






app.post('/api/upload-profile-pic', upload.single('newProfilePic'), (req, res) => {
  const newProfilePic = req.file;

  // Vous pouvez maintenant traiter le fichier téléchargé (par exemple, le sauvegarder sur le serveur).
  // Assurez-vous que le chemin de destination est correct.

  const newProfilePicPath = path.join(__dirname, 'public', 'userpics', newProfilePic.filename);

  // Renommez le fichier si nécessaire et déplacez-le vers le bon emplacement.
  // Assurez-vous également de mettre à jour le nom du fichier dans les données de l'utilisateur.

  // Enfin, renvoyez une réponse JSON avec le nouveau nom de fichier si tout s'est bien passé.
  res.json({ newFileName: newProfilePic.filename });
});




app.post('/register', upload.single('profilePic'), (req, res) => {
  const { email, password, confirmPassword, username } = req.body;
  const profilePic = req.file;

  // Vérification des données d'inscription (à personnaliser)

  // Utilisez decodeURIComponent pour décoder correctement le nom du fichier
  const decodedFileName = decodeURIComponent(profilePic ? profilePic.originalname : '');

  const user = {
    id: uuidv4(),
    email,
    password, // Stockage en texte brut (non recommandé en production)
    username,
    profilePic: decodedFileName || null,
    // Utilisez le nom d'origine du fichier si une photo de profil est téléchargée
  };

  fs.readFile(dataFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier de données :', err);
      res.status(500).send('Erreur lors de l\'inscription.');
      return;
    }

    const users = JSON.parse(data);
    users.push(user);

    fs.writeFile(dataFilePath, JSON.stringify(users), (err) => {
      if (err) {
        console.error('Erreur lors de l\'écriture du fichier de données :', err);
        res.status(500).send('Erreur lors de l\'inscription.');
        return;
      }

      // Stockez les données de l'utilisateur dans le localStorage du navigateur
      const userData = {
        id: user.id,
        email,
        username,
        // Autres données que vous souhaitez stocker
      };

      res.cookie('isLoggedIn', 'true');
      res.cookie('userId', user.id);
      res.cookie('userData', JSON.stringify(userData)); // Stocke les données utilisateur dans un cookie
      res.redirect('/profile.html');
    });
  });
});



// Gestion de la déconnexion
app.post('/logout', (req, res) => {
  // Supprimez les cookies d'authentification ici
  res.clearCookie('isLoggedIn');
  res.clearCookie('userId');
  res.clearCookie('userData');
  res.redirect('/index.html'); // Rediriger vers la page d'accueil après la déconnexion
});

// Route pour la connexion de l'utilisateur
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Charger les données des utilisateurs depuis le fichier data.json
  fs.readFile(dataFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier de données :', err);
      res.status(500).send('Erreur lors de la connexion.');
      return;
    }

    const users = JSON.parse(data);

    // Recherche de l'utilisateur par adresse e-mail
    const user = users.find((u) => u.email === email);

    if (!user) {
      console.error('Utilisateur non trouvé');
      res.status(401).send('Adresse e-mail ou mot de passe incorrect.');
      return;
    }

    // Vérification du mot de passe (à personnaliser, cela suppose un stockage de mot de passe sécurisé)
    if (user.password !== password) {
      console.error('Mot de passe incorrect');
      res.status(401).send('Adresse e-mail ou mot de passe incorrect.');
      return;
    }

    // Stockez les données de l'utilisateur dans le localStorage du navigateur
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      // Autres données que vous souhaitez stocker
    };

    res.cookie('isLoggedIn', 'true');
    res.cookie('userId', user.id);
    res.cookie('userData', JSON.stringify(userData)); // Stocke les données utilisateur dans un cookie

    // Rediriger vers la page de profil
    res.redirect('/profile.html');
  });
});







// Dossier contenant les livres
// Spécifiez le dossier contenant les images des livres (avec le dossier "public")
const livresPath = path.join(__dirname, 'public', 'pdf');


// Route pour obtenir une page du livre
app.get('/livre/:id/:page', (req, res) => {
    const id = req.params.id;
    const page = req.params.page;

    // Construisez le chemin du dossier du livre
    const livrePath = path.join(livresPath, id);

    // Utilisez fs pour rechercher tous les fichiers dans le dossier du livre
    fs.readdir(livrePath, (err, files) => {
        if (err) {
            // Gérez les erreurs ici
            console.error(err);
            res.status(500).send('Erreur serveur interne');
            return;
        }

        // Recherchez le fichier d'image correspondant à la page demandée (quel que soit l'extension)
        const imageFile = files.find(file => file.startsWith(`pg${page}`));

        if (!imageFile) {
            // Si aucune image correspondante n'est trouvée, renvoyez une erreur 404
            res.status(404).send('Page non trouvée');
            return;
        }

        // Construisez le chemin complet de l'image avec l'extension trouvée
        const imagePath = path.join(livrePath, imageFile);

        // Récupérez l'extension de l'image depuis le nom de fichier
        const imageExtension = path.extname(imageFile).slice(1); // Enlève le point initial

        // Renvoyez l'image au client avec le bon type de contenu en fonction de l'extension
        res.sendFile(imagePath, {
            headers: {
                'Content-Type': `image/${imageExtension}`,
            },
        });
    });
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const uploads = multer({ storage: storage });

app.post('/api/publish', uploads.fields([{ name: 'pages' }, { name: 'coverImage' }]), async (req, res) => {
  const userId = req.cookies.userId;
  const { title, author, tags, category, description } = req.body;
  const pagesFiles = req.files.pages;
  const coverImageFile = req.files.coverImage;

  try {
    // Créez un ID unique pour le livre
    const bookId = uuidv4();

    // Comptez le nombre de pages
    const numberOfPages = pagesFiles.length;

    // Créez un dossier au nom de l'ID du livre à l'intérieur du dossier "pdf"
    const bookFolderPath = path.join(__dirname, 'public', 'pdf', bookId);
    mkdirp.sync(bookFolderPath);

    // Parcourez chaque fichier image de page et enregistrez-le avec le nom "pgX" où X est l'index + 1
    pagesFiles.forEach((pageFile, index) => {
      const pageExtension = path.extname(pageFile.originalname).toLowerCase();
      const pageName = `pg${index + 1}${pageExtension}`;
      const pagePath = path.join(bookFolderPath, pageName);
      fs.writeFileSync(pagePath, pageFile.buffer);
    });

   // Enregistrez l'image de couverture dans un dossier "cover" avec le nom de l'ID du livre
   const coverImageExtension = path.extname(coverImageFile[0].originalname).toLowerCase();
   const coverImageName = `${bookId}${coverImageExtension}`;
   const coverImagePath = path.join(__dirname, 'public', 'cover', coverImageName);
   fs.writeFileSync(coverImagePath, coverImageFile[0].buffer);

    // Enregistrez les informations du livre dans un fichier JSON au nom de l'ID du livre
    const bookCommentsFilePath = path.join(__dirname, 'public', 'comments', `${bookId}.json`);
    if (!fs.existsSync(bookCommentsFilePath)) {
      fs.writeFileSync(bookCommentsFilePath, JSON.stringify([]));
    }

    // Enregistrez les informations du livre dans un fichier JSON "book.json"
    const bookData = {
      id: bookId,
      title,
      author,
      tags: tags.split(',').map(tag => tag.trim()),
      category,
      description,
      userId,
      likes: 0,
      commentsFilePath: `/comments/${bookId}.json`,
      coverImage: `/cover/${coverImageName}`, // Utilisez le nouveau nom de couverture
      numberOfPages: numberOfPages,
    };

    const bookFilePath = path.join(__dirname, 'books', 'book.json');
    fs.readFile(bookFilePath, (err, data) => {
      if (err) {
        console.error('Erreur lors de la lecture du fichier book.json :', err);
        res.status(500).send('Erreur lors de la publication du livre.');
        return;
      }

      let books = JSON.parse(data);
      books.push(bookData);

      fs.writeFile(bookFilePath, JSON.stringify(books), (err) => {
        if (err) {
          console.error('Erreur lors de l\'écriture du fichier book.json :', err);
          res.status(500).send('Erreur lors de la publication du livre.');
          return;
        }

        res.json({ message: 'Livre publié avec succès !' });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur lors de la publication du livre.');
  }
});






// ...


// ...
// Nouvelle route pour obtenir le nom du fichier PDF en fonction de l'ID du livre
app.get('/api/userbooks/pdf/:bookId', (req, res) => {


  const userId = req.cookies.userId;
  const bookId = req.params.bookId;

  // Lisez le fichier "book.json" pour obtenir la liste de tous les livres
  const bookFilePath = path.join(__dirname, 'books', 'book.json');
  fs.readFile(bookFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier book.json :', err);
      res.status(500).send('Erreur lors de la récupération des livres.');
      return;
    }

    const allBooks = JSON.parse(data);

    // Recherchez le livre spécifique par ID
    const userBook = allBooks.find((book) => book.userId === userId && book.id === bookId);

    if (!userBook) {
      console.error('Livre non trouvé');
      res.status(404).send('Livre non trouvé.');
      return;
    }

    // Obtenez le nom du fichier PDF du livre
    const pdfFileName = `${userBook.id}.pdf`;

    // Envoyez le nom du fichier PDF au client
    res.send(pdfFileName);
  });
});

// ...


// Route pour obtenir les livres de l'auteur connecté avec les photos et les PDF
app.get('/api/userbooks', (req, res) => {
  const userId = req.cookies.userId;

  // Lisez le fichier "book.json" pour obtenir la liste de tous les livres
  const bookFilePath = path.join(__dirname, 'books', 'book.json');
  fs.readFile(bookFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier book.json :', err);
      res.status(500).send('Erreur lors de la récupération des livres.');
      return;
    }

    const allBooks = JSON.parse(data);

    // Filtrer les livres pour ne récupérer que ceux de l'auteur connecté
    const userBooks = allBooks.filter((book) => book.userId === userId);

    // Mettez à jour le chemin du PDF pour chaque livre
    const userBooksWithPdfPath = userBooks.map((book) => ({
      ...book,
      pdfPath: `/api/userbooks/pdf/${book.id}`, // Utilisez la nouvelle route pour obtenir le PDF
    }));

    res.json(userBooksWithPdfPath);
  });
});




// Ajoutez cette nouvelle route pour obtenir toutes les données des livres
app.get('/api/allbookdata', (req, res) => {
  // Lisez le fichier "book.json" pour obtenir la liste de tous les livres
  const bookFilePath = path.join(__dirname, 'books', 'book.json');
  fs.readFile(bookFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier book.json :', err);
      res.status(500).send('Erreur lors de la récupération des données de livres.');
      return;
    }

    const allBooks = JSON.parse(data);

    res.json(allBooks);
  });
});





app.get('/api/likesfilepath', (req, res) => {
  const likesFilePath = path.join(__dirname, 'likes.json'); // Chemin vers votre fichier likes.json
  res.json({ likesFilePath });
});





// Route pour gérer les likes
app.post('/api/likebook/:bookId', (req, res) => {
  const bookId = req.params.bookId;
  const userId = req.cookies.userId; // Récupérez l'ID de l'utilisateur connecté depuis les cookies

  // Vérifiez si l'utilisateur est connecté
  if (!userId) {
    res.status(401).json({ success: false, error: 'Vous devez être connecté pour aimer un livre.' });
    return;
  }

  // Lire les données de likes depuis likes.json
  fs.readFile(likesFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier likes.json :', err);
      res.status(500).json({ success: false, error: 'Erreur lors de la gestion du like.' });
      return;
    }

    const likes = JSON.parse(data);

    // Vérifier si l'utilisateur a déjà aimé ce livre
    const existingLikeIndex = likes.findIndex((like) => like.bookId === bookId && like.userId === userId);

    if (existingLikeIndex !== -1) {
      // Si l'utilisateur a déjà aimé ce livre, supprimez le like
      likes.splice(existingLikeIndex, 1);
    } else {
      // Sinon, ajoutez un nouveau like
      likes.push({ bookId, userId });
    }

    // Enregistrez les likes mis à jour dans le fichier likes.json
    fs.writeFile(likesFilePath, JSON.stringify(likes), (err) => {
      if (err) {
        console.error('Erreur lors de l\'écriture du fichier likes.json :', err);
        res.status(500).json({ success: false, error: 'Erreur lors de la gestion du like.' });
        return;
      }

      // Mettez à jour le fichier book.json pour refléter le nombre de likes pour ce livre
      const bookFilePath = path.join(__dirname, 'books', 'book.json');
      fs.readFile(bookFilePath, (err, bookData) => {
        if (err) {
          console.error('Erreur lors de la lecture du fichier book.json :', err);
          res.status(500).json({ success: false, error: 'Erreur lors de la gestion du like.' });
          return;
        }

        let books = JSON.parse(bookData);

        // Trouvez le livre spécifique par ID
        const bookToUpdate = books.find((book) => book.id === bookId);

        if (!bookToUpdate) {
          console.error('Livre non trouvé');
          res.status(404).json({ success: false, error: 'Livre non trouvé.' });
          return;
        }

        // Mettez à jour le nombre de likes pour ce livre
        bookToUpdate.likes = likes.filter((like) => like.bookId === bookId).length;

        // Écrivez la liste mise à jour dans le fichier book.json
        fs.writeFile(bookFilePath, JSON.stringify(books), (err) => {
          if (err) {
            console.error('Erreur lors de l\'écriture du fichier book.json :', err);
            res.status(500).json({ success: false, error: 'Erreur lors de la gestion du like.' });
            return;
          }

          res.json({ success: true, likes: bookToUpdate.likes });
        });
      });
    });
  });
});



// ...
// Nouvelle route pour obtenir les likes de l'utilisateur connecté
app.get('/api/userlikes', (req, res) => {
  const userId = req.cookies.userId;

  // Lire les données de likes depuis likes.json
  fs.readFile(likesFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier likes.json :', err);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des likes de l\'utilisateur.' });
      return;
    }

    const likes = JSON.parse(data);

    // Filtrer les likes pour ne récupérer que ceux de l'utilisateur connecté
    const userLikes = likes.filter((like) => like.userId === userId);

    // Envoyer les likes de l'utilisateur au client
    const likedBookIds = userLikes.map((like) => like.bookId);
    res.json({ likedBookIds });
  });
});








// Route pour ajouter un commentaire à un livre
app.post('/api/addcomment/:bookId', (req, res) => {
  const bookId = req.params.bookId;
  const userId = req.cookies.userId; // Récupérez l'ID de l'utilisateur connecté depuis les cookies
  const { message } = req.body; // Assurez-vous que le champ du message est correctement nommé

  // Créez un objet commentaire avec l'ID de l'utilisateur, le message et l'horodatage actuel
  const newComment = {
    userId,
    message,
    timestamp: new Date().toISOString(),
  };

  // Lisez le fichier JSON de commentaires du livre
  const bookCommentsFilePath = path.join(__dirname, 'public', 'comments', `${bookId}.json`);
  fs.readFile(bookCommentsFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier de commentaires :', err);
      res.status(500).json({ success: false, error: 'Erreur lors de l\'ajout du commentaire.' });
      return;
    }

    let comments = JSON.parse(data);

    // Ajoutez le nouveau commentaire à la liste existante
    comments.push(newComment);

    // Écrivez la liste mise à jour dans le fichier de commentaires
    fs.writeFile(bookCommentsFilePath, JSON.stringify(comments), (err) => {
      if (err) {
        console.error('Erreur lors de l\'écriture du fichier de commentaires :', err);
        res.status(500).json({ success: false, error: 'Erreur lors de l\'ajout du commentaire.' });
        return;
      }

      res.json({ success: true, message: 'Commentaire ajouté avec succès !' });
    });
  });
});


// ...

// Nouvelle route pour obtenir les noms d'utilisateur de tous les utilisateurs
app.get('/api/allusernames', (req, res) => {
  fs.readFile(dataFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier de données :', err);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des noms d\'utilisateur.' });
      return;
    }

    const users = JSON.parse(data);
    const usernames = users.map((user) => ({
      id: user.id,
      username: user.username,
    }));

    res.json(usernames);
  });
});




app.get('/api/comments/:bookId', (req, res) => {
  const bookId = req.params.bookId;
  const bookCommentsFilePath = path.join(__dirname, 'public', 'comments', `${bookId}.json`);

  fs.readFile(bookCommentsFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier de commentaires :', err);
      res.status(500).json({ success: false, error: 'Erreur lors de la récupération des commentaires.' });
      return;
    }

    const comments = JSON.parse(data);
    res.json(comments);
  });
});



// Définissez votre route pour servir les photos de profil
app.get('/api/userprofilepic/:userId', (req, res) => {
  const userId = req.params.userId;

  fs.readFile(dataFilePath, (err, data) => {
    if (err) {
      console.error('Erreur lors de la lecture du fichier de données :', err);
      res.status(500).send('Erreur lors de la récupération des données de l\'utilisateur.');
      return;
    }

    const users = JSON.parse(data);
    const user = users.find((u) => u.id === userId);

    if (!user) {
      console.error('Utilisateur non trouvé');
      res.status(404).send('Utilisateur non trouvé.');
      return;
    }

    // Construisez le chemin de la photo de profil de l'utilisateur
    const profilePicPath = path.join(__dirname, 'public', 'userpics', user.profilePic);

    // Envoyez la photo de profil en réponse
    res.sendFile(profilePicPath);
  });
});
app.post('/api/upload-profile-pic', upload.single('newProfilePic'), async (req, res) => {
  try {
    const newProfilePic = req.file;

    if (!newProfilePic) {
      return res.status(400).json({ error: 'Aucun fichier sélectionné' });
    }

    const userId = req.cookies.userId; // Vous devez avoir un cookie d'authentification ici
    const newFileName = `${userId}-profile-pic${path.extname(newProfilePic.originalname)}`;
    const newProfilePicPath = path.join(__dirname, 'public', 'userpics', newFileName);

    // Déplacez le fichier vers le bon emplacement
    fs.renameSync(newProfilePic.path, newProfilePicPath);

    // Chargez le fichier data.json
    const userDataFilePath = path.join(__dirname, 'data.json');
    let userData = require(userDataFilePath);

    // Recherchez l'index de l'utilisateur correspondant dans les données en utilisant son ID
    const userIndex = userData.findIndex(user => user.id === userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Mettez à jour le nom de la photo de profil pour l'utilisateur
    userData[userIndex].profilePic = `userpics/${newFileName}`;

    // Écrivez les données mises à jour dans le fichier data.json
    fs.writeFileSync(userDataFilePath, JSON.stringify(userData, null, 2));

    // Renvoyez une réponse JSON indiquant que la photo de profil a été mise à jour
    res.json({ message: 'La photo de profil a été mise à jour avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur est survenue lors du traitement du fichier' });
  }
});




app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur le port ${port}`);
});
