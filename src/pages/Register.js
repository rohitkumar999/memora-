import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>📚 Memora</h1>
        <p style={styles.sub}>Create your account</p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Full Name</label>
          <input
            style={styles.input}
            type="text"
            placeholder="Your name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <label style={styles.label}>Email</label>
          <input
            style={styles.input}
            type="email"
            placeholder="student@college.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} type="submit">Create Account</button>
        </form>

        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.linkText}>Login</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#f5f6fa',
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '40px 36px',
    width: 360, border: '1px solid #e8eaed',
  },
  logo: { margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a2e', textAlign: 'center' },
  sub: { textAlign: 'center', color: '#888', fontSize: 14, marginBottom: 28 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid #ddd', fontSize: 14, marginBottom: 16,
    boxSizing: 'border-box', outline: 'none',
  },
  error: { color: '#e03131', fontSize: 13, marginBottom: 12 },
  btn: {
    width: '100%', padding: '11px', background: '#4361ee', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', marginTop: 4,
  },
  footer: { textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20, marginBottom: 0 },
  linkText: { color: '#4361ee', textDecoration: 'none', fontWeight: 500 },
};
