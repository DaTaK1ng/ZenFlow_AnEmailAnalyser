const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required' 
        });
    }
    next();
};

// Get user's Gmail messages
router.get('/emails', requireAuth, async (req, res) => {
    try {
        const user = req.session.user;
        
        // Get count parameter from query string, default to 20, max 100
        const requestedCount = parseInt(req.query.count) || 20;
        const maxResults = Math.min(Math.max(requestedCount, 1), 100); // Ensure between 1 and 100
        
        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Set credentials
        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        // Create Gmail API instance
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Get list of messages with user-specified count
        const messagesResponse = await gmail.users.messages.list({
            userId: 'me',
            maxResults: maxResults,
            q: 'in:inbox' // Only inbox messages
        });

        const messages = messagesResponse.data.messages || [];
        
        if (messages.length === 0) {
            return res.json({
                success: true,
                emails: [],
                message: 'No emails found'
            });
        }

        // Get detailed information for each message
        const emailPromises = messages.map(async (message) => {
            try {
                const messageDetail = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'metadata',
                    metadataHeaders: ['From', 'Subject', 'Date']
                });

                const headers = messageDetail.data.payload.headers;
                const fromHeader = headers.find(h => h.name === 'From');
                const subjectHeader = headers.find(h => h.name === 'Subject');
                const dateHeader = headers.find(h => h.name === 'Date');

                return {
                    id: message.id,
                    threadId: message.threadId,
                    from: fromHeader ? fromHeader.value : 'Unknown',
                    subject: subjectHeader ? subjectHeader.value : 'No Subject',
                    date: dateHeader ? dateHeader.value : new Date().toISOString(),
                    snippet: messageDetail.data.snippet || '',
                    labels: messageDetail.data.labelIds || []
                };
            } catch (error) {
                console.error(`Error fetching message ${message.id}:`, error.message);
                return {
                    id: message.id,
                    threadId: message.threadId,
                    from: 'Error loading',
                    subject: 'Error loading message',
                    date: new Date().toISOString(),
                    snippet: 'Could not load this message',
                    labels: []
                };
            }
        });

        const emails = await Promise.all(emailPromises);

        console.log(`Successfully fetched ${emails.length} emails (requested: ${maxResults}) for user: ${user.email}`);

        res.json({
            success: true,
            emails: emails,
            count: emails.length
        });

    } catch (error) {
        console.error('Error fetching Gmail messages:', error);
        
        // Handle token expiration
        if (error.code === 401) {
            return res.status(401).json({
                success: false,
                error: 'Authentication token expired. Please login again.',
                needReauth: true
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to fetch emails',
            details: error.message
        });
    }
});

// Get specific email content
router.get('/emails/:messageId', requireAuth, async (req, res) => {
    try {
        const user = req.session.user;
        const messageId = req.params.messageId;

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Set credentials
        oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        // Create Gmail API instance
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Get full message content
        const messageDetail = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full'
        });

        const message = messageDetail.data;
        const headers = message.payload.headers;
        
        // Extract headers
        const fromHeader = headers.find(h => h.name === 'From');
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const dateHeader = headers.find(h => h.name === 'Date');
        const toHeader = headers.find(h => h.name === 'To');

        // Extract body content
        let body = '';
        
        const extractBody = (payload) => {
            if (payload.body && payload.body.data) {
                return Buffer.from(payload.body.data, 'base64').toString('utf-8');
            }
            
            if (payload.parts) {
                for (const part of payload.parts) {
                    if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                        return Buffer.from(part.body.data, 'base64').toString('utf-8');
                    }
                    if (part.parts) {
                        const nestedBody = extractBody(part);
                        if (nestedBody) return nestedBody;
                    }
                }
            }
            
            return '';
        };

        body = extractBody(message.payload);

        const emailData = {
            id: message.id,
            threadId: message.threadId,
            from: fromHeader ? fromHeader.value : 'Unknown',
            to: toHeader ? toHeader.value : 'Unknown',
            subject: subjectHeader ? subjectHeader.value : 'No Subject',
            date: dateHeader ? dateHeader.value : new Date().toISOString(),
            snippet: message.snippet || '',
            body: body,
            labels: message.labelIds || []
        };

        console.log(`Successfully fetched email content for message: ${messageId}`);

        res.json({
            success: true,
            email: emailData
        });

    } catch (error) {
        console.error('Error fetching email content:', error);
        
        if (error.code === 401) {
            return res.status(401).json({
                success: false,
                error: 'Authentication token expired. Please login again.',
                needReauth: true
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to fetch email content',
            details: error.message
        });
    }
});

module.exports = router;