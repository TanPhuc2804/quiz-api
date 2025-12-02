const env = {}
require("dotenv").config({ processEnv: env })
const jwt = require('jsonwebtoken');
const result = require("../model/examResult.js")
const userModel = require("../model/user.js")
const asyncHandler = require('express-async-handler');
const { AppError } = require('../error.js');
const moment = require("moment")

const verifyLogin = asyncHandler(async (req, res, next) => {
    //  req.cookies.token ?? 
    const token = req.cookies.token;
    if (!token) {
        throw new AppError('Vui lòng đăng nhập', 401);
    }
    jwt.verify(token, env.KEY_LOGIN, (err, user) => {
        if (err) {
            throw new AppError('Tài khoản người dùng đã hết hạn !', 403);
        }
        req.user = user;
        next();
    });
});

const checkUser = asyncHandler(async (req, res, next) => {
   
    //  req.cookies.token ?? 
    const token = req.cookies.token;
    if (!token) {
        return next();
    }
    jwt.verify(token, env.KEY_LOGIN, (err, user) => {
        if (err) {
            throw new AppError('Tài khoản người dùng đã hết hạn !', 403);
        }
        req.user = user;
        next();
    });
});

const verifyPackage = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const userData = await userModel.findById(user.id);
    const attempts_remaining_test = userData.package.attempts_remaining_test;
    if (!userData) {
        throw new AppError('Vui lòng đăng nhập !', 404);
    }
    if (user.role === "admin") {
        return next();
    }

    if (userData.status === "none") {
        const countResult = await result.countDocuments({ user_id: user.id });
        if (countResult >= 1) {
            throw new AppError('Bạn đã sử dụng hết lượt thi miễn phí, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 403);
        }
        return next();
    }

    if (attempts_remaining_test <= 0) {
        throw new AppError('Bạn đã sử dụng hết lượt thi luyện tập, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 403);
    }

    if (userData.status === "paid") {
        throw new AppError('Vui lòng đợi admin phê duyệt gói của bạn ! Bạn có thể liên hệ tới zalo: 0564068652', 403);
    }

    if (userData.status !== "active") {
        throw new AppError('Vui lòng đăng ký gói để sử dụng dịch vụ !', 403);
    }
    next();
});

const verifyCheckAttemptTest = asyncHandler(async (req, res, next) => {
    const user = req.user
    const { examId } = req.params
    const { mode } = req.query
    const userData = await userModel.findById(user.id)
    if (userData.status === "none") {
        const countResult = await result.countDocuments({ user_id: user.id });
        if (countResult >= 1) {
            throw new AppError('Bạn đã sử dụng hết lượt thi miễn phí, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 403);
        }
        return next();
    }
    const getExam = userData.exams.find(exam => exam.exam_id.toString() === examId);
    if (!getExam && userData.status !== "none") {
        throw new AppError('Bài thi không tồn tại trong tài khoản của bạn, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 404);
    }
    if (mode === "testing" && getExam.attempts_test <= 0) {
        throw new AppError('Bạn đã sử dụng hết lượt thi chính thức của bài này, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 403);
    }
    if (mode === "training" && getExam.attempts_training <= 0) {
        throw new AppError('Bạn đã sử dụng hết lượt thi luyện tập của bài này, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 403);
    }
    next();

});


const verifyCheckSaveResultExam = asyncHandler(async (req, res, next) => {
    const user = req.user
    const { exam,mode } = req.body
    const userData = await userModel.findById(user.id)
    const getExam = userData.exams.find(examItem => examItem.exam_id.toString() === exam);
    if (!getExam && userData.status !== "none") {
        throw new AppError('Bài thi không tồn tại trong tài khoản của bạn, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 404);
    }
    if (mode === "testing" && getExam.attempts_test <= 0) {
        throw new AppError('Bạn đã sử dụng hết lượt thi chính thức của bài này, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 403);
    }
    if (mode === "training" && getExam.attempts_training <= 0) {
        throw new AppError('Bạn đã sử dụng hết lượt thi luyện tập của bài này, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 403);
    }
    next();
});

const verifyPackageDisplay = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const userData = await userModel.findById(user.id);
    if (!userData) {
        throw new AppError('Vui lòng đăng nhập !', 404);
    }
    if (user.role === "admin") {
        return next();
    }

    const checkExpire = moment().isAfter(moment(userData.package.expire_date));
    if (checkExpire) {
        await userModel.findByIdAndUpdate(user.id, { status: "expired", "package.package_id": null, "package.register_date": null, "package.expire_date": null }, { new: true });
        throw new AppError('Gói của bạn đã hết hạn, vui lòng đăng ký gói để tiếp tục sử dụng dịch vụ !', 403);
    }
    next();
});


const verifyAdmin = asyncHandler(async (req, res, next) => {
    // 
    const token = req.cookies.token;
    if (!token) {
        throw new AppError('Vui lòng đăng nhập', 401);
    }
    jwt.verify(token, env.KEY_LOGIN, (err, user) => {
        if (err) {
            throw new AppError('Tài khoản người dùng đã hết hạn !', 403);
        }
        if (user.role !== 'admin') {
            throw new AppError('Bạn không có quyền truy cập !', 403);
        }
        req.user = user;
        next();
    });
});



module.exports = { verifyLogin, verifyPackage, verifyAdmin, verifyPackageDisplay, verifyCheckAttemptTest, verifyCheckSaveResultExam, checkUser };