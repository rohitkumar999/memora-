const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { readDb, writeDb } = require('./store');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

function uid() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function dateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function daysSince(value) {
  const diff = startOfToday().getTime() - new Date(value).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function formatRelativeDate(value) {
  const target = new Date(value);
  const today = startOfToday();
  const compare = new Date(target);
  compare.setHours(0, 0, 0, 0);
  const diff = Math.round((compare.getTime() - today.getTime()) / 86400000);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function calculatePrediction(topic) {
  const referenceDate = topic.lastStudiedAt || topic.plannedDate;
  const elapsed = daysSince(referenceDate);

  if (elapsed <= 2) {
    return { status: 'Good', retention: 82, nextReviewGap: 3 };
  }
  if (elapsed <= 5) {
    return { status: 'Moderate', retention: 58, nextReviewGap: 2 };
  }
  return { status: 'At Risk', retention: 36, nextReviewGap: 1 };
}

function syncTopicPrediction(topic) {
  const prediction = calculatePrediction(topic);
  topic.status = prediction.status;
  topic.retention = prediction.retention;

  if (!topic.nextReviewDate) {
    topic.nextReviewDate = addDays(topic.lastStudiedAt || topic.plannedDate, prediction.nextReviewGap);
  }
}

function syncAutoReminders(db, userId) {
  const activeTopics = db.topics.filter((topic) => topic.userId === userId);

  activeTopics.forEach((topic) => {
    syncTopicPrediction(topic);

    const hasPendingReminder = db.reminders.some(
      (reminder) => reminder.userId === userId && reminder.topicId === topic.id && reminder.state === 'todo'
    );

    const dueDate = topic.nextReviewDate || topic.plannedDate;
    if (!hasPendingReminder && new Date(dueDate) <= new Date(addDays(new Date(), 1))) {
      db.reminders.push({
        id: uid(),
        userId,
        topicId: topic.id,
        subject: topic.subject,
        topicName: topic.name,
        dueDate,
        state: 'todo',
        generatedBy: 'ml-engine',
        createdAt: new Date().toISOString(),
      });
    }
  });
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  const db = readDb();
  const session = db.sessions.find((item) => item.token === token);
  if (!session) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const user = db.users.find((item) => item.id === session.userId);
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }

  req.db = db;
  req.user = user;
  req.token = token;
  next();
}

function seedUserData(db, user) {
  const alreadySeeded = db.topics.some((topic) => topic.userId === user.id);
  if (alreadySeeded) return;

  const seeds = [
    { subject: 'DBMS', name: 'Normalization', plannedOffset: -5, studiedOffset: -5 },
    { subject: 'OS', name: 'Process Scheduling', plannedOffset: -2, studiedOffset: -2 },
    { subject: 'Networks', name: 'TCP/IP', plannedOffset: -3, studiedOffset: -3 },
    { subject: 'Algorithms', name: 'Sorting', plannedOffset: -8, studiedOffset: -8 },
    { subject: 'ML', name: 'Decision Trees', plannedOffset: -1, studiedOffset: -1 },
  ];

  seeds.forEach((seed) => {
    const plannedDate = addDays(new Date(), seed.plannedOffset);
    const lastStudiedAt = addDays(new Date(), seed.studiedOffset);
    const topic = {
      id: uid(),
      userId: user.id,
      subject: seed.subject,
      name: seed.name,
      plannedDate,
      planLabel: seed.plannedOffset === 0 ? 'Today' : seed.plannedOffset === 1 ? 'Tomorrow' : 'Pick Date',
      lastStudiedAt,
      nextReviewDate: addDays(lastStudiedAt, 1),
      retention: 0,
      status: 'Moderate',
      createdAt: new Date().toISOString(),
    };
    syncTopicPrediction(topic);
    db.topics.push(topic);
    db.studyLogs.push({
      id: uid(),
      userId: user.id,
      topicId: topic.id,
      subject: topic.subject,
      topicName: topic.name,
      studiedAt: lastStudiedAt,
    });
  });

  syncAutoReminders(db, user.id);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const db = readDb();
  const exists = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const user = { id: uid(), name, email, password };
  const token = crypto.randomBytes(24).toString('hex');
  db.users.push(user);
  db.sessions.push({ token, userId: user.id });
  seedUserData(db, user);
  writeDb(db);

  res.status(201).json({ token, user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDb();
  const user = db.users.find(
    (item) => item.email.toLowerCase() === String(email || '').toLowerCase() && item.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  db.sessions = db.sessions.filter((item) => item.userId !== user.id);
  db.sessions.push({ token, userId: user.id });
  seedUserData(db, user);
  syncAutoReminders(db, user.id);
  writeDb(db);

  res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', auth, (req, res) => {
  syncAutoReminders(req.db, req.user.id);
  writeDb(req.db);
  res.json({ user: publicUser(req.user) });
});

app.post('/api/auth/logout', auth, (req, res) => {
  req.db.sessions = req.db.sessions.filter((item) => item.token !== req.token);
  writeDb(req.db);
  res.json({ ok: true });
});

app.get('/api/topics', auth, (req, res) => {
  syncAutoReminders(req.db, req.user.id);
  writeDb(req.db);

  const topics = req.db.topics
    .filter((topic) => topic.userId === req.user.id)
    .map((topic) => ({
      id: topic.id,
      subject: topic.subject,
      name: topic.name,
      lastStudied: topic.lastStudiedAt ? formatRelativeDate(topic.lastStudiedAt) : 'Not yet studied',
      retention: topic.retention,
      status: topic.status,
      planLabel: topic.planLabel,
      plannedDate: dateOnly(topic.plannedDate),
      nextReviewDate: formatRelativeDate(topic.nextReviewDate || topic.plannedDate),
    }));

  res.json({ topics });
});

app.post('/api/topics', auth, (req, res) => {
  const { subject, name, scheduleType, pickedDate } = req.body;
  if (!subject || !name || !scheduleType) {
    return res.status(400).json({ message: 'Subject, topic, and schedule are required' });
  }

  let plannedDate;
  if (scheduleType === 'Today') {
    plannedDate = new Date().toISOString();
  } else if (scheduleType === 'Tomorrow') {
    plannedDate = addDays(new Date(), 1);
  } else {
    if (!pickedDate) {
      return res.status(400).json({ message: 'Pick date is required' });
    }
    plannedDate = new Date(pickedDate).toISOString();
  }

  const topic = {
    id: uid(),
    userId: req.user.id,
    subject,
    name,
    plannedDate,
    planLabel: scheduleType,
    lastStudiedAt: null,
    nextReviewDate: plannedDate,
    retention: 64,
    status: 'Moderate',
    createdAt: new Date().toISOString(),
  };

  syncTopicPrediction(topic);
  req.db.topics.push(topic);
  syncAutoReminders(req.db, req.user.id);
  writeDb(req.db);

  res.status(201).json({
    topic: {
      id: topic.id,
      subject: topic.subject,
      name: topic.name,
      lastStudied: 'Not yet studied',
      retention: topic.retention,
      status: topic.status,
      planLabel: topic.planLabel,
      plannedDate: dateOnly(topic.plannedDate),
      nextReviewDate: formatRelativeDate(topic.nextReviewDate || topic.plannedDate),
    },
  });
});

app.post('/api/topics/:id/mark-done', auth, (req, res) => {
  const topic = req.db.topics.find((item) => item.userId === req.user.id && item.id === req.params.id);
  if (!topic) {
    return res.status(404).json({ message: 'Topic not found' });
  }

  const completedAt = new Date().toISOString();
  const studyLog = {
    id: uid(),
    userId: req.user.id,
    topicId: topic.id,
    subject: topic.subject,
    topicName: topic.name,
    studiedAt: completedAt,
  };

  req.db.lastActions = req.db.lastActions.filter((item) => !(item.userId === req.user.id && item.type === 'mark-topic-done'));
  req.db.lastActions.push({
    userId: req.user.id,
    type: 'mark-topic-done',
    topicId: topic.id,
    previousLastStudiedAt: topic.lastStudiedAt,
    previousNextReviewDate: topic.nextReviewDate,
    previousStatus: topic.status,
    previousRetention: topic.retention,
    studyLogId: studyLog.id,
  });

  topic.lastStudiedAt = completedAt;
  topic.nextReviewDate = addDays(completedAt, 3);
  syncTopicPrediction(topic);
  req.db.studyLogs.push(studyLog);

  const existingReminder = req.db.reminders.find(
    (item) => item.userId === req.user.id && item.topicId === topic.id && item.state === 'todo'
  );
  if (existingReminder) {
    existingReminder.state = 'done';
    existingReminder.completedAt = completedAt;
  }

  syncAutoReminders(req.db, req.user.id);
  writeDb(req.db);
  res.json({ ok: true });
});

app.post('/api/topics/undo-last-study', auth, (req, res) => {
  const lastAction = req.db.lastActions.find((item) => item.userId === req.user.id && item.type === 'mark-topic-done');
  if (!lastAction) {
    return res.status(400).json({ message: 'No study action to undo' });
  }

  const topic = req.db.topics.find((item) => item.userId === req.user.id && item.id === lastAction.topicId);
  if (topic) {
    topic.lastStudiedAt = lastAction.previousLastStudiedAt;
    topic.nextReviewDate = lastAction.previousNextReviewDate;
    topic.status = lastAction.previousStatus;
    topic.retention = lastAction.previousRetention;
  }

  req.db.studyLogs = req.db.studyLogs.filter((item) => item.id !== lastAction.studyLogId);
  req.db.lastActions = req.db.lastActions.filter((item) => item !== lastAction);

  const reminder = req.db.reminders.find(
    (item) => item.userId === req.user.id && item.topicId === lastAction.topicId && item.state === 'done'
  );
  if (reminder) {
    reminder.state = 'todo';
    delete reminder.completedAt;
  }

  writeDb(req.db);
  res.json({ ok: true });
});

app.get('/api/reminders', auth, (req, res) => {
  syncAutoReminders(req.db, req.user.id);
  writeDb(req.db);

  const reminders = req.db.reminders
    .filter((item) => item.userId === req.user.id)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .map((item) => ({
      id: item.id,
      subject: item.subject,
      topic: item.topicName,
      due: formatRelativeDate(item.dueDate),
      state: item.state,
      generatedBy: 'AI Prediction Engine',
    }));

  const lastAction = req.db.lastActions.find((item) => item.userId === req.user.id) || null;
  res.json({ reminders, lastAction });
});

app.post('/api/reminders/:id/done', auth, (req, res) => {
  const reminder = req.db.reminders.find(
    (item) => item.userId === req.user.id && item.id === req.params.id
  );
  if (!reminder) {
    return res.status(404).json({ message: 'Reminder not found' });
  }

  reminder.state = 'done';
  reminder.completedAt = new Date().toISOString();

  const topic = req.db.topics.find((item) => item.id === reminder.topicId && item.userId === req.user.id);
  if (topic) {
    const studyLog = {
      id: uid(),
      userId: req.user.id,
      topicId: topic.id,
      subject: topic.subject,
      topicName: topic.name,
      studiedAt: reminder.completedAt,
    };
    reminder.undoSnapshot = {
      previousLastStudiedAt: topic.lastStudiedAt,
      previousNextReviewDate: topic.nextReviewDate,
      previousStatus: topic.status,
      previousRetention: topic.retention,
      studyLogId: studyLog.id,
    };
    topic.lastStudiedAt = reminder.completedAt;
    topic.nextReviewDate = addDays(reminder.completedAt, 3);
    syncTopicPrediction(topic);
    req.db.studyLogs.push(studyLog);
  }

  req.db.lastActions = req.db.lastActions.filter((item) => item.userId !== req.user.id || item.type !== 'mark-done');
  req.db.lastActions.push({
    userId: req.user.id,
    type: 'mark-done',
    reminderId: reminder.id,
    topicId: reminder.topicId,
  });

  syncAutoReminders(req.db, req.user.id);
  writeDb(req.db);
  res.json({ ok: true });
});

app.post('/api/reminders/:id/undo', auth, (req, res) => {
  const reminder = req.db.reminders.find(
    (item) => item.userId === req.user.id && item.id === req.params.id
  );
  if (!reminder) {
    return res.status(404).json({ message: 'Reminder not found' });
  }

  reminder.state = 'todo';
  delete reminder.completedAt;

  const topic = req.db.topics.find((item) => item.id === reminder.topicId && item.userId === req.user.id);
  if (topic && reminder.undoSnapshot) {
    req.db.studyLogs = req.db.studyLogs.filter((log) => log.id !== reminder.undoSnapshot.studyLogId);
    topic.lastStudiedAt = reminder.undoSnapshot.previousLastStudiedAt;
    topic.nextReviewDate = reminder.undoSnapshot.previousNextReviewDate;
    topic.status = reminder.undoSnapshot.previousStatus;
    topic.retention = reminder.undoSnapshot.previousRetention;
    delete reminder.undoSnapshot;
  }

  writeDb(req.db);
  res.json({ ok: true });
});

app.post('/api/reminders/undo-last', auth, (req, res) => {
  const lastAction = req.db.lastActions.find((item) => item.userId === req.user.id);
  if (!lastAction || lastAction.type !== 'mark-done') {
    return res.status(400).json({ message: 'No action to undo' });
  }

  const reminder = req.db.reminders.find((item) => item.id === lastAction.reminderId && item.userId === req.user.id);
  if (reminder) {
    reminder.state = 'todo';
    delete reminder.completedAt;
  }

  const topic = req.db.topics.find((item) => item.id === lastAction.topicId && item.userId === req.user.id);
  if (topic && reminder && reminder.undoSnapshot) {
    req.db.studyLogs = req.db.studyLogs.filter((log) => log.id !== reminder.undoSnapshot.studyLogId);
    topic.lastStudiedAt = reminder.undoSnapshot.previousLastStudiedAt;
    topic.nextReviewDate = reminder.undoSnapshot.previousNextReviewDate;
    topic.status = reminder.undoSnapshot.previousStatus;
    topic.retention = reminder.undoSnapshot.previousRetention;
    delete reminder.undoSnapshot;
  }

  req.db.lastActions = req.db.lastActions.filter((item) => item.userId !== req.user.id);
  writeDb(req.db);
  res.json({ ok: true });
});

app.get('/api/dashboard', auth, (req, res) => {
  syncAutoReminders(req.db, req.user.id);
  writeDb(req.db);

  const date = req.query.date || dateOnly(new Date());
  const topics = req.db.topics.filter((item) => item.userId === req.user.id);
  const reminders = req.db.reminders.filter((item) => item.userId === req.user.id && item.state === 'todo');
  const studyLogs = req.db.studyLogs.filter((item) => item.userId === req.user.id);
  const selectedLogs = studyLogs.filter((item) => dateOnly(item.studiedAt) === date);
  const avgRetention = topics.length
    ? Math.round(topics.reduce((sum, item) => sum + item.retention, 0) / topics.length)
    : 0;

  res.json({
    stats: [
      { label: 'Topics Tracked', value: String(topics.length) },
      { label: 'Avg Retention', value: `${avgRetention}%` },
      { label: 'Reviews Due', value: String(reminders.length) },
      { label: 'Studied Today', value: String(studyLogs.filter((item) => dateOnly(item.studiedAt) === dateOnly(new Date())).length) },
    ],
    retentionData: [
      { day: 'Day 1', retention: 100 },
      { day: 'Day 2', retention: 58 },
      { day: 'Day 4', retention: 44 },
      { day: 'Day 7', retention: 36 },
      { day: 'Day 14', retention: 28 },
      { day: 'Day 21', retention: 21 },
    ],
    topicData: topics.map((item) => ({ topic: item.subject, score: item.retention })),
    upcomingReviews: reminders.slice(0, 5).map((item) => {
      const topic = topics.find((topicItem) => topicItem.id === item.topicId);
      return {
        topic: `${item.subject} - ${item.topicName}`,
        due: formatRelativeDate(item.dueDate),
        risk: topic ? topic.status === 'At Risk' ? 'High' : topic.status === 'Moderate' ? 'Medium' : 'Low' : 'Medium',
      };
    }),
    predictions: topics.map((item) => ({
      id: item.id,
      subject: item.subject,
      topic: item.name,
      status: item.status,
      retention: item.retention,
      action: item.status === 'At Risk' ? 'Study this topic today' : item.status === 'Moderate' ? 'Revise within 2 days' : 'Keep normal revision cycle',
    })),
    studiedOnDate: {
      date,
      count: selectedLogs.length,
      topics: selectedLogs.map((item) => `${item.subject} - ${item.topicName}`),
    },
  });
});

app.listen(PORT, () => {
  console.log(`Memora backend running on http://localhost:${PORT}`);
});
