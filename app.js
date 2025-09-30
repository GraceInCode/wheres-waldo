const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();


const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(helmet())

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'))); // For CSS/JS
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session setup 
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

// Middleware to start game if not started
app.use((req, res, next) => {
    if (!req.session.game) {
        req.session.game = { startTime: Date.now(), found: [], imageId: 1 }; // Default imageId
    }
    next();
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json('Something broke!');
});

// Routes
app.get('/', async (req, res) => {
    if (!req.session.game || !req.session.game.imageId) {
        return res.redirect('/images');
    }
    const image = await prisma.image.findUnique({ where: { id: req.session.game.imageId } });
    const characters = await prisma.character.findMany({
        where: { imageId: image.id},
        select: { id: true, name: true }
    });
    res.render('index', { imageUrl: image.url, characters });
});

// API: Validate click
app.post('/validate', async (req, res) => {
    const { x, y, characterId } = req.body; // x, y normalized (0 to 1)
    const charId = parseInt(characterId);
    if (req.session.game.found.includes(charId)) {
        return res.json({ success: false, message: 'Already found' });
    }
    const char = await prisma.character.findUnique({ where: { id: parseInt(characterId) } });
    if (!char || char.imageId !== req.session.game.imageId) {
        return res.status(400).json({ success: false, message: 'Invalid character' });
    }

    const tolerance = 0.05; // 5% tolerance
    const isCorrect = Math.abs(x - char.x) <= tolerance && Math.abs(y - char.y) <= tolerance;

    if (isCorrect) {
        req.session.game.found.push(char.id);
        const allChars = await prisma.character.findMany({ where: { imageId: char.imageId } });
        if (req.session.game.found.length === allChars.length) {
            const time = (Date.now() - req.session.game.startTime) / 1000;
            return res.json({ success: true, allFound: true, time });
        }
        return res.json({ success: true, position: { x: char.x, y: char.y } }); // Send real position for marker
    }
    res.json({ success: false, message: 'Try again!' });
});

// API: Save score
app.post('/scores', async (req, res) => {
    const { name } = req.body;
    if (!req.session.game || !req.session.game.imageId) {
        return res.status(400).json({ error: 'No game in progress' });
    }
    const time = (Date.now() - req.session.game.startTime) / 1000; // Recalc to prevent hack
    await prisma.highScore.create({
        data: { name, time, imageId: req.session.game.imageId },
    });
    req.session.destroy(); // End game session
    res.json({ success: true });
});

// Get high scores (for display)
app.get('/scores', async (req, res) => {
    const imageId = req.session.game?.imageId || null; 
    if (!imageId) {
        return res.status(400).json({ error: 'No image selected' });
    }
    const scores = await prisma.highScore.findMany({
        where: { imageId: imageId },
        orderBy: { time: 'asc' },
        take: 10,
    });
    res.json(scores);
});

app.get('/highscores', (req, res) => {
    if (!req.session.game || !req.session.game.imageId) {
        return res.redirect('/images');
    }
    res.render('highscores');
})

// List images
app.get('/images', async (req, res) => {
    const images = await prisma.image.findMany({ select: { id: true, name: true } });
    res.render('images', { images });
});

// Start game with selected image
app.post('/start', (req, res) => {
    const { imageId } = req.body;
    req.session.game = {
        startTime: Date.now(),
        found: [],
        imageId: parseInt(imageId)
    };
    res.redirect('/');
})

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});