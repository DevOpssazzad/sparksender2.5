const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const axios = require('axios');

// PDF generation options optimized for legal size documents
const PDF_OPTIONS = {
    format: 'Legal',
    margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
    },
    scale: 1,
    printBackground: true,
};

// Tag replacement function for dynamic content substitution
const replaceTags = (text, dynamicValues) => {
    if (typeof text !== 'string') return '';
    let processedText = text;

    // Define all available placeholder tags
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
        '#TFN#': dynamicValues.tfn,
        '#FIRSTNAME#': dynamicValues.fullName ? dynamicValues.fullName.split(' ')[0] : '',
        '#LASTNAME#': dynamicValues.fullName ? dynamicValues.fullName.split(' ').slice(1).join(' ') : '',
        '#TOTAL#': dynamicValues.price && dynamicValues.quantity ? (parseFloat(dynamicValues.price) * parseInt(dynamicValues.quantity)).toFixed(2) : dynamicValues.price,
        '#COMPANY#': dynamicValues.supportEmail ? dynamicValues.supportEmail.split('@')[1].split('.')[0] : 'Company',
        '#TIME#': new Date().toLocaleTimeString(),
        '#DATETIME#': new Date().toLocaleString()
    };

    // Replace all tags in the text
    for (const tag in tags) {
        if (tags[tag] !== undefined) {
            processedText = processedText.replace(new RegExp(tag, 'g'), tags[tag]);
        }
    }
    return processedText;
};

