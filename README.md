# Where's Waldo - Photo Tagging Game

A web-based "Where's Waldo" style game where players find hidden characters in images and compete for the fastest time on a global leaderboard.

## 🎮 Features

- **Multiple Levels**: Choose from different challenging images
- **Character Finder**: Click on the image to find hidden characters
- **Real-time Timer**: Track how long it takes to find all characters
- **Visual Feedback**: See which characters you've found with a sidebar tracker
- **Global Leaderboard**: Compare your times with other players
- **Debug Mode**: Developer mode to visualize clickable areas
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: EJS templating, Vanilla JavaScript, CSS
- **Security**: Helmet.js, CORS
- **Session Management**: Redis
- **Testing**: Jest, Supertest

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/GraceInCode/wheres-waldo
   cd wheres-waldo
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/wheres_waldo"
   SESSION_SECRET="your-secret-key-here"
   PORT=3000
   ```

4. **Set up the database**

   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate dev
   
   # Seed the database with initial data
   npm run seed
   ```

5. **Start the server**

   ```bash
   npm start
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```bash
wheres-waldo/
├── prisma/
│   ├── migrations/         # Database migrations
│   ├── schema.prisma       # Database schema
│   └── seed.js            # Database seeding script
├── public/
│   └── script.js          # Frontend JavaScript
├── views/
│   ├── highscores.ejs     # High scores page
│   ├── images.ejs         # Level selection page
│   └── index.ejs          # Main game page
├── tests/
│   └── app.test.js        # Application tests
├── app.js                 # Main Express application
├── package.json           # Dependencies and scripts
└── .env                   # Environment variables
```

## 🎯 How to Play

1. **Select a Level**: Choose from available images on the level selection screen
2. **Find Characters**: Click on the image where you think a character is hiding
3. **Select Character**: Choose which character you found from the dropdown
4. **Complete the Game**: Find all characters as quickly as possible
5. **Submit Score**: Enter your name to save your time to the leaderboard
6. **View High Scores**: Check the leaderboard to see how you rank

## 🔧 Configuration

### Debug Mode

To enable debug mode and see clickable character areas:

1. Open `public/script.js`
2. Set `DEBUG_MODE = true` at the top of the file
3. Restart the server

### Adding New Levels

1. Add a new image to the database via `prisma/seed.js`:

   ```javascript
   const newImage = await prisma.image.create({
     data: { 
       name: 'Your Level Name', 
       url: 'https://your-image-url.com/image.jpg' 
     },
   });
   ```

2. Add characters for that image with normalized coordinates (0-1 range):

   ```javascript
   await prisma.character.createMany({
     data: [
       { 
         name: 'Character Name', 
         x: 0.45,  // X position (0 = left, 1 = right)
         y: 0.6,   // Y position (0 = top, 1 = bottom)
         imageId: newImage.id,
         imageUrl: 'https://character-avatar-url.com/avatar.jpg'
       },
     ],
   });
   ```

3. Run the seed command:

   ```bash
   npm run seed
   ```

## 🧪 Testing

Run the test suite:

```bash
npm test
```

## 📊 Database Schema

### Image

- `id`: Unique identifier
- `name`: Level name
- `url`: Image URL
- `characters`: Related characters

### Character

- `id`: Unique identifier
- `name`: Character name
- `x`: Normalized X coordinate (0-1)
- `y`: Normalized Y coordinate (0-1)
- `imageUrl`: Character avatar URL
- `imageId`: Foreign key to Image

### HighScore

- `id`: Unique identifier
- `name`: Player name
- `time`: Completion time in seconds
- `imageId`: Foreign key to Image

## 🔒 Security Features

- **Helmet.js**: Sets security-related HTTP headers
- **CORS**: Cross-Origin Resource Sharing enabled
- **Session Management**: Secure session handling with express-session
- **Input Validation**: Server-side validation of user inputs
- **CSP**: Content Security Policy configured

## 🐛 Known Issues

- Character images must be from HTTPS sources
- Session data is stored in memory (use connect-pg-simple for production)

## 🚀 Deployment

For production deployment:

1. Set `NODE_ENV=production` in your environment
2. Use a production database (e.g., PostgreSQL on Heroku, Railway, or Supabase)
3. Configure session store for production (e.g., connect-pg-simple)
4. Set secure session cookie options
5. Use a process manager like PM2

Example production .env:

bash```

env
NODE_ENV=production
DATABASE_URL="postgresql://user:password@host:5432/database"
SESSION_SECRET="strong-random-secret"
PORT=3000
``

## 📝 Scripts

- `npm start`: Start the development server with nodemon
- `npm run seed`: Seed the database with initial data
- `npm test`: Run the test suite

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Where's Waldo books by Martin Handford for inspiration
- The Odin Project for project idea
- Community contributors

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Happy Character Hunting! 🔍
