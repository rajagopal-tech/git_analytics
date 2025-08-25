const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = 5000;

app.use(express.json());

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);
let collection;

client.connect().then(() => {
  const db = client.db('gitAnalytics');
  collection = db.collection('commits');
  console.log('✅ Connected to MongoDB');
});
app.get('/analytics/time-date-activity', async (req, res) => {
  const timezone = 'Asia/Kolkata';
  const commits = await collection.find().toArray();
  const activity = {};

  const hourFreq = {}; // for top active hours
  const lateNightCommits = {}; // after 8 PM

  for (let c of commits) {
    const dateObj = new Date(c.date);
    const localDate = dateObj.toLocaleDateString('en-CA', { timeZone: timezone });
    const localHour = dateObj.toLocaleString('en-US', { timeZone: timezone, hour: '2-digit', hour12: false });
    const author = c.author?.name || 'Unknown';

    // Date + Hour structure
    if (!activity[localDate]) activity[localDate] = {};
    if (!activity[localDate][localHour]) activity[localDate][localHour] = { count: 0, authors: new Set() };

    activity[localDate][localHour].count++;
    activity[localDate][localHour].authors.add(author);

    // Hour frequency
    hourFreq[localHour] = (hourFreq[localHour] || 0) + 1;

    // Late night commits after 20:00
    if (parseInt(localHour) >= 20) {
      lateNightCommits[author] = (lateNightCommits[author] || 0) + 1;
    }
  }

  // Convert sets to arrays
  const result = Object.entries(activity).map(([date, hours]) => ({
    date,
    hourlyActivity: Object.entries(hours).map(([hour, data]) => ({
      hour,
      commits: data.count,
      authors: Array.from(data.authors)
    }))
  }));

  const topHours = Object.entries(hourFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hour, count]) => ({ hour, commits: count }));

  const lateNight = Object.entries(lateNightCommits)
    .map(([author, count]) => ({ author, lateNightCommits: count }));

  res.json({
    result,
    topActiveHours: topHours,
    lateNightCommits: lateNight
  });
});
app.get('/api/weekend-activity', async (req, res) => {
  const { client, collection } = await connectToCollection();

  try {
    const pipeline = [
      {
        $addFields: {
          dateObj: { $toDate: '$date' },
          author: '$author.name',
          hour: { $hour: { date: { $toDate: '$date' }, timezone: 'Asia/Kolkata' } },
          dateOnly: {
            $dateToString: { format: '%Y-%m-%d', date: { $toDate: '$date' }, timezone: 'Asia/Kolkata' }
          },
          dayOfWeek: {
            $dayOfWeek: { date: { $toDate: '$date' }, timezone: 'Asia/Kolkata' }
          }
        }
      },
      {
        $facet: {
          weekendCommits: [
            { $match: { dayOfWeek: { $in: [1, 7] } } }, // Sunday or Saturday
            {
              $group: {
                _id: '$author',
                totalWeekendCommits: { $sum: 1 },
                hours: { $push: '$hour' },
                dates: { $addToSet: '$dateOnly' }
              }
            },
            {
              $project: {
                totalWeekendCommits: 1,
                avgCommitsPerWeekend: {
                  $divide: ['$totalWeekendCommits', { $size: '$dates' }]
                },
                mostActiveHour: {
                  $first: {
                    $arrayElemAt: [
                      {
                        $map: {
                          input: {
                            $slice: [
                              {
                                $sortArray: {
                                  input: {
                                    $map: {
                                      input: { $setUnion: ['$hours', []] },
                                      as: 'h',
                                      in: {
                                        hour: '$$h',
                                        count: {
                                          $size: {
                                            $filter: {
                                              input: '$hours',
                                              cond: { $eq: ['$$this', '$$h'] }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  },
                                  sortBy: { count: -1 }
                                }
                              },
                              1
                            ]
                          },
                          as: 'el',
                          in: '$$el.hour'
                        }
                      },
                      0
                    ]
                  }
                }
              }
            },
            { $sort: { totalWeekendCommits: -1 } }
          ],
          weekdayCommitters: [
            {
              $addFields: {
                isWeekend: { $in: ['$dayOfWeek', [1, 7]] }
              }
            },
            {
              $group: {
                _id: '$author',
                weekend: {
                  $sum: {
                    $cond: [{ $eq: ['$isWeekend', true] }, 1, 0]
                  }
                },
                weekday: {
                  $sum: {
                    $cond: [{ $eq: ['$isWeekend', false] }, 1, 0]
                  }
                }
              }
            },
            {
              $project: {
                _id: 1,
                onlyWeekend: {
                  $cond: [{ $eq: ['$weekday', 0] }, true, false]
                },
                weekend,
                weekday
              }
            }
          ]
        }
      }
    ];

    const result = await collection.aggregate(pipeline).toArray();
    res.json(result[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.close();
  }
});

app.get('/analytics/idle-periods', async (req, res) => {
  const authors = await collection.distinct("author.name");
  const idleData = [];

  for (const author of authors) {
    const commits = await collection
      .find({ "author.name": author })
      .sort({ date: 1 })
      .toArray();

    let maxGap = 0;
    for (let i = 1; i < commits.length; i++) {
      const diff = new Date(commits[i].date) - new Date(commits[i - 1].date);
      const days = diff / (1000 * 60 * 60 * 24);
      if (days > maxGap) maxGap = days;
    }

    idleData.push({ author, maxIdleDays: maxGap });
  }

  res.json(idleData);
});
app.get('/analytics/churn-rate', async (req, res) => {
  const pipeline = [
    {
      $group: {
        _id: '$author.name',
        deletions: { $sum: '$stats.deletions' },
        insertions: { $sum: '$stats.insertions' }
      }
    },
    {
      $project: {
        deletions: 1,
        insertions: 1,
        churnRate: {
          $cond: [
            { $eq: ['$insertions', 0] },
            0,
            { $divide: ['$deletions', '$insertions'] }
          ]
        }
      }
    },
    { $sort: { churnRate: -1 } }
  ];
  const result = await collection.aggregate(pipeline).toArray();
  res.json(result);
});
app.get('/analytics/commit-message-structure', async (req, res) => {
  const commits = await collection.find().toArray();
  const structure = commits.map(c => ({
    author: c.author.name,
    message: c.message,
    length: c.message.length,
    isConventional: /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/.test(c.message)
  }));
  res.json(structure);
});
app.get('/analytics/commit-code-ratio', async (req, res) => {
  const commits = await collection.find().toArray();

  const ratios = commits.map(c => {
    const additions = c.stats.insertions || 0;
    const deletions = c.stats.deletions || 0;
    const total = additions + deletions;
    return {
      author: c.author.name,
      message: c.message,
      totalChanges: total,
      insertions: additions,
      deletions,
      codeRatio: total === 0 ? 0 : additions / total
    };
  });

  res.json(ratios);
});
app.get('/analytics/languages', async (req, res) => {
  const pipeline = [
    {
      $group: {
        _id: '$language',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ];
  const result = await collection.aggregate(pipeline).toArray();
  res.json(result);
});
app.get('/analytics/work-progress', async (req, res) => {
  const pipeline = [
    {
      $group: {
        _id: '$author.name',
        totalInsertions: { $sum: '$stats.insertions' }
      }
    },
    { $sort: { totalInsertions: -1 } }
  ];
  const result = await collection.aggregate(pipeline).toArray();
  res.json(result);
});
app.get('/analytics/large-commits', async (req, res) => {
  const result = await collection
    .find({ 'stats.insertions': { $gte: 500 } })
    .sort({ 'stats.insertions': -1 })
    .toArray();

  const formatted = result.map(c => ({
    author: c.author.name,
    insertions: c.stats.insertions,
    deletions: c.stats.deletions,
    message: c.message,
    date: c.date
  }));

  res.json(formatted);
});
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);   
});
