import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

const statusColor = { Good: '#2f9e44', Moderate: '#f59f00', 'At Risk': '#e03131' };
const statusBg = { Good: '#ebfbee', Moderate: '#fffbe6', 'At Risk': '#fff5f5' };

export default function TeamMemberDetail() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMember() {
      try {
        const data = await api.teamMember(id);
        setMember(data.member);
      } catch (err) {
        setError(err.message || 'Unable to load member details');
      } finally {
        setLoading(false);
      }
    }

    loadMember();
  }, [id]);

  return (
    <div style={styles.page}>
      <div style={styles.topLinks}>
        <Link to="/members" style={styles.backLink}>← Back to Team Members</Link>
        <Link to="/" style={styles.memoraLink}>Go to Memora</Link>
      </div>

      {loading && <div style={styles.infoCard}>Loading member details...</div>}
      {!loading && error && <div style={styles.errorCard}>{error}</div>}

      {!loading && !error && member && (
        <>
          <div style={styles.heroCard}>
            <div style={styles.avatar}>{initials(member.name)}</div>
            <div>
              <h2 style={styles.name}>{member.name}</h2>
              <p style={styles.email}>{member.email}</p>
              <p style={styles.meta}>Role: {member.role === 'Team Member' ? 'Student' : member.role}</p>
              <p style={styles.meta}>Degree: {member.degree}</p>
              <p style={styles.meta}>Year: {member.year}</p>
              <p style={styles.meta}>Unique ID: {member.id}</p>
              <p style={styles.meta}>Topics tracked: {member.topicCount}</p>
            </div>
          </div>

          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Member Info</h3>
            <p style={styles.aboutText}>{((member.about === 'Memora team member profile' ? 'User profile' : member.about) || 'No additional information provided.')}</p>
          </div>

          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>Tracked Topics</h3>
            {member.topics.length === 0 ? (
              <p style={styles.emptyText}>No topics found for this member yet.</p>
            ) : (
              <div style={styles.topicGrid}>
                {member.topics.map((topic) => (
                  <div key={topic.id} style={styles.topicCard}>
                    <div style={styles.topicTop}>
                      <div>
                        <p style={styles.topicName}>{topic.name}</p>
                        <p style={styles.topicSub}>{topic.subject}</p>
                      </div>
                      <span style={{ ...styles.badge, color: statusColor[topic.status] || '#555', background: statusBg[topic.status] || '#f3f4f6' }}>
                        {topic.status}
                      </span>
                    </div>
                    <p style={styles.topicMeta}>Retention: {topic.retention ?? 'N/A'}%</p>
                    <p style={styles.topicMeta}>Next review: {topic.nextReviewDate || 'Not scheduled'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
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
  topLinks: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 },
  backLink: { display: 'inline-block', marginBottom: 18, color: '#4361ee', textDecoration: 'none', fontWeight: 600 },
  memoraLink: {
    display: 'inline-block', padding: '10px 14px', borderRadius: 10, background: '#fff',
    color: '#4361ee', textDecoration: 'none', fontWeight: 600, fontSize: 14, border: '1px solid #ccd3ff',
  },
  infoCard: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 12, padding: 24, color: '#666' },
  errorCard: { background: '#fff5f5', border: '1px solid #ffd8d8', borderRadius: 12, padding: 24, color: '#e03131' },
  heroCard: { display: 'flex', gap: 20, alignItems: 'center', background: '#fff', border: '1px solid #e8eaed', borderRadius: 18, padding: 24, marginBottom: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #4361ee, #6c8cff)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24, flexShrink: 0,
  },
  name: { margin: 0, fontSize: 28, color: '#1a1a2e' },
  email: { margin: '8px 0', fontSize: 15, color: '#555' },
  meta: { margin: '4px 0 0', fontSize: 13, color: '#888' },
  sectionCard: { background: '#fff', border: '1px solid #e8eaed', borderRadius: 18, padding: 24 },
  sectionTitle: { margin: '0 0 16px', fontSize: 18, color: '#1a1a2e' },
  aboutText: { margin: 0, fontSize: 14, color: '#555', lineHeight: 1.6 },
  emptyText: { margin: 0, fontSize: 14, color: '#777' },
  topicGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  topicCard: { border: '1px solid #eef0f2', borderRadius: 14, padding: 16, background: '#fafbff' },
  topicTop: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  topicName: { margin: 0, fontSize: 15, fontWeight: 600, color: '#1a1a2e' },
  topicSub: { margin: '4px 0 0', fontSize: 12, color: '#888' },
  topicMeta: { margin: '0 0 6px', fontSize: 13, color: '#555' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' },
};
