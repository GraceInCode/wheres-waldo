const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    await prisma.character.deleteMany();
    await prisma.image.deleteMany();
    

    const image1 = await prisma.image.create({
        data: { name: 'Classic Waldo', url: 'https://example.com/waldo1.jpg' },
    });
    const image2 = await prisma.image.create({
        data: { name: 'Beach Waldo', url: 'https://example.com/waldo2.jpg' },
    });
    const image3 = await prisma.image.create({
        data: { name: 'Space Waldo', url: 'https://example.com/waldo3.jpg' },
    });
    await prisma.character.createMany({
        data: [
            { name: 'Waldo', x: 0.45, y: 0.6, imageId: image1.id },
            { name: 'Wizard', x: 0.7, y: 0.2, imageId: image1.id },
            { name: 'Odlaw', x: 0.2, y: 0.8, imageId: image1.id },
            { name: 'Waldo', x: 0.3, y: 0.5, imageId: image2.id },
            { name: 'Wizard', x: 0.6, y: 0.3, imageId: image2.id },
            { name: 'Odlaw', x: 0.8, y: 0.7, imageId: image2.id },
            { name: 'Waldo', x: 0.4, y: 0.4, imageId: image3.id },
            { name: 'Wizard', x: 0.5, y: 0.1, imageId: image3.id },
            { name: 'Odlaw', x: 0.9, y: 0.9, imageId: image3.id },
        ],
    });
}

main().catch(e => console.error(e)).finally(async () => await prisma.$disconnect());