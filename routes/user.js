
const express = require('express');
const { verifyUser } = require('../middleware/auth');
const Activity = require('../models/activity');
const router = express.Router();

// Get user's own activities
router.get('/activities', verifyUser, async (req, res) => {
    try {
        const activities = await Activity.getByUserId(req.user.id);
        res.json(activities);
    } catch (error) {
        console.error('Error fetching user activities:', error);
        res.status(500).json({ message: 'Failed to fetch activities' });
    }
});

// Get user's campaign statistics
router.get('/campaign-stats', verifyUser, async (req, res) => {
    try {
        const campaignActivities = await Activity.getCampaignActivities(req.user.id);
        
        let totalCampaigns = 0;
        let totalEmails = 0;
        let totalFailed = 0;
        let totalDuration = 0;
        let campaignCount = 0;
        
        // Count campaign starts for total campaigns
        const campaignStarts = campaignActivities.filter(activity => activity.activity_type === 'campaign_start');
        totalCampaigns = campaignStarts.length;
        
        campaignActivities.forEach(activity => {
            if (activity.activity_type === 'campaign_end' && activity.campaign_details) {
                totalEmails += activity.campaign_details.emails_sent || 0;
                totalFailed += activity.campaign_details.emails_failed || 0;
                if (activity.campaign_details.campaign_duration) {
                    totalDuration += activity.campaign_details.campaign_duration;
                    campaignCount++;
                }
            }
        });
        
        const successRate = totalEmails > 0 ? ((totalEmails / (totalEmails + totalFailed)) * 100).toFixed(1) : 0;
        const avgSpeed = campaignCount > 0 && totalDuration > 0 ? Math.round(totalEmails / (totalDuration / 60000)) : 0; // Convert to minutes
        
        res.json({
            totalCampaigns,
            totalEmails,
            totalFailed,
            successRate,
            avgSpeed,
            campaignActivities: campaignActivities.slice(0, 10) // Last 10 activities
        });
    } catch (error) {
        console.error('Error fetching campaign stats:', error);
        res.status(500).json({ 
            message: 'Failed to fetch campaign statistics',
            totalCampaigns: 0,
            totalEmails: 0,
            totalFailed: 0,
            successRate: 0,
            avgSpeed: 0,
            campaignActivities: []
        });
    }
});

// Get user's email tracking data
router.get('/email-tracking', verifyUser, async (req, res) => {
    try {
        const EmailTracking = require('../models/emailTracking');
        const trackingData = await EmailTracking.getByUserId(req.user.id);
        const stats = await EmailTracking.getStats(req.user.id);
        res.json({ trackingData, stats });
    } catch (error) {
        console.error('Error fetching email tracking data:', error);
        res.status(500).json({ message: 'Failed to fetch email tracking data' });
    }
});

module.exports = router;
