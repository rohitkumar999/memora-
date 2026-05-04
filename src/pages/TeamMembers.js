import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function TeamMembers() {
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMembers() {
      try {
        const data = await api.teamMembers();
        setMembers(data.members || []);
      } catch (err) {
        setError(err.message || 'Unable to load team members');
      } finally {
        setLoading(false);
      }
    }

    loadMembers();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.heading}>Team Members</h2>
          <p style={styles.sub}>View all members stored in the app and open full details for each one.</p>
        </div>
        <div style={styles.headerActions}>
          <Link to="/" style={styles.secondaryButton}>Go to Memora</Link>
          <div style={styles.countPill}>Total: {members.length}</div>
        </div>
      </div>

      {loading && <div style={styles.infoCard}>Loading team members...</div>}
      {!loading && error && <div style={styles.errorCard}>{error}</div>}

      {!loading && !error && (
        <div style={styles.grid}>
          {members.map((member) => (
            <div key={member.id} style={styles.card}>
              <div style={styles.avatar}>{initials(member.name)}</div>
              <h3 style={styles.name}>{member.name}</h3>
              <p style={styles.email}>{member.email}</p>
              <p style={styles.role}>{member.role === 'Team Member' ? 'Student' : member.role} · {member.degree}</p>
              <p style={styles.meta}>{member.topicCount} topic(s) tracked</p>
              <Link to={`/members/${member.id}`} style={styles.button}>
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

const styles = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 },
  headerActions: { display: 'flex', alignItems: 'center', gap: 12 },
  heading: { fontSize: 24, fontWeight: 600, margin: 0, color: '#1a1a2e' },
  sub: { color: '#888', fontSize: 14, marginTop: 4, marginBottom: 0 },
  countPill: { padding: '10px 16px', borderRadius: 999, background: '#eef2ff', color: '#4361ee', fontWeight: 600, fontSize: 14 },
  secondaryButton: {
    display: 'inline-block', padding: '10px 14px', borderRadius: 10, background: '#fff',
    color: '#4361ee', textDecoration: 'none', fontWeight: 600, fontSize: 14, border: '1px solid #ccd3ff',
  },
  infoCard: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: 24, color: '#666' },
  errorCard: { background: '#fff5f5', border: '1px solid #ffd8d8', borderRadius: 12, padding: 24, color: '#e03131' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 },
  card: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 18, padding: '24px 22px', textAlign: 'left' },
  avatar: {
    width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #4361ee, #6c8cff)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, marginBottom: 18,
  },
  name: { margin: '0 0 8px', fontSize: 18, color: '#1a1a2e' },
  email: { margin: '0 0 10px', fontSize: 14, color: '#666', wordBreak: 'break-word' },
  role: { margin: '0 0 8px', fontSize: 13, color: '#4361ee', fontWeight: 600 },
  meta: { margin: '0 0 18px', fontSize: 13, color: '#888' },
  button: {
    display: 'inline-block', padding: '10px 14px', borderRadius: 10, background: '#4361ee',
    color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 14,
  },
};
