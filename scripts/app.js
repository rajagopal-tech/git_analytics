const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { analyzeRepo, getTimeDateActivitySummary } = require('./cloneAndAnalyze'); 
// ^ Replace with your actual functions

const app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Render main page
app.get('/', (req, res) => {
  res.render('index');
});

// Handle repo URL submission
app.post('/analyze', async (req, res) => {
  const repoUrl = req.body.repoUrl;
  try {
    const result = await analyzeRepo(repoUrl);
    res.json({ success: true, message: "Repository inserted successfully!", repoName: result.repoName });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Fetch time & date activity summary
app.get('/time-date-summary', async (req, res) => {
  try {
    const summary = await getTimeDateActivitySummary(); 
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 Running on http://localhost:3000');
});
