const express = require('express');
const { getUrlPayment, vnpayReturn } = require('../controllers/payment');
const { verifyLogin } = require('../midlewares/verify');
// const { getTotalQuestionByType, createExam, generateExamForUser,getTotalQuestionByTypeSafe, getRamdomExam, getDbLimits } = require('../services/services');

const router = express.Router();

router.use(verifyLogin);
router.post("/create-payment-url", getUrlPayment);
router.get("/vnpay_return", vnpayReturn);

module.exports = router;