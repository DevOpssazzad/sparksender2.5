const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/user');
const Session = require('../models/session');
const Activity = require('../models/activity');

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

const verifyUser = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const session = await Session.findOne({ token: token });
        
        // Check if session exists and matches the decoded user
        if (!session || session.user_id.toString() !== decoded.userId) {
            return res.status(401).json({ 
                message: 'Your session has been terminated due to login from another device. Please login again.',
                sessionTerminated: true
            });
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            // Clean up orphaned session
            await Session.deleteMany({ user_id: decoded.userId });
            return res.status(401).json({ message: 'User not found' });
        }

        const now = new Date();
        
        // Auto-logout if user account has expired
        if (new Date(user.validity_end) < now) {
            await Session.deleteByUserId(user._id);
            return res.status(401).json({ 
                message: 'Your account has expired. You have been automatically logged out.',
                expired: true
            });
        }

        // Check if user account is not yet active
        if (new Date(user.validity_start) > now) {
            await Session.deleteByUserId(user._id);
            return res.status(401).json({ 
                message: 'Your account is not yet active.',
                notActive: true
            });
        }

        req.user = {
            id: user._id,
            username: user.username,
            is_admin: user.is_admin,
            validity_start: user.validity_start,
            validity_end: user.validity_end
        };
        
        // Add IP address to user object
        req.user.ip_address = getClientIP(req);
        req.user.user_agent = req.headers['user-agent'];
        
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        
        // If token is expired or invalid, try to clean up the session
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            try {
                const decoded = jwt.decode(token);
                if (decoded && decoded.userId) {
                    await Session.deleteMany({ token: token });
                }
            } catch (cleanupError) {
                console.error('Session cleanup error:', cleanupError);
            }
        }
        
        res.status(401).json({ 
            message: 'Session expired. Please login again.',
            expired: true
        });
    }
};

const verifyAdmin = async (req, res, next) => {
    await verifyUser(req, res, async () => {
        if (!req.user.is_admin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        next();
    });
};

module.exports = { verifyUser, verifyAdmin };
