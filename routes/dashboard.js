const express = require('express');
const { verifyAdmin } = require('../midlewares/verify');
const { getDashboardStats } = require('../controllers/dashboard');
const router = express.Router();

router.use(verifyAdmin);

router.get('/stats', getDashboardStats);

module.exports = router;