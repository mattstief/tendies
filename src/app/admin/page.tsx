'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface UserRow {
  username: string;
  ratingCount: number;
}

interface UsersData {
  users: UserRow[];
  total: number;
}

export default function AdminPage() {
  const [usersData, setUsersData] = useState<UsersData | null>(null);
  const [restaurants, setRestaurants] = useState<string[]>([]);
  const [newRestaurant, setNewRestaurant] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [addRestaurantError, setAddRestaurantError] = useState('');
  const [addUserError, setAddUserError] = useState('');

  async function loadUsers() {
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsersData(await res.json());
  }

  async function loadRestaurants() {
    const res = await fetch('/api/admin/restaurants');
    if (res.ok) setRestaurants((await res.json()).restaurants);
  }

  useEffect(() => {
    loadUsers();
    loadRestaurants();
  }, []);

  async function addUser() {
    const username = newUsername.trim();
    if (!username) return;
    setAddUserError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (res.ok) {
      setNewUsername('');
      loadUsers();
    } else {
      const j = await res.json();
      setAddUserError(j.error ?? 'Failed to add');
    }
  }

  async function removeUser(username: string) {
    if (!confirm(`Remove "${username}" entirely?`)) return;
    await fetch(`/api/admin/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
    loadUsers();
  }

  async function deleteAllUsers() {
    if (!confirm('Delete ALL users and their data?')) return;
    await fetch('/api/admin/users', { method: 'DELETE' });
    loadUsers();
  }

  async function clearRatings(username: string) {
    if (!confirm(`Clear all ratings and preferences for "${username}"?`)) return;
    await fetch(`/api/admin/users/${encodeURIComponent(username)}/ratings`, { method: 'DELETE' });
    loadUsers();
  }

  async function clearPreferences(username: string) {
    await fetch(`/api/admin/users/${encodeURIComponent(username)}/preferences`, { method: 'DELETE' });
    loadUsers();
  }

  async function seedUser(username: string) {
    await fetch(`/api/admin/users/${encodeURIComponent(username)}/seed`, { method: 'POST' });
    loadUsers();
  }

  async function deleteAllRatings() {
    if (!confirm('Delete ALL ratings and preferences for ALL users?')) return;
    await fetch('/api/admin/ratings', { method: 'DELETE' });
    loadUsers();
  }

  async function startReveal() {
    await fetch('/api/admin/reveal', { method: 'POST' });
  }

  async function resetReveal() {
    await fetch('/api/admin/reveal', { method: 'DELETE' });
  }

  async function removeRestaurant(name: string) {
    if (!confirm(`Remove "${name}" from the list?`)) return;
    await fetch(`/api/admin/restaurants/${encodeURIComponent(name)}`, { method: 'DELETE' });
    loadRestaurants();
  }

  async function addRestaurant() {
    const name = newRestaurant.trim();
    if (!name) return;
    setAddRestaurantError('');
    const res = await fetch('/api/admin/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setNewRestaurant('');
      loadRestaurants();
    } else {
      const j = await res.json();
      setAddRestaurantError(j.error ?? 'Failed to add');
    }
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <Link href="/" className="btn-ghost btn-sm">← Back</Link>
        <h1 className="admin-title">Admin</h1>
      </header>

      <section className="admin-section">
        <p className="admin-section-title">Global Actions</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn-primary btn-sm" onClick={startReveal}>Start Reveal</button>
          <button className="btn-ghost btn-sm" onClick={resetReveal}>Reset Reveal</button>
          <button className="btn-danger" onClick={deleteAllRatings}>Delete All Ratings</button>
          <button className="btn-danger" onClick={deleteAllUsers}>Delete All Users</button>
        </div>
      </section>

      <section className="admin-section">
        <p className="admin-section-title">Users ({usersData?.users.length ?? 0})</p>
        {usersData?.users.length === 0 && (
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '8px' }}>No users yet.</p>
        )}
        {usersData?.users.map((u) => (
          <div key={u.username} className="admin-row">
            <span className="admin-row-name">{u.username}</span>
            <span className="admin-row-meta">{u.ratingCount}/{usersData.total}</span>
            <div className="admin-actions">
              <button className="btn-ghost btn-sm" onClick={() => seedUser(u.username)}>Seed</button>
              <button className="btn-ghost btn-sm" onClick={() => clearPreferences(u.username)}>Clear Prefs</button>
              <button className="btn-ghost btn-sm" onClick={() => clearRatings(u.username)}>Clear Ratings</button>
              <button className="btn-danger btn-sm" onClick={() => removeUser(u.username)}>Remove</button>
            </div>
          </div>
        ))}
        <div className="admin-add-form">
          <input
            className="admin-input"
            placeholder="New username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUser()}
          />
          <button className="btn-primary btn-sm" onClick={addUser}>Add</button>
        </div>
        {addUserError && <p className="admin-error">{addUserError}</p>}
      </section>

      <section className="admin-section">
        <p className="admin-section-title">Restaurants ({restaurants.length})</p>
        {restaurants.map((r) => (
          <div key={r} className="admin-row">
            <span className="admin-row-name">{r}</span>
            <button className="btn-danger btn-sm" onClick={() => removeRestaurant(r)}>Remove</button>
          </div>
        ))}
        <div className="admin-add-form">
          <input
            className="admin-input"
            placeholder="New restaurant name"
            value={newRestaurant}
            onChange={(e) => setNewRestaurant(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addRestaurant()}
          />
          <button className="btn-primary btn-sm" onClick={addRestaurant}>Add</button>
        </div>
        {addRestaurantError && <p className="admin-error">{addRestaurantError}</p>}
      </section>
    </div>
  );
}
