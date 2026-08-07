import React, { useState } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

function AdminPanel() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!title || !message) return alert("Please fill both title and message.");
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        title: title,
        message: message,
        createdAt: serverTimestamp(),
        isReadBy: [] 
      });
      alert("Notification sent successfully to all users!");
      setTitle('');
      setMessage('');
    } catch (error) {
      alert("Error sending notification: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#e5b94f' }}>Admin Control Panel</h2>
        <button onClick={() => signOut(auth)} style={{ background: '#e5b94f', border: 'none', padding: '8px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '16px', border: '1px solid #333' }}>
        <h3>📢 Send Announcement</h3>
        <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#aaa' }}>Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', marginTop: '5px' }} 
              placeholder="e.g. New Market Update"
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#aaa' }}>Message</label>
            <textarea 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', minHeight: '100px', marginTop: '5px', resize: 'vertical' }} 
              placeholder="Type your announcement..."
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ background: '#e5b94f', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Sending...' : 'Send Notification to All Users'}
          </button>
        </form>
      </div>
    </div>
  );
}
export default AdminPanel;