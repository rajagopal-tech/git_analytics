const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { analyzeRepo } = require('./analyzer'); // your existing analyze function

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { repoDataList: null, summaryData: null, successMessage: null });
});

app.post('/analyze', async (req, res) => {
  const repoUrls = req.body.repoUrls
    ?.split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0);

  if (!repoUrls || repoUrls.length === 0) {
    return res.render('index', { repoDataList: null, summaryData: null, successMessage: "Please enter valid URLs" });
  }

  try {
    const results = await Promise.all(
      repoUrls.map(async (url) => {
        try {
          const data = await analyzeRepo(url);
          return { url, data, error: null };
        } catch (err) {
          return { url, data: null, error: err.message };
        }
      })
    );

    // Filter out errored repos to aggregate summary only on successful results
    const validResults = results.filter(r => !r.error);

    // Aggregate summary of all repos
    const summaryData = aggregateSummary(validResults);

    res.render('index', { repoDataList: results, summaryData, successMessage: "Analysis completed!" });
  } catch (err) {
    console.error(err);
    res.render('index', { repoDataList: null, summaryData: null, successMessage: `Error analyzing repos: ${err.message}` });
  }
});

// Aggregation function
function aggregateSummary(validResults) {
  if (validResults.length === 0) return null;

  let longestStreakOverall = 0;
  let longestIdleOverall = 0;
  let largeCommitsCount = 0;
  let biggestCommitSizeOverall = 0;
  const languagesSet = new Set();

  // Helper to parse percentage strings like '23.45%' safely
  function parsePercent(str) {
    return parseFloat(str.replace('%','')) || 0;
  }

  let totalLateNight = 0;
  let totalWeekend = 0;
  let totalChurn = 0;
  let totalMeaningful = 0;

  validResults.forEach(({ data }) => {
    totalLateNight += parsePercent(data.timeDateActivity.lateNightPercentage);
    totalWeekend += parsePercent(data.timeDateActivity.weekendWork);
    totalChurn += parsePercent(data.churnRate);
    totalMeaningful += parsePercent(data.commitMessageStructure.meaningfulMessages);

    longestStreakOverall = Math.max(longestStreakOverall, parseInt(data.burnoutDetection.longestStreak) || 0);
    longestIdleOverall = Math.max(longestIdleOverall, parseInt(data.idlePeriods.longestIdle) || 0);
    largeCommitsCount += data.largeCommits.count || 0;

    // Remove ' lines' suffix and parse integer for biggest commit size
    const biggestSize = parseInt((data.largeCommits.biggestCommitSize || '').replace(' lines', '')) || 0;
    biggestCommitSizeOverall = Math.max(biggestCommitSizeOverall, biggestSize);

    (data.languagesUsed || []).forEach(lang => languagesSet.add(lang));
  });

  const count = validResults.length;

  const burnoutRisk = (function(){
    if(longestStreakOverall > 20) return 'High';
    else if(longestStreakOverall > 10) return 'Medium';
    return 'Low';
  })();

  return {
    timeDateActivity: {
      lateNightPercentage: (totalLateNight / count).toFixed(2) + '%',
      weekendWork: (totalWeekend / count).toFixed(2) + '%',
      mostActiveDay: 'N/A (varies)' // Optional: Extend logic if you want actual combined
    },
    burnoutDetection: {
      burnoutRisk,
      longestStreak: `${longestStreakOverall} days`
    },
    churnRate: (totalChurn / count).toFixed(2) + '%',
    idlePeriods: {
      longestIdle: `${longestIdleOverall} days`
    },
    commitMessageStructure: {
      meaningfulMessages: (totalMeaningful / count).toFixed(2) + '%'
    },
    languagesUsed: Array.from(languagesSet),
    largeCommits: {
      count: largeCommitsCount,
      biggestCommitSize: biggestCommitSizeOverall ? `${biggestCommitSizeOverall} lines` : 'N/A'
    }
  };
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
