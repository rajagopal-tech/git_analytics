const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { analyzeRepo } = require('./analyzer'); // Make sure this is optimized too!

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { repoDataList: null, successMessage: null });
});

app.post('/analyze', async (req, res) => {
  const repoUrls = req.body.repoUrls
    ?.split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0);

  if (!repoUrls || repoUrls.length === 0) {
    return res.render('index', { repoDataList: null, successMessage: "Please enter valid URLs" });
  }

  try {
    // Run all analyses in parallel for speed
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

    res.render('index', { repoDataList: results, successMessage: "Analysis completed!" });
  } catch (err) {
    console.error(err);
    res.render('index', { repoDataList: null, successMessage: `Error analyzing repos: ${err.message}` });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
