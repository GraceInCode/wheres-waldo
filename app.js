const express = require('express');
const session = require('express-session');
const { RedisStore, RedisStore } = require('connect-redis').default;  // Fixed syntax for v7+
const { createClient } = require('redis');  // Use createClient
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';  // Moved up for reference

const app = express();

// Prisma with log config
const prisma = new PrismaClient({
  log: isProduction ? ['error'] : ['query', 'info', 'warn', 'error'],
});

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', err => console.log('Redis Client Error', err));
redisClient.connect().catch(console.error);

// CORS
app.use(cors());

// Helmet config (unchanged)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:", "http:"],
      "script-src": ["'self'", "'unsafe-inline'"],
    },
  },
}));

// View engine and static
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const redisStore = new RedisStore({ client: redisClient })

// Session with Redis store (fixed)
app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: !!isProduction }
}));

// Game middleware (unchanged)
app.use((req, res, next) => {
  if (!req.session.game) {
    req.session.game = { startTime: Date.now(), found: [], imageId: null };
  }
  next();
});

// Logging: Verbose in dev
if (!isProduction) {
  app.use(require('morgan')('dev'));
}

// Debug routes: Disable in prod
if (!isProduction) {
  app.get('/debug/characters', async (req, res) => {
    const imageId = req.session.game?.imageId;
    if (!imageId) {
      return res.json([]);
    }
    const characters = await prisma.character.findMany({
      where: { imageId: imageId },
      select: { id: true, name: true, x: true, y: true, imageUrl: true }
    });
    res.json(characters);
  });
}

// Routes (unchanged from your code)
app.get('/', async (req, res) => {
  if (!req.session.game || !req.session.game.imageId) {
    return res.redirect('/images');
  }
  const image = await prisma.image.findUnique({ where: { id: req.session.game.imageId } });
  const characters = await prisma.character.findMany({
    where: { imageId: image.id },
    select: { id: true, name: true, imageUrl: true }
  });
  res.render('index', { imageUrl: image.url, characters });
});

// /validate (unchanged)
app.post('/validate', async (req, res) => {
  const { x, y, characterId } = req.body;
  const charId = parseInt(characterId);
  if (req.session.game.found.includes(charId)) {
    return res.json({ success: false, message: 'Already found' });
  }
  const char = await prisma.character.findUnique({ where: { id: charId } });
  if (!char || char.imageId !== req.session.game.imageId) {
    return res.status(400).json({ success: false, message: 'Invalid character' });
  }

  const tolerance = 0.05;
  const isCorrect = Math.abs(x - char.x) <= tolerance && Math.abs(y - char.y) <= tolerance;

  if (isCorrect) {
    req.session.game.found.push(char.id);
    const allChars = await prisma.character.findMany({ where: { imageId: char.imageId } });
    if (req.session.game.found.length === allChars.length) {
      const time = (Date.now() - req.session.game.startTime) / 1000;
      return res.json({ success: true, allFound: true, time, position: { x: char.x, y: char.y } });
    }
    return res.json({ success: true, position: { x: char.x, y: char.y } });
  }
  res.json({ success: false, message: 'Try again!' });
});

// /scores POST (unchanged)
app.post('/scores', async (req, res) => {
  const { name } = req.body;
  if (!req.session.game || !req.session.game.imageId) {
    return res.status(400).json({ error: 'No game in progress' });
  }
  const time = (Date.now() - req.session.game.startTime) / 1000;
  await prisma.highScore.create({
    data: { name, time, imageId: req.session.game.imageId },
  });
  req.session.destroy();
  res.json({ success: true });
});

// /scores GET (unchanged)
app.get('/scores', async (req, res) => {
  let imageId = req.query.imageId ? parseInt(req.query.imageId) : req.session.game?.imageId;
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

// /highscores (unchanged)
app.get('/highscores', async (req, res) => {
  res.render('highscores');
});

// /images (unchanged)
app.get('/images', async (req, res) => {
  const images = await prisma.image.findMany({ select: { id: true, name: true } });
  res.render('images', { images });
});

// /start (unchanged)
app.post('/start', (req, res) => {
  const { imageId } = req.body;
  req.session.game = {
    startTime: Date.now(),
    found: [],
    imageId: parseInt(imageId)
  };
  res.redirect('/');
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Single error handler 
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;