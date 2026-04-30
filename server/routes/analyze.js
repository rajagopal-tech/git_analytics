const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Analysis = require('../models/Analysis');
const { analyzeRepo, aggregateSummary } = require('../services/analyzer');

const CLONE_BASE = path.join(__dirname, '../../cloned_repos');

// POST /api/analyze - Analyze one or more repos
router.post('/analyze', async (req, res) => {
  try {
    const { repoUrls, timezone = 'Asia/Kolkata', forceRefresh = false } = req.body;

    if (!repoUrls || !Array.isArray(repoUrls) || repoUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of repository URLs'
      });
    }

    const results = await Promise.all(
      repoUrls.map(async (url) => {
        try {
          // Check if already analyzed (unless force refresh)
          if (!forceRefresh) {
            const existing = await Analysis.findOne({ repoUrl: url });
            if (existing) {
              console.log(`Using cached analysis for ${url}`);
              return {
                url,
                data: existing.metrics,
                cached: true,
                analyzedAt: existing.analyzedAt,
                error: null
              };
            }
          }

          // Analyze the repo
          console.log(`Analyzing ${url}...`);
          const data = await analyzeRepo(url, timezone);

          // Save to database
          await Analysis.findOneAndUpdate(
            { repoUrl: url },
            {
              repoUrl: url,
              repoName: data.repoName,
              timezone,
              metrics: data,
              analyzedAt: new Date()
            },
            { upsert: true, new: true }
          );

          return {
            url,
            data,
            cached: false,
            analyzedAt: new Date(),
            error: null
          };
        } catch (err) {
          console.error(`Error analyzing ${url}:`, err.message);
          return {
            url,
            data: null,
            cached: false,
            error: err.message
          };
        }
      })
    );

    const validResults = results.filter(r => !r.error && r.data);
    const summaryData = validResults.length > 0 ? aggregateSummary(validResults) : null;

    res.json({
      success: true,
      results,
      summary: summaryData,
      totalAnalyzed: validResults.length,
      totalFailed: results.length - validResults.length
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// GET /api/results - Get all analyzed repos
router.get('/results', async (req, res) => {
  try {
    const analyses = await Analysis.find()
      .select('repoUrl repoName analyzedAt timezone')
      .sort({ analyzedAt: -1 });

    res.json({
      success: true,
      count: analyses.length,
      results: analyses
    });
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// GET /api/results/:repoName - Get specific repo analysis
router.get('/results/:repoName', async (req, res) => {
  try {
    const { repoName } = req.params;
    
    const analysis = await Analysis.findOne({ repoName });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: `No analysis found for repository: ${repoName}`
      });
    }

    res.json({
      success: true,
      data: analysis
    });
  } catch (err) {
    console.error('Error fetching result:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// DELETE /api/results/:repoName - Delete cached analysis
router.delete('/results/:repoName', async (req, res) => {
  try {
    const { repoName } = req.params;
    
    const result = await Analysis.findOneAndDelete({ repoName });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No analysis found for repository: ${repoName}`
      });
    }

    res.json({
      success: true,
      message: `Analysis for ${repoName} deleted successfully`
    });
  } catch (err) {
    console.error('Error deleting result:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// GET /api/summary - Get aggregated summary of all repos
router.get('/summary', async (req, res) => {
  try {
    const analyses = await Analysis.find();

    if (analyses.length === 0) {
      return res.json({
        success: true,
        message: 'No analyses found',
        summary: null
      });
    }

    const validResults = analyses.map(a => ({
      url: a.repoUrl,
      data: a.metrics
    }));

    const summary = aggregateSummary(validResults);

    res.json({
      success: true,
      summary,
      totalRepos: analyses.length
    });
  } catch (err) {
    console.error('Error generating summary:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// GET /api/clones - List all cloned repo folders with their disk size
router.get('/clones', (req, res) => {
  try {
    if (!fs.existsSync(CLONE_BASE)) {
      return res.json({ success: true, clones: [], totalSizeMB: 0 });
    }

    const entries = fs.readdirSync(CLONE_BASE).filter(name =>
      fs.statSync(path.join(CLONE_BASE, name)).isDirectory()
    );

    // Calculate folder size recursively
    function dirSizeBytes(dirPath) {
      let total = 0;
      try {
        for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
          const full = path.join(dirPath, entry.name);
          if (entry.isDirectory()) total += dirSizeBytes(full);
          else total += fs.statSync(full).size;
        }
      } catch { /* skip unreadable entries */ }
      return total;
    }

    const clones = entries.map(name => {
      const bytes = dirSizeBytes(path.join(CLONE_BASE, name));
      return {
        name,
        sizeMB: (bytes / 1024 / 1024).toFixed(1)
      };
    });

    const totalSizeMB = clones.reduce((sum, c) => sum + parseFloat(c.sizeMB), 0).toFixed(1);

    res.json({ success: true, clones, totalSizeMB });
  } catch (err) {
    console.error('Error listing clones:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/clones/:repoName - Delete one cloned repo folder
router.delete('/clones/:repoName', (req, res) => {
  try {
    const { repoName } = req.params;

    // Sanitise — no path traversal
    if (!repoName || repoName.includes('..') || repoName.includes('/') || repoName.includes('\\')) {
      return res.status(400).json({ success: false, message: 'Invalid repo name' });
    }

    const targetPath = path.join(CLONE_BASE, repoName);

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, message: `Cloned folder not found: ${repoName}` });
    }

    fs.rmSync(targetPath, { recursive: true, force: true });
    console.log(`🗑️  Deleted cloned repo: ${repoName}`);

    res.json({ success: true, message: `Deleted cloned repo: ${repoName}` });
  } catch (err) {
    console.error('Error deleting clone:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/clones - Delete ALL cloned repo folders
router.delete('/clones', (req, res) => {
  try {
    if (!fs.existsSync(CLONE_BASE)) {
      return res.json({ success: true, message: 'Nothing to clear — cloned_repos folder does not exist' });
    }

    fs.rmSync(CLONE_BASE, { recursive: true, force: true });
    console.log('🗑️  Cleared all cloned repos');

    res.json({ success: true, message: 'All cloned repositories deleted' });
  } catch (err) {
    console.error('Error clearing clones:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
