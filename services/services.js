const { duration } = require('moment');
const examModel = require('../model/exam');
const questionModel = require('../model/question');
const { AppError } = require("../error")
const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

function generateOrderId() {
  const now = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD${now}${random}`;
}

async function getDbLimits(level) {
  const result = await questionModel.aggregate([
    {
      $match: {
        level: level
      }
    },
    {
      $group: {
        _id: '$question_type',
        count: { $sum: 1 }   
      }
    },

  ]);

  const dbLimits = {};

  const allTypes = ["normal", "multiple", "drop_match", "classify"];
  allTypes.forEach(type => {
    dbLimits[type] = 0;
  });

  result.forEach(item => {
    const type = item._id;
    const count = item.count;
    dbLimits[type] = count;
  });

  return dbLimits;
}

const MAX_RANDOM_MAX = {
  classify: { maxRandom: 0, dbCount: 0 },
  drop_match: { maxRandom: 0, dbCount: 0 },
  multiple: { maxRandom: 0, dbCount: 0 }
}


async function checkQuestionAvailability(requiredQuestions, level) {
  const dbLimits = await getDbLimits(level);
  for (const req of requiredQuestions) {
    const { question_type, limit } = req;
    if (dbLimits[question_type] < limit) {
      return { question_type, available: false, needed: limit, availableCount: dbLimits[question_type]};
    }
  }
  return false;
}

async function getTotalQuestionByTypeSafe(totalQuestion = 30, limitQuestionForType, level) {
  // 1. Lấy giới hạn tối đa hiện có từ DB
  const dbLimits = await getDbLimits(level);
  let remainingTotal = totalQuestion;
  let requiredQuestions = [];

  // --- Cấu hình giới hạn cho các loại (trừ Normal) ---
  const questionRandom = limitQuestionForType || getTotalQuestionByType(totalQuestion);
  questionRandom.forEach(qr => {
    const { question_type, limit } = qr;
    if (question_type !== "normal") {
      const dbCount = dbLimits[question_type];
      MAX_RANDOM_MAX[question_type] = { maxRandom: limit, dbCount: dbCount };
    }
  });

  const TYPE_CONFIG = MAX_RANDOM_MAX

  for (const type in TYPE_CONFIG) {
    const config = TYPE_CONFIG[type];
    const maxLimit = Math.min(config.maxRandom, config.dbCount, remainingTotal);
    const limit = randomInt(0, maxLimit);

    requiredQuestions.push({ question_type: type, limit: limit });
    remainingTotal -= limit;
  }
  const finalNormalLimit = Math.min(remainingTotal, dbLimits.normal);

  requiredQuestions.push({ question_type: "normal", limit: finalNormalLimit });

  if (finalNormalLimit < remainingTotal) {
    console.warn(`Cảnh báo: Không đủ câu hỏi (thiếu ${remainingTotal - finalNormalLimit} câu) để đạt ${totalQuestion}.`);
  }

  return requiredQuestions
    .filter(req => req.limit > 0)
    .sort((a, b) => (a.question_type === 'normal' ? -1 : 1));
}

function getTotalQuestionByType(totalQuestion) {
  const normalLimit = randomInt(15, 20);
  let remainingTotal = 30 - normalLimit;
  const dropMatchLimit = randomInt(0, 3);
  const classifyLimit = randomInt(0, 5);
  const multipleLimit = remainingTotal - dropMatchLimit - classifyLimit;

  return [
    { question_type: "normal", limit: normalLimit },
    { question_type: "multiple", limit: multipleLimit },
    { question_type: "drop_match", limit: dropMatchLimit },
    { question_type: "classify", limit: classifyLimit }
  ]
}



async function createExam(level, count) {
  const imageUrl = "https://res.cloudinary.com/da5mlszld/image/upload/v1756055813/IC3-removebg-preview_va4uxe.png"
  const totalQuestion = 30
  const duration = 45
  const content = `Bài kiểm tra trình độ cấp độ ${level} - ${count}`
  const description = `Bài kiểm tra này bao gồm ${totalQuestion} câu hỏi ở nhiều dạng khác nhau, giúp bạn đánh giá chính xác trình độ của mình ở cấp độ ${level}. Hãy chuẩn bị tinh thần và sẵn sàng để bắt đầu bài kiểm tra nhé! Chúc bạn may mắn và thành công!`
  const require_questions = await getTotalQuestionByTypeSafe(totalQuestion)
  let questions = []
  for (const req of require_questions) {
    const { question_type, limit } = req
    const randomQuestions = await questionModel.aggregate([
      { $match: { question_type: question_type, level: level } },
      { $sample: { size: limit } }
    ])
    questions = questions.concat(randomQuestions)
  }
  const examCreated = new examModel({
    description,
    content,
    image_url: imageUrl,
    duration,
    level,
    total_question: questions.length,
    category_id: 1
  })
  const examSaved = await examCreated.save()
  const updated = await questionModel.updateMany({
    _id: { $in: questions.map(q => q._id) }
  }, {
    $push: { exam_id: examSaved._id }
  })
  if (!examSaved) {
    throw new AppError("Cannot create exam", 500)
  }
  if (updated.modifiedCount === 0) {
    throw new AppError("Cannot update questions with exam", 500)
  }
  return examSaved
}

async function generateExamForUser(numberOfExams, attempts_training_limit) {
  // tạo bài test mới
  let sumExamsLevel = [0, 0, 0]
  let attempts_test = 0
  let exams = []
  if (numberOfExams <= 0) return [];
  if (numberOfExams === 5) {
    sumExamsLevel = [2, 2, 1]
    attempts_test = 1
    for (let index = 0; index < sumExamsLevel.length; index++) {
      const count = sumExamsLevel[index];
      for (let i = 0; i < count; i++) {
        const exam = await createExam(index + 1, i + 1);
        exams.push(exam)
      }
    }

  } else if (numberOfExams === 10) {
    sumExamsLevel = [4, 4, 2]
    attempts_test = 1
    for (let index = 0; index < sumExamsLevel.length; index++) {
      const count = sumExamsLevel[index];
      for (let i = 0; i < count; i++) {
        const exam = await createExam(index + 1, i + 1);
        exams.push(exam)
      }
    }
  } else {
    sumExamsLevel = [1, 1, 1]
    attempts_test = 2
    for (let index = 0; index < sumExamsLevel.length; index++) {
      const count = sumExamsLevel[index];
      for (let i = 0; i < count; i++) {
        const exam = await createExam(index + 1, i + 1);
        exams.push(exam)
      }
    }
  }
  const idList = exams.map(exam => {
    return {
      exam_id: exam._id,
      attempts_test: attempts_test,
      attempts_training: attempts_training_limit,
    }
  })

  return idList;
  // lấy ngẫu nhiên số lượng bài test từ cơ sở dữ liệu
}


async function getRamdomExam(numberOfExams, attempts_training_limit) {
  let sumExamsLevel = [0, 0, 0]
  let attempts_test = 0
  let exams = []
  if (numberOfExams <= 0) return [];
  if (numberOfExams === 5) {
    sumExamsLevel = [2, 2, 1]
    attempts_test = 1
    for (let index = 0; index < sumExamsLevel.length; index++) {
      const count = sumExamsLevel[index];
      const randomExams = await examModel.aggregate([
        { $match: { level: index + 1 } },
        { $sample: { size: count } }
      ])
      exams = exams.concat(randomExams)
    }

  } else if (numberOfExams === 10) {
    sumExamsLevel = [4, 4, 2]
    attempts_test = 1
    for (let index = 0; index < sumExamsLevel.length; index++) {
      const count = sumExamsLevel[index];
      const randomExams = await examModel.aggregate([
        { $match: { level: index + 1 } },
        { $sample: { size: count } }
      ])
      exams = exams.concat(randomExams)
    }
  } else {
    sumExamsLevel = [1, 1, 1]
    attempts_test = 2
    for (let index = 0; index < sumExamsLevel.length; index++) {
      const count = sumExamsLevel[index];
      const randomExams = await examModel.aggregate([
        { $match: { level: index + 1 } },
        { $sample: { size: count } }
      ])
      exams = exams.concat(randomExams)
    }
  }
  const idList = exams.map(exam => {
    return {
      exam_id: exam._id,
      attempts_test: attempts_test,
      attempts_training: attempts_training_limit,
    }
  })

  return idList;
}




module.exports = { generateOrderId, generateExamForUser, createExam, getRamdomExam, getTotalQuestionByTypeSafe,checkQuestionAvailability };