import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Bell, Shield, Heart, Flame, Trophy, Settings, LogOut, Camera, Edit2, Check, ExternalLink, Sparkles, BookOpen, Share2, Bookmark, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { requestNotificationPermission } from '../utils/notificationService';

const MAX_REEL_DURATION_SECONDS = 90;
const INTEREST_OPTIONS = ['Karma Yoga', 'Bhakti Yoga', 'Meditation', 'Stress Relief', 'Motivation', 'Leadership'];

const getVideoDuration = (file) => new Promise((resolve, reject) => {
  const testVideo = document.createElement('video');
  const objectUrl = URL.createObjectURL(file);

  testVideo.preload = 'metadata';
  testVideo.onloadedmetadata = () => {
    const duration = Number(testVideo.duration || 0);
    URL.revokeObjectURL(objectUrl);
    resolve(duration);
  };
  testVideo.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('Unable to read video duration'));
  };
  testVideo.src = objectUrl;
});

export default function Profile() {
  const DAILY_SAVED_KEY = 'daily_saved_verses_v1';
  const MENTOR_SAVED_KEY = 'mentor_saved_verses_v1';
  const SAVED_REELS_KEY = 'saved_reels_v1';
  const { user, setUser, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedVerses, setSavedVerses] = useState([]);
  const [savedReels, setSavedReels] = useState([]);
  const [dailySavedVerses, setDailySavedVerses] = useState([]);
  const [mentorSavedVerses, setMentorSavedVerses] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [myReels, setMyReels] = useState([]);
  const [myReelsLoading, setMyReelsLoading] = useState(false);
  const [reelActionLoading, setReelActionLoading] = useState(false);
  const [editingReelId, setEditingReelId] = useState(null);
  const [reelForm, setReelForm] = useState({ title: '', description: '', tags: '' });
  const [reelVideoFile, setReelVideoFile] = useState(null);
  const [reelEditError, setReelEditError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    profilePicture: ''
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [privacySetting, setPrivacySetting] = useState('public');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [newInterest, setNewInterest] = useState('');
  const [savingPersonalization, setSavingPersonalization] = useState(false);
  const [personalizationStatus, setPersonalizationStatus] = useState('');

  const fileInputRef = React.useRef(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user) {
      setFormData({
        name: user.name,
        bio: user.bio || '',
        profilePicture: user.profilePicture || ''
      });
      setNotificationsEnabled(Boolean(user.settings?.notifications));
      setPrivacySetting(String(user.settings?.privacy || 'public').toLowerCase() === 'private' ? 'private' : 'public');
      setSelectedInterests(Array.isArray(user.settings?.interests) ? user.settings.interests : []);
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadSavedVerses = async () => {
      const bookmarks = Array.isArray(user?.bookmarkedSlokas) ? user.bookmarkedSlokas : [];
      if (!bookmarks.length) {
        setSavedVerses([]);
        return;
      }

      const normalizedIds = bookmarks.map((item) => (typeof item === 'object' ? item.id || item._id : item)).filter(Boolean);
      if (!normalizedIds.length) {
        setSavedVerses([]);
        return;
      }

      try {
        setSavedLoading(true);
        const responses = await Promise.all(
          normalizedIds.map((id) => axios.get(`/api/slokas/${id}`))
        );
        setSavedVerses(responses.map((response) => response.data));
      } catch (error) {
        console.error('Error loading saved verses:', error);
        setSavedVerses([]);
      } finally {
        setSavedLoading(false);
      }
    };

    loadSavedVerses();
  }, [user]);

  useEffect(() => {
    try {
      const currentUserId = Number(user?.id || user?._id || 0);
      if (!currentUserId) {
        setSavedReels([]);
        return;
      }

      const raw = localStorage.getItem(SAVED_REELS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const mine = list.filter((item) => Number(item.savedByUserId || 0) === currentUserId);
      setSavedReels(mine);
    } catch (error) {
      console.error('Error loading saved reels:', error);
      setSavedReels([]);
    }
  }, [user]);

  useEffect(() => {
    try {
      const rawDaily = localStorage.getItem(DAILY_SAVED_KEY);
      const daily = rawDaily ? JSON.parse(rawDaily) : [];
      setDailySavedVerses(Array.isArray(daily) ? daily : []);

      const rawMentor = localStorage.getItem(MENTOR_SAVED_KEY);
      const mentor = rawMentor ? JSON.parse(rawMentor) : [];
      setMentorSavedVerses(Array.isArray(mentor) ? mentor : []);
    } catch (error) {
      console.error('Error loading local saved verses:', error);
      setDailySavedVerses([]);
      setMentorSavedVerses([]);
    }
  }, []);

  useEffect(() => {
    const loadMyReels = async () => {
      if (!user) {
        setMyReels([]);
        return;
      }

      try {
        setMyReelsLoading(true);
        const token = localStorage.getItem('token');
        const { data } = await axios.get('/api/videos/user-reels/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMyReels(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading uploaded reels:', error);
        setMyReels([]);
      } finally {
        setMyReelsLoading(false);
      }
    };

    loadMyReels();
  }, [user]);

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.put('/api/auth/profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limit file size (e.g., 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large. Max size is 2MB.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.put('/api/auth/profile', {
          ...formData,
          profilePicture: base64String
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(data);
        setFormData(prev => ({ ...prev, profilePicture: data.profilePicture }));
      } catch (error) {
        console.error('Error uploading image:', error);
      } finally {
        setUploading(false);
      }
    };
  };

  const toggleDailyAlerts = async () => {
    const nextValue = !notificationsEnabled;

    if (nextValue) {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        alert('Notification permission is needed to enable daily wisdom alerts.');
        return;
      }
    }

    setNotificationsEnabled(nextValue);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        settings: {
          ...(user?.settings || {}),
          notifications: nextValue,
          privacy: privacySetting,
          interests: selectedInterests,
        },
      };

      const { data } = await axios.put('/api/auth/profile', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(data);
      setPersonalizationStatus(nextValue ? 'Daily wisdom alerts enabled.' : 'Daily wisdom alerts disabled.');
      setTimeout(() => setPersonalizationStatus(''), 2000);
    } catch (error) {
      console.error('Error updating notifications setting:', error);
      setNotificationsEnabled(!nextValue);
    }
  };

  const savePersonalization = async (nextSettings) => {
    try {
      setSavingPersonalization(true);
      const token = localStorage.getItem('token');
      const payload = {
        settings: {
          ...(user?.settings || {}),
          notifications: notificationsEnabled,
          privacy: privacySetting,
          interests: selectedInterests,
          ...(nextSettings || {}),
        },
      };

      const { data } = await axios.put('/api/auth/profile', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(data);
      return true;
    } catch (error) {
      console.error('Error saving personalization settings:', error);
      return false;
    } finally {
      setSavingPersonalization(false);
    }
  };

  const handlePrivacyChange = async (event) => {
    const nextPrivacy = event.target.value === 'private' ? 'private' : 'public';
    setPrivacySetting(nextPrivacy);
    const ok = await savePersonalization({ privacy: nextPrivacy });
    setPersonalizationStatus(ok
      ? nextPrivacy === 'private'
        ? 'Profile set to private. Your seeker details are hidden from community users.'
        : 'Profile set to public. Community users can discover your seeker profile.'
      : 'Could not update privacy setting.');
    setTimeout(() => setPersonalizationStatus(''), 2500);
  };

  const toggleInterest = async (interest) => {
    const exists = selectedInterests.includes(interest);
    const nextInterests = exists
      ? selectedInterests.filter((item) => item !== interest)
      : [...selectedInterests, interest];

    setSelectedInterests(nextInterests);
    const ok = await savePersonalization({ interests: nextInterests });
    setPersonalizationStatus(ok ? 'Wisdom interests updated.' : 'Could not update wisdom interests.');
    setTimeout(() => setPersonalizationStatus(''), 1800);
  };

  const addCustomInterest = async () => {
    const trimmed = String(newInterest || '').trim();
    if (!trimmed) return;
    if (selectedInterests.includes(trimmed)) {
      setNewInterest('');
      return;
    }

    const nextInterests = [...selectedInterests, trimmed];
    setSelectedInterests(nextInterests);
    setNewInterest('');
    const ok = await savePersonalization({ interests: nextInterests });
    setPersonalizationStatus(ok ? 'Custom wisdom interest added.' : 'Could not add custom interest.');
    setTimeout(() => setPersonalizationStatus(''), 1800);
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderMeaning = (sloka) => sloka?.englishMeaning || sloka?.teluguMeaning || 'No meaning available';

  const handleShareSavedVerse = async (sloka) => {
    if (!sloka) return;
    const title = `Bhagavad Gita ${sloka.chapter}:${sloka.verse}`;
    const text = `${title}\n\n${sloka.sanskrit}\n\n${renderMeaning(sloka)}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text });
      } else {
        await navigator.clipboard.writeText(text);
        alert('Verse copied to clipboard');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  };

  const removeDailySavedVerse = (verseKey) => {
    const next = dailySavedVerses.filter((item) => item.verseKey !== verseKey);
    setDailySavedVerses(next);
    localStorage.setItem(DAILY_SAVED_KEY, JSON.stringify(next));
  };

  const removeMentorSavedVerse = (verseKey) => {
    const next = mentorSavedVerses.filter((item) => item.verseKey !== verseKey);
    setMentorSavedVerses(next);
    localStorage.setItem(MENTOR_SAVED_KEY, JSON.stringify(next));
  };

  const removeSavedReel = (reelId) => {
    const currentUserId = Number(user?.id || user?._id || 0);
    const next = savedReels.filter((item) => String(item.reelId) !== String(reelId));
    setSavedReels(next);

    try {
      const raw = localStorage.getItem(SAVED_REELS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const updated = list.filter(
        (item) => !(String(item.reelId) === String(reelId) && Number(item.savedByUserId || 0) === currentUserId)
      );
      localStorage.setItem(SAVED_REELS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing saved reel:', error);
    }
  };

  const openSavedReel = (reelId) => {
    navigate('/reels', { state: { focusReelId: reelId } });
  };

  const openEditReel = (reel) => {
    setEditingReelId(reel._id || reel.id);
    setReelEditError('');
    setReelForm({
      title: reel.title || '',
      description: reel.description || '',
      tags: Array.isArray(reel.tags) ? reel.tags.join(', ') : '',
    });
    setReelVideoFile(null);
  };

  const closeEditReel = () => {
    setEditingReelId(null);
    setReelForm({ title: '', description: '', tags: '' });
    setReelVideoFile(null);
    setReelEditError('');
  };

  const handleReelEditVideoSelection = async (file) => {
    if (!file) {
      setReelVideoFile(null);
      setReelEditError('');
      return;
    }

    try {
      const duration = await getVideoDuration(file);
      if (!duration || duration > MAX_REEL_DURATION_SECONDS) {
        setReelVideoFile(null);
        setReelEditError(`Video must be ${MAX_REEL_DURATION_SECONDS} seconds or less.`);
        return;
      }

      setReelVideoFile(file);
      setReelEditError('');
    } catch (error) {
      setReelVideoFile(null);
      setReelEditError('Could not validate selected file. Please choose another video.');
    }
  };

  const saveEditedReel = async (reelId) => {
    try {
      setReelActionLoading(true);
      const token = localStorage.getItem('token');
      const payload = new FormData();
      payload.append('title', reelForm.title);
      payload.append('description', reelForm.description);
      payload.append('tags', reelForm.tags);
      if (reelVideoFile) {
        payload.append('video', reelVideoFile);
      }

      const { data } = await axios.patch(`/api/videos/user-reels/${reelId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMyReels((prev) => prev.map((item) => ((item._id || item.id) === reelId ? data : item)));
      closeEditReel();
      alert(data.message || 'Reel updated successfully');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update reel');
    } finally {
      setReelActionLoading(false);
    }
  };

  const deleteReel = async (reelId) => {
    const confirmed = window.confirm('Delete this reel permanently?');
    if (!confirmed) return;

    try {
      setReelActionLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/videos/user-reels/${reelId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyReels((prev) => prev.filter((item) => (item._id || item.id) !== reelId));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete reel');
    } finally {
      setReelActionLoading(false);
    }
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
       <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-devotion-gold"></div>
    </div>
  );

  return (
    <div className="min-h-screen pt-28 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-glass-gradient backdrop-blur-3xl rounded-[2.5rem] border border-devotion-gold/20 overflow-hidden shadow-2xl sticky top-28">
            <div className="h-32 bg-gradient-to-r from-devotion-darkBlue to-devotion-maroon relative">
               <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                  <div className="relative group">
                     <div className="w-32 h-32 rounded-full border-4 border-devotion-gold shadow-2xl overflow-hidden bg-devotion-maroon flex items-center justify-center">
                        {formData.profilePicture ? (
                          <img 
                            src={formData.profilePicture} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-5xl font-serif font-black text-devotion-gold drop-shadow-lg">
                            {getInitials(user?.name)}
                          </span>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-devotion-gold border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                     </div>
                     {isEditing && (
                       <>
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                         >
                            <Camera className="w-8 h-8 text-white" />
                         </button>
                         <input 
                           type="file" 
                           ref={fileInputRef} 
                           className="hidden" 
                           accept="image/*"
                           onChange={handleFileUpload}
                         />
                       </>
                     )}
                  </div>
               </div>
            </div>
            
            <div className="pt-16 pb-10 px-8 text-center">
               {isEditing ? (
                 <input 
                   className="bg-white/5 border border-devotion-gold/30 rounded-lg px-4 py-2 text-center text-2xl font-bold w-full mb-2"
                   value={formData.name}
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                 />
               ) : (
                 <h2 className="text-3xl font-serif font-black text-white mb-2">{user?.name}</h2>
               )}
               <p className="text-devotion-gold font-bold text-xs uppercase tracking-widest mb-6">Gita Seeker • Lv. {Math.floor((user?.benefits?.points || 0) / 100) + 1}</p>
               
               {isEditing ? (
                 <textarea 
                   className="bg-white/5 border border-devotion-gold/30 rounded-lg px-4 py-2 text-center text-sm w-full mb-6"
                   placeholder="Write a short bio..."
                   value={formData.bio}
                   onChange={(e) => setFormData({...formData, bio: e.target.value})}
                 />
               ) : (
                 <p className="text-gray-400 text-sm italic mb-8">"{user?.bio || 'Divine soul on a path of wisdom.'}"</p>
               )}

               <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-devotion-gold/5 p-4 rounded-2xl border border-devotion-gold/20">
                     <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                     <p className="text-xl font-black text-white">{user?.streak || 0}</p>
                     <p className="text-[10px] text-gray-500 uppercase font-black">Streak</p>
                  </div>
                  <div className="bg-devotion-gold/5 p-4 rounded-2xl border border-devotion-gold/20">
                     <Trophy className="w-6 h-6 text-devotion-gold mx-auto mb-2" />
                     <p className="text-xl font-black text-white">{user?.benefits?.points || 0}</p>
                     <p className="text-[10px] text-gray-500 uppercase font-black">Points</p>
                  </div>
               </div>

               <div className="space-y-3">
                  {isEditing ? (
                    <button 
                      onClick={handleUpdate}
                      className="w-full bg-devotion-gold text-devotion-darkBlue py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-400"
                    >
                       <Check className="w-4 h-4" /> Save Changes
                    </button>
                  ) : (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="w-full bg-white/5 border border-white/10 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                    >
                       <Edit2 className="w-4 h-4" /> Edit Profile
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="w-full text-red-400 hover:text-red-300 py-3 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                  >
                     <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => navigate('/admin')}
                      className="w-full bg-devotion-gold/15 border border-devotion-gold/30 text-devotion-gold py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-devotion-gold/25 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Open Admin Dashboard
                    </button>
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* User Benefits Section */}
          <section className="bg-glass-gradient backdrop-blur-3xl rounded-[2.5rem] border border-devotion-gold/20 p-10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-[10rem] pointer-events-none italic">Wisdom</div>
             <div className="flex items-center gap-4 mb-8">
                <Sparkles className="text-devotion-gold w-8 h-8" />
                <h3 className="text-3xl font-serif font-bold text-white uppercase tracking-tighter">Seeker Benefits</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-devotion-darkBlue/40 p-6 rounded-2xl border border-white/5 group hover:border-devotion-gold/30 transition-colors">
                   <h4 className="text-devotion-gold font-black text-[10px] uppercase tracking-[0.2em] mb-4">Your Badges</h4>
                   <div className="flex flex-wrap gap-3">
                      {(user?.benefits?.badges?.length > 0 ? user.benefits.badges : ['Beginner Seeker']).map(badge => (
                        <span key={badge} className="px-4 py-2 bg-devotion-gold/10 rounded-full border border-devotion-gold/30 text-devotion-gold text-[10px] font-black uppercase tracking-widest">
                           {badge}
                        </span>
                      ))}
                   </div>
                </div>
                <div className="bg-devotion-darkBlue/40 p-6 rounded-2xl border border-white/5 group hover:border-blue-400/30 transition-colors">
                   <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">Milestones</h4>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                         <span className="text-gray-400">10 Daily Slokas</span>
                         <span className="text-white font-bold">{Math.min(user?.streak || 0, 10)}/10</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((user?.streak || 0) * 10, 100)}%` }}></div>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          <section className="bg-glass-gradient backdrop-blur-3xl rounded-[2.5rem] border border-devotion-gold/20 p-10 shadow-2xl">
             <div className="flex items-center gap-4 mb-8">
                <Bookmark className="text-devotion-gold w-8 h-8" />
                <h3 className="text-3xl font-serif font-bold text-white uppercase tracking-tighter">Saved Verses</h3>
             </div>

             {savedLoading ? (
               <div className="py-16 flex justify-center">
                 <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-devotion-gold"></div>
               </div>
             ) : savedVerses.length === 0 ? (
               <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-gray-400">
                 No saved verses yet. Use Save Verse on Daily Sloka or Mentor pages.
               </div>
             ) : (
               <div className="grid grid-cols-1 gap-5">
                 {savedVerses.map((sloka) => (
                   <div key={sloka.id || sloka._id} className="bg-devotion-darkBlue/40 rounded-2xl border border-white/10 p-6">
                     <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                       <div className="space-y-3">
                         <div className="flex items-center gap-3 text-devotion-gold font-black text-xs uppercase tracking-widest">
                           <BookOpen className="w-4 h-4" />
                           Chapter {sloka.chapter} • Verse {sloka.verse}
                         </div>
                         <p className="text-white font-serif text-xl leading-relaxed">{sloka.sanskrit}</p>
                         <p className="text-gray-300 text-sm leading-relaxed">{renderMeaning(sloka)}</p>
                       </div>

                       <div className="flex items-center gap-3">
                         <button
                           onClick={() => handleShareSavedVerse(sloka)}
                           className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-xs font-black uppercase tracking-widest"
                         >
                           <Share2 className="w-4 h-4" /> Share
                         </button>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </section>

          <section className="bg-glass-gradient backdrop-blur-3xl rounded-[2.5rem] border border-devotion-gold/20 p-10 shadow-2xl">
             <div className="flex items-center gap-4 mb-8">
                <Bookmark className="text-devotion-gold w-8 h-8" />
                <h3 className="text-3xl font-serif font-bold text-white uppercase tracking-tighter">Saved Daily & Mentor Verses</h3>
             </div>

             {dailySavedVerses.length === 0 && mentorSavedVerses.length === 0 ? (
               <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-gray-400">
                 No locally saved verses yet. Save verses from Daily Sloka or Mentor pages.
               </div>
             ) : (
               <div className="space-y-8">
                 {dailySavedVerses.length > 0 && (
                   <div>
                     <h4 className="text-devotion-gold font-black text-xs uppercase tracking-[0.2em] mb-4">Daily Sloka Saves</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {dailySavedVerses.slice(0, 8).map((item) => (
                         <div key={item.verseKey} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                           <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">
                             {item.chapter && item.verse ? `Chapter ${item.chapter} • Verse ${item.verse}` : item.dailyKey || 'Daily Verse'}
                           </p>
                           <p className="text-sm text-white line-clamp-2 italic mb-2">{item.sanskrit}</p>
                           <p className="text-xs text-gray-300 line-clamp-2 mb-3">{item.englishMeaning}</p>
                           <div className="flex gap-2">
                             <button
                               onClick={() => navigate('/daily-sloka', { state: { savedVerse: item } })}
                               className="flex-1 px-3 py-2 rounded-lg border border-devotion-gold/30 text-devotion-gold text-[10px] font-black uppercase tracking-widest hover:bg-devotion-gold/10"
                             >
                               Open
                             </button>
                             <button
                               onClick={() => removeDailySavedVerse(item.verseKey)}
                               className="px-3 py-2 rounded-lg border border-red-500/30 text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10"
                             >
                               Remove
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {mentorSavedVerses.length > 0 && (
                   <div>
                     <h4 className="text-devotion-gold font-black text-xs uppercase tracking-[0.2em] mb-4">Mentor Saves</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {mentorSavedVerses.slice(0, 8).map((item) => (
                         <div key={item.verseKey} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                           <p className="text-[10px] uppercase tracking-[0.2em] text-devotion-gold mb-2">{item.problem || 'mentor'}</p>
                           <p className="text-sm text-white line-clamp-2 italic mb-2">{item.sanskrit}</p>
                           <p className="text-xs text-gray-300 line-clamp-2 mb-3">{item.englishMeaning}</p>
                           <div className="flex gap-2">
                             <button
                               onClick={() => navigate('/mentor', { state: { savedVerse: item } })}
                               className="flex-1 px-3 py-2 rounded-lg border border-devotion-gold/30 text-devotion-gold text-[10px] font-black uppercase tracking-widest hover:bg-devotion-gold/10"
                             >
                               Open
                             </button>
                             <button
                               onClick={() => removeMentorSavedVerse(item.verseKey)}
                               className="px-3 py-2 rounded-lg border border-red-500/30 text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10"
                             >
                               Remove
                             </button>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             )}
          </section>

          <section className="bg-glass-gradient backdrop-blur-3xl rounded-[2.5rem] border border-devotion-gold/20 p-10 shadow-2xl">
             <div className="flex items-center gap-4 mb-8">
                <Bookmark className="text-devotion-gold w-8 h-8" />
                <h3 className="text-3xl font-serif font-bold text-white uppercase tracking-tighter">Saved Reels</h3>
             </div>

             {savedReels.length === 0 ? (
               <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-gray-400">
                 No saved reels yet. Tap Save on any reel to collect it here.
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 {savedReels.slice(0, 30).map((reel) => (
                   <div key={`${reel.reelId}-${reel.savedAt}`} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                     <h4 className="text-white font-bold text-lg line-clamp-1 mb-2">{reel.title || 'Saved Reel'}</h4>
                     <p className="text-sm text-gray-300 line-clamp-2 mb-3">{reel.description || 'No description'}</p>
                     <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-4">
                       ❤ {reel.likesCount || 0} • 💬 {reel.commentsCount || 0} • ↗ {reel.sharesCount || 0}
                     </p>
                     <div className="flex gap-2">
                       <button
                         onClick={() => openSavedReel(reel.reelId)}
                         className="flex-1 px-3 py-2 rounded-lg border border-devotion-gold/30 text-devotion-gold text-[10px] font-black uppercase tracking-widest hover:bg-devotion-gold/10"
                       >
                         Watch
                       </button>
                       <button
                         onClick={() => removeSavedReel(reel.reelId)}
                         className="px-3 py-2 rounded-lg border border-red-500/30 text-red-300 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10"
                       >
                         Remove
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </section>

          <section className="bg-glass-gradient backdrop-blur-3xl rounded-[2.5rem] border border-devotion-gold/20 p-10 shadow-2xl">
             <div className="flex items-center gap-4 mb-8">
                <Video className="text-devotion-gold w-8 h-8" />
                <h3 className="text-3xl font-serif font-bold text-white uppercase tracking-tighter">Your Uploaded Reels</h3>
             </div>

             {myReelsLoading ? (
               <div className="py-16 flex justify-center">
                 <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-devotion-gold"></div>
               </div>
             ) : myReels.length === 0 ? (
               <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-gray-400">
                 You have not uploaded reels yet. Share a spiritual reel from Upload Reel page.
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 {myReels.map((reel) => (
                   <div key={reel._id || reel.id} className="bg-devotion-darkBlue/40 rounded-2xl border border-white/10 p-5 space-y-3">
                     <div className="flex items-start justify-between gap-3">
                       <h4 className="text-white font-bold text-lg line-clamp-1">{reel.title}</h4>
                       <div className="flex gap-2">
                         <button
                           onClick={() => openEditReel(reel)}
                           className="px-3 py-1 rounded-lg border border-white/20 text-gray-300 hover:text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest"
                         >
                           Edit
                         </button>
                         <button
                           onClick={() => deleteReel(reel._id || reel.id)}
                           disabled={reelActionLoading}
                           className="px-3 py-1 rounded-lg border border-red-500/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                         >
                           Delete
                         </button>
                       </div>
                     </div>
                     <p className="text-sm text-gray-300 line-clamp-2">{reel.description || 'No description'}</p>
                     <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-black">
                       <span className={`px-3 py-1 rounded-full border ${reel.moderationStatus === 'approved' ? 'text-green-300 border-green-500/40 bg-green-500/10' : reel.moderationStatus === 'rejected' ? 'text-red-300 border-red-500/40 bg-red-500/10' : 'text-yellow-300 border-yellow-500/40 bg-yellow-500/10'}`}>
                         {reel.moderationStatus || 'pending'}
                       </span>
                       <span className="text-gray-400">❤ {reel.likesCount || 0} • 💬 {reel.commentsCount || 0}</span>
                     </div>
                     {reel.moderationStatus === 'pending' && (
                       <p className="text-xs text-yellow-200 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
                         Pending Review: Your reel is waiting for admin approval.
                       </p>
                     )}
                     {reel.moderationStatus === 'approved' && (
                       <p className="text-xs text-green-200 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
                         Approved: Your reel is now visible in public spiritual reels.
                       </p>
                     )}
                     {reel.moderationStatus === 'rejected' && reel.moderationNote && (
                       <p className="text-xs text-red-200 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                         Rejected by Admin: {reel.moderationNote}
                       </p>
                     )}
                     {reel.moderationStatus === 'rejected' && !reel.moderationNote && (
                       <p className="text-xs text-red-200 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                         Rejected by Admin.
                       </p>
                     )}

                     {editingReelId === (reel._id || reel.id) && (
                       <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                         <input
                           value={reelForm.title}
                           onChange={(e) => setReelForm((prev) => ({ ...prev, title: e.target.value }))}
                           placeholder="Title"
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-devotion-gold/40"
                         />
                         <input
                           type="file"
                           accept="video/*"
                             onChange={(e) => handleReelEditVideoSelection(e.target.files?.[0] || null)}
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-devotion-gold/40"
                         />
                           {reelEditError && <p className="text-xs text-red-300">{reelEditError}</p>}
                         <textarea
                           rows="2"
                           value={reelForm.description}
                           onChange={(e) => setReelForm((prev) => ({ ...prev, description: e.target.value }))}
                           placeholder="Description"
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-devotion-gold/40"
                         />
                         <input
                           value={reelForm.tags}
                           onChange={(e) => setReelForm((prev) => ({ ...prev, tags: e.target.value }))}
                           placeholder="Tags: krishna, gita"
                           className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-devotion-gold/40"
                         />
                         <div className="flex justify-end gap-2">
                           <button
                             onClick={closeEditReel}
                             className="px-3 py-2 rounded-xl border border-white/10 text-gray-300 text-[10px] font-black uppercase tracking-widest"
                           >
                             Cancel
                           </button>
                           <button
                             onClick={() => saveEditedReel(reel._id || reel.id)}
                             disabled={reelActionLoading || Boolean(reelEditError)}
                             className="px-3 py-2 rounded-xl border border-devotion-gold/40 bg-devotion-gold/10 text-devotion-gold text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                           >
                             Save
                           </button>
                         </div>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
             )}
          </section>

          {/* Settings Section (Insta style information gathering) */}
          <section className="bg-glass-gradient backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-10 shadow-2xl">
             <div className="flex items-center gap-4 mb-8">
                <Settings className="text-gray-400 w-8 h-8" />
                <h3 className="text-3xl font-serif font-bold text-white uppercase tracking-tighter">Personalize Path</h3>
             </div>

             <div className="space-y-8">
                <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-blue-500/10 rounded-xl"><Bell className="text-blue-400" /></div>
                      <div>
                         <h5 className="text-lg font-bold text-white">Daily Wisdom Alerts</h5>
                         <p className="text-sm text-gray-500">Get notified when Today's Sloka is ready.</p>
                      </div>
                   </div>
                   <button
                    onClick={toggleDailyAlerts}
                    className={`w-14 h-8 rounded-full relative transition-colors ${notificationsEnabled ? 'bg-devotion-gold' : 'bg-gray-700'}`}
                    aria-label="Toggle daily wisdom alerts"
                   >
                     <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
                   </button>
                </div>

                <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                   <div className="flex items-center gap-6">
                      <div className="p-4 bg-green-500/10 rounded-xl"><Shield className="text-green-400" /></div>
                      <div>
                         <h5 className="text-lg font-bold text-white">Spiritual Privacy</h5>
                         <p className="text-sm text-gray-500">Public means community users can view your seeker profile. Private keeps it hidden.</p>
                      </div>
                   </div>
                   <select
                     value={privacySetting}
                     onChange={handlePrivacyChange}
                     disabled={savingPersonalization}
                     className="bg-devotion-darkBlue text-white border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-devotion-gold disabled:opacity-60"
                   >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                   </select>
                </div>

                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                   <h5 className="text-lg font-bold text-white mb-4">Wisdom Interests</h5>
                   <div className="flex flex-wrap gap-3">
                      {INTEREST_OPTIONS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleInterest(tag)}
                          disabled={savingPersonalization}
                          className={`px-5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60 ${selectedInterests.includes(tag) ? 'bg-devotion-gold/20 border-devotion-gold/50 text-devotion-gold' : 'bg-white/5 border-white/10 text-gray-400 hover:border-devotion-gold hover:text-devotion-gold'}`}
                        >
                           {tag}
                        </button>
                      ))}
                      {selectedInterests
                        .filter((interest) => !INTEREST_OPTIONS.includes(interest))
                        .map((interest) => (
                          <button
                            key={interest}
                            onClick={() => toggleInterest(interest)}
                            disabled={savingPersonalization}
                            className="px-5 py-2 rounded-xl bg-devotion-gold/15 border border-devotion-gold/40 text-devotion-gold text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                          >
                            {interest}
                          </button>
                        ))}
                   </div>
                   <div className="mt-4 flex flex-col sm:flex-row gap-3">
                     <input
                       value={newInterest}
                       onChange={(e) => setNewInterest(e.target.value)}
                       placeholder="Add custom interest"
                       className="flex-1 bg-devotion-darkBlue text-white border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-devotion-gold"
                     />
                     <button
                       onClick={addCustomInterest}
                       disabled={savingPersonalization || !String(newInterest || '').trim()}
                       className="px-5 py-2 rounded-xl bg-devotion-gold/20 border border-devotion-gold/50 text-devotion-gold text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                     >
                       + Add More
                     </button>
                   </div>
                   <p className="mt-3 text-[11px] text-gray-500">
                     Interests are never auto-selected. Choose only what you want.
                   </p>
                   {personalizationStatus && (
                     <p className="mt-2 text-[11px] text-devotion-gold">{personalizationStatus}</p>
                   )}
                </div>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}
