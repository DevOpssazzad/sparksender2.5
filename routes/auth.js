const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Session = require('../models/session');
const Activity = require('../models/activity'); // Added Activity model
const router = express.Router();

// Helper function to get client IP
function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.ip ||
           '127.0.0.1';
}

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findByUsername(username);
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const now = new Date();

        // Check if user account has expired
        if (new Date(user.validity_end) < now) {
            return res.status(401).json({ message: 'User account has expired. Please contact administrator.' });
        }

        // Check if user account is not yet valid
        if (new Date(user.validity_start) > now) {
            return res.status(401).json({ message: 'User account is not yet active.' });
        }

        // Check for existing sessions and count them
        const existingSessions = await Session.findByUserId(user._id);
        const sessionCount = existingSessions.length;

        // Log multiple login attempt
        if (sessionCount > 0) {
            console.log(`🔄 Multiple login detected for user: ${username}. Terminating ${sessionCount} existing session(s).`);
        }

        // Implement single device login - delete all existing sessions for this user
        const deletedResult = await Session.deleteByUserId(user._id);
        console.log(`🗑️ Cleared ${deletedResult.deletedCount || sessionCount} session(s) for user: ${username}`);

        const token = jwt.sign({ userId: user._id, is_admin: user.is_admin }, process.env.JWT_SECRET, { expiresIn: '1d' });
        await Session.create(user._id, token);

        console.log(`✅ New session created for user: ${username}`);

        // Log login activity
        const ip_address = getClientIP(req);
        const user_agent = req.headers['user-agent'];
        await Activity.create({
            user_id: user._id,
            username: user.username,
            activity_type: 'login',
            description: sessionCount > 0 ? `User logged in (terminated ${sessionCount} previous session(s))` : 'User logged in',
            ip_address,
            user_agent
        });

        const responseData = { 
            token, 
            is_admin: user.is_admin, 
            username: user.username 
        };

        // Add info about terminated sessions if any existed
        if (sessionCount > 0) {
            responseData.message = `Login successful. ${sessionCount} previous session(s) were terminated.`;
        }

        res.json(responseData);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Logout route
router.post('/logout', async (req, res) => {
    const logoutToken = req.headers.authorization?.split('Bearer ')[1];

    if (!logoutToken) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        // Get user info before deleting session
        const decoded = jwt.verify(logoutToken, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        await Session.deleteByToken(logoutToken);

        // Log logout activity
        if (user) {
            const ip_address = getClientIP(req);
            const user_agent = req.headers['user-agent'];
            await Activity.create({
                user_id: user._id,
                username: user.username,
                activity_type: 'logout',
                description: 'User logged out',
                ip_address,
                user_agent
            });
        }

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
