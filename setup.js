const pool = require('./config/db');
const bcrypt = require('bcrypt');

async function setup() {
    try {
        const adminPassword = 'Gte232555@';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await pool.execute(
            'INSERT INTO users (user_id, password, role, valid_from, valid_to) VALUES (?, ?, ?, ?, ?) ' +
            'ON DUPLICATE KEY UPDATE user_id = user_id',
            ['admin', hashedPassword, 'admin', '2023-01-01', '2030-12-31']
        );
        console.log('Admin user created or already exists');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up admin user:', err);
        process.exit(1);
    }
}

setup();