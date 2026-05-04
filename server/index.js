const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 5000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/memora';

const app = express();
app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const memberSchema = new mongoose.Schema({
  linkedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },
  email: { type: String, required: true },
  year: { type: String, default: '3rd Year' },
  degree: { type: String, default: 'B.Tech' },
  role: { type: String, default: 'Student' },
  about: { type: String, default: 'User profile' },
}, { timestamps: true });

const topicSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  plannedDate: { type: Date, required: true },
  planLabel: { type: String, required: true },
  lastStudiedAt: { type: Date, default: null },
  nextReviewDate: { type: Date, required: true },
  retention: { type: Number, required: true },
  status: { type: String, enum: ['Good', 'Moderate', 'At Risk'], required: true },
}, { timestamps: true });

const reminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  dueAt: { type: Date, required: true },
  generatedBy: { type: String, default: 'ML schedule engine' },
  state: { type: String, enum: ['todo', 'done'], default: 'todo' },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

const studyLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  studiedAt: { type: Date, required: true },
}, { timestamps: true });

const lastActionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scope: { type: String, enum: ['study', 'reminder'], required: true },
  reminderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reminder', default: null },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  studyLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyLog', default: null },
  previousReminderState: { type: String, default: null },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);
const Member = mongoose.model('Member', memberSchema);
const Topic = mongoose.model('Topic', topicSchema);
const Reminder = mongoose.model('Reminder', reminderSchema);
const StudyLog = mongoose.model('StudyLog', studyLogSchema);
const LastAction = mongoose.model('LastAction', lastActionSchema);

function tokenValue() {
  return crypto.randomBytes(24).toString('hex');
}

function startOfDay(dateInput = new Date()) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(dateInput = new Date()) {
  const date = new Date(dateInput);
  date.setHours(23, 59, 59, 999);
  return date;
}

function formatDate(dateInput) {
  return new Date(dateInput).toISOString().slice(0, 10);
}

function formatDateTime(dateInput) {
  return new Date(dateInput).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeDateForSchedule(scheduleType, pickedDate) {
  const now = new Date();
  if (scheduleType === 'Tomorrow') {
    now.setDate(now.getDate() + 1);
    return now;
  }
  if (scheduleType === 'Pick Date' && pickedDate) {
    return new Date(`${pickedDate}T09:00:00`);
  }
  return now;
}

function predictionFromGap(daysUntilReview) {
  if (daysUntilReview <= 1) {
    return { retention: 38, status: 'At Risk' };
  }
  if (daysUntilReview <= 2) {
    return { retention: 64, status: 'Moderate' };
  }
  return { retention: 82, status: 'Good' };
}

function nextReviewFromStudy(studiedAt) {
  const next = new Date(studiedAt);
  next.setDate(next.getDate() + 3);
  return next;
}

async function ensureMemberForUser(user) {
  const existing = await Member.findOne({ linkedUserId: user._id });
  if (existing) return existing;

  return Member.create({
    linkedUserId: user._id,
    name: user.name,
    email: user.email,
    year: '3rd Year',
    degree: 'B.Tech',
    role: 'Student',
    about: 'User profile',
  });
}

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const session = await Session.findOne({ token });
  if (!session) {
    return res.status(401).json({ message: 'Session expired. Please login again.' });
  }

  const user = await User.findById(session.userId);
  if (!user) {
    await Session.deleteOne({ _id: session._id });
    return res.status(401).json({ message: 'User not found for current session' });
  }

  req.user = user;
  req.token = token;
  next();
}

function toTopicResponse(topic) {
  return {
    id: String(topic._id),
    subject: topic.subject,
    name: topic.name,
    lastStudied: topic.lastStudiedAt ? formatDate(topic.lastStudiedAt) : 'Not studied yet',
    plannedDate: formatDate(topic.plannedDate),
    planLabel: topic.planLabel,
    nextReviewDate: formatDate(topic.nextReviewDate),
    retention: topic.retention,
    status: topic.status,
  };
}

function toReminderResponse(reminder) {
  return {
    id: String(reminder._id),
    subject: reminder.subject,
    topic: reminder.topic,
    due: formatDateTime(reminder.dueAt),
    generatedBy: reminder.generatedBy,
    state: reminder.state,
  };
}

