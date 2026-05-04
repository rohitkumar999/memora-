import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const nav = [
  { label: 'Dashboard', path: '/' },
  { label: 'My Topics', path: '/topics' },
  { label: 'Reminders', path: '/reminders' },
  { label: 'Profile', path: '/members' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>📚 Memora</span>
      <div style={styles.links}>
        {nav.map(n => (
          <Link
            key={n.path}
            to={n.path}
            style={{
              ...styles.link,
              ...(location.pathname === n.path ? styles.active : {}),
            }}
          >
            {n.label}
          </Link>
        ))}
      </div>
      <div style={styles.user}>
        <span style={styles.userText}>{user?.name}</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', height: 60, background: '#ffffff',
    borderBottom: '1px solid #e8eaed', position: 'sticky', top: 0, zIndex: 100,
  },
  brand: { fontSize: 18, fontWeight: 600, color: '#1a1a2e' },
  links: { display: 'flex', gap: 8 },
  link: {
    padding: '6px 14px', borderRadius: 8, fontSize: 14,
    color: '#555', textDecoration: 'none', fontWeight: 500,
  },
  active: { background: '#eef2ff', color: '#4361ee' },
  user: { display: 'flex', alignItems: 'center', gap: 12 },
  userText: { fontSize: 14, color: '#555' },
  logoutBtn: {
    padding: '6px 14px', borderRadius: 8, border: '1px solid #ddd',
    background: 'white', cursor: 'pointer', fontSize: 13, color: '#555',
  },
};
