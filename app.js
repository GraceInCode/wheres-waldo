const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { start } = require('repl');
require('dotenv').config();


const app = express();
const prisma = new PrismaClient();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'))); // For CSS/JS
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

// Middleware to start game if not started
app.use((req, res, next) => {
    if (!req.session.game) {
        req.session.game = { startTime: Date.now(), found: [], ImageId: 1 }; // Default ImageId
    }
    next();
});

// Routes
app.get('/', async (req, res) => {
    const image = await prisma.image.findUnique({ where: { id: req.session.game.ImageId } });
    const characters = await prisma.character.findMany({
        where: { ImageId: image.id},
        select: { id: true, name: true }
    });
    res.render('index', { imageUrl: image.url, characters });
});

// API: Validate click
app.post('/validate', async (req, res) => {
    const { x, y, characterId } = req.body; // x, y normalized (0 to 1)
    const char = await prisma.character.findUnique({ where: { id: parseInt(characterId) } });
    if (!char || char.ImageId !== req.session.game.ImageId) {
        return res.status(400).json({ success: false, message: 'Invalid character' });
    }

    const tolerance = 0.05; // 5% tolerance
    const isCorrect = Math.abs(x - char.x) <= tolerance && Math.abs(y - char.y) <= tolerance;

    if (isCorrect && !req.session.game.found.includes(char.id)) {
        req.session.game.found.push(char.id);
        const allChars = await prisma.character.findMany({ where: { ImageId: char.ImageId } });
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
    const time = (Date.now() - req.session.game.startTime) / 1000; // Recalc to prevent hack
    await prisma.score.create({
        data: { name, time, ImageId: req.session.game.ImageId },
    });
    req.session.destroy(); // End game session
    res.json({ success: true });
});

// Get high scores (for display)
app.get('/scores', async (req, res) => {
    const scores = await prisma.highScore.findMany({
        where: { ImageId: req.session.game.ImageId },
        orderBy: { time: 'asc' },
        take: 10,
    });
    res.json(scores);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});