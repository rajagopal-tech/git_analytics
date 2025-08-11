const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { analyzeRepo } = require('./analyzer');

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
    res.render('index', { repoData: data, successMessage: "Analysis completed successfully!" });
  } catch (err) {
    console.error(err);
    res.render('index', { repoData: null, successMessage: `Error analyzing repo: ${err.message}` });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
