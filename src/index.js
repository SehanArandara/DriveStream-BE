require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { loadKnowledge } = require('./services/knowledge.service');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
connectDB().then(async () => {
  // Load PDF knowledge base for RAG chatbot
  await loadKnowledge();

  app.listen(PORT, () => {
    console.log(`\n🚀 DriveStream Server running on http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database    : Connected to MongoDB\n`);
  });
});
