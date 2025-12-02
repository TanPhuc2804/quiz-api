const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: Number || String,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    benefits: {
      type: [String],
      default: [],
    },
    sum_practice: {
      type: Number,
      required: true,
      min: 0,
    },
    attempts_training_limit: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Package', packageSchema, "Package");
