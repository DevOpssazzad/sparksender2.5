const express = require('express');
const multer = require('multer');
const { verifyUser } = require('../middleware/auth');
const { sendEmail, replaceTags, generateDynamicValues, generateAttachment } = require('../utils/emailUtils');
const fs = require('fs');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Email sending route (protected)
router.post('/send', verifyUser, upload.fields([
    { name: 'Smtp', maxCount: 1 },
    { name: 'recipientFile', maxCount: 1 }
]), async (req, res) => {
    // Email sending logic will be handled in main index.js
    // This is just to ensure the route is protected
    res.json({ message: 'Email route accessed successfully' });
});

module.exports = router;
