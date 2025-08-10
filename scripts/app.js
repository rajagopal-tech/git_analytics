const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { analyzeRepo } = require('./cloneAndAnalyze');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // ensure views path is correct

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // serve static files

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/analyze', async (req, res) => {
  const repoUrl = req.body.repoUrl;

  try {
    const result = await analyzeRepo(repoUrl); // your logic
    res.render('results', { metrics: result.metrics, repoName: result.repoName });
  } catch (err) {
    res.send('❌ Error: ' + err.message);
  }
});

app.listen(3000, () => {
  console.log('🚀 Running on http://localhost:3000');
});
