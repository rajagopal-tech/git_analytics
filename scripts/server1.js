// server1.js
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { analyzeRepo, aggregateSummary } = require('./analyzer');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.render('index', { repoDataList: null, summaryData: null, successMessage: null });
});

app.post('/analyze', async (req, res) => {
  const repoUrls = req.body.repoUrls
    ?.split('\n')
    .map(u => u.trim())
    .filter(Boolean);

  if (!repoUrls || !repoUrls.length) {
    return res.render('index', { repoDataList: null, summaryData: null, successMessage: 'Please enter valid URLs' });
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

    const validResults = results.filter(r => !r.error);
    const summaryData = aggregateSummary(validResults);

    res.render('index', { repoDataList: results, summaryData, successMessage: 'Analysis completed!' });
  } catch (err) {
    console.error(err);
    res.render('index', { repoDataList: null, summaryData: null, successMessage: `Error analyzing repos: ${err.message}` });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
