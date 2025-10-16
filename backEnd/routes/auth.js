const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { google } = require('googleapis');
const router = express.Router();

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Build user information object
        const user = {
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            picture: profile.photos[0].value,
            accessToken: accessToken,
            refreshToken: refreshToken,
            loginTime: new Date().toISOString()
        };
        
        console.log('Google login successful:', user.email);
        return done(null, user);
    } catch (error) {
        console.error('Google login failed:', error);
        return done(error, null);
    }
}));

// Serialize user info to session
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user info from session
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Check authentication status
router.get('/status', (req, res) => {
    res.json({
        isAuthenticated: !!req.session.user,
        user: req.session.user || null,
        message: req.session.user ? 'User is logged in' : 'User is not logged in'
    });
});

// Start Google OAuth login
router.get('/google', passport.authenticate('google', {
    scope: [
        'profile', 
        'email', 
        'https://www.googleapis.com/auth/gmail.readonly'
    ]
}));

// Handle Google OAuth callback
router.get('/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` 
    }),
    (req, res) => {
        // Login successful, save user info to session
        req.session.user = req.user;
        
        console.log('User login successful, redirecting to frontend');
        
        // Redirect to frontend email list page
        res.redirect(`${process.env.FRONTEND_URL}/emails`);
    }
);

// Logout route
router.post('/logout', (req, res) => {
    const userEmail = req.session.user?.email;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout failed:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        
        console.log('User logged out:', userEmail);
        res.json({ 
            success: true, 
            message: 'Logout successful' 
        });
    });
});

module.exports = router;