async function syncReminderForTopic(topic) {
  const dueAt = topic.nextReviewDate;
  let reminder = await Reminder.findOne({ topicId: topic._id });

  if (!reminder) {
    reminder = await Reminder.create({
      userId: topic.userId,
      topicId: topic._id,
      subject: topic.subject,
      topic: topic.name,
      dueAt,
      generatedBy: 'ML schedule engine',
      state: 'todo',
    });
    return reminder;
  }

  reminder.subject = topic.subject;
  reminder.topic = topic.name;
  reminder.dueAt = dueAt;
  if (reminder.state !== 'done') {
    reminder.state = 'todo';
    reminder.completedAt = null;
  }
  await reminder.save();
  return reminder;
}

async function seedStarterTopics(user) {
  const existingCount = await Topic.countDocuments({ userId: user._id });
  if (existingCount > 0) return;

  const starters = [
    { subject: 'DBMS', name: 'Normalization', offsetDays: -2 },
    { subject: 'OS', name: 'Process Scheduling', offsetDays: -1 },
    { subject: 'Networks', name: 'TCP/IP', offsetDays: 0 },
    { subject: 'Algorithms', name: 'Sorting', offsetDays: 1 },
    { subject: 'ML', name: 'Decision Trees', offsetDays: 2 },
  ];

  for (const item of starters) {
    const plannedDate = new Date();
    plannedDate.setDate(plannedDate.getDate() + item.offsetDays);
    const reviewGap = Math.max(1, 3 - item.offsetDays);
    const { retention, status } = predictionFromGap(reviewGap);
    const topic = await Topic.create({
      userId: user._id,
      subject: item.subject,
      name: item.name,
      plannedDate,
      planLabel: 'Pick Date',
      lastStudiedAt: item.offsetDays < 0 ? plannedDate : null,
      nextReviewDate: item.offsetDays < 0 ? nextReviewFromStudy(plannedDate) : plannedDate,
      retention,
      status,
    });
    await syncReminderForTopic(topic);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const user = await User.create({ name: String(name).trim(), email: normalizedEmail, password });
  await ensureMemberForUser(user);
  await seedStarterTopics(user);

  const token = tokenValue();
  await Session.create({ token, userId: user._id });

  res.status(201).json({
    token,
    user: { id: String(user._id), name: user.name, email: user.email },
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail, password });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  await ensureMemberForUser(user);
  await seedStarterTopics(user);

  const token = tokenValue();
  await Session.create({ token, userId: user._id });

  res.json({
    token,
    user: { id: String(user._id), name: user.name, email: user.email },
  });
});

app.get('/api/auth/me', auth, async (req, res) => {
  res.json({
    user: { id: String(req.user._id), name: req.user.name, email: req.user.email },
  });
});

app.post('/api/auth/logout', auth, async (req, res) => {
  await Session.deleteOne({ token: req.token });
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/topics', auth, async (req, res) => {
  const topics = await Topic.find({ userId: req.user._id }).sort({ subject: 1, createdAt: 1 });
  res.json({ topics: topics.map(toTopicResponse) });
});

app.post('/api/topics', auth, async (req, res) => {
  const { subject, name, scheduleType = 'Today', pickedDate = '' } = req.body;
  if (!subject || !name) {
    return res.status(400).json({ message: 'Subject and topic name are required' });
  }

  const plannedDate = normalizeDateForSchedule(scheduleType, pickedDate);
  const daysUntilReview = Math.max(1, Math.ceil((startOfDay(plannedDate) - startOfDay(new Date())) / 86400000) + 1);
  const { retention, status } = predictionFromGap(daysUntilReview);

  const topic = await Topic.create({
    userId: req.user._id,
    subject: String(subject).trim(),
    name: String(name).trim(),
    plannedDate,
    planLabel: scheduleType,
    lastStudiedAt: null,
    nextReviewDate: plannedDate,
    retention,
    status,
  });

  await syncReminderForTopic(topic);

  res.status(201).json({ topic: toTopicResponse(topic) });
});

app.post('/api/topics/:id/mark-done', auth, async (req, res) => {
  const topic = await Topic.findOne({ _id: req.params.id, userId: req.user._id });
  if (!topic) {
    return res.status(404).json({ message: 'Topic not found' });
  }

  const studiedAt = new Date();
  topic.lastStudiedAt = studiedAt;
  topic.nextReviewDate = nextReviewFromStudy(studiedAt);
  topic.retention = 82;
  topic.status = 'Good';
  await topic.save();

  const reminder = await syncReminderForTopic(topic);
  reminder.state = 'done';
  reminder.completedAt = studiedAt;
  await reminder.save();

  const studyLog = await StudyLog.create({
    userId: req.user._id,
    topicId: topic._id,
    subject: topic.subject,
    topic: topic.name,
    studiedAt,
  });

  await LastAction.create({
    userId: req.user._id,
    scope: 'study',
    topicId: topic._id,
    reminderId: reminder._id,
    studyLogId: studyLog._id,
    previousReminderState: 'todo',
  });

  res.json({ message: 'Topic marked as studied' });
});

