// scripts/analyzer.js
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

const cloneBasePath = path.join(__dirname, '../cloned_repos');

// Convert a Date (UTC) to IST Date object (no external libs)
function toIST(date) {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
}
function fmtIST(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss} IST`;
}

function dayName(d) {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
}

function parsePercentToNumber(s) {
  if (!s) return 0;
  const n = parseFloat(String(s).replace('%',''));
  return Number.isNaN(n) ? 0 : n;
}

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

  // Get commits (no merges)
  const rawLog = await repoGit.raw([
    'log',
    '--pretty=format:%H|%an|%ad|%s',
    '--date=iso',
    '--no-merges'
  ]);

  const lines = rawLog.trim().length ? rawLog.trim().split('\n') : [];
  // parse and convert to IST right away
  const commits = lines.map(line => {
    const [hash, author, dateStr, message] = line.split('|');
    const utcDate = new Date(dateStr);
    const istDate = toIST(utcDate);
    return { hash, author, date: istDate, message };
  });

  if (commits.length === 0) throw new Error('No commits found in repository');

  // ---------- Metrics ----------
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dailyActivity = { Sunday:0, Monday:0, Tuesday:0, Wednesday:0, Thursday:0, Friday:0, Saturday:0 };
  const authorActivity = {};
  const yearlyCommits = {};            // year -> count
  const lateNightByYear = {};          // year -> count
  const weekendByYear = {};            // year -> count
  const churnByYearCounts = {};        // year -> churn-count
  const largeCommitsByYear = {};       // year -> count

  const lateNightDetails = [];         // IST details
  const weekendDetails = [];           // IST details
  const churnDetails = [];             // IST details
  const largeCommitDetails = [];       // details with totalChanges
  const idlePeriodDetails = [];        // long gaps
  const commitMessageDetails = [];     // commit message structure list

  // Heuristics
  const churnRegex = /fix|remove|delete|revert/i;
  const conventionalRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/i;
  // Late night considered 20:00 - 04:59 IST (as earlier design)
  const isLateNight = d => d.getHours() >= 20 || d.getHours() < 5;
  const isWeekend = d => [0,6].includes(d.getDay());

  // Fill counters & details
  commits.forEach(c => {
    const day = dayNames[c.date.getDay()];
    dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    authorActivity[c.author] = (authorActivity[c.author] || 0) + 1;

    const y = c.date.getFullYear();
    yearlyCommits[y] = (yearlyCommits[y] || 0) + 1;

    if (isLateNight(c.date)) {
      lateNightByYear[y] = (lateNightByYear[y] || 0) + 1;
      lateNightDetails.push({ author: c.author, timeIST: fmtIST(c.date), message: c.message, hash: c.hash });
    }
    if (isWeekend(c.date)) {
      weekendByYear[y] = (weekendByYear[y] || 0) + 1;
      weekendDetails.push({ author: c.author, day: dayNames[c.date.getDay()], timeIST: fmtIST(c.date), message: c.message, hash: c.hash });
    }
    if (churnRegex.test(c.message)) {
      churnByYearCounts[y] = (churnByYearCounts[y] || 0) + 1;
      churnDetails.push({ author: c.author, timeIST: fmtIST(c.date), message: c.message, hash: c.hash });
    }

    // commit message details (conventional flag)
    commitMessageDetails.push({ author: c.author, message: c.message, isConventional: conventionalRegex.test(c.message), timeIST: fmtIST(c.date), hash: c.hash });
  });

  // Totals
  const totalCommits = commits.length;
  const lateNightCommits = lateNightDetails.length;
  const weekendCommits = weekendDetails.length;

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
    else if (diffDays === 0) { /* same day */ }
    else currentStreak = 1;
    if (currentStreak > longestStreak) longestStreak = currentStreak;
  }
  let burnoutRisk = 'Low';
  if (longestStreak > 20) burnoutRisk = 'High';
  else if (longestStreak > 10) burnoutRisk = 'Medium';

  // Idle periods — longest gap (days) between adjacent commits & details for big gaps
  let longestIdle = 0;
  for (let i=1; i<commits.length; i++) {
    const gap = Math.floor((commits[i].date - commits[i-1].date) / (1000*60*60*24));
    if (gap > longestIdle) longestIdle = gap;
    if (gap >= 7) {
      idlePeriodDetails.push({
        gapDays: gap,
        fromIST: fmtIST(commits[i-1].date),
        toIST: fmtIST(commits[i].date),
        resumedBy: commits[i].author,
        resumedHash: commits[i].hash
      });
    }
  }

  // Churn rate (message keyword heuristic)
  const churnCommits = churnDetails.length;
  const churnRate = ((churnCommits / totalCommits) * 100).toFixed(2) + '%';

  // Conventional commit % (meaningful)
  const meaningfulCount = commitMessageDetails.filter(c => c.isConventional).length;
  const meaningfulMessages = ((meaningfulCount / totalCommits) * 100).toFixed(2) + '%';

  // Languages used — from most recent commit file list (fast heuristic)
  const newestCommitHash = commits[commits.length - 1].hash;
  const filesRaw = await repoGit.show(['--name-only', '--pretty=format:', newestCommitHash]).catch(()=>'');
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

  // Large commits — insertions+deletions > 100
  let largeCommitsCount = 0;
  let biggestCommitSize = 0;
  for (let c of commits) {
    const diffSummary = await repoGit.show([c.hash, '--stat', '--pretty=format:']).catch(()=>'');
    const insertionsMatch = diffSummary.match(/(\d+)\s+insertions?\(\+\)/);
    const deletionsMatch = diffSummary.match(/(\d+)\s+deletions?\(-\)/);
    const insertions = insertionsMatch ? parseInt(insertionsMatch[1],10) : 0;
    const deletions = deletionsMatch ? parseInt(deletionsMatch[1],10) : 0;
    const totalChanges = insertions + deletions;
    if (totalChanges > 100) {
      largeCommitsCount++;
      const y = c.date.getFullYear();
      largeCommitsByYear[y] = (largeCommitsByYear[y] || 0) + 1;
      largeCommitDetails.push({ author: c.author, timeIST: fmtIST(c.date), message: c.message, hash: c.hash, totalChanges, year: y });
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
    lateNightByYearPct[y] = total ? (((lateNightByYear[y]||0)/total)*100).toFixed(2) + '%' : '0%';
    weekendByYearPct[y] = total ? (((weekendByYear[y]||0)/total)*100).toFixed(2) + '%' : '0%';
    churnByYearPct[y]    = total ? (((churnByYearCounts[y]||0)/total)*100).toFixed(2) + '%' : '0%';
  });

  return {
    repoName,
    timeDateActivity: {
      lateNightPercentage,
      weekendWork,
      mostActiveDay,
      dailyActivity,
      lateNightDetails,
      weekendDetails
    },
    burnoutDetection: {
      burnoutRisk,
      longestStreak: `${longestStreak} days`,
      idlePeriodDetails
    },
    churnRate,
    churnByYearPct,
    churnDetails,
    idlePeriods: {
      longestIdle: `${longestIdle} days`
    },
    commitMessageStructure: {
      meaningfulMessages,
      commitMessageDetails
    },
    languagesUsed,
    largeCommits: {
      count: largeCommitsCount,
      biggestCommitSize: biggestCommitSize ? `${biggestCommitSize} lines` : 'N/A',
      details: largeCommitDetails
    },
    largeCommitsByYear,
    yearlyCommits,
    authorActivity,
    lateNightByYearPct,
    weekendByYearPct
  };
}

// Aggregate many repos into summary
function aggregateSummary(validResults) {
  if (!validResults.length) return null;

  const dayTotals = { Sunday:0, Monday:0, Tuesday:0, Wednesday:0, Thursday:0, Friday:0, Saturday:0 };
  const languagesSet = new Set();
  const yearlyCommitsTotal = {};
  const largeCommitsYearTotals = {};

  let totalLateNightPct = 0;
  let totalWeekendPct = 0;
  let totalChurnPct = 0;
  let totalMeaningfulPct = 0;

  let longestStreakOverall = 0;
  let longestIdleOverall = 0;
  let largeCommitsCount = 0;
  let biggestCommitSizeOverall = 0;

  const sumLateNightDetails = [];
  const sumWeekendDetails = [];
  const sumChurnDetails = [];
  const sumLargeCommitDetails = [];
  const sumIdlePeriodDetails = [];
  const sumCommitMessageDetails = [];

  const bucketsLate = {};
  const bucketsWeekend = {};
  const bucketsChurn = {};

  validResults.forEach(({ data }) => {
    totalLateNightPct += parsePercentToNumber(data.timeDateActivity.lateNightPercentage);
    totalWeekendPct   += parsePercentToNumber(data.timeDateActivity.weekendWork);
    totalChurnPct     += parsePercentToNumber(data.churnRate);
    totalMeaningfulPct+= parsePercentToNumber(data.commitMessageStructure.meaningfulMessages);

    Object.keys(dayTotals).forEach(d => { dayTotals[d] += data.timeDateActivity.dailyActivity[d] || 0; });

    const ls = parseInt(String(data.burnoutDetection.longestStreak).replace(/\D/g,'')) || 0;
    longestStreakOverall = Math.max(longestStreakOverall, ls);
    const li = parseInt(String(data.idlePeriods.longestIdle).replace(/\D/g,'')) || 0;
    longestIdleOverall = Math.max(longestIdleOverall, li);

    (data.languagesUsed||[]).forEach(l => languagesSet.add(l));

    largeCommitsCount += data.largeCommits.count || 0;
    const big = parseInt(String(data.largeCommits.biggestCommitSize||'').replace(/\D/g,'')) || 0;
    biggestCommitSizeOverall = Math.max(biggestCommitSizeOverall, big);

    Object.entries(data.yearlyCommits||{}).forEach(([y,c]) => {
      yearlyCommitsTotal[y] = (yearlyCommitsTotal[y]||0) + c;
    });
    Object.entries(data.largeCommitsByYear||{}).forEach(([y,c]) => {
      largeCommitsYearTotals[y] = (largeCommitsYearTotals[y]||0) + c;
    });

    // collect details for summary panels
    sumLateNightDetails.push(...(data.timeDateActivity.lateNightDetails||[]));
    sumWeekendDetails.push(...(data.timeDateActivity.weekendDetails||[]));
    sumChurnDetails.push(...(data.churnDetails||[]));
    sumLargeCommitDetails.push(...(data.largeCommits.details||[]));
    sumIdlePeriodDetails.push(...(data.burnoutDetection.idlePeriodDetails||[]));
    sumCommitMessageDetails.push(...(data.commitMessageStructure.commitMessageDetails||[]));

    // build buckets for per-year averaging
    Object.entries(data.lateNightByYearPct||{}).forEach(([y,p]) => (bucketsLate[y] ||= []).push(parsePercentToNumber(p)));
    Object.entries(data.weekendByYearPct||{}).forEach(([y,p]) => (bucketsWeekend[y] ||= []).push(parsePercentToNumber(p)));
    Object.entries(data.churnByYearPct||{}).forEach(([y,p]) => (bucketsChurn[y] ||= []).push(parsePercentToNumber(p)));
  });

  const n = validResults.length;
  const avgLateNight = (totalLateNightPct / n).toFixed(2) + '%';
  const avgWeekend   = (totalWeekendPct / n).toFixed(2) + '%';
  const avgChurn     = (totalChurnPct / n).toFixed(2) + '%';
  const avgMeaningful= (totalMeaningfulPct / n).toFixed(2) + '%';

  const avgLateNightByYear = {};
  const avgWeekendByYear = {};
  const avgChurnByYear = {};
  Object.keys(bucketsLate).forEach(y => { const arr = bucketsLate[y]; avgLateNightByYear[y] = (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) + '%'; });
  Object.keys(bucketsWeekend).forEach(y => { const arr = bucketsWeekend[y]; avgWeekendByYear[y] = (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) + '%'; });
  Object.keys(bucketsChurn).forEach(y => { const arr = bucketsChurn[y]; avgChurnByYear[y] = (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) + '%'; });

  const mostActiveDayOverall = Object.entries(dayTotals).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'N/A';
  const burnoutRiskOverall = longestStreakOverall > 20 ? 'High' : (longestStreakOverall > 10 ? 'Medium' : 'Low');

  return {
    timeDateActivity: {
      lateNightPercentage: avgLateNight,
      weekendWork: avgWeekend,
      mostActiveDay: mostActiveDayOverall,
      dailyActivity: dayTotals,
      lateNightDetails: sumLateNightDetails,
      weekendDetails: sumWeekendDetails
    },
    burnoutDetection: {
      burnoutRisk: burnoutRiskOverall,
      longestStreak: `${longestStreakOverall} days`,
      idlePeriodDetails: sumIdlePeriodDetails
    },
    churnRate: avgChurn,
    churnByYearPct: avgChurnByYear,
    churnDetails: sumChurnDetails,
    idlePeriods: { longestIdle: `${longestIdleOverall} days` },
    commitMessageStructure: { meaningfulMessages: avgMeaningful, commitMessageDetails: sumCommitMessageDetails },
    languagesUsed: Array.from(languagesSet),
    largeCommits: { count: largeCommitsCount, biggestCommitSize: biggestCommitSizeOverall ? `${biggestCommitSizeOverall} lines` : 'N/A', details: sumLargeCommitDetails },
    yearlyCommits: yearlyCommitsTotal,
    largeCommitsByYear: largeCommitsYearTotals,
    lateNightByYearPct: avgLateNightByYear,
    weekendByYearPct: avgWeekendByYear
  };
}

module.exports = { analyzeRepo, aggregateSummary };
