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
            maxAge: 60 * 60 * 1000,
            sameSite: "none",
            domain: "quiz-api-mlyw.onrender.com"
        }).status(200).json({ status: true });
});
module.exports = router;