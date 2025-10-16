const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();  //load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;

// session middleware -- saving the user log in infos
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret',
    resave: false,
    saveUninitialized: false,
    cookie:{
      secure:false, 
      maxAge: 14*24*60*60*1000 //2 weeks
    }
}));

// Passport初始化
app.use(passport.initialize());
app.use(passport.session());

// middleware
// allow across origin requests
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}))

// Json middleware: let server understand Json data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// basic route: check if the server is running 
app.get('/',(req,res) => {
    res.json({
        message:'ZenFlow backend server is running',
        status:'running',
        version:'1.0.0 beta',
        user: req.session.user || null //show the user info if logged in
    })
})

// let the auth routes in 
//the auth routes manage the user's login and logout
app.use('/api/auth',require('./routes/auth'));

// Gmail API routes
app.use('/api/gmail', require('./routes/gmail'));

// Analysis routes (AI tasks extraction, quota, file download)
app.use('/api/analyze', require('./routes/analyze'));

// Email Api
app.get('/api/emails', (req,res) => {
    // check if the user login or not
    if(!req.session.user){
        return res.status(401).json({
            error:'user not login, please login first',
            needAuth:true
        })
    }

    // if login then return emails
    res.json({
      message:'get Email List',
      user:req.session.user.email,
      emails: [
        // simulate email data
        { id: 1, subject: 'Email 1', body: 'Content of Email 1' },
        { id: 2, subject: 'Email 2', body: 'Content of Email 2' },
      ] 
    })
})

// (Moved) AI analysis API is implemented in routes/analyze.js

// 404 handler
app.use(/.*/, (req, res) => {
    res.status(404).json({ 
        error: 'Cannot find the requested API endpoint',    
        path: req.originalUrl 
    });
});

// start the server
app.listen(port, () => {
    console.log(`🚀 ZenFlow backEnd Server is Running at http://localhost:${port}`);
    console.log(`📝 Env: ${process.env.NODE_ENV}`);
    console.log(`🌐 FrontEnd URL allowed: ${process.env.FRONTEND_URL}`);
});