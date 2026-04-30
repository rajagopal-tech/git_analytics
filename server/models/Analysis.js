const mongoose = require('mongoose');

// Current (latest) analysis per repo
const analysisSchema = new mongoose.Schema({
  repoUrl:    { type: String, required: true, unique: true, index: true },
  repoName:   { type: String, required: true },
  timezone:   { type: String, default: 'Asia/Kolkata' },
  analyzedAt: { type: Date, default: Date.now },
  metrics:    { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

// Historical snapshots — one document per analysis run
const historySchema = new mongoose.Schema({
  repoUrl:    { type: String, required: true, index: true },
  repoName:   { type: String, required: true },
  timezone:   { type: String, default: 'Asia/Kolkata' },
  analyzedAt: { type: Date, default: Date.now },
  // Only store the lightweight trend fields, not full commit arrays
  snapshot: {
    totalCommits:       Number,
    healthScore:        Number,
    burnoutRisk:        String,
    longestStreak:      String,
    lateNightPct:       String,
    weekendPct:         String,
    churnRate:          String,
    conventionalPct:    String,
    largeCommitsCount:  Number,
    languageCount:      Number,
    authorCount:        Number,
    yearlyCommits:      mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

module.exports = {
  Analysis: mongoose.model('Analysis', analysisSchema),
  AnalysisHistory: mongoose.model('AnalysisHistory', historySchema)
};
