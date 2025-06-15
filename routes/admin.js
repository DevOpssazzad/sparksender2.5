
const express = require('express');
const { verifyAdmin, verifyUser } = require('../middleware/auth');
const User = require('../models/user');
const Activity = require('../models/activity');
const Session = require('../models/session');
const router = express.Router();

// Get all users
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.getAll();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// Create new user
router.post('/users', verifyAdmin, async (req, res) => {
    try {
        const { username, password, validity_start, validity_end, is_admin } = req.body;
        
        if (!username || !password || !validity_start || !validity_end) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const newUser = await User.create({
            username,
            password,
            validity_start,
            validity_end,
            is_admin: Boolean(is_admin)
        });

        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user' });
    }
});

// Update user
router.put('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, password, validity_start, validity_end, is_admin } = req.body;

        if (!userId || userId === 'undefined') {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const updateData = {
            username,
            validity_start,
            validity_end,
            is_admin: Boolean(is_admin)
        };

        if (password) {
            updateData.password = password;
        }

        const updatedUser = await User.update(userId, updateData);
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }
        res.status(500).json({ message: 'Failed to update user' });
    }
});

// Delete user
router.delete('/users/:id', verifyAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        if (!userId || userId === 'undefined') {
            return res.status(400).json({ message: 'Invalid user ID' });
        }
        
        // Prevent deleting the current admin user
        if (req.user.id == userId || req.user._id == userId) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const deleted = await User.delete(userId);
        if (!deleted) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// Get activity logs
router.get('/activities', verifyAdmin, async (req, res) => {
    try {
        const activities = await Activity.getAll();
        res.json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ message: 'Failed to fetch activities' });
    }
});

// Get user activities by user ID
router.get('/users/:id/activities', verifyAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const activities = await Activity.getByUserId(userId);
        res.json(activities);
    } catch (error) {
        console.error('Error fetching user activities:', error);
        res.status(500).json({ message: 'Failed to fetch user activities' });
    }
});

// Get online users with detailed status
router.get('/online-users', verifyAdmin, async (req, res) => {
    try {
        // Get all active sessions
        const sessions = await Session.find({});
        const userIds = sessions.map(session => session.user_id);
        
        // Get user details for active sessions
        const onlineUsers = await User.findByIds(userIds);
        
        // Get recent activities for each user
        const usersWithStatus = await Promise.all(onlineUsers.map(async user => {
            const userSession = sessions.find(s => s.user_id.toString() === user._id.toString());
            const recentActivity = await Activity.getByUserId(user._id);
            const lastLogin = recentActivity.find(a => a.activity_type === 'login');
            const campaignActivities = await Activity.getCampaignActivities(user._id);
            
            return {
                ...user.toObject(),
                session_created: userSession ? userSession.created_at : null,
                last_login: lastLogin ? lastLogin.created_at : null,
                status: 'online',
                recent_campaigns: campaignActivities.length,
                last_activity: recentActivity[0] ? recentActivity[0].created_at : null,
                activity_summary: {
                    total_activities: recentActivity.length,
                    login_count: recentActivity.filter(a => a.activity_type === 'login').length,
                    campaign_count: campaignActivities.length
                }
            };
        }));
        
        res.json(usersWithStatus);
    } catch (error) {
        console.error('Error fetching online users:', error);
        res.status(500).json({ message: 'Failed to fetch online users' });
    }
});

// Get all users with online/offline status
router.get('/users-status', verifyAdmin, async (req, res) => {
    try {
        // Get all users
        const allUsers = await User.getAll();
        
        // Get all active sessions
        const sessions = await Session.find({});
        const onlineUserIds = sessions.map(session => session.user_id.toString());
        
        // Add status and activity info to each user
        const usersWithStatus = await Promise.all(allUsers.map(async user => {
            const isOnline = onlineUserIds.includes(user._id.toString());
            const recentActivity = await Activity.getByUserId(user._id);
            const lastActivity = recentActivity[0];
            const campaignActivities = await Activity.getCampaignActivities(user._id);
            
            return {
                ...user.toObject(),
                status: isOnline ? 'online' : 'offline',
                last_activity: lastActivity ? lastActivity.created_at : null,
                last_activity_type: lastActivity ? lastActivity.activity_type : null,
                total_activities: recentActivity.length,
                campaign_count: campaignActivities.length,
                last_login: recentActivity.find(a => a.activity_type === 'login')?.created_at || null,
                last_logout: recentActivity.find(a => a.activity_type === 'logout')?.created_at || null
            };
        }));
        
        res.json(usersWithStatus);
    } catch (error) {
        console.error('Error fetching users status:', error);
        res.status(500).json({ message: 'Failed to fetch users status' });
    }
});

// Get detailed campaign logs
router.get('/campaign-logs', verifyAdmin, async (req, res) => {
    try {
        const campaignActivities = await Activity.getAllCampaignActivities();
        res.json(campaignActivities);
    } catch (error) {
        console.error('Error fetching campaign logs:', error);
        res.status(500).json({ message: 'Failed to fetch campaign logs' });
    }
});

// Get user-specific campaign logs
router.get('/user/:userId/campaigns', verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const campaignActivities = await Activity.getCampaignActivities(userId);
        res.json(campaignActivities);
    } catch (error) {
        console.error('Error fetching user campaign logs:', error);
        res.status(500).json({ message: 'Failed to fetch user campaign logs' });
    }
});

// Get all email tracking data (admin only)
router.get('/email-tracking', verifyAdmin, async (req, res) => {
    try {
        const EmailTracking = require('../models/emailTracking');
        const trackingData = await EmailTracking.getAll();
        const stats = await EmailTracking.getStats();
        res.json({ trackingData, stats });
    } catch (error) {
        console.error('Error fetching email tracking data:', error);
        res.status(500).json({ message: 'Failed to fetch email tracking data' });
    }
});

// Get email tracking data for specific user (admin only)
router.get('/users/:userId/email-tracking', verifyAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const EmailTracking = require('../models/emailTracking');
        const trackingData = await EmailTracking.getByUserId(userId);
        const stats = await EmailTracking.getStats(userId);
        res.json({ trackingData, stats });
    } catch (error) {
        console.error('Error fetching user email tracking data:', error);
        res.status(500).json({ message: 'Failed to fetch user email tracking data' });
    }
});

// Get campaign tracking data (admin only)
router.get('/campaign/:campaignId/tracking', verifyAdmin, async (req, res) => {
    try {
        const { campaignId } = req.params;
        const EmailTracking = require('../models/emailTracking');
        const trackingData = await EmailTracking.getByCampaignId(campaignId);
        const stats = await EmailTracking.getCampaignStats(campaignId);
        res.json({ trackingData, stats });
    } catch (error) {
        console.error('Error fetching campaign tracking data:', error);
        res.status(500).json({ message: 'Failed to fetch campaign tracking data' });
    }
});

module.exports = router;
