const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// Fake analytics function (replace with your actual code)
async function analyzeRepo(repoUrl) {
  // Simulate results from your analytics logic
  return {
    timeDateActivity: {
      lateNightPercentage: "23%",
      weekendWork: "18%",
      mostActiveDay: "Wednesday",
    },
    burnoutDetection: {
      burnoutRisk: "Low",
      longestStreak: "12 days",
    },
    churnRate: "8%",
    idlePeriods: {
      longestIdle: "5 days",
    },
    commitMessageStructure: {
      meaningfulMessages: "92%",
    },
    languagesUsed: ["JavaScript", "Python", "HTML"],
    largeCommits: {
      count: 3,
      biggestCommitSize: "450 lines",
    }
  };
}

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { repoData: null, successMessage: null });
});

app.post('/analyze', async (req, res) => {
  const repoUrl = req.body.repoUrl;
  if (!repoUrl) {
    return res.render('index', { repoData: null, successMessage: "Please enter a valid URL" });
  }

  try {
    const data = await analyzeRepo(repoUrl);
    res.render('index', { repoData: data, successMessage: "Inserted successfully!" });
  } catch (err) {
    res.render('index', { repoData: null, successMessage: "Error analyzing repo" });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