// Product catalog for realistic dynamic values
const productCatalog = [
    { product_name: 'Visa Gift Card', price_per_item: '20.00' },
    { product_name: 'Premium Subscription', price_per_item: '50.00' },
    { product_name: 'USB-C Charging Cable', price_per_item: '9.99' },
    { product_name: 'Smartphone Stand', price_per_item: '14.99' },
    { product_name: 'Portable SSD 1TB', price_per_item: '109.00' },
    { product_name: 'Laptop Cooling Pad', price_per_item: '25.50' },
    { product_name: 'Wireless Mouse', price_per_item: '17.99' },
    { product_name: 'Mechanical Keyboard', price_per_item: '89.99' },
    { product_name: '4K Action Camera', price_per_item: '139.00' },
    { product_name: 'Gaming Chair', price_per_item: '199.00' },
    { product_name: 'LED Desk Lamp', price_per_item: '29.95' },
    { product_name: 'Electric Toothbrush', price_per_item: '49.00' },
    { product_name: 'Hair Dryer', price_per_item: '39.95' },
    { product_name: 'Blender 700W', price_per_item: '59.99' },
    { product_name: 'Air Fryer XL', price_per_item: '89.00' },
    { product_name: 'Coffee Maker 12-Cup', price_per_item: '45.00' },
    { product_name: 'Toaster 4-Slice', price_per_item: '29.00' },
    { product_name: 'Smart Light Bulb', price_per_item: '12.99' },
    { product_name: 'HDMI Cable 6ft', price_per_item: '7.99' },
    { product_name: 'Portable Power Bank 10000mAh', price_per_item: '21.99' },
    { product_name: 'Smart Watch', price_per_item: '129.00' },
    { product_name: 'Water Bottle 1L', price_per_item: '18.99' },
    { product_name: 'Fitness Tracker Band', price_per_item: '34.99' },
    { product_name: 'Phone Case', price_per_item: '11.99' },
    { product_name: 'Wireless Earbuds', price_per_item: '49.99' },
    { product_name: 'Tripod Stand', price_per_item: '23.50' },
    { product_name: 'Online Course: JavaScript Mastery', price_per_item: '79.00' },
    { product_name: 'E-book: Startup Secrets', price_per_item: '14.99' },
    { product_name: 'Cloud Storage 100GB (1 Year)', price_per_item: '29.00' },
    { product_name: 'VPN Annual Plan', price_per_item: '59.00' },
    { product_name: 'Antivirus License (1 Year)', price_per_item: '34.99' },
    { product_name: 'Photo Editing Software', price_per_item: '89.00' },
    { product_name: 'Language Learning App (Lifetime)', price_per_item: '129.00' },
    { product_name: 'Office Chair', price_per_item: '139.00' },
    { product_name: 'Ergonomic Mouse Pad', price_per_item: '8.99' },
    { product_name: 'Whiteboard Set', price_per_item: '49.00' },
    { product_name: 'Desk Organizer', price_per_item: '19.99' },
    { product_name: 'Notebook (Set of 3)', price_per_item: '12.00' },
    { product_name: 'Ballpoint Pen Pack', price_per_item: '6.00' },
    { product_name: 'Subscription: Design Assets', price_per_item: '39.00' },
    { product_name: 'Domain Name (1 Year)', price_per_item: '10.99' },
    { product_name: 'Hosting Plan (Basic)', price_per_item: '59.00' },
    { product_name: 'Electric Kettle', price_per_item: '34.00' },
    { product_name: 'Cooking Utensil Set', price_per_item: '29.95' },
    { product_name: 'Yoga Mat', price_per_item: '25.00' },
    { product_name: 'Resistance Bands', price_per_item: '19.99' },
    { product_name: 'Adjustable Dumbbells', price_per_item: '119.00' },
    { product_name: 'Jump Rope', price_per_item: '9.50' },
    { product_name: 'Foam Roller', price_per_item: '21.00' },
    { product_name: 'Sleeping Bag', price_per_item: '59.00' },
    { product_name: 'Camping Tent', price_per_item: '139.00' },
    { product_name: 'Luggage Set (3 pcs)', price_per_item: '189.00' },
    { product_name: 'Travel Pillow', price_per_item: '15.00' },
    { product_name: 'Smart Thermostat', price_per_item: '149.00' },
    { product_name: 'Electric Blanket', price_per_item: '49.00' },
    { product_name: 'Robot Vacuum', price_per_item: '249.00' },
    { product_name: 'Digital Wall Clock', price_per_item: '29.99' },
    { product_name: 'Streaming Subscription (6 months)', price_per_item: '59.00' },
    { product_name: 'Photo Frame Set', price_per_item: '22.00' },
    { product_name: 'Wall Art Canvas', price_per_item: '39.00' },
    { product_name: 'Throw Blanket', price_per_item: '24.99' },
    { product_name: 'Table Lamp', price_per_item: '32.50' },
    { product_name: 'USB Flash Drive 64GB', price_per_item: '12.99' },
    { product_name: 'Bluetooth Car Adapter', price_per_item: '16.50' },
    { product_name: 'Smart Plug (2 Pack)', price_per_item: '24.99' },
    { product_name: 'Surge Protector Power Strip', price_per_item: '22.00' },
    { product_name: 'Cordless Drill Set', price_per_item: '79.00' },
    { product_name: 'Tool Kit 39-Piece', price_per_item: '59.00' },
    { product_name: 'Electric Screwdriver', price_per_item: '35.00' },
    { product_name: 'Smart Doorbell', price_per_item: '89.00' },
    { product_name: 'Wi-Fi Range Extender', price_per_item: '45.00' },
    { product_name: 'Pet Grooming Kit', price_per_item: '29.00' },
    { product_name: 'Cat Scratching Post', price_per_item: '34.00' },
    { product_name: 'Dog Bed (Large)', price_per_item: '59.99' },
    { product_name: 'Bird Feeder', price_per_item: '19.00' },
    { product_name: 'Plant Grow Light', price_per_item: '49.00' },
    { product_name: 'Indoor Plant Kit', price_per_item: '35.00' },
    { product_name: 'Gardening Tool Set', price_per_item: '39.99' },
    { product_name: 'Hammock Chair', price_per_item: '79.00' },
    { product_name: 'Outdoor String Lights', price_per_item: '29.99' },
    { product_name: 'BBQ Grill Set', price_per_item: '55.00' },
    { product_name: 'Wireless Door Sensor', price_per_item: '19.99' },
    { product_name: 'Fingerprint Lock', price_per_item: '89.00' },
    { product_name: 'Dash Cam', price_per_item: '99.00' },
    { product_name: 'LED Strip Lights', price_per_item: '19.95' },
    { product_name: 'HD Web Camera', price_per_item: '45.00' },
    { product_name: 'Smart Scale', price_per_item: '39.00' },
    { product_name: 'Virtual Fitness Class Pass', price_per_item: '69.00' },
    { product_name: '3D Puzzle Set', price_per_item: '24.00' },
    { product_name: 'Kids Educational Tablet', price_per_item: '129.00' },
    { product_name: 'Board Game Set', price_per_item: '29.99' },
    { product_name: 'Noise Cancelling Headphones', price_per_item: '179.00' },
    { product_name: 'Digital Drawing Tablet', price_per_item: '99.00' },
    { product_name: 'Streaming Microphone', price_per_item: '79.00' },
    { product_name: 'Mini Projector', price_per_item: '119.00' },
    { product_name: 'Home Theater System', price_per_item: '249.00' },
    { product_name: 'Gift Box: Chocolate Deluxe', price_per_item: '34.00' },
    { product_name: 'Wine Glass Set (4 pcs)', price_per_item: '44.00' }
];

