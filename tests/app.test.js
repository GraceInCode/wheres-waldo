const request = require('supertest');
const app = require('../app'); 

describe('API routes', () => {
    // Start a game (sets session)
    beforeAll(async () => {
        await agent.post('/start').send({ imageId: 1 }); // Assume imageId 1 exists
    });

    it('validates correct click', async () => {
        const res = await agent.post('/validate').send({ x: 0.45, y: 0.6, characterId: 1 });
    })
})