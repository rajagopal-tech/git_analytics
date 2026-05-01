const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

const cloneBasePath = path.join(__dirname, '../../cloned_repos');

// Convert UTC date to any timezone offset (in hours)
function toTimezone(date, offsetHours = 5.5) {
  return new Date(date.getTime() + offsetHours * 60 * 60 * 1000);
}

function formatDateTime(d, tzName = 'IST') {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss} ${tzName}`;
}

function parsePercentToNumber(s) {
  if (!s) return 0;
  const n = parseFloat(String(s).replace('%', ''));
  return Number.isNaN(n) ? 0 : n;
}

// Parse git log --stat output to extract commit stats in one pass
// BUG FIX: The header line uses --pretty=format:%H|%an|%ad|%s
// %s (subject) can contain '|', and stat lines never start with a 40-char hex hash.
// Use a SHA-1 pattern to reliably detect commit header lines.
const SHA_RE = /^[0-9a-f]{40}\|/;

function parseGitLogStat(rawOutput) {
  const commits = [];
  const lines = rawOutput.split('\n');

  let currentCommit = null;

  for (const line of lines) {
    if (SHA_RE.test(line)) {
      // New commit header
      if (currentCommit) commits.push(currentCommit);

      const pipeIdx = line.indexOf('|');
      const hash = line.slice(0, pipeIdx);
      const rest = line.slice(pipeIdx + 1);

      // rest = "author|dateStr|subject"  (subject may contain '|')
      const parts = rest.split('|');
      const author  = parts[0] || '';
      const dateStr = parts[1] || '';
      const message = parts.slice(2).join('|');

      currentCommit = { hash, author, dateStr, message, insertions: 0, deletions: 0 };
    } else if (currentCommit && line.includes('changed')) {
      // Stats line: " 3 files changed, 120 insertions(+), 30 deletions(-)"
      const insertMatch = line.match(/(\d+)\s+insertions?\(\+\)/);
      const deleteMatch = line.match(/(\d+)\s+deletions?\(-\)/);
      if (insertMatch) currentCommit.insertions = parseInt(insertMatch[1], 10);
      if (deleteMatch) currentCommit.deletions  = parseInt(deleteMatch[1], 10);
    }
  }

  if (currentCommit) commits.push(currentCommit);
  return commits;
}

async function analyzeRepo(repoUrl, timezone = 'Asia/Kolkata') {
  // Normalise URL: ensure it ends with .git and handles missing suffix
  let normalizedUrl = repoUrl.trim();
  if (normalizedUrl.endsWith('/')) normalizedUrl = normalizedUrl.slice(0, -1);
  if (!normalizedUrl.endsWith('.git')) normalizedUrl += '.git';

  if (!normalizedUrl.startsWith('https://github.com/')) {
    throw new Error('Invalid GitHub repo URL. Must start with https://github.com/ (HTTPS only)');
  }

  repoUrl = normalizedUrl;

  // Map common timezone names to offset hours
  const timezoneOffsets = {
    'Asia/Kolkata': 5.5,
    'UTC': 0,
    'America/New_York': -5,
    'America/Los_Angeles': -8,
    'Europe/London': 0,
    'Europe/Paris': 1,
    'Asia/Tokyo': 9,
    'Australia/Sydney': 10
  };
  
  const offsetHours = timezoneOffsets[timezone] || 5.5;
  const tzAbbrev = timezone.split('/').pop() || 'IST';

  const repoName = repoUrl.split('/').pop().replace('.git', '');
  const localPath = path.join(cloneBasePath, repoName);
  const git = simpleGit();

  // Clone if missing
  if (!fs.existsSync(localPath)) {
    if (!fs.existsSync(cloneBasePath)) fs.mkdirSync(cloneBasePath, { recursive: true });
    console.log(`Cloning ${repoUrl}...`);
    await git.clone(repoUrl, localPath);
  } else {
    console.log(`${repoName} already cloned. Pulling latest changes...`);
    const repoGit = simpleGit(localPath);
    await repoGit.pull().catch(() => console.log('Pull failed, using existing state'));
  }

  const repoGit = simpleGit(localPath);

  // PERFORMANCE FIX: Get commits with stats in ONE git call
  const rawLog = await repoGit.raw([
    'log',
    '--pretty=format:%H|%an|%ad|%s',
    '--date=iso',
    '--stat',
    '--no-merges'
  ]);

  if (!rawLog.trim()) throw new Error('No commits found in repository');

  const parsedCommits = parseGitLogStat(rawLog);
  
  // Convert to timezone and add computed fields
  const commits = parsedCommits.map(c => {
    const utcDate = new Date(c.dateStr);
    const tzDate = toTimezone(utcDate, offsetHours);
    return {
      hash: c.hash,
      author: c.author,
      date: tzDate,
      message: c.message,
      insertions: c.insertions,
      deletions: c.deletions,
      totalChanges: c.insertions + c.deletions
    };
  });

  if (commits.length === 0) throw new Error('No commits found in repository');

  // ---------- Metrics ----------
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dailyActivity = { Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
  const authorActivity = {};
  const yearlyCommits = {};
  const lateNightByYear = {};
  const weekendByYear = {};
  const churnByYearCounts = {};
  const largeCommitsByYear = {};

  const lateNightDetails = [];
  const weekendDetails = [];
  const churnDetails = [];
  const largeCommitDetails = [];
  const idlePeriodDetails = [];
  const commitMessageDetails = [];

  // Heuristics
  const churnRegex = /fix|remove|delete|revert/i;
  const conventionalRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/i;
  const isLateNight = d => d.getHours() >= 20 || d.getHours() < 5;
  const isWeekend = d => [0, 6].includes(d.getDay());

  // Fill counters & details
  commits.forEach(c => {
    const day = dayNames[c.date.getDay()];
    dailyActivity[day] = (dailyActivity[day] || 0) + 1;
    authorActivity[c.author] = (authorActivity[c.author] || 0) + 1;

    const y = c.date.getFullYear();
    yearlyCommits[y] = (yearlyCommits[y] || 0) + 1;

    if (isLateNight(c.date)) {
      lateNightByYear[y] = (lateNightByYear[y] || 0) + 1;
      lateNightDetails.push({
        author: c.author,
        time: formatDateTime(c.date, tzAbbrev),
        message: c.message,
        hash: c.hash
      });
    }
    
    if (isWeekend(c.date)) {
      weekendByYear[y] = (weekendByYear[y] || 0) + 1;
      weekendDetails.push({
        author: c.author,
        day: dayNames[c.date.getDay()],
        time: formatDateTime(c.date, tzAbbrev),
        message: c.message,
        hash: c.hash
      });
    }
    
    if (churnRegex.test(c.message)) {
      churnByYearCounts[y] = (churnByYearCounts[y] || 0) + 1;
      churnDetails.push({
        author: c.author,
        time: formatDateTime(c.date, tzAbbrev),
        message: c.message,
        hash: c.hash
      });
    }

    // Large commits (already have stats from git log --stat)
    if (c.totalChanges > 100) {
      largeCommitsByYear[y] = (largeCommitsByYear[y] || 0) + 1;
      largeCommitDetails.push({
        author: c.author,
        time: formatDateTime(c.date, tzAbbrev),
        message: c.message,
        hash: c.hash,
        totalChanges: c.totalChanges,
        insertions: c.insertions,
        deletions: c.deletions,
        year: y
      });
    }

    commitMessageDetails.push({
      author: c.author,
      message: c.message,
      isConventional: conventionalRegex.test(c.message),
      time: formatDateTime(c.date, tzAbbrev),
      hash: c.hash
    });
  });

  // Totals
  const totalCommits = commits.length;
  const lateNightCommits = lateNightDetails.length;
  const weekendCommits = weekendDetails.length;

  const lateNightPercentage = ((lateNightCommits / totalCommits) * 100).toFixed(2) + '%';
  const weekendWork = ((weekendCommits / totalCommits) * 100).toFixed(2) + '%';
  const mostActiveDay = Object.entries(dailyActivity).sort((a, b) => b[1] - a[1])[0][0];

  // Burnout detection — guard against single-commit repos
  commits.sort((a, b) => a.date - b.date);
  let longestStreak = commits.length > 0 ? 1 : 0;
  let currentStreak = 1;
  for (let i = 1; i < commits.length; i++) {
    const prev = new Date(commits[i - 1].date.toDateString());
    const curr = new Date(commits[i].date.toDateString());
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) currentStreak++;
    else if (diffDays === 0) { /* same day */ }
    else currentStreak = 1;
    if (currentStreak > longestStreak) longestStreak = currentStreak;
  }
  
  let burnoutRisk = 'Low';
  if (longestStreak > 20) burnoutRisk = 'High';
  else if (longestStreak > 10) burnoutRisk = 'Medium';

  // Idle periods
  let longestIdle = 0;
  for (let i = 1; i < commits.length; i++) {
    const gap = Math.floor((commits[i].date - commits[i - 1].date) / (1000 * 60 * 60 * 24));
    if (gap > longestIdle) longestIdle = gap;
    if (gap >= 7) {
      idlePeriodDetails.push({
        gapDays: gap,
        from: formatDateTime(commits[i - 1].date, tzAbbrev),
        to: formatDateTime(commits[i].date, tzAbbrev),
        resumedBy: commits[i].author,
        resumedHash: commits[i].hash
      });
    }
  }

  // Churn rate
  const churnCommits = churnDetails.length;
  const churnRate = ((churnCommits / totalCommits) * 100).toFixed(2) + '%';

  // Conventional commits — cap commitMessageDetails at 500 to avoid MongoDB doc size limits
  const meaningfulCount = commitMessageDetails.filter(c => c.isConventional).length;
  const meaningfulMessages = ((meaningfulCount / totalCommits) * 100).toFixed(2) + '%';
  const commitMessageDetailsCapped = commitMessageDetails.slice(0, 500);

  // FEATURE 5: Full-repo language detection via git ls-files
  const extToLang = {
    '.js': 'JavaScript', '.ts': 'TypeScript', '.jsx': 'JavaScript', '.tsx': 'TypeScript',
    '.py': 'Python', '.java': 'Java', '.go': 'Go', '.rb': 'Ruby', '.php': 'PHP',
    '.c': 'C', '.cpp': 'C++', '.cs': 'C#', '.rs': 'Rust', '.swift': 'Swift', '.kt': 'Kotlin',
    '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.json': 'JSON', '.md': 'Markdown',
    '.yml': 'YAML', '.yaml': 'YAML', '.xml': 'XML', '.sql': 'SQL', '.sh': 'Shell'
  };

  const allFilesRaw = await repoGit.raw(['ls-files']).catch(() => '');
  const langCounts = {};
  allFilesRaw.split('\n').filter(Boolean).forEach(f => {
    const ext = path.extname(f).toLowerCase();
    const lang = extToLang[ext];
    if (lang) langCounts[lang] = (langCounts[lang] || 0) + 1;
  });

  const totalLangFiles = Object.values(langCounts).reduce((a, b) => a + b, 0) || 1;
  const languageBreakdown = Object.entries(langCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([lang, count]) => ({
      lang,
      count,
      pct: ((count / totalLangFiles) * 100).toFixed(1) + '%'
    }));
  const languagesUsed = languageBreakdown.map(l => l.lang);

  // FEATURE 4: Per-author detailed metrics
  const authorMetrics = {};
  commits.forEach(c => {
    const a = c.author;
    if (!authorMetrics[a]) {
      authorMetrics[a] = {
        name: a,
        totalCommits: 0,
        lateNight: 0,
        weekend: 0,
        churn: 0,
        conventional: 0,
        largeCommits: 0,
        insertions: 0,
        deletions: 0,
        firstCommit: c.date,
        lastCommit: c.date,
        activeDays: new Set()
      };
    }
    const am = authorMetrics[a];
    am.totalCommits++;
    am.insertions += c.insertions;
    am.deletions += c.deletions;
    am.activeDays.add(c.date.toDateString());
    if (c.date < am.firstCommit) am.firstCommit = c.date;
    if (c.date > am.lastCommit) am.lastCommit = c.date;
    if (isLateNight(c.date)) am.lateNight++;
    if (isWeekend(c.date)) am.weekend++;
    if (churnRegex.test(c.message)) am.churn++;
    if (conventionalRegex.test(c.message)) am.conventional++;
    if (c.totalChanges > 100) am.largeCommits++;
  });

  // Serialise (Sets aren't JSON-safe)
  const authorMetricsList = Object.values(authorMetrics).map(am => ({
    name: am.name,
    totalCommits: am.totalCommits,
    lateNightPct: ((am.lateNight / am.totalCommits) * 100).toFixed(1) + '%',
    weekendPct: ((am.weekend / am.totalCommits) * 100).toFixed(1) + '%',
    churnPct: ((am.churn / am.totalCommits) * 100).toFixed(1) + '%',
    conventionalPct: ((am.conventional / am.totalCommits) * 100).toFixed(1) + '%',
    largeCommits: am.largeCommits,
    insertions: am.insertions,
    deletions: am.deletions,
    activeDays: am.activeDays.size,
    firstCommit: formatDateTime(am.firstCommit, tzAbbrev),
    lastCommit: formatDateTime(am.lastCommit, tzAbbrev)
  })).sort((a, b) => b.totalCommits - a.totalCommits);

  // Large commits stats — declare FIRST so healthScore can use it
  const largeCommitsCount = largeCommitDetails.length;
  const biggestCommitSize = largeCommitDetails.length > 0
    ? Math.max(...largeCommitDetails.map(c => c.totalChanges))
    : 0;

  // FEATURE 4: Team health score (0–100)
  const lateNightScore   = Math.max(0, 100 - parsePercentToNumber(lateNightPercentage) * 2);
  const weekendScore     = Math.max(0, 100 - parsePercentToNumber(weekendWork) * 2);
  const churnScore       = Math.max(0, 100 - parsePercentToNumber(churnRate) * 1.5);
  const qualityScore     = parsePercentToNumber(meaningfulMessages);
  const largeCommitRatio = totalCommits > 0 ? (largeCommitsCount / totalCommits) * 100 : 0;
  const largeScore       = Math.max(0, 100 - largeCommitRatio * 3);
  const healthScore      = Math.round((lateNightScore + weekendScore + churnScore + qualityScore + largeScore) / 5);
  const years = Object.keys(yearlyCommits).sort();
  const lateNightByYearPct = {};
  const weekendByYearPct = {};
  const churnByYearPct = {};
  
  years.forEach(y => {
    const total = yearlyCommits[y];
    lateNightByYearPct[y] = total ? (((lateNightByYear[y] || 0) / total) * 100).toFixed(2) + '%' : '0%';
    weekendByYearPct[y] = total ? (((weekendByYear[y] || 0) / total) * 100).toFixed(2) + '%' : '0%';
    churnByYearPct[y] = total ? (((churnByYearCounts[y] || 0) / total) * 100).toFixed(2) + '%' : '0%';
  });

  return {
    repoName,
    totalCommits,
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
      commitMessageDetails: commitMessageDetailsCapped
    },
    languagesUsed,
    languageBreakdown,
    authorMetrics: authorMetricsList,
    healthScore,
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

// Aggregate multiple repos
function aggregateSummary(validResults) {
  if (!validResults.length) return null;

  const dayTotals = { Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };
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
    totalWeekendPct += parsePercentToNumber(data.timeDateActivity.weekendWork);
    totalChurnPct += parsePercentToNumber(data.churnRate);
    totalMeaningfulPct += parsePercentToNumber(data.commitMessageStructure.meaningfulMessages);

    Object.keys(dayTotals).forEach(d => { dayTotals[d] += data.timeDateActivity.dailyActivity[d] || 0; });

    const ls = parseInt(String(data.burnoutDetection.longestStreak).replace(/\D/g, '')) || 0;
    longestStreakOverall = Math.max(longestStreakOverall, ls);
    
    const li = parseInt(String(data.idlePeriods.longestIdle).replace(/\D/g, '')) || 0;
    longestIdleOverall = Math.max(longestIdleOverall, li);

    (data.languagesUsed || []).forEach(l => languagesSet.add(l));

    largeCommitsCount += data.largeCommits.count || 0;
    const big = parseInt(String(data.largeCommits.biggestCommitSize || '').replace(/\D/g, '')) || 0;
    biggestCommitSizeOverall = Math.max(biggestCommitSizeOverall, big);

    Object.entries(data.yearlyCommits || {}).forEach(([y, c]) => {
      yearlyCommitsTotal[y] = (yearlyCommitsTotal[y] || 0) + c;
    });
    
    Object.entries(data.largeCommitsByYear || {}).forEach(([y, c]) => {
      largeCommitsYearTotals[y] = (largeCommitsYearTotals[y] || 0) + c;
    });

    sumLateNightDetails.push(...(data.timeDateActivity.lateNightDetails || []));
    sumWeekendDetails.push(...(data.timeDateActivity.weekendDetails || []));
    sumChurnDetails.push(...(data.churnDetails || []));
    sumLargeCommitDetails.push(...(data.largeCommits.details || []));
    sumIdlePeriodDetails.push(...(data.burnoutDetection.idlePeriodDetails || []));
    sumCommitMessageDetails.push(...(data.commitMessageStructure.commitMessageDetails || []));

    Object.entries(data.lateNightByYearPct || {}).forEach(([y, p]) => (bucketsLate[y] ||= []).push(parsePercentToNumber(p)));
    Object.entries(data.weekendByYearPct || {}).forEach(([y, p]) => (bucketsWeekend[y] ||= []).push(parsePercentToNumber(p)));
    Object.entries(data.churnByYearPct || {}).forEach(([y, p]) => (bucketsChurn[y] ||= []).push(parsePercentToNumber(p)));
  });

  const n = validResults.length;
  const avgLateNight = (totalLateNightPct / n).toFixed(2) + '%';
  const avgWeekend = (totalWeekendPct / n).toFixed(2) + '%';
  const avgChurn = (totalChurnPct / n).toFixed(2) + '%';
  const avgMeaningful = (totalMeaningfulPct / n).toFixed(2) + '%';

  const avgLateNightByYear = {};
  const avgWeekendByYear = {};
  const avgChurnByYear = {};
  
  Object.keys(bucketsLate).forEach(y => {
    const arr = bucketsLate[y];
    avgLateNightByYear[y] = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) + '%';
  });
  
  Object.keys(bucketsWeekend).forEach(y => {
    const arr = bucketsWeekend[y];
    avgWeekendByYear[y] = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) + '%';
  });
  
  Object.keys(bucketsChurn).forEach(y => {
    const arr = bucketsChurn[y];
    avgChurnByYear[y] = (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) + '%';
  });

  const mostActiveDayOverall = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
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
    commitMessageStructure: {
      meaningfulMessages: avgMeaningful,
      commitMessageDetails: sumCommitMessageDetails
    },
    languagesUsed: Array.from(languagesSet),
    largeCommits: {
      count: largeCommitsCount,
      biggestCommitSize: biggestCommitSizeOverall ? `${biggestCommitSizeOverall} lines` : 'N/A',
      details: sumLargeCommitDetails
    },
    yearlyCommits: yearlyCommitsTotal,
    largeCommitsByYear: largeCommitsYearTotals,
    lateNightByYearPct: avgLateNightByYear,
    weekendByYearPct: avgWeekendByYear
  };
}

module.exports = { analyzeRepo, aggregateSummary };