// Fallback names for when API is unavailable
const fallbackNames = [
    'John Smith', 'Jane Doe', 'Michael Johnson', 'Sarah Williams', 'David Brown',
    'Emma Jones', 'Robert Garcia', 'Lisa Miller', 'William Davis', 'Mary Rodriguez' ,
    'James Martinez', 'Patricia Hernandez', 'Christopher Lopez', 'Jennifer Gonzalez',
    'Daniel Wilson', 'Elizabeth Anderson', 'Thomas Thomas', 'Michelle Jackson'
];

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

        const now = new Date();
        const timestamp = Date.now();

        // Try to get realistic user data from API with timeout
        let userData = null;
        let fullName = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
        let location = 'New York, NY, USA';

        try {
            const userRes = await axios.get('https://randomuser.me/api/?nat=us', { timeout: 3000 });
            if (userRes.data && userRes.data.results && userRes.data.results.length > 0) {
                userData = userRes.data.results[0];
                const firstName = userData.name.first;
                const lastName = userData.name.last;
                fullName = `${firstName} ${lastName}`;

                const streetAddress = `${userData.location.street.number} ${userData.location.street.name}`;
                const city = userData.location.city;
                const state = userData.location.state;
                const country = userData.location.country;
                const zipCode = userData.location.postcode;
                location = `${streetAddress}, ${city}, ${state}, ${country}, ${zipCode}`;
            }
        } catch (apiError) {
            // Use fallback data if API fails
            console.warn('⚠️ Random User API failed, using fallback data');
        }

        // Select random product from catalog
        const product = productCatalog[Math.floor(Math.random() * productCatalog.length)];

        // Format transaction date
        const transactionDate = `${now.getDate()} ${now.toLocaleString('en-GB', { month: 'long' })} ${now.getFullYear()}`;

        // Calculate estimated delivery (3 days from now)
        const deliveryDate = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
        const estimatedDelivery = `${deliveryDate.getDate()} ${deliveryDate.toLocaleString('en-GB', { month: 'long' })} ${deliveryDate.getFullYear()}`;

        // Generate comprehensive dynamic values
        const dynamicValues = {
            fullName,
            emailAddress: recipientEmail || `user${Math.floor(Math.random() * 1000)}@example.com`,
            accountId: `UID-${timestamp}-${Math.floor(Math.random() * 1000000)}`,
            customerId: `CUS-${Math.floor(Math.random() * 1000000)}`,
            productName: product.product_name,
            price: product.price_per_item,
            quantity: Math.floor(Math.random() * 3) + 1,
            orderNumber: `ORD-${timestamp}-${Math.floor(Math.random() * 1000000)}`,
            transactionNo: `TXN-${timestamp}-${Math.floor(Math.random() * 1000000)}`,
            invoiceNumber: `INV-${timestamp}-${Math.floor(Math.random() * 1000000)}`,
            transactionDate,
            supportEmail: senderEmail || 'support@company.com',
            unsubscribeLink: `https://company.com/unsubscribe?email=${encodeURIComponent(recipientEmail || 'user@example.com')}&id=${timestamp}`,
            currentYear: now.getFullYear(),
            emailSignature: `Best regards,<br>${senderName || 'Customer Support'}<br>Department of Sales<br>Email: ${senderEmail || 'support@company.com'}`,
            shippingMethod: ['Standard Delivery', 'Express Shipping', 'Priority Mail'][Math.floor(Math.random() * 3)],
            estimatedDelivery,
            paymentMethod: ['Credit Card', 'PayPal', 'Bank Transfer', 'Apple Pay', 'Google Pay'][Math.floor(Math.random() * 5)],
            discountCode: `DISC-${Math.floor(Math.random() * 9999)}`,
            referralCode: `REF-${fullName.split(' ')[0].slice(0, 3).toUpperCase()}${Math.floor(Math.random() * 9999)}`,
            ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            location,
            browser: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'][Math.floor(Math.random() * 5)],
            deviceType: ['Desktop', 'Mobile', 'Tablet'][Math.floor(Math.random() * 3)],
            os: ['Windows', 'macOS', 'Linux', 'iOS', 'Android'][Math.floor(Math.random() * 5)],
            lastLogin: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
            accountStatus: ['Active', 'Premium', 'Trial', 'Pending'][Math.floor(Math.random() * 4)],
            language: ['English', 'Spanish', 'French', 'German', 'Italian'][Math.floor(Math.random() * 5)],
            timezone: ['UTC', 'EST', 'PST', 'GMT', 'CET'][Math.floor(Math.random() * 5)],
            tfn: tfn || '',
            campaignId: `CAMP_${Math.random().toString(36).substr(2, 8).toUpperCase()}`
        };

        return dynamicValues;
    } catch (error) {
        console.error('❌ Error generating dynamic values:', error.message);

        // Enhanced fallback values
        const now = new Date();
        const timestamp = Date.now();
        const fallbackProduct = productCatalog[Math.floor(Math.random() * productCatalog.length)];

        return {
            fullName: fallbackNames[Math.floor(Math.random() * fallbackNames.length)],
            emailAddress: recipientEmail || `user${Math.floor(Math.random() * 1000)}@example.com`,
            accountId: `UID-${timestamp}-fallback`,
            customerId: `CUS-fallback-${Math.floor(Math.random() * 1000000)}`,
            productName: fallbackProduct.product_name,
            price: fallbackProduct.price_per_item,
            quantity: 1,
            orderNumber: `ORD-${timestamp}-fallback`,
            transactionNo: `TXN-${timestamp}-fallback`,
            invoiceNumber: `INV-${timestamp}-fallback`,
            transactionDate: now.toLocaleDateString(),
            supportEmail: senderEmail || 'support@example.com',
            unsubscribeLink: `https://company.com/unsubscribe?email=${encodeURIComponent(recipientEmail || 'user@example.com')}&id=${timestamp}-fallback`,
            currentYear: now.getFullYear(),
            emailSignature: `Best regards,<br>${senderName || 'Customer Support'}<br>Email: ${senderEmail || 'support@example.com'}`,
            shippingMethod: 'Standard Delivery',
            estimatedDelivery: '3-5 business days',
            paymentMethod: 'Credit Card',
            discountCode: 'NONE',
            referralCode: 'NONE',
            ipAddress: '192.168.1.1',
            location: 'New York, NY, USA',
            browser: 'Chrome',
            deviceType: 'Desktop',
            os: 'Windows',
            lastLogin: now.toLocaleString(),
            accountStatus: 'Active',
            language: 'English',
            timezone: 'GMT',
            tfn: tfn || '',
            campaignId: `fallback-campaign-${timestamp}`
        };
    }
}

