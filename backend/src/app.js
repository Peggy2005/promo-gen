require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const generateRoutes = require('./routes/generate');
const publishRoutes = require('./routes/publish');
const authRoutes = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve locally saved AI-generated images
const STORAGE_DIR = path.join(__dirname, '../.storage');
fs.mkdirSync(STORAGE_DIR, { recursive: true });
app.use('/api/images', express.static(STORAGE_DIR));

app.use('/api/generate', generateRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
