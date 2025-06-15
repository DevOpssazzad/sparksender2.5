
const mongoose = require('mongoose');
require('dotenv').config();

// Use MongoDB connection URL from environment variables
const databaseUrl = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://ugmtgomohmkbvp248heh:khQ2r9zQ5LSo1jvjQJ0@bklatodaxhth6qi7s8uo-mongodb.services.clever-cloud.com:2273/bklatodaxhth6qi7s8uo';

async function connectToDatabase() {
    try {
        await mongoose.connect(databaseUrl);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

module.exports = { mongoose, connectToDatabase };
