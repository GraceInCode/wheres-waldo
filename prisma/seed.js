const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting seed...');
    
    // Clear existing data
    await prisma.highScore.deleteMany();
    await prisma.character.deleteMany();
    await prisma.image.deleteMany();
    console.log('Cleared existing data.');

    // Create images (your originals—load fine)
    const image1 = await prisma.image.create({
      data: { 
        name: 'Shopping crowd', 
        url: 'https://cdn-useast.purposegames.com/images/game/bg/154/zonSq2IUzwE.png?s=1400' 
      },
    });
    console.log(`Created image1: ID ${image1.id}`);

    const image2 = await prisma.image.create({
      data: { 
        name: 'Sea fish', 
        url: 'https://kidsactivitiesblog.com/wp-content/uploads/2020/04/Wheres-Waldo-online-hidden-fish-pictures-printable-from-Candlewick-Kids-Activities-Blog.jpg' 
      },
    });
    console.log(`Created image2: ID ${image2.id}`);

    const image3 = await prisma.image.create({
      data: { 
        name: 'Circus', 
        url: 'https://assets.epuzzle.info/puzzle/083/714/original.jpg' 
      },
    });
    console.log(`Created image3: ID ${image3.id}`);

    // Characters with valid, loading URLs (from Waldo Fandom, 2025)
    await prisma.character.createMany({
      data: [
        { name: 'Waldo', x: 0.35, y: 0.28, imageId: image1.id, imageUrl: 'https://static.wikia.nocookie.net/whereswaldo/images/5/5b/Waldo.png/revision/latest?cb=20190730195748' },
        { name: 'Odlaw', x: 0.8, y: 0.50, imageId: image1.id, imageUrl: 'https://static.wikia.nocookie.net/whereswaldo/images/0/09/Odlulu.png/revision/latest?cb=20190730203516' },  // Odlaw variant
      ],
    });
    console.log('Created characters for image1.');

    await prisma.character.createMany({
      data: [
        // Waldo: Moved slightly left and down to center on him in the crowd.
        { name: 'Waldo', x: 0.35, y: 0.25, imageId: image2.id, imageUrl: 'https://static.wikia.nocookie.net/whereswaldo/images/5/5b/Waldo.png/revision/latest?cb=20190730195748' },
        
      // Wizard: Moved up significantly to be in the boat, not on the fish below.
        { name: 'Wizard', x: 0.45, y: 0.25, imageId: image2.id, imageUrl: 'https://static.wikia.nocookie.net/whereswaldo/images/1/1c/Wizard_Whitebeard.png/revision/latest?cb=20190731142424' },        
      ],
    });
    console.log('Created characters for image2.');

    await prisma.character.createMany({
      data: [
        { name: 'Waldo', x: 0.82, y: 0.13, imageId: image3.id, imageUrl: 'https://static.wikia.nocookie.net/whereswaldo/images/5/5b/Waldo.png/revision/latest?cb=20190730195748' },
        { name: 'Wizard', x: 0.7, y: 0.8, imageId: image3.id, imageUrl: 'https://static.wikia.nocookie.net/whereswaldo/images/1/1c/Wizard_Whitebeard.png/revision/latest?cb=20190731142424' },
      ],
    });
    console.log('Created characters for image3.');

    console.log('Seed complete!');
    
    // Debug print
    console.log('All images:', JSON.stringify(await prisma.image.findMany(), null, 2));
    console.log('All characters:', JSON.stringify(await prisma.character.findMany(), null, 2));
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });