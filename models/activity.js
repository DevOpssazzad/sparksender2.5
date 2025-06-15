
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    activity_type: {
        type: String,
        required: true,
        enum: ['login', 'logout', 'email_campaign', 'campaign_start', 'campaign_end', 'campaign_pause', 'campaign_resume', 'campaign_stop', 'admin_action']
    },
    description: {
        type: String,
        required: true
    },
    ip_address: {
        type: String,
        required: true
    },
    user_agent: {
        type: String
    },
    campaign_details: {
        recipients_count: Number,
        emails_sent: Number,
        emails_failed: Number,
        smtp_configs_used: Number,
        campaign_duration: Number,
        subject: String,
        status: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

class Activity {
    static async create({ user_id, username, activity_type, description, ip_address, user_agent }) {
        const activity = new ActivityModel({
            user_id,
            username,
            activity_type,
            description,
            ip_address,
            user_agent
        });
        return await activity.save();
    }

    static async getByUserId(userId) {
        return await ActivityModel.find({ user_id: userId }).sort({ created_at: -1 }).limit(50);
    }

    static async getAll() {
        return await ActivityModel.find({}).sort({ created_at: -1 }).limit(100);
    }

    static async getRecentActivity(limit = 20) {
        return await ActivityModel.find({}).sort({ created_at: -1 }).limit(limit);
    }

    static async createCampaignActivity({ user_id, username, activity_type, description, ip_address, user_agent, campaign_details, metadata }) {
        const activity = new ActivityModel({
            user_id,
            username,
            activity_type,
            description,
            ip_address,
            user_agent,
            campaign_details,
            metadata
        });
        return await activity.save();
    }

    static async getCampaignActivities(userId) {
        return await ActivityModel.find({ 
            user_id: userId, 
            activity_type: { $in: ['email_campaign', 'campaign_start', 'campaign_end', 'campaign_pause', 'campaign_resume'] }
        }).sort({ created_at: -1 }).limit(50);
    }

    static async getAllCampaignActivities() {
        return await ActivityModel.find({ 
            activity_type: { $in: ['email_campaign', 'campaign_start', 'campaign_end', 'campaign_pause', 'campaign_resume', 'campaign_stop'] }
        }).sort({ created_at: -1 }).limit(100);
    }
}

const ActivityModel = mongoose.model('Activity', activitySchema);

module.exports = Activity;
