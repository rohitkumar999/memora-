import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const statusColor = { Good: '#2f9e44', Moderate: '#f59f00', 'At Risk': '#e03131' };
const statusBg = { Good: '#ebfbee', Moderate: '#fffbe6', 'At Risk': '#fff5f5' };

export default function Topics() {
  const [topics, setTopics] = useState([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [scheduleType, setScheduleType] = useState('Today');
  const [pickedDate, setPickedDate] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [openSubject, setOpenSubject] = useState('');

  async function loadTopics() {
    const data = await api.topics();
    setTopics(data.topics);
    if (!openSubject && data.topics.length) {
      setOpenSubject(data.topics[0].subject);
    }
  }

  useEffect(() => {
    loadTopics();
  }, []);

  const groupedTopics = useMemo(() => {
    return topics.reduce((acc, topic) => {
      acc[topic.subject] = acc[topic.subject] || [];
      acc[topic.subject].push(topic);
      return acc;
    }, {});
  }, [topics]);

  const addTopic = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createTopic({ subject, name, scheduleType, pickedDate });
      setName('');
      setSubject('');
      setScheduleType('Today');
      setPickedDate('');
      setShowForm(false);
      await loadTopics();
      if (subject) {
        setOpenSubject(subject);
      }
    } catch (err) {
      setError(err.message || 'Unable to add topic');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.heading}>My Topics</h2>
          <p style={styles.sub}>Click a subject to see which topics were studied or are planned to study</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
          + Add Topic
        </button>
      </div>

      {showForm && (
        <form onSubmit={addTopic} style={styles.formCard}>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Subject</label>
              <input
                style={styles.input}
                placeholder="e.g. DBMS"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={styles.label}>Topic Name</label>
              <input
                style={styles.input}
                placeholder="e.g. Normalization"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={styles.label}>Study When</label>
              <select style={styles.input} value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                <option>Today</option>
                <option>Tomorrow</option>
                <option>Pick Date</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Pick Date</label>
              <input
                style={styles.input}
                type="date"
                value={pickedDate}
                onChange={(e) => setPickedDate(e.target.value)}
                disabled={scheduleType !== 'Pick Date'}
              />
            </div>
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.saveBtn}>Save Topic</button>
        </form>
      )}

      <div style={styles.subjectList}>
        {Object.keys(groupedTopics).map((subjectName) => {
          const items = groupedTopics[subjectName];
          const isOpen = openSubject === subjectName;
          return (
            <div key={subjectName} style={styles.subjectCard}>
              <button style={styles.subjectButton} onClick={() => setOpenSubject(isOpen ? '' : subjectName)}>
                <span>{subjectName}</span>
                <span>{isOpen ? 'Hide' : 'Open'}</span>
              </button>
              {isOpen && (
                <div style={styles.topicStack}>
                  {items.map((item) => (
                    <div key={item.id} style={styles.topicCard}>
                      <div style={styles.topicTop}>
                        <div>
                          <p style={styles.topicName}>{item.name}</p>
                          <p style={styles.topicSub}>Studied: {item.lastStudied}</p>
                        </div>
                        <span style={{ ...styles.badge, color: statusColor[item.status], background: statusBg[item.status] }}>
                          {item.status}
                        </span>
                      </div>
                      <p style={styles.detailText}>Plan: {item.planLabel} ({item.plannedDate})</p>
                      <p style={styles.detailText}>Next AI reminder: {item.nextReviewDate}</p>
                      <p style={styles.detailText}>Retention: {item.retention}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  heading: { fontSize: 24, fontWeight: 600, margin: 0, color: '#1a1a2e' },
  sub: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 0 },
  addBtn: { padding: '9px 18px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  formCard: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: '20px 24px', marginBottom: 24 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 12 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 },
  input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' },
  error: { color: '#e03131', fontSize: 13, marginBottom: 12 },
  saveBtn: { padding: '9px 20px', background: '#4361ee', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  subjectList: { display: 'grid', gap: 16 },
  subjectCard: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, overflow: 'hidden' },
  subjectButton: { width: '100%', border: 'none', background: '#f8f9ff', padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 15, fontWeight: 600, color: '#1a1a2e', cursor: 'pointer' },
  topicStack: { padding: 16, display: 'grid', gap: 12 },
  topicCard: { border: '1px solid #eef0f2', borderRadius: 12, padding: 14, background: '#fafbff' },
  topicTop: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  topicName: { margin: 0, fontSize: 15, fontWeight: 600, color: '#1a1a2e' },
  topicSub: { margin: '4px 0 0', fontSize: 12, color: '#888' },
  detailText: { margin: '0 0 6px', fontSize: 13, color: '#555' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' },
};
