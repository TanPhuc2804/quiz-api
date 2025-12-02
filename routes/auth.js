const express = require('express');
const { register, login } = require('../controllers/auth');
const router = express.Router();

// Test API endpoint
router.post('/register', register)
router.post('/login', login)
router.get('/logout', (req, res) => {
     res.cookie(
        "token",
        "",
        {
            httpOnly: true,
            secure: true,
            maxAge: 0,
            sameSite: "none",
            // domain: "quiz-api-mlyw.onrender.com",
            // path: '/'
        }).status(200).json({ status: true });
});
module.exports = router;