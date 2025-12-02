const userModel = require("../model/user")
const examModel = require("../model/exam")
const questionModel = require("../model/question")
const expressAsyncHandler = require("express-async-handler")
const { AppError } = require("../error")

async function aggregateQuestionsByType(level = null) {
    const typeMapping = {
        'normal': { name: 'Trắc nghiệm (1 đáp án)', color: '#3b82f6' },
        'multiple': { name: 'Trắc nghiệm (N đáp án)', color: '#10b981' },
        'drop_match': { name: 'Kéo thả nối đáp án', color: '#f59e0b' },
        'classify': { name: 'Phân loại', color: '#ef4444' },
    };

    const pipeline = [];

    // 1. Giai đoạn LỌC ($match) - Chỉ thêm vào nếu tham số 'level' được cung cấp
    if (level) {
        pipeline.push({
            $match: {
                level: level
            }
        });
    }
    // 2. Giai đoạn NHÓM ($group) - Đếm số lượng theo question_type
    pipeline.push({
        $group: {
            _id: '$question_type',
            count: { $sum: 1 }
        }
    });
    // 3. Giai đoạn CHUYỂN ĐỔI ($project)
    pipeline.push({
        $project: {
            _id: 0,
            type: '$_id',
            count: 1
        }
    });
    pipeline.push({
        $sort: {
            count: -1
        }
    });
    const rawResults = await questionModel.aggregate(pipeline);
    const finalResult = rawResults.map(item => {
        const typeInfo = typeMapping[item.type] || { name: `Loại không xác định: ${item.type}`, color: '#000000' };
        return {
            type: typeInfo.name,
            count: item.count,
            color: typeInfo.color
        };
    });

    return finalResult;
}

async function aggregateQuizzesByLevel() {
    // 1. Định nghĩa ÁNH XẠ (MAPPING) tên hiển thị, màu sắc, và mô tả dựa trên Level
    const levelMapping = {
        1: { title: 'Level 1: Cơ Bản', color: 'success', desc: 'Dành cho người mới bắt đầu' },
        2: { title: 'Level 2: Trung Bình', color: 'processing', desc: 'Kiến thức tổng hợp' },
        3: { title: 'Level 3: Nâng Cao', color: 'error', desc: 'Chuyên sâu & Khó' },
    };

    const pipeline = [
        // Nhóm các document theo trường 'level' và đếm số lượng
        {
            $group: {
                _id: '$level',
                count: { $sum: 1 }
            }
        },
        // Định hình lại output: Đổi tên _id thành levelKey
        {
            $project: {
                _id: 0,
                levelKey: '$_id',
                count: 1
            }
        },
        {
            $sort: {
                levelKey: 1
            }
        }
    ];
    const rawResults = await examModel.aggregate(pipeline);
    const finalResult = rawResults.map(item => {
        const mappedData = levelMapping[item.levelKey] || {
            title: `Level ${item.levelKey}: Không xác định`,
            color: 'default',
            desc: 'Không có mô tả'
        };

        return {
            title: mappedData.title,
            count: item.count,
            color: mappedData.color,
            desc: mappedData.desc
        };
    });

    return finalResult;
}


const getDashboardStats = expressAsyncHandler(async (req, res) => {
    const [
        totalUsers,
        totalQuizzes,
        totalQuestions,
        questionTypes,
        quizzesByLevel
    ] = await Promise.all([
        userModel.countDocuments(),
        examModel.countDocuments(),
        questionModel.countDocuments(),
        aggregateQuestionsByType(),
        aggregateQuizzesByLevel()
    ]);

    return res.json({
        totalUsers,
        totalQuizzes,
        totalQuestions,
        questionTypes,
        quizzesByLevel
    });
});



module.exports = {
    getDashboardStats
}