app.post('/api/topics/undo-last-study', auth, async (req, res) => {
  const lastAction = await LastAction.findOne({ userId: req.user._id, scope: 'study' }).sort({ createdAt: -1 });
  if (!lastAction) {
    return res.status(400).json({ message: 'No study action to undo' });
  }

  const topic = await Topic.findOne({ _id: lastAction.topicId, userId: req.user._id });
  if (!topic) {
    await LastAction.deleteOne({ _id: lastAction._id });
    return res.status(404).json({ message: 'Topic for undo was not found' });
  }

  if (lastAction.studyLogId) {
    await StudyLog.deleteOne({ _id: lastAction.studyLogId, userId: req.user._id });
  }

  const previousLog = await StudyLog.findOne({ topicId: topic._id, userId: req.user._id }).sort({ studiedAt: -1 });
  if (previousLog) {
    topic.lastStudiedAt = previousLog.studiedAt;
    topic.nextReviewDate = nextReviewFromStudy(previousLog.studiedAt);
    topic.retention = 82;
    topic.status = 'Good';
  } else {
    topic.lastStudiedAt = null;
    topic.nextReviewDate = topic.plannedDate;
    const daysUntilReview = Math.max(1, Math.ceil((startOfDay(topic.plannedDate) - startOfDay(new Date())) / 86400000) + 1);
    const prediction = predictionFromGap(daysUntilReview);
    topic.retention = prediction.retention;
    topic.status = prediction.status;
  }
  await topic.save();

  const reminder = await Reminder.findOne({ _id: lastAction.reminderId, userId: req.user._id });
  if (reminder) {
    reminder.state = 'todo';
    reminder.completedAt = null;
    reminder.dueAt = topic.nextReviewDate;
    await reminder.save();
  }

  await LastAction.deleteOne({ _id: lastAction._id });
  res.json({ message: 'Last study action undone' });
});

app.get('/api/dashboard', auth, async (req, res) => {
  const requestedDate = req.query.date ? new Date(`${req.query.date}T12:00:00`) : new Date();
  const topics = await Topic.find({ userId: req.user._id }).sort({ createdAt: 1 });
  const reminders = await Reminder.find({ userId: req.user._id }).sort({ dueAt: 1 });
  const studyLogs = await StudyLog.find({ userId: req.user._id }).sort({ studiedAt: -1 });

  const studiedLogs = studyLogs.filter((log) => {
    const studiedAt = new Date(log.studiedAt);
    return studiedAt >= startOfDay(requestedDate) && studiedAt <= endOfDay(requestedDate);
  });

  const studiedTopicLabels = studiedLogs.map((log) => `${log.subject} - ${log.topic}`);
  const todoCount = reminders.filter((item) => item.state === 'todo').length;
  const doneCount = reminders.filter((item) => item.state === 'done').length;
  const atRiskCount = topics.filter((item) => item.status === 'At Risk').length;

  const predictions = topics.map((topic) => ({
    id: String(topic._id),
    subject: topic.subject,
    topic: topic.name,
    status: topic.status,
    retention: topic.retention,
    action: topic.planLabel === 'Today' ? 'Study this topic today' : `Scheduled for ${formatDate(topic.plannedDate)}`,
  }));

  const topicData = topics.map((topic) => ({ topic: topic.subject, score: topic.retention }));

  const upcomingReviews = reminders
    .filter((item) => item.state === 'todo')
    .slice(0, 6)
    .map((item) => {
      const daysDiff = Math.ceil((startOfDay(item.dueAt) - startOfDay(new Date())) / 86400000);
      let risk = 'Low';
      if (daysDiff <= 0) risk = 'High';
      else if (daysDiff <= 1) risk = 'Medium';
      return {
        topic: `${item.subject} - ${item.topic}`,
        due: formatDate(item.dueAt),
        risk,
      };
    });

  res.json({
    stats: [
      { label: 'Total Topics', value: topics.length },
      { label: 'To Study', value: todoCount },
      { label: 'Completed', value: doneCount },
      { label: 'At Risk', value: atRiskCount },
    ],
    retentionData: [
      { day: 'Day 1', retention: 100 },
      { day: 'Day 2', retention: 78 },
      { day: 'Day 3', retention: 62 },
      { day: 'Day 4', retention: 49 },
      { day: 'Day 5', retention: 38 },
    ],
    topicData,
    upcomingReviews,
    predictions,
    studiedOnDate: {
      date: formatDate(requestedDate),
      count: studiedTopicLabels.length,
      topics: studiedTopicLabels,
    },
  });
});

