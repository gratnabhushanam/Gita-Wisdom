import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

export default function NotificationDropdown({ token }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    axios.get('/api/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setNotifications(res.data))
      .catch(() => setError('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, [open, token]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markAllRead = async () => {
    await axios.post('/api/notifications/read-all', {}, { headers: { Authorization: `Bearer ${token}` } });
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 rounded-full hover:bg-devotion-gold/10 focus:outline-none"
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-devotion-gold" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-full bg-[#18122B] border border-devotion-gold/30 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
          <div className="flex items-center justify-between px-5 py-3 border-b border-devotion-gold/10 bg-[#241a3a]">
            <span className="font-bold text-devotion-gold uppercase tracking-widest text-xs">Notifications</span>
            <button
              className="text-xs text-devotion-gold hover:underline"
              onClick={markAllRead}
              disabled={loading || notifications.length === 0}
            >
              Mark all as read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-devotion-gold/10">
            {loading ? (
              <div className="p-6 text-center text-devotion-gold">Loading...</div>
            ) : error ? (
              <div className="p-6 text-center text-red-400">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No notifications yet.</div>
            ) : notifications.map((n) => (
              <div
                key={n._id}
                className={`px-5 py-4 flex items-start gap-3 ${n.read ? 'bg-transparent' : 'bg-devotion-gold/5'}`}
              >
                <div className="pt-1">
                  {n.type === 'system' ? <CheckCircle className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-yellow-400" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white mb-1">{n.title}</div>
                  <div className="text-gray-300 text-sm mb-1">{n.body}</div>
                  <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
