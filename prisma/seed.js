const { name } = require("ejs");
const { url } = require("inspector");

const prisma = new PrismaClient();

async function main() {
    const image = await prisma.image.create({
        data: { url: 'https://your-waldo-image-url.jpg' },
    });
    await prisma.character.createMany({
        data: [
            { name: 'Waldo', x: 0.45, y: 0.6, imageId: image.id },
            { name: 'Wizard', x: 0.7, y: 0.2, imageId: image.id },
            { name: 'Odlaw', x: 0.2, y: 0.8, imageId: image.id },
        ],
    });
}

main().catch(e => console.error(e)).finally(async () => await prisma.$disconnect());