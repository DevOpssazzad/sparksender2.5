const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Set environment to production
process.env.NODE_ENV = 'production';

// Set JWT_SECRET if not provided
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'gfdhgfuft878sfddsfdsyfdsfdsufdshfsii';
}

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Import routes and middleware
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { connectToDatabase } = require('./config/db');
const User = require('./models/user');
const Activity = require('./models/activity');
const { verifyUser } = require('./middleware/auth');

// Directory setup for file storage
const recipientsDir = 'recipients/';
const smtpFolderPath = 'smtp';
const logFilePath = 'email_logs.txt';

// Create necessary directories if they don't exist
const createDirectoryIfNotExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};
createDirectoryIfNotExists(recipientsDir);
createDirectoryIfNotExists(smtpFolderPath);

// Express middleware configuration
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route configuration
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/user', require('./routes/user'));
app.use('/api/email', require('./routes/email'));

// Root route redirect to login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Protected admin route
app.get('/admin.html', verifyUser, (req, res) => {
    if (!req.user.is_admin) {
        return res.redirect('/login.html');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Protected main application route
app.get('/index.html', verifyUser, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket connection handling for real-time console streaming
wss.on('connection', (ws) => {
    console.log('🔗 Client connected to Spark Sender Server\n🛠️ Developed by: Pjɗw Sʌzzʌɗ');
    ws.on('close', () => {
        console.log('❌ Client disconnected from server');
    });
});

// Stream console logs to connected WebSocket clients (clean and necessary logs only)
const streamConsoleLog = (message, type = 'log') => {
    const logData = JSON.stringify({
        type: type,
        message: message,
        timestamp: new Date().toISOString()
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(logData);
        }
    });
};

// Override console methods to stream only essential logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
    originalConsoleLog(...args);
    try {
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        // Only stream important logs (not verbose debugging)
        if (message.includes('✅') || message.includes('❌') || message.includes('⚡') || 
            message.includes('🚀') || message.includes('📧') || message.includes('Campaign')) {
            streamConsoleLog(message, 'log');
        }
    } catch (error) {
        originalConsoleLog(...args);
    }
};

console.error = (...args) => {
    originalConsoleError(...args);
    try {
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        streamConsoleLog(message, 'error');
    } catch (error) {
        originalConsoleError(...args);
    }
};

console.warn = (...args) => {
    originalConsoleWarn(...args);
    try {
        const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ');
        streamConsoleLog(message, 'warn');
    } catch (error) {
        originalConsoleWarn(...args);
    }
};

// License verification system
const licenseKey = 'd1c6f5f4-62b7-4039-b838-cdf6784e4768';
const licenseUrl = 'https://p2ilab.serv00.net/verify_license.php';

async function verifyLicense(licenseKeyToVerify) {
    try {
        const response = await axios.get(licenseUrl, { params: { license_key: licenseKeyToVerify } });
        if (response.data.status !== 'valid') {
            console.log(`❌ Invalid License: ${response.data.message}`);
            process.exit(1);
        }
        console.log('✅ License is valid');
    } catch (error) {
        console.error('❌ Error verifying license:', error.message);
        process.exit(1);
    }
}
verifyLicense(licenseKey);

// Import database initialization
const { initializeDatabase } = require('./config/init-db');

// Tag replacement function for email personalization
const replaceTags = (text, dynamicValues) => {
    if (typeof text !== 'string') return '';
    let processedText = text;
    const tags = {
        '#NAME#': dynamicValues.fullName,
        '#EMAIL#': dynamicValues.emailAddress,
        '#UID#': dynamicValues.accountId,
        '#CUS#': dynamicValues.customerId,
        '#PRODUCT#': dynamicValues.productName,
        '#PRICE#': dynamicValues.price,
        '#QTY#': dynamicValues.quantity,
        '#SNUM#': dynamicValues.orderNumber,
        '#TRX#': dynamicValues.transactionNo,
        '#INV#': dynamicValues.invoiceNumber,
        '#DATE#': dynamicValues.transactionDate,
        '#SUPPORT#': dynamicValues.supportEmail,
        '#UNSUBSCRIBE#': dynamicValues.unsubscribeLink,
        '#YEAR#': dynamicValues.currentYear,
        '#SIGNATURE#': dynamicValues.emailSignature,
        '#SHIPMETHOD#': dynamicValues.shippingMethod,
        '#DELIVERY#': dynamicValues.estimatedDelivery,
        '#PAYMENT#': dynamicValues.paymentMethod,
        '#DISCOUNT#': dynamicValues.discountCode,
        '#REF#': dynamicValues.referralCode,
        '#IP#': dynamicValues.ipAddress,
        '#LOCATION#': dynamicValues.location,
        '#BROWSER#': dynamicValues.browser,
        '#DEVICE#': dynamicValues.deviceType,
        '#OS#': dynamicValues.os,
        '#LOGIN#': dynamicValues.lastLogin,
        '#STATUS#': dynamicValues.accountStatus,
        '#LANG#': dynamicValues.language,
        '#TZ#': dynamicValues.timezone,
        '#TFN#': dynamicValues.tfn
    };
    for (const tag in tags) {
        if (tags[tag] !== undefined) {
            processedText = processedText.replace(new RegExp(tag, 'g'), tags[tag]);
        }
    }
    return processedText;
};

// Helper functions for generating realistic data
function generateRandomName() {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Lisa', 'William', 'Mary', 'James', 'Patricia', 'Christopher', 'Jennifer', 'Daniel', 'Elizabeth'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function generateRandomCompany() {
    const companies = [
        'Tech Solutions Inc', 'Global Services LLC', 'Innovation Corp', 'Digital Systems Ltd', 
        'Business Partners Co', 'Advanced Technologies', 'Professional Services', 'Enterprise Solutions', 
        'Creative Industries', 'Strategic Consulting', 'Modern Enterprises', 'Future Systems',
        'Quality Solutions', 'Premier Services', 'Dynamic Corp', 'Elite Technologies'
    ];
    return companies[Math.floor(Math.random() * companies.length)];
}

// Generate dynamic values for email personalization
async function generateDynamicValues(template, recipientEmail = null, senderEmail = 'support@company.com', senderName = 'Support Team', tfn = null) {
    try {
        if (!template || typeof template !== 'string') {
            return {};
        }

        const placeholderRegex = /#[A-Z_]+#/g;
        const placeholders = template.match(placeholderRegex) || [];

        if (placeholders.length === 0) {
            return {};
        }

        const uniquePlaceholders = [...new Set(placeholders)];

        // Generate comprehensive dynamic values for email personalization
        const dynamicValues = {
            fullName: generateRandomName(),
            emailAddress: recipientEmail || `user${Math.floor(Math.random() * 1000)}@example.com`,
            accountId: Math.random().toString(36).substr(2, 12).toUpperCase(),
            customerId: `CUST_${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            productName: generateRandomCompany() + ' Product',
            price: (Math.random() * 1000 + 50).toFixed(2),
            quantity: Math.floor(Math.random() * 5) + 1,
            orderNumber: `ORDER_${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            transactionNo: `TXN_${Math.random().toString(36).substr(2, 10).toUpperCase()}`,
            invoiceNumber: `INV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            transactionDate: new Date().toLocaleDateString(),
            supportEmail: senderEmail || 'support@company.com',
            unsubscribeLink: 'https://company.com/unsubscribe',
            currentYear: new Date().getFullYear(),
            emailSignature: `Best regards,\n${senderName || 'The Support Team'}`,
            shippingMethod: 'Standard Shipping',
            estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            paymentMethod: ['Credit Card', 'PayPal', 'Bank Transfer'][Math.floor(Math.random() * 3)],
            discountCode: `SAVE${Math.floor(Math.random() * 50) + 10}`,
            referralCode: `REF_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            location: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)],
            browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
            deviceType: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
            os: ['Windows', 'macOS', 'Linux', 'iOS', 'Android'][Math.floor(Math.random() * 5)],
            lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            accountStatus: ['Active', 'Premium', 'Trial'][Math.floor(Math.random() * 3)],
            language: ['English', 'Spanish', 'French', 'German'][Math.floor(Math.random() * 4)],
            timezone: ['UTC', 'EST', 'PST', 'GMT'][Math.floor(Math.random() * 4)],
            tfn: tfn || '',
            campaignId: `CAMP_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
        };

        return dynamicValues;
    } catch (error) {
        console.error('❌ Error generating dynamic values:', error.message);
        return {};
    }
}

// SMTP configuration constants - optimized for 50+ emails per minute
const SMTP_DAILY_LIMIT = 300;
const SMTP_MAX_COUNT = 5; // Maximum 5 SMTP connections in pool

// Global variables for SMTP management
let paused = false;
let smtpConfigs = [];
let smtpUsage = [];
let totalSent = 0;
let totalFailed = 0;
let currentPoolIndex = 0;
let smtpPools = [];

// Check if it's a new day for resetting SMTP daily limits
function isNewDay(lastReset, currentDate) {
    return (
        lastReset.getDate() !== currentDate.getDate() ||
        lastReset.getMonth() !== currentDate.getMonth() ||
        lastReset.getFullYear() !== currentDate.getFullYear()
    );
}

// Read and parse SMTP credentials from uploaded file
function readSmtpCredentials(filePath) {
    smtpConfigs = [];
    smtpUsage = [];
    smtpPools = [];

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const configsTextBlobs = fileContent.split(/\n\s*\n/);

    // Parse each SMTP configuration block
    configsTextBlobs.forEach((configTextBlob, index) => {
        if (configTextBlob.trim() === "") return;

        const credentials = { authFailed: false };
        configTextBlob.split('\n').forEach((line) => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                credentials[key.trim()] = valueParts.join('=').trim();
            }
        });

        if (Object.keys(credentials).length > 1) {
            if (!credentials.SMTP_NAME) {
                credentials.SMTP_NAME = `SMTP_${index + 1}`;
            }
            smtpConfigs.push(credentials);
            smtpUsage.push({ count: 0, lastReset: new Date(0) });
        }
    });

    // Create SMTP pools with maximum 5 connections per pool
    for (let i = 0; i < Math.ceil(smtpConfigs.length / SMTP_MAX_COUNT); i++) {
        const pool = smtpConfigs.slice(i * SMTP_MAX_COUNT, (i + 1) * SMTP_MAX_COUNT);
        if (pool.length > 0) {
            smtpPools.push(pool);
            console.log(`✅ Created SMTP Pool ${smtpPools.length} with ${pool.length} SMTPs:`);
            pool.forEach((smtp) => {
                console.log(`  - ${smtp.SMTP_NAME} (Host: ${smtp.SMTP_HOST})`);
            });
        }
    }
    currentPoolIndex = 0;
    console.log(`✅ Total SMTP configurations loaded: ${smtpConfigs.length}`);
    console.log(`✅ Total SMTP pools created: ${smtpPools.length}`);
}

// Rotate to next SMTP pool for load balancing
function rotatePool() {
    if (smtpPools.length === 0) return;
    currentPoolIndex = (currentPoolIndex + 1) % smtpPools.length;
    console.log(`🔄 Rotated to SMTP Pool ${currentPoolIndex + 1}`);
}

// Get next available SMTP configuration from pools
function getNextSmtp() {
    if (smtpPools.length === 0) {
        console.error('❌ No SMTP pools available.');
        return null;
    }

    let initialPoolIndex = currentPoolIndex;
    let poolsAttempted = 0;

    while (poolsAttempted < smtpPools.length) {
        const currentSmtpGroup = smtpPools[currentPoolIndex];
        if (!currentSmtpGroup || currentSmtpGroup.length === 0) {
            rotatePool();
            poolsAttempted++;
            if (currentPoolIndex === initialPoolIndex && poolsAttempted > 0) break;
            continue;
        }

        // Check each SMTP in current pool
        for (let i = 0; i < currentSmtpGroup.length; i++) {
            const smtp = currentSmtpGroup[i];
            const globalIndex = smtpConfigs.findIndex(cfg => cfg === smtp);

            if (globalIndex === -1) {
                console.error(`❌ SMTP ${smtp.SMTP_NAME} from pool not found in global smtpConfigs.`);
                continue;
            }

            if (smtp.authFailed) {
                console.log(`⏩ Skipping SMTP ${smtp.SMTP_NAME} due to previous auth failure.`);
                continue;
            }

            const usage = smtpUsage[globalIndex];
            const now = new Date();

            // Reset daily count if it's a new day
            if (isNewDay(usage.lastReset, now)) {
                console.log(`🔄 Resetting daily count for SMTP: ${smtp.SMTP_NAME}`);
                usage.count = 0;
                usage.lastReset = now;
            }

            // Check if SMTP hasn't reached daily limit
            if (usage.count < SMTP_DAILY_LIMIT) {
                usage.count++;
                console.log(`✅ Using SMTP: ${smtp.SMTP_NAME} (Host: ${smtp.SMTP_HOST}), Count: ${usage.count}/${SMTP_DAILY_LIMIT}`);
                return smtp;
            } else {
                console.log(`🚫 SMTP: ${smtp.SMTP_NAME} has reached its daily limit (${usage.count}/${SMTP_DAILY_LIMIT}).`);
            }
        }

        console.log(`Pool ${currentPoolIndex + 1} exhausted or all SMTPs failed/limited.`);
        rotatePool();
        poolsAttempted++;
        if (currentPoolIndex === initialPoolIndex && poolsAttempted > 0 && poolsAttempted >= smtpPools.length) {
            break;
        }
    }

    console.error('❌ All SMTPs in all pools have hit their daily limit or failed.');
    return null;
}

// Protected email sending route with optimized batch processing
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/send-email', verifyUser, upload.fields([
    { name: 'Smtp', maxCount: 1 },
    { name: 'recipientFile', maxCount: 1 }
]), async (req, res) => {
    totalSent = 0;
    totalFailed = 0;
    const campaignStartTime = new Date();

    try {
        const { fromName, subject, bodyHtml, attachmentHtml, tfn, delay } = req.body;
        const smtpFile = req.files['Smtp'] ? req.files['Smtp'][0] : null;
        const recipientFile = req.files['recipientFile'] ? req.files['recipientFile'][0] : null;

        // Validate required fields
        if (!smtpFile || !recipientFile) {
            return res.status(400).send('SMTP and recipient files are required.');
        }
        if (!subject || !bodyHtml) {
            return res.status(400).send('Subject and HTML body are required.');
        }
        if (!tfn) {
            return res.status(400).send('TFN (Tracking/Reference Number) is required.');
        }

        // Load SMTP configurations
        readSmtpCredentials(smtpFile.path);
        if (smtpConfigs.length === 0 || smtpPools.length === 0) {
            console.error('❌ No valid SMTP configurations loaded from the file.');
            return res.status(400).send('No valid SMTP configurations loaded. Check SMTP file format.');
        }

        // Load recipient email addresses
        const recipients = fs.readFileSync(recipientFile.path, 'utf-8').split('\n').map(email => email.trim()).filter(email => email && email.includes('@'));

        if (recipients.length === 0) {
            return res.status(400).send('No valid recipients found in the file.');
        }

        console.log(`🚀 Starting email campaign for ${recipients.length} recipients.`);

        // Log campaign start activity
        await Activity.createCampaignActivity({
            user_id: req.user.id,
            username: req.user.username,
            activity_type: 'campaign_start',
            description: `Started email campaign: "${subject}" for ${recipients.length} recipients`,
            ip_address: req.user.ip_address,
            user_agent: req.user.user_agent,
            campaign_details: {
                recipients_count: recipients.length,
                emails_sent: 0,
                emails_failed: 0,
                smtp_configs_used: smtpConfigs.length,
                subject: subject,
                status: 'started'
            },
            metadata: {
                from_name: fromName,
                has_attachment: !!attachmentHtml,
                delay_ms: parseInt(delay, 10) || 0
            }
        });

        // Initialize log stream for campaign tracking
        const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
        logStream.write(`\n--- Campaign Started: ${new Date().toISOString()} ---\n`);
        logStream.write(`User: ${req.user.username} (${req.user.ip_address})\n`);
        logStream.write(`Subject: ${subject}\n`);
        logStream.write(`Total Recipients: ${recipients.length}\n`);
        logStream.write(`SMTP Configs: ${smtpConfigs.length}\n`);

        // Optimized batch processing for 50+ emails per minute
        const BATCH_SIZE = 5; // Process 5 emails per batch as requested
        const DELAY_BETWEEN_BATCHES = 1; // 6 seconds = 50 emails per minute minimum

        // Pre-initialize browser for attachment generation if needed
        if (attachmentHtml) {
            console.log('🚀 Initializing superfast PDF generation system with 5 concurrent instances...');
            try {
                const { getBrowserInstance } = require('./utils/emailUtils');
                await getBrowserInstance();
                console.log('✅ Superfast PDF system with 5 concurrent instances initialized');
            } catch (error) {
                console.warn('⚠️ PDF system initialization warning:', error.message);
            }
        }

        // Process emails in batches of 5
        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            // Check if campaign is paused
            if (paused) {
                console.log('⏸️ Email sending is paused. Waiting...');
                while (paused) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
                console.log('▶️ Email sending resumed.');
            }

            const batch = recipients.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map(async (toEmail) => {
                const emailStartTime = Date.now();
                try {
                    const smtp = getNextSmtp();
                    if (!smtp) {
                        console.error('❌ No available SMTP configurations.');
                        return { success: false, email: toEmail };
                    }

                    const effectiveFromName = fromName || smtp.SMTP_FROM_NAME || 'Support Team';

                    // Generate dynamic values for email personalization
                    const template = `${subject} ${bodyHtml} ${attachmentHtml || ''}`;
                    const dynamicValues = await generateDynamicValues(template, toEmail, smtp.FROM_EMAIL, effectiveFromName, tfn);

                    let success = false;
                    try {
                        const { sendEmail } = require('./utils/emailUtils');

                        // Send email with all optimizations
                        success = await sendEmail(toEmail, subject, bodyHtml, smtp, dynamicValues, attachmentHtml, effectiveFromName);

                    } catch (emailError) {
                        console.error(`❌ Error sending email to ${toEmail}:`, emailError.message);
                        success = false;
                    }

                    const emailDuration = Date.now() - emailStartTime;
                    return { success, email: toEmail, smtp: smtp.SMTP_NAME, duration: emailDuration };
                } catch (error) {
                    console.error(`❌ Error processing email for ${toEmail}:`, error.message);
                    return { success: false, email: toEmail, duration: Date.now() - emailStartTime };
                }
            });

            // Wait for current batch to complete
            const batchResults = await Promise.allSettled(batchPromises);

            // Process batch results and update counters
            let batchSent = 0;
            let batchFailed = 0;
            let totalBatchDuration = 0;

            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const { success, email, smtp, duration } = result.value;
                    totalBatchDuration += duration || 0;

                    if (success) {
                        totalSent++;
                        batchSent++;
                    } else {
                        totalFailed++;
                        batchFailed++;
                    }
                    logStream.write(`${new Date().toISOString()} - To: ${email}, From SMTP: ${smtp || 'Unknown'}, Status: ${success ? 'Sent' : 'Failed'}, Duration: ${duration || 0}ms\n`);
                } else {
                    totalFailed++;
                    batchFailed++;
                    const email = batch[index];
                    logStream.write(`${new Date().toISOString()} - To: ${email}, Status: Failed (Exception)\n`);
                }
            });

            // Calculate performance metrics
            const avgBatchDuration = totalBatchDuration / batch.length;
            const currentRate = Math.round((totalSent / ((Date.now() - campaignStartTime) / 60000)) || 0);

            // Log batch completion with essential info only
            console.log(`⚡ Batch ${Math.ceil((i + BATCH_SIZE) / BATCH_SIZE)} completed | Sent: ${batchSent}/${batch.length} | Total: ${totalSent}/${recipients.length} | Rate: ${currentRate}/min | Failed: ${totalFailed}`);
            logStream.write(`⚡ Batch ${Math.ceil((i + BATCH_SIZE) / BATCH_SIZE)} completed | Sent: ${batchSent}/${batch.length} | Total: ${totalSent}/${recipients.length} | Rate: ${currentRate}/min | Failed: ${totalFailed}`);

            // Add delay between batches to maintain 50+ emails per minute rate
            if (i + BATCH_SIZE < recipients.length) {
                let actualDelay = parseInt(delay, 10) || DELAY_BETWEEN_BATCHES;

                // Dynamic delay adjustment based on performance
                if (avgBatchDuration < 1000) {
                    actualDelay = Math.max(actualDelay * 0.8, 3000); // Speed up if processing is fast
                } else if (avgBatchDuration > 3000) {
                    actualDelay = Math.min(actualDelay * 1.2, 10000); // Slow down if struggling
                }

                await new Promise((resolve) => setTimeout(resolve, actualDelay));
            }
        }

        const campaignEndTime = new Date();
        const campaignDuration = campaignEndTime - campaignStartTime;

        // Log campaign completion activity
        await Activity.createCampaignActivity({
            user_id: req.user.id,
            username: req.user.username,
            activity_type: 'campaign_end',
            description: `Completed email campaign: "${subject}" - Sent: ${totalSent}, Failed: ${totalFailed}`,
            ip_address: req.user.ip_address,
            user_agent: req.user.user_agent,
            campaign_details: {
                recipients_count: recipients.length,
                emails_sent: totalSent,
                emails_failed: totalFailed,
                smtp_configs_used: smtpConfigs.length,
                campaign_duration: campaignDuration,
                subject: subject,
                status: 'completed'
            },
            metadata: {
                success_rate: ((totalSent / recipients.length) * 100).toFixed(2) + '%',
                emails_per_minute: Math.round((totalSent / (campaignDuration / 60000)) || 0)
            }
        });

        // Finalize campaign log
        logStream.write(`--- Campaign Ended: ${new Date().toISOString()} ---\n`);
        logStream.write(`Duration: ${Math.round(campaignDuration / 1000)} seconds\n`);
        logStream.write(`Success Rate: ${((totalSent / recipients.length) * 100).toFixed(2)}%\n`);
        logStream.write(`Sent: ${totalSent}, Failed: ${totalFailed}\n`);
        logStream.end();

        console.log(`✅ Campaign finished. Total Sent: ${totalSent}, Total Failed: ${totalFailed}, Duration: ${Math.round(campaignDuration / 1000)}s`);
        res.json({ 
            message: 'Email campaign processing finished.', 
            summary: `Sent: ${totalSent}, Failed: ${totalFailed}`,
            duration: Math.round(campaignDuration / 1000),
            success_rate: ((totalSent / recipients.length) * 100).toFixed(2) + '%'
        });

    } catch (error) {
        console.error('❌ Error processing email request:', error.message);
        res.status(500).send(`Internal server error: ${error.message}`);
    } finally {
        // Clean up temporary files
        if (req.files && req.files['Smtp'] && req.files['Smtp'][0]) {
            fs.unlink(req.files['Smtp'][0].path, err => { if (err) console.error("Error deleting SMTP temp file:", err); });
        }
        if (req.files && req.files['recipientFile'] && req.files['recipientFile'][0]) {
            fs.unlink(req.files['recipientFile'][0].path, err => { if (err) console.error("Error deleting recipient temp file:", err); });
        }
    }
});

// Campaign control endpoints
app.post('/pause', verifyUser, async (req, res) => {
    paused = true;
    console.log('⏸️ Email sending paused by request.');

    await Activity.create({
        user_id: req.user.id,
        username: req.user.username,
        activity_type: 'campaign_pause',
        description: 'Email campaign paused by user',
        ip_address: req.user.ip_address,
        user_agent: req.user.user_agent
    });

    res.send('Email sending paused.');
});

app.post('/resume', verifyUser, async (req, res) => {
    paused = false;
    console.log('▶️ Email sending resumed by request.');

    await Activity.create({
        user_id: req.user.id,
        username: req.user.username,
        activity_type: 'campaign_resume',
        description: 'Email campaign resumed by user',
        ip_address: req.user.ip_address,
        user_agent: req.user.user_agent
    });

    res.send('Email sending resumed.');
});

// User activity endpoints
app.get('/user/activities', verifyUser, async (req, res) => {
    try {
        const activities = await Activity.getByUserId(req.user.id);
        res.json(activities);
    } catch (error) {
        console.error('Error fetching user activities:', error);
        res.status(500).json({ message: 'Failed to fetch activities' });
    }
});

// User campaign statistics endpoint
app.get('/user/campaign-stats', verifyUser, async (req, res) => {
    try {
        const Activity = require('./models/activity');

        // Get campaign activities for the user
        const campaignActivities = await Activity.getCampaignActivities(req.user.id);

        // Calculate campaign statistics
        const totalCampaigns = campaignActivities.filter(a => a.activity_type === 'campaign_start').length;
        const completedCampaigns = campaignActivities.filter(a => a.activity_type === 'campaign_end');

        let totalEmails = 0;
        let totalFailed = 0;
        let totalDuration = 0;

        completedCampaigns.forEach(campaign => {
            if (campaign.campaign_details) {
                totalEmails += campaign.campaign_details.emails_sent || 0;
                totalFailed += campaign.campaign_details.emails_failed || 0;
                totalDuration += campaign.campaign_details.campaign_duration || 0;
            }
        });

        const successRate = totalEmails > 0 ? ((totalEmails / (totalEmails + totalFailed)) * 100).toFixed(2) : 0;
        const avgSpeed = completedCampaigns.length > 0 && totalDuration > 0 
            ? Math.round((totalEmails / (totalDuration / 60000))) 
            : 0;

        const stats = {
            totalCampaigns,
            totalEmails,
            totalFailed,
            successRate,
            avgSpeed,
            completedCampaigns: completedCampaigns.length,
            activeCampaigns: totalCampaigns - completedCampaigns.length
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching campaign stats:', error);
        res.status(500).json({ message: 'Failed to fetch campaign statistics' });
    }
});

// Auto-create admin user with default credentials
async function initAdminUser() {
    try {
        const adminUser = await User.findByUsername('admin');
        if (!adminUser) {
            await User.create({
                username: 'admin',
                password: 'Gte232555@',
                validity_start: '2023-01-01',
                validity_end: '2030-12-31',
                is_admin: true
            });
            console.log('✅ Admin user created successfully');
        } else {
            // Update existing admin user password to ensure consistency
            await User.update(adminUser._id, {
                password: 'Gte232555@'
            });
            console.log('✅ Admin user password updated');
        }
    } catch (error) {
        console.error('❌ Error creating/updating admin user:', error);
    }
}

// Initialize application with database and admin user
async function initializeApp() {
    await connectToDatabase();
    await initializeDatabase();
    await initAdminUser();
}

// Global error handlers for production stability
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Initialize and start the application
initializeApp().catch(console.error);

// Start server on port 3000
server.listen(3000, '0.0.0.0', (error) => {
    if (error) {
        console.error('❌ Server failed to start:', error);
        process.exit(1);
    }
    console.log('🚀 Server is running on http://0.0.0.0:3000');
});

module.exports = { replaceTags, generateDynamicValues };