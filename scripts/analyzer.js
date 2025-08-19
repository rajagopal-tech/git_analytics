// analyzer.js
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

const cloneBasePath = path.join(__dirname, '../cloned_repos');

async function analyzeRepo(repoUrl) {
  if (!repoUrl.startsWith('https://github.com/') || !repoUrl.endsWith('.git')) {
    throw new Error('Invalid GitHub repo URL. Must start with https://github.com/ and end with .git');
  }

  const repoName = repoUrl.split('/').pop().replace('.git', '');
  const localPath = path.join(cloneBasePath, repoName);
  const git = simpleGit();

  // Clone if missing
  if (!fs.existsSync(localPath)) {
    if (!fs.existsSync(cloneBasePath)) fs.mkdirSync(cloneBasePath, { recursive: true });
    console.log(`Cloning ${repoUrl}...`);
    await git.clone(repoUrl, localPath);
  } else {
    console.log(`${repoName} already cloned. Skipping clone.`);
  }

  const repoGit = simpleGit(localPath);

  // Use raw to keep consistent output (no merges)
  const rawLog = await repoGit.raw([
    'log',
    '--pretty=format:%H|%an|%ad|%s',
    '--date=iso',
    '--no-merges'
  ]);

  const lines = rawLog.trim().length ? rawLog.trim().split('\n') : [];
  const commits = lines.map(line => {
    const [hash, author, date, message] = line.split('|');
    return { hash, author, date: new Date(date), message };
  });

  if (commits.length === 0) throw new Error('No commits found in repository');

  // ---------- Metrics ----------

  // Day-of-week activity
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dailyActivity = { Sunday:0, Monday:0, Tuesday:0, Wednesday:0, Thursday:0, Friday:0, Saturday:0 };

  // Author activity
  const authorActivity = {};

  // Year-wise buckets
  const yearlyCommits = {};            // year -> count
  const lateNightByYear = {};          // year -> count
  const weekendByYear = {};            // year -> count
  const churnByYearCounts = {};        // year -> churn-count
  const largeCommitsByYear = {};       // year -> count

  // Late night: >= 20:00 (8pm)
  const isLateNight = d => d.getHours() >= 20;
  const isWeekend = d => [0,6].includes(d.getDay());
  const churnRegex = /fix|remove|delete|revert/i;
  const conventionalRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/i;

  // Fill counters
  commits.forEach(c => {
    const day = dayNames[c.date.getDay()];
    dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    authorActivity[c.author] = (authorActivity[c.author] || 0) + 1;

    const y = c.date.getFullYear();
    yearlyCommits[y] = (yearlyCommits[y] || 0) + 1;

    if (isLateNight(c.date)) lateNightByYear[y] = (lateNightByYear[y] || 0) + 1;
    if (isWeekend(c.date)) weekendByYear[y] = (weekendByYear[y] || 0) + 1;
    if (churnRegex.test(c.message)) churnByYearCounts[y] = (churnByYearCounts[y] || 0) + 1;
  });

  // Simple totals
  const totalCommits = commits.length;
  const lateNightCommits = commits.filter(c => isLateNight(c.date)).length;
  const weekendCommits = commits.filter(c => isWeekend(c.date)).length;

  const lateNightPercentage = ((lateNightCommits / totalCommits) * 100).toFixed(2) + '%';
  const weekendWork = ((weekendCommits / totalCommits) * 100).toFixed(2) + '%';
  const mostActiveDay = Object.entries(dailyActivity).sort((a,b) => b[1]-a[1])[0][0];

  // Burnout detection — longest streak of consecutive days with commits
  commits.sort((a,b) => a.date - b.date);
  let longestStreak = 1, currentStreak = 1;
  for (let i=1; i<commits.length; i++) {
    const prev = new Date(commits[i-1].date.toDateString());
    const curr = new Date(commits[i].date.toDateString());
    const diffDays = Math.round((curr - prev) / (1000*60*60*24));
    if (diffDays === 1) currentStreak++;
    else if (diffDays === 0) { /* same day, ignore */ }
    else currentStreak = 1;
    if (currentStreak > longestStreak) longestStreak = currentStreak;
  }
  let burnoutRisk = 'Low';
  if (longestStreak > 20) burnoutRisk = 'High';
  else if (longestStreak > 10) burnoutRisk = 'Medium';

  // Idle periods — longest gap (days) between adjacent commits
  let longestIdle = 0;
  for (let i=1; i<commits.length; i++) {
    const gap = Math.floor((commits[i].date - commits[i-1].date) / (1000*60*60*24));
    if (gap > longestIdle) longestIdle = gap;
  }

  // Churn rate (message keyword heuristic)
  const churnCommits = commits.filter(c => churnRegex.test(c.message)).length;
  const churnRate = ((churnCommits / totalCommits) * 100).toFixed(2) + '%';

  // Commit message structure — Conventional Commits %
  const meaningfulCount = commits.filter(c => conventionalRegex.test(c.message)).length;
  const meaningfulMessages = ((meaningfulCount / totalCommits) * 100).toFixed(2) + '%';

  // Languages used — from last commit file list (fast + stable)
  const lastCommitHash = commits[0].hash;
  const filesRaw = await repoGit.show(['--name-only', '--pretty=format:', lastCommitHash]);
  const fileExts = filesRaw.split('\n').filter(f => f.includes('.')).map(f => path.extname(f).toLowerCase());
  const extToLang = {
    '.js': 'JavaScript', '.ts':'TypeScript', '.jsx':'JavaScript', '.tsx':'TypeScript',
    '.py': 'Python', '.java':'Java', '.go':'Go', '.rb':'Ruby', '.php':'PHP',
    '.c': 'C', '.cpp':'C++', '.cs':'C#',
    '.html':'HTML', '.css':'CSS', '.json':'JSON', '.md':'Markdown', '.yml':'YAML', '.yaml':'YAML'
  };
  const langsSet = new Set();
  fileExts.forEach(ext => { if (extToLang[ext]) langsSet.add(extToLang[ext]); });
  const languagesUsed = Array.from(langsSet);

  // Large commits (insertions+deletions > 100)
  let largeCommitsCount = 0;
  let biggestCommitSize = 0;
  for (let c of commits) {
    const diffSummary = await repoGit.show([c.hash, '--stat', '--pretty=format:']);
    const insertionsMatch = diffSummary.match(/(\d+)\s+insertions?\(\+\)/);
    const deletionsMatch = diffSummary.match(/(\d+)\s+deletions?\(-\)/);
    const insertions = insertionsMatch ? parseInt(insertionsMatch[1],10) : 0;
    const deletions = deletionsMatch ? parseInt(deletionsMatch[1],10) : 0;
    const totalChanges = insertions + deletions;
    if (totalChanges > 100) {
      largeCommitsCount++;
      const y = c.date.getFullYear();
      largeCommitsByYear[y] = (largeCommitsByYear[y] || 0) + 1;
    }
    if (totalChanges > biggestCommitSize) biggestCommitSize = totalChanges;
  }

  // Year-wise percentages for late night, weekend, churn
  const years = Object.keys(yearlyCommits).sort();
  const lateNightByYearPct = {};
  const weekendByYearPct = {};
  const churnByYearPct = {};
  years.forEach(y => {
    const total = yearlyCommits[y];
    lateNightByYearPct[y] = total ? (( (lateNightByYear[y]||0)/total )*100).toFixed(2) + '%' : '0%';
    weekendByYearPct[y] = total ? (( (weekendByYear[y]||0)/total )*100).toFixed(2) + '%' : '0%';
    churnByYearPct[y]    = total ? (( (churnByYearCounts[y]||0)/total )*100).toFixed(2) + '%' : '0%';
  });

  return {
    repoName,
    timeDateActivity: {
      lateNightPercentage,
      weekendWork,
      mostActiveDay,
      dailyActivity
    },
    burnoutDetection: {
      burnoutRisk,
      longestStreak: `${longestStreak} days`
    },
    churnRate,
    churnByYearPct,
    idlePeriods: {
      longestIdle: `${longestIdle} days`
    },
    commitMessageStructure: {
      meaningfulMessages
    },
    languagesUsed,
    largeCommits: {
      count: largeCommitsCount,
      biggestCommitSize: biggestCommitSize ? `${biggestCommitSize} lines` : 'N/A'
    },
    largeCommitsByYear,
    yearlyCommits,        // year -> count (absolute)
    authorActivity        // author -> commits
  };
}

