const { AppError } = require("../error")
const userModel = require("../model/user")
const examModel = require("../model/exam")
const expressAsyncHandler = require("express-async-handler")
const getAllExam = expressAsyncHandler(async (req, res) => {
    const exams = await examModel.find({})
    const user = req.user;
    if (user) {
        const userId = user.id;
        const userData = await userModel.findById(userId);
        if (userData && userData.status !== "none") {
            const userExams = userData.exams.map(e => e.exam_id.toString());
            const filteredExams = exams.filter(exam => userExams.includes(exam._id.toString())).sort((a, b) => a.level - b.level);
            return res.json(filteredExams);
        }
    }
    if (!exams) {
        throw new AppError("No exam found", 404)
    }
    res.json(exams)
})

const getById = expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const exam = await examModel.findById(id);
    const user = req.user;
    let userExams = [];
    if (user) {
        const userId = user.id;
        const userData = await userModel.findById(userId);
        if (userData && userData.status !== "none") {
            userExams = userData.exams.find(e => e.exam_id.toString() === id);
        }
    }
    if (!exam) {
        throw new AppError("Exam not found", 404);
    }
    res.json({ exams: exam, attempts: userExams });
});



module.exports = { getAllExam, getById }