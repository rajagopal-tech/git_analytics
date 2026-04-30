const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  repoUrl: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  repoName: {
    type: String,
    required: true
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  analyzedAt: {
    type: Date,
    default: Date.now
  },
  metrics: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Analysis', analysisSchema);
