const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const os = require('os');

const basePath = path.join(__dirname, 'cloned');

function hasCommentInCode(code) {
  return /\/\/|\/\*|\*/.test(code);
}

async function analyzeRepo(repoUrl) {
  const repoName = repoUrl.split('/').pop();
  const localPath = path.join(basePath, repoName);

  if (!fs.existsSync(basePath)) fs.mkdirSync(basePath);

  const git = simpleGit();

  // Clone if not already
  if (!fs.existsSync(localPath)) {
    await git.clone(repoUrl, localPath);
  }

  const repoGit = simpleGit(localPath);
  const logs = await repoGit.log({ '--no-merges': null });

  const commits = [];

  for (let commit of logs.all.slice(0, 20)) {
    const code = await repoGit.show([commit.hash]);
    const hasComment = hasCommentInCode(code);

    commits.push({
      message: commit.message,
      author: commit.author_name,
      hasComment,
    });
  }

  const totalCommits = commits.length;
  const commentedCommits = commits.filter(c => c.hasComment).length;
  const nonCommentedCommits = totalCommits - commentedCommits;

  return {
    repoName,
    metrics: {
      totalCommits,
      commentedCommits,
      nonCommentedCommits,
      commits,
    },
  };
}

module.exports = { analyzeRepo };
