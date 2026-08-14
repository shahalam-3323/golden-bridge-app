import React, { useState } from 'react';
// ✅ Line 2 ko badal kar humne sahi rasta (./firebase) de diya hai
import { db } from './firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminPanel({ user, onBack }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!title || !message) return;
    try {
      setStatus('Sending...');
      await addDoc(collection(db, 'notifications'), {
        title,
        message,
        createdAt: serverTimestamp()
      });
      setStatus('Notification sent successfully!');
      setTitle('');
      setMessage('');
    } catch (err) {
      console.error(err);
      setStatus('Error sending notification: ' + err.message);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Admin Control Panel</h2>
        <button className="btn-secondary" onClick={onBack}>Back to Dashboard</button>
      </div>

      <div className="admin-card">
        <h3>Broadcast Notification to All Users</h3>
        <form onSubmit={handleSendNotification}>
          <div className="form-group">
            <label>Notification Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Daily Payout Processed" 
              required 
            />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Enter details for users..." 
              rows={4}
              required 
            />
          </div>
          <button type="submit" className="btn-primary">Post Notification</button>
        </form>
        {status && <p className="status-msg">{status}</p>}
      </div>
    </div>
  );
}