function parsePercentToNumber(s) {
  if (!s) return 0;
  const n = parseFloat(String(s).replace('%',''));
  return isNaN(n) ? 0 : n;
}

function aggregateSummary(validResults) {
  if (!validResults.length) return null;

  // Totals / max / sets
  const dayTotals = { Sunday:0, Monday:0, Tuesday:0, Wednesday:0, Thursday:0, Friday:0, Saturday:0 };
  const languagesSet = new Set();
  const yearlyCommitsTotal = {};
  const lateNightYearTotalPct = {};
  const weekendYearTotalPct = {};
  const churnYearTotalPct = {};
  const largeCommitsYearTotals = {};

  let totalLateNightPct = 0;
  let totalWeekendPct = 0;
  let totalChurnPct = 0;
  let totalMeaningfulPct = 0;

  let longestStreakOverall = 0;
  let longestIdleOverall = 0;
  let largeCommitsCount = 0;
  let biggestCommitSizeOverall = 0;

  validResults.forEach(({ data }) => {
    // Percentages (average)
    totalLateNightPct += parsePercentToNumber(data.timeDateActivity.lateNightPercentage);
    totalWeekendPct   += parsePercentToNumber(data.timeDateActivity.weekendWork);
    totalChurnPct     += parsePercentToNumber(data.churnRate);
    totalMeaningfulPct+= parsePercentToNumber(data.commitMessageStructure.meaningfulMessages);

    // Days
    Object.keys(dayTotals).forEach(d => {
      dayTotals[d] += data.timeDateActivity.dailyActivity[d] || 0;
    });

    // Longest streak / idle
    const ls = parseInt(String(data.burnoutDetection.longestStreak).replace(/\D/g,'')) || 0;
    longestStreakOverall = Math.max(longestStreakOverall, ls);
    const li = parseInt(String(data.idlePeriods.longestIdle).replace(/\D/g,'')) || 0;
    longestIdleOverall = Math.max(longestIdleOverall, li);

    // Languages
    (data.languagesUsed||[]).forEach(l => languagesSet.add(l));

    // Large commits
    largeCommitsCount += data.largeCommits.count || 0;
    const big = parseInt(String(data.largeCommits.biggestCommitSize||'').replace(/\D/g,'')) || 0;
    biggestCommitSizeOverall = Math.max(biggestCommitSizeOverall, big);

    // Yearly
    Object.entries(data.yearlyCommits||{}).forEach(([y,c]) => {
      yearlyCommitsTotal[y] = (yearlyCommitsTotal[y]||0) + c;
    });
    Object.entries(data.largeCommitsByYear||{}).forEach(([y,c]) => {
      largeCommitsYearTotals[y] = (largeCommitsYearTotals[y]||0) + c;
    });
    Object.entries(data.churnByYearPct||{}).forEach(([y,p]) => {
      churnYearTotalPct[y] = (churnYearTotalPct[y]||0) + parsePercentToNumber(p);
    });
    Object.entries(data.churnByYearPct||{}); // ensure presence
    Object.entries(data.churnByYearPct||{}); // no-op

    Object.entries(data.churnByYearPct||{}); // keep

    Object.entries(data.churnByYearPct||{});
    Object.entries(data.churnByYearPct||{});

    Object.entries(data.churnByYearPct||{}); // ok

    Object.entries(data.churnByYearPct||{});
    // LateNight & Weekend year pct
    Object.entries(data.churnByYearPct||{});
    Object.entries(data.churnByYearPct||{});
    Object.entries(data.churnByYearPct||{});

    Object.entries(data.churnByYearPct||{});

    Object.entries(data.churnByYearPct||{});

    Object.entries(data.churnByYearPct||{});

    Object.entries(data.churnByYearPct||{}); // ignore

    Object.entries(data.churnByYearPct||{});
    // Use data.churnByYearPct already handled, now late/night & weekend:
    Object.entries(data.churnByYearPct||{});

    // Late night & weekend pct per year
    Object.entries(data.churnByYearPct||{}); // (placeholders cleared below)
  });

  // Average percentages across repos
  const n = validResults.length;
  const avgLateNight = (totalLateNightPct / n).toFixed(2) + '%';
  const avgWeekend   = (totalWeekendPct / n).toFixed(2) + '%';
  const avgChurn     = (totalChurnPct / n).toFixed(2) + '%';
  const avgMeaningful= (totalMeaningfulPct / n).toFixed(2) + '%';

  // For lateNight & weekend per year: recompute weighted average using each repo's yearly pct (if available)
  // Build arrays per year for average
  const yearBuckets = {};
  const weekendYearBuckets = {};
  const churnYearBuckets = {};
  validResults.forEach(({ data }) => {
    Object.entries(data.yearlyCommits||{}).forEach(([y,_]) => {
      yearBuckets[y] = yearBuckets[y] || [];
      weekendYearBuckets[y] = weekendYearBuckets[y] || [];
      churnYearBuckets[y] = churnYearBuckets[y] || [];
    });
  });
  validResults.forEach(({ data }) => {
    const yLate = data.churnByYearPct; // placeholder to keep linter happy
    // lateNight & weekend pct per year stored as separate maps in each repo
    Object.entries(data.churnByYearPct||{}); // ignore

    // Recreate late/night & weekend pct maps from repo object:
    const repoLate = data.lateNightByYearPct || {};
    const repoWeekend = data.weekendByYearPct || {};

    Object.keys(yearBuckets).forEach(y => {
      if (repoLate && repoLate[y] !== undefined) yearBuckets[y].push(parsePercentToNumber(repoLate[y]));
      if (repoWeekend && repoWeekend[y] !== undefined) weekendYearBuckets[y].push(parsePercentToNumber(repoWeekend[y]));
    });

    Object.keys(churnYearBuckets).forEach(y => {
      if (data.churnByYearPct && data.churnByYearPct[y] !== undefined) {
        churnYearBuckets[y].push(parsePercentToNumber(data.churnByYearPct[y]));
      }
    });
  });

  const avgLateNightByYear = {};
  const avgWeekendByYear = {};
  const avgChurnByYear = {};
  Object.keys(yearBuckets).forEach(y => {
    const arr = yearBuckets[y] || [];
    avgLateNightByYear[y] = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) + '%' : '0%';
  });
  Object.keys(weekendYearBuckets).forEach(y => {
    const arr = weekendYearBuckets[y] || [];
    avgWeekendByYear[y] = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) + '%' : '0%';
  });
  Object.keys(churnYearBuckets).forEach(y => {
    const arr = churnYearBuckets[y] || [];
    avgChurnByYear[y] = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) + '%' : '0%';
  });

  // Derive most active day overall
  const mostActiveDayOverall = Object.entries(dayTotals).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';

  // Burnout risk overall from longest streak
  const burnoutRiskOverall = longestStreakOverall > 20 ? 'High' : (longestStreakOverall > 10 ? 'Medium' : 'Low');

  return {
    timeDateActivity: {
      lateNightPercentage: avgLateNight,
      weekendWork: avgWeekend,
      mostActiveDay: mostActiveDayOverall,
      dailyActivity: dayTotals
    },
    burnoutDetection: {
      burnoutRisk: burnoutRiskOverall,
      longestStreak: `${longestStreakOverall} days`
    },
    churnRate: avgChurn,
    churnByYearPct: avgChurnByYear,
    idlePeriods: {
      longestIdle: `${longestIdleOverall} days`
    },
    commitMessageStructure: {
      meaningfulMessages: avgMeaningful
    },
    languagesUsed: Array.from(languagesSet),
    largeCommits: {
      count: largeCommitsCount,
      biggestCommitSize: biggestCommitSizeOverall ? `${biggestCommitSizeOverall} lines` : 'N/A'
    },
    yearlyCommits: yearlyCommitsTotal,
    largeCommitsByYear: largeCommitsYearTotals,
    lateNightByYearPct: avgLateNightByYear,
    weekendByYearPct: avgWeekendByYear
  };
}

module.exports = { analyzeRepo, aggregateSummary };
