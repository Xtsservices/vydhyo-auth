const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const bodyParser = require("body-parser");
require('dotenv').config();
const connectDB = require('./utils/db');
const logger = require('./utils/logger'); 

// Middleware
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
// Connect to MongoDB
connectDB();

// Create initial accounts on project load
const createInitialAccounts = require('./utils/initAccounts');
createInitialAccounts();

// Routes
app.use('/auth', authRoutes);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Auth Service running on port ${PORT}`));