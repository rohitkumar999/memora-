import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [lastAction, setLastAction] = useState(null);

  const loadReminders = async () => {
    const data = await api.reminders();
    setReminders(data.reminders);
    setLastAction(data.lastAction);
  };

  useEffect(() => {
    loadReminders();
  }, []);

  const markDone = async (id) => {
    await api.markReminderDone(id);
    loadReminders();
  };

  const undoReminder = async (id) => {
    await api.undoReminder(id);
    loadReminders();
  };

  const undoLast = async () => {
    await api.undoLastReminderAction();
    loadReminders();
  };

  const pending = reminders.filter((r) => r.state === 'todo');
  const done = reminders.filter((r) => r.state === 'done');

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.heading}>AI Reminders</h2>
          <p style={styles.sub}>Generated automatically by the backend based on topic status and study history</p>
        </div>
        <button style={styles.undoBtn} onClick={undoLast} disabled={!lastAction}>Undo Last Action</button>
      </div>

      <h3 style={styles.section}>To Do ({pending.length})</h3>
      {pending.length === 0 && <p style={styles.empty}>No topics need study right now.</p>}
      {pending.map((r) => (
        <ReminderRow key={r.id} r={r} primaryLabel="Mark Done" onPrimary={() => markDone(r.id)} />
      ))}

      <h3 style={{ ...styles.section, marginTop: 28 }}>Done ({done.length})</h3>
      {done.length === 0 && <p style={styles.empty}>No completed reminders yet.</p>}
      {done.map((r) => (
        <ReminderRow key={r.id} r={r} primaryLabel="Undo" onPrimary={() => undoReminder(r.id)} completed />
      ))}
    </div>
  );
}

function ReminderRow({ r, onPrimary, primaryLabel, completed }) {
  return (
    <div style={{ ...styles.row, opacity: completed ? 0.7 : 1 }}>
      <div style={{ flex: 1 }}>
        <p style={{ ...styles.rowTopic, textDecoration: completed ? 'line-through' : 'none' }}>
          {r.subject} - {r.topic}
        </p>
        <p style={styles.rowTime}>Due: {r.due} · Source: {r.generatedBy}</p>
      </div>
      <button onClick={onPrimary} style={completed ? styles.secondaryBtn : styles.primaryBtn}>{primaryLabel}</button>
    </div>
  );
}

const styles = {
  page: { maxWidth: 860, margin: '0 auto', padding: '32px 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 },
  heading: { fontSize: 24, fontWeight: 600, margin: 0, color: '#1a1a2e' },
  sub: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 0 },
  undoBtn: { padding: '9px 18px', background: 'white', color: '#4361ee', border: '1px solid #ccd3ff', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  section: { fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 12 },
  empty: { color: '#aaa', fontSize: 14 },
  row: { display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '1px solid #e8eaed', borderRadius: 10, padding: '14px 18px', marginBottom: 10 },
  rowTopic: { margin: 0, fontSize: 15, fontWeight: 500, color: '#1a1a2e' },
  rowTime: { margin: '4px 0 0', fontSize: 12, color: '#888' },
  primaryBtn: { padding: '8px 14px', background: '#4361ee', border: 'none', borderRadius: 8, fontSize: 13, color: 'white', cursor: 'pointer' },
  secondaryBtn: { padding: '8px 14px', background: 'white', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, color: '#555', cursor: 'pointer' },
};
