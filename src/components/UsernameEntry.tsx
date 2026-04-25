'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UsernameEntry() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const username = value.trim();
    if (!username) {
      setError('Please enter a username');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="username-entry">
      <h1 className="entry-title">🍗 Tendies</h1>
      <p className="entry-subtitle">Rate the best chicken tenders around.</p>
      <form onSubmit={handleSubmit} className="entry-form">
        <input
          className="entry-input"
          type="text"
          placeholder="Enter your name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          maxLength={30}
        />
        {error && <p className="entry-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Let\'s go'}
        </button>
      </form>
    </div>
  );
}
