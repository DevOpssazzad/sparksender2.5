const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

class Session {
    static async create(userId, token) {
        const session = new SessionModel({
            user_id: userId,
            token
        });
        return await session.save();
    }

    static async findOne(query) {
        return await SessionModel.findOne(query);
    }

    static async findByToken(token) {
        return await SessionModel.findOne({ token });
    }

    static async findByUserId(userId) {
        return await SessionModel.find({ user_id: userId });
    }

    static async deleteByUserId(userId) {
        return await SessionModel.deleteMany({ user_id: userId });
    }

    static async deleteByToken(token) {
        return await SessionModel.deleteOne({ token });
    }

    static async deleteMany(query) {
        return await SessionModel.deleteMany(query);
    }

    static async find(query = {}) {
        return await SessionModel.find(query);
    }
}

const SessionModel = mongoose.model('Session', sessionSchema);

module.exports = Session;