app.get('/api/reminders', auth, async (req, res) => {
  const reminders = await Reminder.find({ userId: req.user._id }).sort({ dueAt: 1 });
  const lastAction = await LastAction.findOne({ userId: req.user._id, scope: 'reminder' }).sort({ createdAt: -1 });
  res.json({ reminders: reminders.map(toReminderResponse), lastAction: lastAction ? { id: String(lastAction._id) } : null });
});

app.post('/api/reminders/:id/done', auth, async (req, res) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.user._id });
  if (!reminder) {
    return res.status(404).json({ message: 'Reminder not found' });
  }

  const previousState = reminder.state;
  reminder.state = 'done';
  reminder.completedAt = new Date();
  await reminder.save();

  await LastAction.create({
    userId: req.user._id,
    scope: 'reminder',
    reminderId: reminder._id,
    previousReminderState: previousState,
  });

  res.json({ message: 'Reminder completed' });
});

app.post('/api/reminders/:id/undo', auth, async (req, res) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, userId: req.user._id });
  if (!reminder) {
    return res.status(404).json({ message: 'Reminder not found' });
  }

  reminder.state = 'todo';
  reminder.completedAt = null;
  await reminder.save();
  res.json({ message: 'Reminder restored' });
});

app.post('/api/reminders/undo-last', auth, async (req, res) => {
  const lastAction = await LastAction.findOne({ userId: req.user._id, scope: 'reminder' }).sort({ createdAt: -1 });
  if (!lastAction || !lastAction.reminderId) {
    return res.status(400).json({ message: 'No reminder action to undo' });
  }

  const reminder = await Reminder.findOne({ _id: lastAction.reminderId, userId: req.user._id });
  if (!reminder) {
    await LastAction.deleteOne({ _id: lastAction._id });
    return res.status(404).json({ message: 'Reminder not found' });
  }

  reminder.state = lastAction.previousReminderState || 'todo';
  reminder.completedAt = null;
  await reminder.save();
  await LastAction.deleteOne({ _id: lastAction._id });

  res.json({ message: 'Last reminder action undone' });
});

app.get('/api/team-members', auth, async (_req, res) => {
  const members = await Member.find().sort({ createdAt: 1 });
  const topicCounts = await Topic.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const topicCountMap = new Map(topicCounts.map((entry) => [String(entry._id), entry.count]));

  res.json({
    members: members.map((member) => ({
      id: String(member._id),
      name: member.name,
      email: member.email,
      year: member.year,
      degree: member.degree,
      role: member.role,
      topicCount: topicCountMap.get(String(member.linkedUserId)) || 0,
    })),
  });
});

app.get('/api/team-members/:id', auth, async (req, res) => {
  const member = await Member.findById(req.params.id);
  if (!member) {
    return res.status(404).json({ message: 'Member not found' });
  }

  const topics = member.linkedUserId
    ? await Topic.find({ userId: member.linkedUserId }).sort({ createdAt: 1 })
    : [];

  res.json({
    member: {
      id: String(member._id),
      name: member.name,
      email: member.email,
      year: member.year,
      degree: member.degree,
      role: member.role,
      about: member.about,
      topicCount: topics.length,
      topics: topics.map((topic) => ({
        id: String(topic._id),
        subject: topic.subject,
        name: topic.name,
        status: topic.status,
        retention: topic.retention,
        nextReviewDate: formatDate(topic.nextReviewDate),
      })),
    },
  });
});

app.post('/api/team-members', auth, async (req, res) => {
  const { name, email, year, degree, role, about } = req.body;
  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required' });
  }

  const member = await Member.create({
    name,
    email,
    year: year || '3rd Year',
    degree: degree || 'B.Tech',
    role: role || 'Student',
    about: about || 'User profile',
  });

  res.status(201).json({
    member: {
      id: String(member._id),
      name: member.name,
      email: member.email,
      year: member.year,
      degree: member.degree,
      role: member.role,
      about: member.about,
    },
  });
});

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log(`MongoDB connected: ${MONGO_URI}`);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB');
    console.error(error.message);
    process.exit(1);
  });
