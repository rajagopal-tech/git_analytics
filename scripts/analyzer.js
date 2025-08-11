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

  // Clone repo if not present
  if (!fs.existsSync(localPath)) {
    if (!fs.existsSync(cloneBasePath)) {
      fs.mkdirSync(cloneBasePath);
    }
    console.log(`Cloning ${repoUrl}...`);
    await git.clone(repoUrl, localPath);
  } else {
    console.log(`${repoName} already cloned. Skipping clone.`);
  }

  const repoGit = simpleGit(localPath);
  const rawLog = await repoGit.raw([
    'log',
    '--pretty=format:%H|%an|%ad|%s',
    '--date=iso',
    '--no-merges'
  ]);

  const commits = rawLog.trim().split('\n').map(line => {
    const [hash, author, date, message] = line.split('|');
    return { hash, author, date: new Date(date), message };
  });

  if (commits.length === 0) throw new Error('No commits found in repository');

  // Metrics calculations:

  // Late Night % (commits after 8pm)
  const lateNightCommits = commits.filter(c => c.date.getHours() >= 20).length;
  const lateNightPercentage = ((lateNightCommits / commits.length) * 100).toFixed(2) + '%';

  // Weekend Work %
  const weekendCommits = commits.filter(c => [0,6].includes(c.date.getDay())).length;
  const weekendWork = ((weekendCommits / commits.length) * 100).toFixed(2) + '%';

  // Most Active Day of Week
  const dayCount = {};
  commits.forEach(c => {
    const day = c.date.toLocaleDateString('en-US', { weekday: 'long' });
    dayCount[day] = (dayCount[day] || 0) + 1;
  });
  const mostActiveDay = Object.entries(dayCount).sort((a,b) => b[1] - a[1])[0][0];

  // Burnout detection - longest commit streak (consecutive days with commits)
  commits.sort((a,b) => a.date - b.date);
  let longestStreak = 1, currentStreak = 1;
  for (let i=1; i<commits.length; i++) {
    const diffDays = Math.floor((commits[i].date - commits[i-1].date) / (1000*60*60*24));
    if (diffDays === 1) currentStreak++;
    else currentStreak = 1;
    if (currentStreak > longestStreak) longestStreak = currentStreak;
  }
  let burnoutRisk = 'Low';
  if (longestStreak > 20) burnoutRisk = 'High';
  else if (longestStreak > 10) burnoutRisk = 'Medium';

  // Churn rate (approx ratio of commits with fix/remove/delete keywords)
  const churnCommits = commits.filter(c => /fix|remove|delete/i.test(c.message)).length;
  const churnRate = ((churnCommits / commits.length) * 100).toFixed(2) + '%';

  // Idle Periods - longest gap between commits in days
  let longestIdle = 0;
  for(let i=1; i<commits.length; i++) {
    const gap = Math.floor((commits[i].date - commits[i-1].date)/(1000*60*60*24));
    if (gap > longestIdle) longestIdle = gap;
  }
  const longestIdleStr = `${longestIdle} days`;

  // Commit message meaningfulness (% matching Conventional Commits)
  const conventionalRegex = /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/i;
  const meaningfulCount = commits.filter(c => conventionalRegex.test(c.message)).length;
  const meaningfulMessages = ((meaningfulCount / commits.length) * 100).toFixed(2) + '%';

  // Languages used (from last commit files)
  const lastCommitHash = commits[0].hash;
  const filesRaw = await repoGit.show(['--name-only', '--pretty=format:', lastCommitHash]);
  const fileExts = filesRaw.split('\n').filter(f => f.includes('.')).map(f => path.extname(f).toLowerCase());

  const extToLang = {
    '.js': 'JavaScript',
    '.py': 'Python',
    '.java': 'Java',
    '.ts': 'TypeScript',
    '.html': 'HTML',
    '.css': 'CSS',
    '.json': 'JSON',
    '.go': 'Go',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.c': 'C',
    '.cpp': 'C++',
  };
  const langsSet = new Set();
  fileExts.forEach(ext => {
    if(extToLang[ext]) langsSet.add(extToLang[ext]);
  });
  const languagesUsed = Array.from(langsSet);

  // Large commits (>100 lines added+deleted)
  let largeCommitsCount = 0;
  let biggestCommitSize = 0;

  for (let c of commits) {
    const diffSummary = await repoGit.show([c.hash, '--stat', '--pretty=format:', '--name-only']);
    const insertionsMatch = diffSummary.match(/(\d+) insertions?\(\+\)/);
    const deletionsMatch = diffSummary.match(/(\d+) deletions?\(-\)/);
    const insertions = insertionsMatch ? parseInt(insertionsMatch[1]) : 0;
    const deletions = deletionsMatch ? parseInt(deletionsMatch[1]) : 0;
    const totalChanges = insertions + deletions;
    if (totalChanges > 100) {
      largeCommitsCount++;
      if (totalChanges > biggestCommitSize) biggestCommitSize = totalChanges;
    }
  }

  return {
    timeDateActivity: {
      lateNightPercentage,
      weekendWork,
      mostActiveDay
    },
    burnoutDetection: {
      burnoutRisk,
      longestStreak: `${longestStreak} days`
    },
    churnRate,
    idlePeriods: {
      longestIdle: longestIdleStr
    },
    commitMessageStructure: {
      meaningfulMessages
    },
    languagesUsed,
    largeCommits: {
      count: largeCommitsCount,
      biggestCommitSize: biggestCommitSize ? `${biggestCommitSize} lines` : 'N/A'
    },
    repoName
  };
}

module.exports = { analyzeRepo };
