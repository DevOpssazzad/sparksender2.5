
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    validity_start: {
        type: Date,
        required: true
    },
    validity_end: {
        type: Date,
        required: true
    },
    is_admin: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

class User {
    static async create({ username, password, validity_start, validity_end, is_admin }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new UserModel({
            username,
            password: hashedPassword,
            validity_start,
            validity_end,
            is_admin
        });
        const savedUser = await user.save();
        return savedUser._id;
    }

    static async findByUsername(username) {
        return await UserModel.findOne({ username });
    }

    static async findById(id) {
        return await UserModel.findById(id);
    }

    static async update(id, { username, password, validity_start, validity_end, is_admin }) {
        const updates = {};
        
        if (username) updates.username = username;
        if (password) updates.password = await bcrypt.hash(password, 10);
        if (validity_start) updates.validity_start = validity_start;
        if (validity_end) updates.validity_end = validity_end;
        if (is_admin !== undefined) updates.is_admin = is_admin;

        return await UserModel.findByIdAndUpdate(id, updates, { new: true });
    }

    static async delete(id) {
        return await UserModel.findByIdAndDelete(id);
    }

    static async getAll() {
        return await UserModel.find({}, '_id username validity_start validity_end is_admin created_at').sort({ created_at: -1 });
    }

    static async findByIds(ids) {
        return await UserModel.find({ _id: { $in: ids } }, '_id username validity_start validity_end is_admin created_at');
    }
}

const UserModel = mongoose.model('User', userSchema);

module.exports = User;
