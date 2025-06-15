const { connectToDatabase } = require('./db');
const User = require('../models/user');

async function initializeDatabase() {
    try {
        console.log('🔄 Starting database initialization...');

        // Connect to MongoDB
        await connectToDatabase();
        console.log('✅ Database connection successful');

        // Check if admin user exists
        try {
            const adminUser = await User.findByUsername('admin');
            if (adminUser) {
                console.log('✅ Admin user exists');
            } else {
                console.log('ℹ️ Admin user not found, will be created by application');
            }
        } catch (error) {
            console.error('❌ Error checking admin user:', error.message);
        }

        console.log('✅ Database initialization completed successfully');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('🎉 Database setup complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Database setup failed:', error);
            process.exit(1);
        });
}

module.exports = { initializeDatabase };
