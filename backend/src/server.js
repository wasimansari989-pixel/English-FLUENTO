require('dotenv').config();
const express = require('express');
const cors = require('cors');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// API Routes
app.use('/api/ai', aiRouter);

app.get('/', (req, res) => {
  res.json({
    message: 'English Sentence Formula App AI Backend is running!',
    endpoints: [
      'GET /api/ai/health',
      'POST /api/ai/tutor',
      'POST /api/ai/correct-sentence',
      'POST /api/ai/generate-examples',
      'POST /api/ai/generate-quiz',
      'POST /api/ai/conversation'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server listening on http://localhost:${PORT}`);
  console.log(`⚡ AI Primary: ${process.env.AI_PRIMARY_PROVIDER || 'groq'} | AI Fallback: ${process.env.AI_FALLBACK_PROVIDER || 'gemini'}`);
});
