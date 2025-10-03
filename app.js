const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(console.error);
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();


const app = express();
const prisma = new PrismaClient();

app.use(cors());

// Configure helmet with custom CSP to allow external images and inline scripts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:", "http:"],
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));

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
    store: new RedisStore({ client: redisClient }),
}));

// Middleware to start game if not started
app.use((req, res, next) => {
  if (!req.session.game) {
    req.session.game = { startTime: Date.now(), found: [], imageId: null };
  }
  next();
});

const isProduction = process.env.NODE_ENV === 'production';

// Error handling: Less detail in prod
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json(isProduction ? { error: 'Internal server error' } : { error: err.message });
});

// Logging: Verbose in dev
if (!isProduction) {
  app.use(require('morgan')('dev')); 
}

// Debug routes: Disable in prod
if (!isProduction) {
  app.get('/debug/characters', async (req, res) => { /* ... */ });
}

// Prisma: Less logging in prod
const prisma = new PrismaClient({
  log: isProduction ? ['error'] : ['query', 'info', 'warn', 'error'],
});

// Routes
app.get('/', async (req, res) => {
  if (!req.session.game || !req.session.game.imageId) {
    return res.redirect('/images');
  }
  const image = await prisma.image.findUnique({ where: { id: req.session.game.imageId } });
  const characters = await prisma.character.findMany({
    where: { imageId: image.id },
    select: { id: true, name: true, imageUrl: true }  // Ensure imageUrl here
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
            return res.json({ success: true, allFound: true, time, position: { x: char.x, y: char.y } });
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
    // Get imageId from query parameter or session
    let imageId = req.query.imageId ? parseInt(req.query.imageId) : req.session.game?.imageId;
    
    // If no imageId, get the first image's scores
    if (!imageId) {
        const firstImage = await prisma.image.findFirst();
        imageId = firstImage?.id;
    }
    
    if (!imageId) {
        return res.json({ scores: [], imageName: 'No levels available' });
    }
    
    const scores = await prisma.highScore.findMany({
        where: { imageId: imageId },
        orderBy: { time: 'asc' },
        take: 10,
    });
    const image = await prisma.image.findUnique({ 
        where: { id: imageId },
        select: { name: true }
    });
    res.json({ scores, imageName: image?.name });
});

// DEBUG: Get character positions for current image
app.get('/debug/characters', async (req, res) => {
  const imageId = req.session.game?.imageId;
  if (!imageId) {
    return res.json([]);
  }
  const characters = await prisma.character.findMany({
    where: { imageId: imageId },
    select: { id: true, name: true, x: true, y: true, imageUrl: true }  // Add imageUrl
  });
  res.json(characters);
});

app.get('/highscores', async (req, res) => {
    // Allow viewing highscores even without an active game
    // Just redirect to images if no game has ever been played
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

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
})

module.exports = app; // For testing