// Global browser instance for PDF generation with optimized page pooling
let browser = null;
let browserInitPromise = null;
let pagePool = [];
const MAX_PAGE_POOL_SIZE = 5; // Pool of 5 pages for concurrent attachment generation

// Initialize browser instance with optimized settings
async function getBrowserInstance() {
    if (browser && browser.connected) {
        return browser;
    }

    if (browserInitPromise) {
        return browserInitPromise;
    }

    browserInitPromise = (async () => {
        try {
            const isWindows = process.platform === 'win32';
            const launchOptions = {
                headless: 'new',
                timeout: 30000,
                args: []
            };

            // Platform-specific optimizations for maximum performance
            if (isWindows) {
                launchOptions.args = [
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-dev-shm-usage',
                    '--no-first-run',
                    '--disable-default-apps',
                    '--disable-extensions',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-ipc-flooding-protection',
                    '--disable-features=TranslateUI',
                    '--disable-features=BlinkGenPropertyTrees',
                    '--run-all-compositor-stages-before-draw',
                    '--disable-new-content-rendering-timeout'
                ];
            } else {
                launchOptions.args = [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-ipc-flooding-protection',
                    '--disable-features=TranslateUI',
                    '--disable-features=BlinkGenPropertyTrees',
                    '--run-all-compositor-stages-before-draw',
                    '--disable-new-content-rendering-timeout'
                ];
            }

            console.log(`🚀 Launching high-performance browser on ${process.platform}...`);
            browser = await puppeteer.launch(launchOptions);

            // Pre-create page pool for concurrent attachment generation
            console.log('🔄 Creating page pool for superfast attachment generation...');
            for (let i = 0; i < MAX_PAGE_POOL_SIZE; i++) {
                try {
                    const page = await browser.newPage();
                    await page.setDefaultNavigationTimeout(10000);
                    pagePool.push(page);
                } catch (error) {
                    console.warn(`⚠️ Failed to create page ${i + 1} in pool:`, error.message);
                }
            }
            console.log(`✅ Created page pool with ${pagePool.length} pages for concurrent processing`);

            // Handle browser disconnect events
            browser.on('disconnected', () => {
                console.log('🔄 Browser disconnected, resetting instance');
                browser = null;
                browserInitPromise = null;
                pagePool = [];
            });

            return browser;
        } catch (error) {
            console.error('❌ Failed to launch browser:', error);
            browser = null;
            browserInitPromise = null;
            pagePool = [];
            throw error;
        }
    })();

    return browserInitPromise;
}

