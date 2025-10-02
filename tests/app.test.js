const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../app');

const prisma = new PrismaClient();
const agent = request.agent(app);

describe('API routes', () => {
  let testImageId;
  let testCorrectChar;
  let testIncorrectChar;

  beforeAll(async () => {
    // Get real IDs from DB (assume seeded)
    const image = await prisma.image.findFirst();
    testImageId = image.id;
    const characters = await prisma.character.findMany({ where: { imageId: testImageId } });
    testCorrectChar = characters[0]; // First for correct
    testIncorrectChar = characters[1] || characters[0]; // Second for incorrect (fallback if only one)
    console.log(`Using imageId: ${testImageId}, correctCharId: ${testCorrectChar.id} pos: ${JSON.stringify({x: testCorrectChar.x, y: testCorrectChar.y})}, incorrectCharId: ${testIncorrectChar.id}`);

    await agent.post('/start').send({ imageId: testImageId });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('validates correct click', async () => {
    const res = await agent.post('/validate').send({ x: testCorrectChar.x, y: testCorrectChar.y, characterId: testCorrectChar.id });
    console.log('Validate correct response:', res.body);
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });

  it('validates incorrect click', async () => {
    const res = await agent.post('/validate').send({ x: 0.1, y: 0.1, characterId: testIncorrectChar.id });
    console.log('Validate incorrect response:', res.body);
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(false);
  });

  it('retrieves high scores', async () => {
    const res = await agent.get('/scores');
    console.log('Get scores response:', res.body);
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('posts score', async () => {
    const res = await agent.post('/scores').send({ name: 'TestPlayer' });
    console.log('Post score response:', res.body);
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
  });
});

describe('API routes without game started', () => {
  const freshAgent = request.agent(app);  // No session

  it('handles validate without starting game', async () => {
    const res = await freshAgent.post('/validate').send({ x: 0.45, y: 0.6, characterId: 1 });
    console.log('Validate without game response:', res.body);
    expect(res.statusCode).toEqual(400);
    expect(res.body.success).toBe(false);
  });

  it('handles post score without starting game', async () => {
    const res = await freshAgent.post('/scores').send({ name: 'TestPlayer' });
    console.log('Post score without game response:', res.body);
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toBe('No game in progress');
  });
});