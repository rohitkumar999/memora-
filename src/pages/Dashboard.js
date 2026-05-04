import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

const riskColor = { High: '#e03131', Medium: '#f59f00', Low: '#2f9e44' };
const riskBg = { High: '#fff5f5', Medium: '#fffbe6', Low: '#ebfbee' };
const statusColor = { Good: '#2f9e44', Moderate: '#f59f00', 'At Risk': '#e03131' };
const statusBg = { Good: '#ebfbee', Moderate: '#fffbe6', 'At Risk': '#fff5f5' };

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [activePredictionTab, setActivePredictionTab] = useState('todo');
  const [dashboard, setDashboard] = useState({
    stats: [],
    retentionData: [],
    topicData: [],
    upcomingReviews: [],
    predictions: [],
    studiedOnDate: { date: '', count: 0, topics: [] },
  });
  const [error, setError] = useState('');

  async function loadDashboard(date = selectedDate) {
    const data = await api.dashboard(date);
    setDashboard(data);
  }

  useEffect(() => {
    loadDashboard(selectedDate);
  }, [selectedDate]);

  const completedTodaySet = useMemo(() => {
    return new Set(dashboard.studiedOnDate.topics);
  }, [dashboard.studiedOnDate]);

  const todoPredictions = useMemo(() => {
    return dashboard.predictions.filter((item) => !completedTodaySet.has(`${item.subject} - ${item.topic}`));
  }, [dashboard.predictions, completedTodaySet]);

  const donePredictions = useMemo(() => {
    return dashboard.predictions.filter((item) => completedTodaySet.has(`${item.subject} - ${item.topic}`));
  }, [dashboard.predictions, completedTodaySet]);

  const handleMarkDone = async (topicId) => {
    setError('');
    try {
      await api.markTopicDone(topicId);
      await loadDashboard(selectedDate);
      setActivePredictionTab('done');
    } catch (err) {
      setError(err.message || 'Unable to mark topic as done');
    }
  };

  const handleUndoLast = async () => {
    setError('');
    try {
      await api.undoLastTopicStudy();
      await loadDashboard(selectedDate);
      setActivePredictionTab('todo');
    } catch (err) {
      setError(err.message || 'No study action to undo');
    }
  };

  return (
    <div style={styles.page}>
      <h2 style={styles.heading}>Hello, {user?.name?.split(' ')[0]} 👋</h2>
      <p style={styles.sub}>Here's your memory health overview for today.</p>

      <div style={styles.statsRow}>
        {dashboard.stats.map((s) => (
          <div key={s.label} style={styles.statCard}>
            <p style={styles.statLabel}>{s.label}</p>
            <p style={styles.statValue}>{s.value}</p>
          </div>
        ))}
      </div>
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Forgetting Curve (Ebbinghaus)</h3>
          <p style={styles.chartSub}>Predicted retention over time without review</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dashboard.retentionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line
                type="monotone"
                dataKey="retention"
                stroke="#4361ee"
                strokeWidth={2}
                dot={{ r: 4, fill: '#4361ee' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Retention by Topic</h3>
          <p style={styles.chartSub}>Current predicted retention per subject</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dashboard.topicData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="topic" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="score" fill="#4361ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={styles.aiCard}>
        <div style={styles.aiHeader}>
          <div>
            <h3 style={styles.chartTitle}>AI Prediction Status</h3>
            <p style={styles.chartSub}>Choose To Do to study topics and Done to see completed work</p>
          </div>
          <button style={styles.undoBtn} onClick={handleUndoLast}>Undo Last Study</button>
        </div>

        <div style={styles.tabRow}>
          <button
            style={{ ...styles.tabBtn, ...(activePredictionTab === 'todo' ? styles.activeTab : {}) }}
            onClick={() => setActivePredictionTab('todo')}
          >
            To Do
          </button>
          <button
            style={{ ...styles.tabBtn, ...(activePredictionTab === 'done' ? styles.activeTab : {}) }}
            onClick={() => setActivePredictionTab('done')}
          >
            Done
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {activePredictionTab === 'todo' ? (
          <div style={styles.todoStack}>
            {todoPredictions.length === 0 ? (
              <p style={styles.emptyText}>No topics pending right now.</p>
            ) : todoPredictions.map((item) => (
              <div key={item.id} style={styles.todoBar}>
                <div style={styles.todoBarText}>
                  <p style={styles.todoTitle}>TO STUDY: {item.subject} - {item.topic}</p>
                  <p style={styles.todoSub}>{item.status} risk · {item.retention}% retention · {item.action}</p>
                </div>
                <button style={styles.doneBtn} onClick={() => handleMarkDone(item.id)}>Mark Done</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.predictionGrid}>
            {donePredictions.length === 0 ? (
              <p style={styles.emptyText}>No completed topics for this date yet.</p>
            ) : donePredictions.map((item) => (
              <div key={item.id} style={styles.predictionCard}>
                <div style={styles.predictionTop}>
                  <div>
                    <p style={styles.topicName}>{item.topic}</p>
                    <p style={styles.topicSub}>{item.subject}</p>
                  </div>
                  <span style={{ ...styles.badge, color: statusColor[item.status], background: statusBg[item.status] }}>
                    {item.status}
                  </span>
                </div>
                <p style={styles.predictionText}>{item.retention}% retention</p>
                <p style={styles.actionText}>{item.action}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.reviewCard}>
        <div style={styles.dateHeader}>
          <div>
            <h3 style={styles.chartTitle}>Topics Studied By Date</h3>
            <p style={styles.chartSub}>Select a date to see how many topics were studied</p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={styles.dateInput}
          />
        </div>
        <p style={styles.dateSummary}>{dashboard.studiedOnDate.count} topic(s) studied on {dashboard.studiedOnDate.date}</p>
        <ul style={styles.studyList}>
          {dashboard.studiedOnDate.topics.length === 0 ? (
            <li style={styles.studyItem}>No topics studied on this date.</li>
          ) : dashboard.studiedOnDate.topics.map((item) => (
            <li key={item} style={styles.studyItem}>{item}</li>
          ))}
        </ul>
      </div>

      <div style={styles.reviewCard}>
        <h3 style={styles.chartTitle}>Upcoming Reviews</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Topic</th>
              <th style={styles.th}>Due</th>
              <th style={styles.th}>Forgetting Risk</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.upcomingReviews.map((r) => (
              <tr key={`${r.topic}-${r.due}`} style={styles.tr}>
                <td style={styles.td}>{r.topic}</td>
                <td style={styles.td}>{r.due}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, color: riskColor[r.risk], background: riskBg[r.risk] }}>
                    {r.risk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  heading: { fontSize: 24, fontWeight: 600, margin: 0, color: '#1a1a2e' },
  sub: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 28 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: '20px 24px' },
  statLabel: { margin: 0, fontSize: 13, color: '#888' },
  statValue: { margin: '6px 0 0', fontSize: 28, fontWeight: 600, color: '#1a1a2e' },
  membersBtn: {
    display: 'inline-block', padding: '10px 16px', borderRadius: 10, background: '#4361ee',
    color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap',
  },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 },
  chartCard: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: '20px 24px' },
  chartTitle: { margin: 0, fontSize: 15, fontWeight: 600, color: '#1a1a2e' },
  chartSub: { margin: '4px 0 16px', fontSize: 12, color: '#aaa' },
  aiCard: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: '20px 24px', marginBottom: 24 },
  aiHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 12 },
  tabRow: { display: 'flex', gap: 10, marginBottom: 14 },
  tabBtn: { padding: '8px 16px', border: '1px solid #d8ddf8', borderRadius: 999, background: 'white', color: '#4361ee', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  activeTab: { background: '#4361ee', color: '#fff', borderColor: '#4361ee' },
  todoStack: { display: 'grid', gap: 12 },
  todoBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, border: '1px solid #eef0f2', borderRadius: 12, padding: 16, background: '#fafbff' },
  todoBarText: { flex: 1 },
  todoTitle: { margin: 0, fontSize: 14, fontWeight: 700, color: '#1a1a2e' },
  todoSub: { margin: '6px 0 0', fontSize: 12, color: '#666' },
  predictionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 },
  predictionCard: { border: '1px solid #eef0f2', borderRadius: 12, padding: 16, background: '#fafbff' },
  predictionTop: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  topicName: { margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a2e' },
  topicSub: { margin: '4px 0 0', fontSize: 12, color: '#888' },
  predictionText: { margin: '0 0 6px', fontSize: 14, color: '#333' },
  actionText: { margin: 0, fontSize: 12, color: '#666' },
  doneBtn: { padding: '8px 14px', background: '#4361ee', border: 'none', borderRadius: 8, fontSize: 13, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' },
  undoBtn: { padding: '8px 14px', background: 'white', border: '1px solid #ccd3ff', borderRadius: 8, fontSize: 13, color: '#4361ee', cursor: 'pointer' },
  error: { color: '#e03131', fontSize: 13, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#777', margin: 0 },
  reviewCard: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: '20px 24px', marginBottom: 24 },
  dateHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  dateInput: { border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', fontSize: 14 },
  dateSummary: { margin: '8px 0 12px', fontSize: 14, color: '#444' },
  studyList: { margin: 0, paddingLeft: 18 },
  studyItem: { marginBottom: 8, fontSize: 14, color: '#333' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
  th: { textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888', padding: '8px 12px', borderBottom: '1px solid #f0f0f0' },
  tr: { borderBottom: '1px solid #f5f5f5' },
  td: { padding: '12px', fontSize: 14, color: '#333' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
};