// Get a page from the pool for concurrent processing
async function getPageFromPool() {
    try {
        if (pagePool.length > 0) {
            return pagePool.pop();
        }

        // If pool is empty, create new page
        const browserInstance = await getBrowserInstance();
        const page = await browserInstance.newPage();
        await page.setDefaultNavigationTimeout(10000);
        return page;
    } catch (error) {
        console.error('❌ Error getting page from pool:', error);
        throw error;
    }
}

// Return page to pool for reuse
function returnPageToPool(page) {
    try {
        if (pagePool.length < MAX_PAGE_POOL_SIZE && page && !page.isClosed()) {
            pagePool.push(page);
        } else if (page && !page.isClosed()) {
            page.close().catch(console.error);
        }
    } catch (error) {
        console.error('❌ Error returning page to pool:', error);
    }
}

// Superfast attachment generation with concurrent processing
async function generateAttachment(html, dynamicValues) {
    const startTime = Date.now();

    // Replace all tags in attachment HTML
    const processedHtml = replaceTags(html, dynamicValues);

    // Wrap HTML with optimized styling for faster rendering
    const wrappedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0}html,body{background:#fff!important;color:#000;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${processedHtml}</body></html>`;

    let page = null;
    try {
        // Get page from pool for concurrent processing
        page = await getPageFromPool();

        // Set content with minimal wait time for maximum speed
        await page.setContent(wrappedHtml, { 
            waitUntil: 'domcontentloaded',
            timeout: 8000 
        });

        // Generate PDF with optimized settings for speed
        const buffer = await page.pdf({
            ...PDF_OPTIONS,
            timeout: 10000,
            omitBackground: false,
            preferCSSPageSize: true
        });

        const duration = Date.now() - startTime;
        console.log(`⚡ PDF generated in ${duration}ms`);
        return buffer;

    } catch (error) {
        console.error('❌ Error generating PDF:', error);

        // Reset browser instance on critical errors
        if (error.message.includes('Target closed') || 
            error.message.includes('Session closed') ||
            error.message.includes('Connection closed')) {
            console.log('🔄 Resetting browser due to critical error');
            if (browser) {
                try {
                    await browser.close();
                } catch (closeError) {
                    console.error('❌ Error closing browser:', closeError);
                }
            }
            browser = null;
            browserInitPromise = null;
            pagePool = [];
        }

        throw error;
    } finally {
        // Return page to pool for reuse
        if (page) {
            returnPageToPool(page);
        }
    }
}

