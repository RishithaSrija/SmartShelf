const mongoose = require('mongoose');

const jobExecutionSchema = new mongoose.Schema(
  {
    jobName: {
      type: String,
      required: [true, 'Job name is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    lastStartedAt: {
      type: Date,
      default: Date.now
    },
    lastCompletedAt: {
      type: Date
    },
    lastStatus: {
      type: String,
      enum: ['HEALTHY', 'WARNING', 'ERROR'],
      default: 'HEALTHY'
    },
    lastDurationMs: {
      type: Number,
      default: 0
    },
    recordsProcessed: {
      type: Number,
      default: 0
    },
    lastError: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('JobExecution', jobExecutionSchema);
