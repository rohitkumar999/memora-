# Memora - Student Forgetting Predictor

Memora now runs as a minimal full-stack project while preserving the original frontend structure.
The backend is responsible for authentication, topic storage, AI-style risk prediction, automatic reminders,
and study log tracking by date.

## Run on Mac

Open two terminals.

### Terminal 1
```bash
cd /Users/rohitkumar/Documents/review2
npm install
npm run server
```

### Terminal 2
```bash
cd /Users/rohitkumar/Documents/review2
npm start
```

## What the backend now handles

- Register and login
- Topic creation with subject, topic name, and schedule
- AI prediction labels: Good, Moderate, At Risk
- Automatic reminders generated from study history
- To Do, Done, and Undo reminder workflow
- Studied-topics list by selected date
# memora-