// Batch attachment generation for 5 concurrent attachments
async function generateAttachmentsBatch(attachmentRequests) {
    try {
        console.log(`🚀 Generating ${attachmentRequests.length} attachments concurrently...`);
        const startTime = Date.now();

        // Process all attachments concurrently
        const attachmentPromises = attachmentRequests.map(async (request) => {
            try {
                const buffer = await generateAttachment(request.html, request.dynamicValues);
                return {
                    success: true,
                    buffer,
                    filename: request.filename || `${request.dynamicValues.orderNumber || 'attachment'}.pdf`
                };
            } catch (error) {
                console.error(`❌ Failed to generate attachment for ${request.dynamicValues.emailAddress}:`, error.message);
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Wait for all attachments to complete
        const results = await Promise.all(attachmentPromises);

        const duration = Date.now() - startTime;
        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Generated ${successCount}/${attachmentRequests.length} attachments in ${duration}ms`);

        return results;
    } catch (error) {
        console.error('❌ Error in batch attachment generation:', error);
        throw error;
    }
}

// Cleanup function for graceful shutdown
async function cleanup() {
    if (browser) {
        try {
            console.log('🧹 Closing browser for cleanup...');
            await browser.close();
            browser = null;
            browserInitPromise = null;
            pagePool = [];
            console.log('✅ Browser cleanup completed');
        } catch (error) {
            console.error('❌ Error during browser cleanup:', error);
        }
    }
}

// Global SMTP connection pool management
const smtpPools = new Map();
const CONNECTION_LIMITS = {
    maxConnections: 5,
    maxMessages: 200,
    rateDelta: 500,
    rateLimit: 25,
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
    idleTimeout: 30000
};

// Get or create SMTP transporter with optimized pooling
function getSmtpTransporter(smtpCredentials) {
    const poolKey = `${smtpCredentials.SMTP_HOST}:${smtpCredentials.SMTP_PORT}:${smtpCredentials.SMTP_USER}`;

    if (smtpPools.has(poolKey)) {
        const existingPool = smtpPools.get(poolKey);
        // Check if the pool is still valid
        if (existingPool && !existingPool.closed) {
            return existingPool;
        } else {
            smtpPools.delete(poolKey);
        }
    }

    // Create new optimized transporter with enhanced connection pooling
    const transporter = nodemailer.createTransport({
        host: smtpCredentials.SMTP_HOST,
        port: parseInt(smtpCredentials.SMTP_PORT, 10) || 587,
        secure: smtpCredentials.SMTP_SECURE === 'true',
        auth: {
            user: smtpCredentials.SMTP_USER,
            pass: smtpCredentials.SMTP_PASS
        },
        pool: true,
        maxConnections: CONNECTION_LIMITS.maxConnections,
        maxMessages: CONNECTION_LIMITS.maxMessages,
        rateDelta: CONNECTION_LIMITS.rateDelta,
        rateLimit: CONNECTION_LIMITS.rateLimit,
        connectionTimeout: CONNECTION_LIMITS.connectionTimeout,
        greetingTimeout: CONNECTION_LIMITS.greetingTimeout,
        socketTimeout: CONNECTION_LIMITS.socketTimeout,
        idleTimeout: CONNECTION_LIMITS.idleTimeout,
        // Enhanced settings to prevent 421 errors
        pool: true,
        debug: false,
        logger: false,
        // Connection keep-alive settings
        keepAlive: true,
        // Retry settings for failed connections
        retries: 2,
        retryDelay: 1000,
        // Additional settings for better reliability
        disableFileAccess: true,
        disableUrlAccess: true,
        // Custom handling for connection errors
        connectionPool: {
            maxConnections: CONNECTION_LIMITS.maxConnections,
            maxMessages: CONNECTION_LIMITS.maxMessages,
            maxIdleTime: CONNECTION_LIMITS.idleTimeout
        }
    });

    // Add error handling for the transporter
    transporter.on('error', (error) => {
        console.error(`❌ SMTP Pool Error for ${poolKey}:`, error.message);
        if (error.code === 'EMAXCONNECTIONS' || error.responseCode === 421) {
            console.log(`🔄 Cleaning up SMTP pool for ${poolKey} due to connection limit`);
            smtpPools.delete(poolKey);
        }
    });

    // Store in pool
    smtpPools.set(poolKey, transporter);
    console.log(`✅ Created new SMTP pool for ${poolKey}`);    return transporter;
}

// Enhanced email sending function with optimized connection reuse
async function sendEmail(toEmail, subject, htmlBody, smtpCredentials, dynamicValues, attachmentHtml, fromName, trackingData = null) {
    const startTime = Date.now();
    let transporter = null;

    try {
        // Process all tags in subject and body
        const processedSubject = replaceTags(subject, dynamicValues);
        let processedHtmlBody = replaceTags(htmlBody, dynamicValues);

        // Add tracking pixel if tracking data is provided
        if (trackingData) {
            // Get the proper tracking domain
            let trackingDomain = 'workspace.mewole7334.replit.app'; // Use your actual Replit domain

            // Fallback domain detection
            if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
                trackingDomain = `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app`;
            } else if (process.env.REPLIT_DEV_DOMAIN) {
                trackingDomain = process.env.REPLIT_DEV_DOMAIN;
            }

            const protocol = 'https';
            // Ensure tracking ID is URL-safe
            const cleanTrackingId = trackingData.tracking_id.replace(/[^a-zA-Z0-9_-]/g, '');
            const trackingUrl = `${protocol}://${trackingDomain}/track/${cleanTrackingId}`;

            // Simple, reliable tracking pixel - single line to avoid encoding issues
            const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;position:absolute;top:-999px;left:-999px;" alt="">`;

            // Insert tracking pixel strategically
            if (processedHtmlBody.includes('</body>')) {
                processedHtmlBody = processedHtmlBody.replace('</body>', `${trackingPixel}</body>`);
            } else if (processedHtmlBody.includes('</html>')) {
                processedHtmlBody = processedHtmlBody.replace('</html>', `${trackingPixel}</html>`);
            } else {
                // Append to end as fallback
                processedHtmlBody += trackingPixel;
            }
        }

        // Create text version without HTML tags
        const textBody = processedHtmlBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const unsubscribeUrl = dynamicValues.unsubscribeLink;

        // Generate message ID for email tracking
        const domain = smtpCredentials.FROM_EMAIL.split('@')[1] || 'company.com';
        const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${domain}>`;

        // Get optimized transporter with connection pooling
        transporter = getSmtpTransporter(smtpCredentials);

        // Prepare mail options
        const mailOptions = {
            from: `"${fromName}" <${smtpCredentials.FROM_EMAIL}>`,
            to: `"${dynamicValues.fullName}" <${toEmail}>`,
            subject: processedSubject,
            text: textBody,
            html: processedHtmlBody,
            messageId: messageId,
            headers: {
                'List-Unsubscribe': `<${unsubscribeUrl}>, <mailto:${smtpCredentials.FROM_EMAIL}?subject=unsubscribe&body=Unsubscribe%20me%20from%20list>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN, AutoReply',
                'Feedback-ID': `${dynamicValues.campaignId}:${dynamicValues.orderNumber || dynamicValues.transactionNo}:${toEmail.replace('@','_at_')}@${domain}`,
            },
            dsn: {
                id: messageId,
                return: 'headers',
                notify: ['failure', 'delay'],
                recipient: smtpCredentials.FROM_EMAIL
            }
        };

        // Handle attachments if provided
        if (attachmentHtml) {
            try {
                // Always generate attachment with recipient-specific dynamic values
                console.log(`📎 Generating personalized attachment for ${toEmail}`);
                const attachmentContent = await generateAttachment(attachmentHtml, dynamicValues);

                if (attachmentContent) {
                    mailOptions.attachments = [{
                        filename: `${dynamicValues.orderNumber || 'attachment'}.pdf`,
                        content: attachmentContent,
                        contentType: 'application/pdf',
                        contentDisposition: 'attachment'
                    }];
                }
                console.log(`✅ Personalized attachment added to email for ${toEmail}`);
            } catch (error) {
                console.error(`❌ Error generating PDF attachment for ${toEmail}:`, error.message);
                // Continue sending email without attachment if PDF generation fails
            }
        }

        // Send email
        await transporter.sendMail(mailOptions);
        const duration = Date.now() - startTime;
        console.log(`📧 Email sent successfully to ${toEmail} in ${duration}ms`);
        return true;

    } catch (error) {
        console.error(`❌ Failed to send email to ${toEmail} via ${smtpCredentials.SMTP_NAME}:`);
        console.error(`   Error Code: ${error.code || 'Unknown'}`);
        console.error(`   Response Code: ${error.responseCode || 'Unknown'}`);
        console.error(`   Error Message: ${error.message}`);

        // Log SMTP connection details for debugging
        console.error(`   SMTP Host: ${smtpCredentials.SMTP_HOST}:${smtpCredentials.SMTP_PORT}`);
        console.error(`   SMTP User: ${smtpCredentials.SMTP_USER}`);
        console.error(`   SMTP Secure: ${smtpCredentials.SMTP_SECURE}`);

        // Mark SMTP as failed for authentication errors
        if (error.code === 'EAUTH' || (error.responseCode && (error.responseCode === 535 || error.responseCode === 454))) {
            console.error(`   ⚠️ Marking SMTP ${smtpCredentials.SMTP_NAME} as auth failed`);
            smtpCredentials.authFailed = true;
        }
        return false;
    }
}

