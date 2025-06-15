
const mongoose = require('mongoose');

const emailTrackingSchema = new mongoose.Schema({
    tracking_id: {
        type: String,
        required: true,
        unique: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    campaign_id: {
        type: String,
        required: true
    },
    recipient_email: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'opened', 'failed'],
        default: 'sent'
    },
    sent_at: {
        type: Date,
        default: Date.now
    },
    delivered_at: {
        type: Date
    },
    opened_at: {
        type: Date
    },
    open_count: {
        type: Number,
        default: 0
    },
    smtp_name: {
        type: String,
        required: true
    },
    ip_address: {
        type: String
    },
    user_agent: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
});

class EmailTracking {
    static async create({ tracking_id, user_id, username, campaign_id, recipient_email, subject, smtp_name, metadata }) {
        try {
            // Check if tracking record already exists
            const existingRecord = await EmailTrackingModel.findOne({ tracking_id });
            if (existingRecord) {
                console.log(`⚠️ Tracking record with ID ${tracking_id} already exists, updating instead`);
                return await EmailTrackingModel.findByIdAndUpdate(existingRecord._id, {
                    user_id,
                    username,
                    campaign_id,
                    recipient_email,
                    subject,
                    smtp_name,
                    metadata
                }, { new: true });
            }

            const tracking = new EmailTrackingModel({
                tracking_id,
                user_id,
                username,
                campaign_id,
                recipient_email,
                subject,
                smtp_name,
                metadata
            });
            return await tracking.save();
        } catch (error) {
            if (error.code === 11000) {
                // Handle duplicate key error by finding and returning existing record
                console.log(`⚠️ Duplicate tracking ID ${tracking_id}, returning existing record`);
                return await EmailTrackingModel.findOne({ tracking_id });
            }
            throw error;
        }
    }

    static async findByTrackingId(tracking_id) {
        return await EmailTrackingModel.findOne({ tracking_id });
    }

    static async markAsOpened(tracking_id, ip_address, user_agent) {
        try {
            console.log(`🔍 Looking for tracking record: ${tracking_id}`);
            
            const tracking = await EmailTrackingModel.findOne({ tracking_id });
            if (tracking) {
                console.log(`✅ Found tracking record for ${tracking.recipient_email}`);
                
                const updateData = {
                    status: 'opened',
                    open_count: tracking.open_count + 1,
                    ip_address: ip_address || tracking.ip_address,
                    user_agent: user_agent || tracking.user_agent
                };
                
                if (!tracking.opened_at) {
                    updateData.opened_at = new Date();
                    console.log(`📅 Setting first open time for ${tracking.recipient_email}`);
                }
                
                const updatedTracking = await EmailTrackingModel.findByIdAndUpdate(
                    tracking._id, 
                    updateData, 
                    { new: true }
                );
                
                console.log(`✅ Email tracking updated successfully:`);
                console.log(`   Email: ${tracking.recipient_email}`);
                console.log(`   Opens: ${updatedTracking.open_count}`);
                console.log(`   Status: ${updatedTracking.status}`);
                
                return updatedTracking;
            } else {
                console.log(`⚠️ No tracking record found for ID: ${tracking_id}`);
                
                // Try to find similar tracking IDs (in case of encoding issues)
                const similarRecords = await EmailTrackingModel.find({
                    tracking_id: { $regex: tracking_id.substring(0, 10), $options: 'i' }
                }).limit(5);
                
                if (similarRecords.length > 0) {
                    console.log(`🔍 Found ${similarRecords.length} similar tracking IDs:`);
                    similarRecords.forEach(record => {
                        console.log(`   - ${record.tracking_id} (${record.recipient_email})`);
                    });
                }
                
                return null;
            }
        } catch (error) {
            console.error(`❌ Error updating tracking for ${tracking_id}:`, error);
            console.error('   Error details:', error.message);
            console.error('   Stack trace:', error.stack);
            return null;
        }
    }

    static async getByUserId(userId, limit = 50) {
        return await EmailTrackingModel.find({ user_id: userId })
            .sort({ sent_at: -1 })
            .limit(limit);
    }

    static async getByCampaignId(campaignId) {
        return await EmailTrackingModel.find({ campaign_id: campaignId })
            .sort({ sent_at: -1 });
    }

    static async getAll(limit = 100) {
        return await EmailTrackingModel.find({})
            .sort({ sent_at: -1 })
            .limit(limit);
    }

    static async getStats(userId = null) {
        const match = userId ? { user_id: userId } : {};
        
        const stats = await EmailTrackingModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    total_sent: { $sum: 1 },
                    total_opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
                    total_failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    total_opens: { $sum: '$open_count' }
                }
            }
        ]);

        const result = stats[0] || { total_sent: 0, total_opened: 0, total_failed: 0, total_opens: 0 };
        
        return {
            totalSent: result.total_sent,
            totalOpened: result.total_opened,
            totalFailed: result.total_failed,
            totalOpens: result.total_opens,
            openRate: result.total_sent > 0 ? ((result.total_opened / result.total_sent) * 100).toFixed(2) : '0'
        };
    }

    static async getCampaignStats(campaignId) {
        const stats = await EmailTrackingModel.aggregate([
            { $match: { campaign_id: campaignId } },
            {
                $group: {
                    _id: null,
                    total_sent: { $sum: 1 },
                    total_opened: { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
                    total_failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    total_opens: { $sum: '$open_count' }
                }
            }
        ]);

        const result = stats[0] || { total_sent: 0, total_opened: 0, total_failed: 0, total_opens: 0 };
        
        return {
            totalSent: result.total_sent,
            totalOpened: result.total_opened,
            totalFailed: result.total_failed,
            totalOpens: result.total_opens,
            openRate: result.total_sent > 0 ? ((result.total_opened / result.total_sent) * 100).toFixed(2) : '0'
        };
    }
}

const EmailTrackingModel = mongoose.model('EmailTracking', emailTrackingSchema);

module.exports = EmailTracking;
