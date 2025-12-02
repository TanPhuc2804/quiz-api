const express = require('express');
const { getAllExam, getById } = require('../controllers/exam');
const { checkUser } = require('../midlewares/verify');
const router = express.Router();

router.get("/", checkUser, getAllExam);
router.get("/:id", checkUser, getById);

module.exports = router;