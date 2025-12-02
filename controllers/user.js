const { AppError } = require("../error")
const userModel = require("../model/user")
const examResult = require("../model/examResult")
const expressAsyncHandler = require("express-async-handler");
const user = require("../model/user");


const getUserExamResults = expressAsyncHandler(async (req, res) => {
    const userId = req.user.id
    const results = await examResult.find({ user_id: userId })
    if (!results) {
        throw new AppError("No exam results found for this user", 404);
    }
    res.json(results);
});

const getExamResultDetailByUser = expressAsyncHandler(async (req, res) => {
    const userId = req.user.id
    const { resultId } = req.params;
    const result = await examResult.find({ exam: resultId, user_id: userId });
    if (!result) {
        throw new AppError("Exam result not found", 404);
    }
    res.json(result);
});

const saveResultExam = expressAsyncHandler(async (req, res) => {
    const idUser = req.user.id
    const { exam, result_detail, mode } = req.body

    const userData = await userModel.findById(idUser);
    const getExam = userData.exams.find(examItem => examItem.exam_id.toString() === exam);
    if (!getExam && userData.status !== "none") {
        throw new AppError('Bài thi không tồn tại trong tài khoản của bạn, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 404);
    }

    if (!exam || !result_detail || !mode) {
        throw new AppError("Missing required fields", 400);
    }
    try {
        const examResultData = new examResult({
            ...req.body,
            user_id: idUser
        });
        const examResultSaved = await examResultData.save();
        if (userData.status !== "none") {
            getExam.attempts_test = mode === "testing" ? getExam.attempts_test - 1 : getExam.attempts_test;
            getExam.attempts_training = mode === "training" ? getExam.attempts_training - 1 : getExam.attempts_training;
            await userData.save();
        }
        res.status(201).json(examResultSaved);
    } catch (error) {
        console.error(error);
        throw new AppError("Lưu kết quả thi thất bại, vui lòng thử lại sau !", 500);
    }
})

const getExamResultDetail = expressAsyncHandler(async (req, res) => {
    const { resultId } = req.params;
    const result = await examResult.findById(resultId)
    if (!result) {
        throw new AppError("Exam result not found", 404);
    }
    res.json(result);
});


const changeStatusUser = expressAsyncHandler(async (req, res) => {
    const { userId } = req.body
    const status = "active"
    const updateUser = await userModel.findByIdAndUpdate(userId, {
        $set: { status: status },
    }, { new: true })
    await updateUser.save()
    res.status(201).json({ message: "Phê duyệt thành công !" })
})

const getAllUsers = expressAsyncHandler(async (req, res) => {
    const users = await userModel.find({}).populate("package.package_id")
    res.status(200).json({ users })
});

module.exports = { getUserExamResults, saveResultExam, getExamResultDetail, changeStatusUser, getAllUsers, getExamResultDetailByUser }