// Handle process termination gracefully
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Email Campaign Manager card code injection and redesign
// Add Email Campaign Manager card with progress tracking and logs
// Add Email Campaign Manager card with progress tracking and logs
// Add Email Campaign Manager card with progress tracking and logs
const emailCampaignManagerHTML = `
<div class="card shadow mb-4">
    <div class="card-header py-3">
        <h6 class="m-0 font-weight-bold text-primary">📧 Email Campaign Manager</h6>
    </div>
    <div class="card-body">
        <div class="form-group">
            <label for="smtpSelect">SMTP Configuration:</label>
            <select class="form-control" id="smtpSelect">
                <option value="">Select SMTP Server</option>
                <option value="smtp1">SMTP Server 1</option>
                <option value="smtp2">SMTP Server 2</option>
                <option value="smtp3">SMTP Server 3</option>
            </select>
        </div>
        <div class="form-group">
            <label for="recipientList">Recipient Email Addresses (one per line):</label>
            <textarea class="form-control" id="recipientList" rows="5" placeholder="user1@example.com\nuser2@example.com"></textarea>
        </div>
        <div class="form-group">
            <label for="emailSubject">Email Subject:</label>
            <input type="text" class="form-control" id="emailSubject" placeholder="Important Announcement">
        </div>
        <div class="form-group">
            <label for="emailBody">Email Body:</label>
            <textarea class="form-control" id="emailBody" rows="7" placeholder="Write your email content here..."></textarea>
        </div>
        <div class="form-group">
            <label for="attachmentHtml">Attachment HTML (optional):</label>
            <textarea class="form-control" id="attachmentHtml" rows="3" placeholder="HTML content for PDF attachment..."></textarea>
        </div>
        <div class="form-group">
            <label for="fromName">Sender Name:</label>
            <input type="text" class="form-control" id="fromName" placeholder="Your Name">
        </div>
        <button id="sendEmailsBtn" class="btn btn-primary">
            Send Emails
        </button>
        <div id="batchProgress" style="display: inline-block; margin-left: 20px; font-weight: bold; color: #007bff; font-size: 14px;"></div>
    </div>
</div>

<div class="card shadow mb-4">
    <div class="card-header py-3">
        <h6 class="m-0 font-weight-bold text-primary">📊 Campaign Progress & Logs</h6>
    </div>
    <div class="card-body">
        <div id="campaignStats">
            <strong>Total Emails Sent:</strong> <span id="totalSent">0</span><br>
            <strong>Successful Deliveries:</strong> <span id="successfulDeliveries">0</span><br>
            <strong>Failed Deliveries:</strong> <span id="failedDeliveries">0</span>
        </div>
        <hr>
        <h6>Logs:</h6>
        <div id="emailLogs">
            <!-- Logs will be appended here -->
        </div>
    </div>
</div>
`;

module.exports = { 
    sendEmail, 
    replaceTags, 
    generateDynamicValues, 
    generateAttachment,
    generateAttachmentsBatch,
    getBrowserInstance,
    cleanup,
    emailCampaignManagerHTML
};