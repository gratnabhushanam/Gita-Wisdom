import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Upload, Users, BookOpen, Video, LogOut, Settings, Film, Plus, X, Check, AlertCircle, Image as ImageIcon, Link as LinkIcon, FileText, Flame, Trash2, Pencil, CircleHelp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import MediaPlayer from '../components/MediaPlayer';

const VIDEO_COLLECTION_PRESETS = ['Bhagavad Gita', 'Ramayanam', 'Mahabharat', 'Puranas'];

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ users: [], stats: null, movies: [], stories: [], videos: [], quizQuestions: [] });
  const [pendingUserReels, setPendingUserReels] = useState([]);
  const [pendingContentFilter, setPendingContentFilter] = useState('all');
  const [videoCollectionFilter, setVideoCollectionFilter] = useState('all');
  const [storyLanguageFilter, setStoryLanguageFilter] = useState('all');
  const [quickFillStoryId, setQuickFillStoryId] = useState(null);
  const [moderationNotes, setModerationNotes] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [movieForm, setMovieForm] = useState({ title: '', description: '', videoUrl: '', thumbnail: '', releaseYear: 2025, ownerHistory: '', tags: '' });
  const [storyForm, setStoryForm] = useState({
    title: '',
    titleTelugu: '',
    titleHindi: '',
    titleEnglish: '',
    seriesTitle: 'Bhagavad Gita',
    content: '',
    chapter: 1,
    summary: '',
    summaryTelugu: '',
    summaryHindi: '',
    summaryEnglish: '',
    contentTelugu: '',
    contentHindi: '',
    contentEnglish: '',
    language: 'english',
    thumbnail: '',
    tags: '',
  });
  const [videoForm, setVideoForm] = useState({ title: '', description: '', videoUrl: '', category: 'reels', collectionTitle: 'Bhagavad Gita', isKids: false, tags: '' });
  const [quizForm, setQuizForm] = useState({
    questionText: '',
    category: 'Gita Challenge',
    videoUrl: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'B',
  });
  const [editingStoryId, setEditingStoryId] = useState(null);

  const contentLabels = {
    movies: 'Movie',
    stories: 'Story',
    videos: 'Video',
    quiz: 'Quiz Question',
  };

  const currentContentLabel = contentLabels[activeTab] || 'Content';
  const collectionSet = new Set((data.videos || []).map((item) => String(item.collectionTitle || 'Bhagavad Gita').trim()).filter(Boolean));
  const prioritizedCollections = VIDEO_COLLECTION_PRESETS.filter((item) => collectionSet.has(item));
  const customCollections = Array.from(collectionSet)
    .filter((item) => !VIDEO_COLLECTION_PRESETS.includes(item))
    .sort((a, b) => a.localeCompare(b));
  const videoCollectionOptions = ['all', ...prioritizedCollections, ...customCollections];
  const filteredAdminVideos = videoCollectionFilter === 'all'
    ? (data.videos || [])
    : (data.videos || []).filter((item) => String(item.collectionTitle || 'Bhagavad Gita').trim() === videoCollectionFilter);
  
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      console.warn('Unauthorized access to admin dashboard');
      navigate('/');
    } else if (user?.role === 'admin') {
      fetchAdminData();
    }
  }, [user, authLoading, activeTab, pendingContentFilter, navigate]);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (activeTab === 'dashboard') {
        const { data: stats } = await axios.get('/api/auth/stats', { headers });
        setData(prev => ({ ...prev, stats }));
      } else if (activeTab === 'users') {
        const { data: users } = await axios.get('/api/auth/users', { headers });
        const normalizedUsers = Array.isArray(users) ? users : (users ? [users] : []);
        setData(prev => ({ ...prev, users: normalizedUsers }));
      } else if (activeTab === 'movies') {
        const { data: movies } = await axios.get('/api/movies', { headers });
        setData(prev => ({ ...prev, movies }));
      } else if (activeTab === 'stories') {
        const { data: stories } = await axios.get('/api/stories', { headers });
        setData(prev => ({ ...prev, stories }));
      } else if (activeTab === 'videos') {
        const [videosResponse, pendingResponse] = await Promise.all([
          axios.get('/api/videos', { headers }),
          axios.get(`/api/videos/user-reels/moderation?status=pending&contentType=${pendingContentFilter}`, { headers }),
        ]);
        setData(prev => ({ ...prev, videos: videosResponse.data }));
        setPendingUserReels(Array.isArray(pendingResponse.data) ? pendingResponse.data : []);
      } else if (activeTab === 'quiz') {
        const { data: quizQuestions } = await axios.get('/api/quiz/questions', { headers });
        setData(prev => ({ ...prev, quizQuestions: Array.isArray(quizQuestions) ? quizQuestions : [] }));
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
  };

  const handleModerateUserReel = async (id, status) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const note = moderationNotes[id] || '';
      await axios.patch(`/api/videos/user-reels/${id}/moderate`, { status, note }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModerationNotes((prev) => ({ ...prev, [id]: '' }));
      setMessage({ type: 'success', text: `Reel ${status} successfully!` });
      await fetchAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to moderate reel' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    setLoading(true);
    let endpoint = '';
    let payload = {};

    try {
      const token = localStorage.getItem('token');
      
      if (activeTab === 'movies') {
        endpoint = '/api/movies';
        payload = { ...movieForm, tags: movieForm.tags.split(',').map(tag => tag.trim()) };
      } else if (activeTab === 'stories') {
        endpoint = editingStoryId ? `/api/stories/${editingStoryId}` : '/api/stories';
        const languageKey = storyForm.language.charAt(0).toUpperCase() + storyForm.language.slice(1);
        payload = {
          ...storyForm,
          tags: storyForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          title: storyForm.title || storyForm[`title${languageKey}`] || storyForm.titleEnglish || storyForm.titleHindi || storyForm.titleTelugu || '',
          summary: storyForm.summary || storyForm[`summary${languageKey}`] || '',
          content: storyForm.content || storyForm[`content${languageKey}`] || '',
        };
      } else if (activeTab === 'videos') {
        endpoint = '/api/videos';
        payload = {
          ...videoForm,
          collectionTitle: String(videoForm.collectionTitle || '').trim() || 'Bhagavad Gita',
          tags: videoForm.tags.split(',').map(tag => tag.trim()),
        };
      } else if (activeTab === 'quiz') {
        endpoint = '/api/quiz/questions';
        const optionMap = {
          A: quizForm.optionA,
          B: quizForm.optionB,
          C: quizForm.optionC,
          D: quizForm.optionD,
        };
        payload = {
          questionText: quizForm.questionText,
          category: quizForm.category,
          videoUrl: quizForm.videoUrl,
          options: ['A', 'B', 'C', 'D']
            .map((key) => ({ answerText: String(optionMap[key] || '').trim(), isCorrect: quizForm.correctOption === key }))
            .filter((item) => item.answerText),
        };
      }

      if (activeTab === 'stories' && editingStoryId) {
        await axios.patch(endpoint, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(endpoint, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setMessage({ type: 'success', text: activeTab === 'stories' && editingStoryId ? 'Story updated successfully!' : `${currentContentLabel} published successfully!` });
      setShowAddModal(false);
      resetForms();
      await fetchAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to publish content' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const handleDeleteContent = async (type, id, title) => {
    const confirmed = window.confirm(`Delete ${type.slice(0, -1)}: "${title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/${type}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage({ type: 'success', text: `${type.slice(0, -1)} deleted successfully!` });
      await fetchAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || `Failed to delete ${type.slice(0, -1)}` });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const handleDeleteUser = async (id, name, role) => {
    if (role === 'admin') {
      setMessage({ type: 'error', text: 'Admin accounts cannot be deleted.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      return;
    }

    const confirmed = window.confirm(`Delete user account: "${name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.delete(`/api/auth/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage({ type: 'success', text: 'User account deleted successfully!' });
      await fetchAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to delete user account' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const resetForms = () => {
    setMovieForm({ title: '', description: '', videoUrl: '', thumbnail: '', releaseYear: 2025, ownerHistory: '', tags: '' });
    setStoryForm({
      title: '',
      titleTelugu: '',
      titleHindi: '',
      titleEnglish: '',
      seriesTitle: 'Bhagavad Gita',
      content: '',
      chapter: 1,
      summary: '',
      summaryTelugu: '',
      summaryHindi: '',
      summaryEnglish: '',
      contentTelugu: '',
      contentHindi: '',
      contentEnglish: '',
      language: 'english',
      thumbnail: '',
      tags: '',
    });
    setVideoForm({ title: '', description: '', videoUrl: '', category: 'reels', collectionTitle: 'Bhagavad Gita', isKids: false, tags: '' });
    setQuizForm({
      questionText: '',
      category: 'Gita Challenge',
      videoUrl: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctOption: 'B',
    });
    setEditingStoryId(null);
  };

  const handleEditStory = (story) => {
    setActiveTab('stories');
    setEditingStoryId(story._id || story.id);
    setStoryForm({
      title: story.title || '',
      titleTelugu: story.titleTelugu || '',
      titleHindi: story.titleHindi || '',
      titleEnglish: story.titleEnglish || '',
      seriesTitle: story.seriesTitle || 'Bhagavad Gita',
      content: story.content || '',
      chapter: story.chapter || 1,
      summary: story.summary || '',
      summaryTelugu: story.summaryTelugu || '',
      summaryHindi: story.summaryHindi || '',
      summaryEnglish: story.summaryEnglish || '',
      contentTelugu: story.contentTelugu || '',
      contentHindi: story.contentHindi || '',
      contentEnglish: story.contentEnglish || '',
      language: story.language || 'english',
      thumbnail: story.thumbnail || '',
      tags: Array.isArray(story.tags) ? story.tags.join(', ') : (story.tags || ''),
    });
    setShowAddModal(true);
  };

  const handleQuickFillStoryTitle = async (story, targetLanguage) => {
    const storyId = story?._id || story?.id;
    if (!storyId) return;

    const baseTitle = String(story.title || '').trim();
    if (!baseTitle) {
      setMessage({ type: 'error', text: 'Primary title is required before quick fill.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3500);
      return;
    }

    const fieldByLanguage = {
      te: 'titleTelugu',
      hi: 'titleHindi',
      en: 'titleEnglish',
    };
    const targetField = fieldByLanguage[targetLanguage];
    if (!targetField) return;

    const currentTargetValue = String(story[targetField] || '').trim();
    if (currentTargetValue) {
      setMessage({ type: 'success', text: `${targetLanguage.toUpperCase()} title already exists.` });
      setTimeout(() => setMessage({ type: '', text: '' }), 2500);
      return;
    }

    const updatedPayload = {
      title: story.title,
      [targetField]: baseTitle,
    };

    try {
      setQuickFillStoryId(storyId);
      const token = localStorage.getItem('token');
      await axios.patch(`/api/stories/${storyId}`, updatedPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage({ type: 'success', text: `${targetLanguage.toUpperCase()} title filled successfully.` });
      await fetchAdminData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || `Failed to fill ${targetLanguage.toUpperCase()} title` });
    } finally {
      setQuickFillStoryId(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const hasLocalizedTitle = (value) => Boolean(String(value || '').trim());

  const filteredStories = data.stories.filter((story) => {
    if (storyLanguageFilter === 'all') return true;
    if (storyLanguageFilter === 'missing-any') {
      return !hasLocalizedTitle(story.titleTelugu)
        || !hasLocalizedTitle(story.titleHindi)
        || !hasLocalizedTitle(story.titleEnglish);
    }
    if (storyLanguageFilter === 'missing-te') return !hasLocalizedTitle(story.titleTelugu);
    if (storyLanguageFilter === 'missing-hi') return !hasLocalizedTitle(story.titleHindi);
    if (storyLanguageFilter === 'missing-en') return !hasLocalizedTitle(story.titleEnglish);
    return true;
  });

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-[#06101E]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-devotion-gold"></div></div>;

  return (
    <div className="min-h-screen bg-[#06101E] text-white flex">
      {/* Admin Sidebar */}
      <div className="w-72 bg-devotion-darkBlue/80 backdrop-blur-2xl border-r border-white/5 hidden md:flex flex-col shadow-2xl">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 bg-devotion-gold/20 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-devotion-gold" />
             </div>
             <h2 className="text-xl font-serif font-black text-white tracking-widest uppercase">
               Gita<span className="text-devotion-gold">Admin</span>
             </h2>
          </div>
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Spiritual Management</p>
        </div>

        <nav className="flex-1 p-6 space-y-3">
          {[
            { id: 'dashboard', name: 'Analytics', icon: <Database className="w-5 h-5" /> },
            { id: 'movies', name: 'Movies', icon: <Film className="w-5 h-5" /> },
            { id: 'stories', name: 'Stories', icon: <BookOpen className="w-5 h-5" /> },
            { id: 'videos', name: 'Videos', icon: <Video className="w-5 h-5" /> },
            { id: 'quiz', name: 'Quiz', icon: <CircleHelp className="w-5 h-5" /> },
            { id: 'users', name: 'Users', icon: <Users className="w-5 h-5" /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === item.id ? 'bg-devotion-gold text-devotion-darkBlue shadow-2xl' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              {item.icon} {item.name}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-gray-400 hover:text-white hover:bg-white/5 font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <LogOut className="w-5 h-5" /> Exit to App
          </button>
        </div>
      </div>

      {/* Admin Content Area */}
      <div className="flex-1 flex flex-col pt-24 px-10 pb-10 overflow-y-auto">
         
         {message.text && (
           <div className={`fixed top-28 right-10 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl animate-shake shadow-2xl ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-bold text-sm">{message.text}</span>
           </div>
         )}

         <div className="mb-12 flex justify-between items-end">
            <div>
               <h1 className="text-6xl font-serif font-black text-white mb-2 uppercase tracking-tighter">
                 {activeTab} <span className="text-devotion-gold">Center</span>
               </h1>
               <p className="text-gray-500 text-sm font-serif italic">Managing the divine knowledge base.</p>
            </div>
            
            {['movies', 'stories', 'videos', 'quiz'].includes(activeTab) && (
              <button 
                onClick={() => {
                  resetForms();
                  setShowAddModal(true);
                }}
                className="bg-devotion-gold text-devotion-darkBlue px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-yellow-400 transition-all flex items-center gap-3 shadow-2xl shadow-devotion-gold/20 transform hover:-translate-y-1 active:scale-95"
              >
                <Plus className="w-5 h-5" /> Add New {currentContentLabel}
              </button>
            )}
         </div>

          <div className="grid grid-cols-1 gap-6">
            {activeTab === 'dashboard' && data.stats && (
              <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                   {[
                     { label: 'Seekers Joined', value: data.stats.totalUsers, icon: <Users />, color: 'text-blue-400' },
                     { label: 'Divine Movies', value: data.stats.totalMovies, icon: <Film />, color: 'text-devotion-gold' },
                     { label: 'Wisdom Stories', value: data.stats.totalStories, icon: <BookOpen />, color: 'text-orange-400' },
                     { label: 'Library Videos', value: data.stats.totalVideos, icon: <Video />, color: 'text-green-400' },
                   ].map((stat, i) => (
                     <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-3xl shadow-2xl">
                        <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 ${stat.color}`}>
                           {stat.icon}
                        </div>
                        <h4 className="text-4xl font-black text-white mb-2">{stat.value}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{stat.label}</p>
                     </div>
                   ))}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-3xl">
                   <h3 className="text-2xl font-serif font-black text-white mb-10 uppercase tracking-widest flex items-center gap-4">
                      <Users className="text-devotion-gold" /> Recent Seeker Signups
                   </h3>
                   <div className="space-y-4">
                      {data.stats.recentUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-devotion-gold/30 transition-all">
                           <div className="flex items-center gap-6">
                              <div className="w-12 h-12 rounded-full bg-devotion-gold/20 flex items-center justify-center text-devotion-gold font-black">
                                 {user.name[0].toUpperCase()}
                              </div>
                              <div>
                                 <h5 className="font-bold text-white">{user.name}</h5>
                                 <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                              {new Date(user.createdAt).toLocaleDateString()}
                           </span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
               <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-3xl">
                  <div className="flex justify-between items-center mb-12">
                     <h3 className="text-3xl font-serif font-black text-white uppercase tracking-tighter">Registered <span className="text-devotion-gold">Seekers</span></h3>
                     <span className="bg-devotion-gold/10 text-devotion-gold px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest border border-devotion-gold/30">Total: {data.users.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {data.users.map(u => (
                       <div key={u._id || u.id} className="p-8 bg-white/5 rounded-[2.5rem] border border-white/5 hover:border-devotion-gold/30 transition-all shadow-xl group">
                          <div className="flex items-center gap-6 mb-6">
                             <div className="w-16 h-16 rounded-2xl overflow-hidden bg-devotion-maroon flex items-center justify-center border-2 border-devotion-gold/20">
                                {u.profilePicture ? <img src={u.profilePicture} className="w-full h-full object-cover" /> : <span className="text-2xl font-black text-devotion-gold">{u.name[0]}</span>}
                             </div>
                             <div>
                                <h4 className="font-serif font-bold text-xl text-white group-hover:text-devotion-gold transition-colors">{u.name}</h4>
                                <p className="text-xs text-gray-500 truncate max-w-[150px]">{u.email}</p>
                             </div>
                          </div>
                        <div className="space-y-2 text-xs mb-5 bg-black/20 rounded-2xl p-4 border border-white/5">
                          <p className="text-gray-300"><span className="text-gray-500">Username:</span> {u.name || 'N/A'}</p>
                          <p className="text-gray-300 truncate"><span className="text-gray-500">Email:</span> {u.email || 'N/A'}</p>
                          <p className="text-gray-300"><span className="text-gray-500">Password:</span> Stored securely (not viewable)</p>
                          <p className="text-gray-300"><span className="text-gray-500">Joined:</span> {u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'}</p>
                        </div>
                          <div className="flex items-center justify-between pt-6 border-t border-white/5">
                             <div className="flex items-center gap-2">
                                <Flame className="w-4 h-4 text-orange-500" />
                                <span className="font-black text-xs text-white">{u.streak} Days</span>
                             </div>
                             <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-devotion-gold text-devotion-darkBlue' : 'bg-white/10 text-gray-400'}`}>
                                {u.role}
                             </span>
                          </div>
                            <button
                             onClick={() => handleDeleteUser(u._id || u.id, u.name, u.role)}
                             disabled={u.role === 'admin' || !(u._id || u.id)}
                             className={`mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' || !(u._id || u.id) ? 'border-white/10 text-gray-500 cursor-not-allowed' : 'border-red-500/30 text-red-300 hover:text-red-200 hover:bg-red-500/10'}`}
                            >
                             <Trash2 className="w-4 h-4" /> Delete User
                            </button>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {activeTab === 'movies' && (
               <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-3xl">
                  <div className="flex justify-between items-center mb-10">
                     <h3 className="text-3xl font-serif font-black text-white uppercase tracking-tighter">Movie <span className="text-devotion-gold">Library</span></h3>
                     <span className="bg-devotion-gold/10 text-devotion-gold px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest border border-devotion-gold/30">Total: {data.movies.length}</span>
                  </div>
                  {data.movies.length === 0 ? (
                    <p className="text-gray-500 text-center py-12">No movies uploaded yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {data.movies.map((movie) => (
                        <div key={movie._id || movie.id} className="p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col">
                          {movie.videoUrl && (
                            <div className="mb-4 rounded-xl overflow-hidden border border-devotion-gold/20 aspect-video bg-black">
                              <MediaPlayer
                                url={movie.videoUrl}
                                title={movie.title}
                                className="w-full h-full object-cover"
                                youtubeParams="autoplay=0&rel=0&modestbranding=1"
                                controls
                              />
                            </div>
                          )}
                          <h4 className="text-white font-bold text-lg mb-2">{movie.title}</h4>
                          <p className="text-xs text-gray-400 mb-3">{movie.releaseYear || 'N/A'} • {(movie.tags || []).join(', ') || 'No tags'}</p>
                          <p className="text-sm text-gray-300 line-clamp-2 mb-4">{movie.description || 'No description'}</p>
                          <button
                            onClick={() => handleDeleteContent('movies', movie._id || movie.id, movie.title || 'Untitled')}
                            className="mt-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-all text-[10px] font-black uppercase tracking-widest"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            )}

            {activeTab === 'stories' && (
               <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-3xl">
                  <div className="flex justify-between items-center mb-10">
                     <h3 className="text-3xl font-serif font-black text-white uppercase tracking-tighter">Story <span className="text-devotion-gold">Library</span></h3>
                     <span className="bg-devotion-gold/10 text-devotion-gold px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest border border-devotion-gold/30">Total: {filteredStories.length}/{data.stories.length}</span>
                  </div>

                  <div className="mb-6 flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'missing-any', label: 'Any Missing' },
                      { key: 'missing-te', label: 'Missing TE' },
                      { key: 'missing-hi', label: 'Missing HI' },
                      { key: 'missing-en', label: 'Missing EN' },
                    ].map((filterOption) => (
                      <button
                        key={filterOption.key}
                        type="button"
                        onClick={() => setStoryLanguageFilter(filterOption.key)}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${storyLanguageFilter === filterOption.key ? 'border-devotion-gold/50 bg-devotion-gold/20 text-devotion-gold' : 'border-white/15 text-gray-300 hover:border-devotion-gold/30 hover:text-white'}`}
                      >
                        {filterOption.label}
                      </button>
                    ))}
                  </div>

                  {filteredStories.length === 0 ? (
                    <p className="text-gray-500 text-center py-12">No stories uploaded yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredStories.map((story) => (
                        <div key={story._id || story.id} className="p-6 rounded-2xl border border-white/10 bg-white/5">
                          <h4 className="text-white font-bold text-lg mb-2">{story.title}</h4>
                          <p className="text-xs text-gray-400 mb-3">{story.seriesTitle || 'Bhagavad Gita'} • Chapter {story.chapter || 1} • {(story.language || 'english')} • {(story.tags || []).join(', ') || 'No tags'}</p>
                          <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="mb-2 flex flex-wrap gap-2">
                              <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${story.titleTelugu ? 'border-devotion-gold/40 text-devotion-gold' : 'border-white/10 text-white/35'}`}>TE</span>
                              <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${story.titleHindi ? 'border-devotion-gold/40 text-devotion-gold' : 'border-white/10 text-white/35'}`}>HI</span>
                              <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] ${story.titleEnglish ? 'border-devotion-gold/40 text-devotion-gold' : 'border-white/10 text-white/35'}`}>EN</span>
                            </div>
                            <div className="space-y-1 text-[11px] text-gray-300">
                              <p className="line-clamp-1"><span className="text-devotion-gold">TE:</span> {story.titleTelugu || '-'}</p>
                              <p className="line-clamp-1"><span className="text-devotion-gold">HI:</span> {story.titleHindi || '-'}</p>
                              <p className="line-clamp-1"><span className="text-devotion-gold">EN:</span> {story.titleEnglish || '-'}</p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-300 line-clamp-3">{story.summary || story.description || 'No summary'}</p>
                          <div className="mt-5 flex flex-wrap gap-2">
                            {!hasLocalizedTitle(story.titleTelugu) && (
                              <button
                                onClick={() => handleQuickFillStoryTitle(story, 'te')}
                                disabled={quickFillStoryId === (story._id || story.id)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${quickFillStoryId === (story._id || story.id) ? 'border-white/15 text-white/45 cursor-not-allowed' : 'border-[#9FD9F0]/30 text-[#9FD9F0] hover:text-white hover:bg-[#9FD9F0]/10'}`}
                              >
                                {quickFillStoryId === (story._id || story.id) ? 'Saving...' : 'Fill TE'}
                              </button>
                            )}
                            {!hasLocalizedTitle(story.titleHindi) && (
                              <button
                                onClick={() => handleQuickFillStoryTitle(story, 'hi')}
                                disabled={quickFillStoryId === (story._id || story.id)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${quickFillStoryId === (story._id || story.id) ? 'border-white/15 text-white/45 cursor-not-allowed' : 'border-[#9FD9F0]/30 text-[#9FD9F0] hover:text-white hover:bg-[#9FD9F0]/10'}`}
                              >
                                {quickFillStoryId === (story._id || story.id) ? 'Saving...' : 'Fill HI'}
                              </button>
                            )}
                            {!hasLocalizedTitle(story.titleEnglish) && (
                              <button
                                onClick={() => handleQuickFillStoryTitle(story, 'en')}
                                disabled={quickFillStoryId === (story._id || story.id)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${quickFillStoryId === (story._id || story.id) ? 'border-white/15 text-white/45 cursor-not-allowed' : 'border-[#9FD9F0]/30 text-[#9FD9F0] hover:text-white hover:bg-[#9FD9F0]/10'}`}
                              >
                                {quickFillStoryId === (story._id || story.id) ? 'Saving...' : 'Fill EN'}
                              </button>
                            )}
                            <button
                              onClick={() => handleEditStory(story)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-devotion-gold/30 text-devotion-gold hover:text-white hover:bg-devotion-gold/10 transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                              <Pencil className="w-4 h-4" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteContent('stories', story._id || story.id, story.title || 'Untitled')}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            )}

            {activeTab === 'videos' && (
               <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-3xl">
                  <div className="flex justify-between items-center mb-10">
                     <h3 className="text-3xl font-serif font-black text-white uppercase tracking-tighter">Video <span className="text-devotion-gold">Library</span></h3>
                     <span className="bg-devotion-gold/10 text-devotion-gold px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest border border-devotion-gold/30">Total: {filteredAdminVideos.length}/{data.videos.length}</span>
                  </div>

                  {data.videos.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                      {videoCollectionOptions.map((collection) => (
                        <button
                          key={collection}
                          onClick={() => setVideoCollectionFilter(collection)}
                          className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${videoCollectionFilter === collection ? 'border-devotion-gold/50 bg-devotion-gold/20 text-devotion-gold' : 'border-white/15 text-gray-300 hover:border-devotion-gold/30 hover:text-white'}`}
                        >
                          {collection === 'all' ? 'All Collections' : collection}
                        </button>
                      ))}
                    </div>
                  )}

                  {pendingUserReels.length > 0 && (
                    <div className="mb-10 rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                        <h4 className="text-yellow-300 font-black text-xs uppercase tracking-widest">Pending User Reels For Review</h4>
                        <div className="flex gap-2">
                          {['all', 'spiritual', 'other'].map((type) => (
                            <button
                              key={type}
                              onClick={() => setPendingContentFilter(type)}
                              className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${pendingContentFilter === type ? 'border-devotion-gold/50 bg-devotion-gold/20 text-devotion-gold' : 'border-white/15 text-gray-300 hover:bg-white/10'}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingUserReels.map((reel) => (
                          <div key={reel._id || reel.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <p className="text-white font-bold mb-1 line-clamp-1">{reel.title}</p>
                            <p className="text-xs text-gray-300 mb-2 line-clamp-2">{reel.description || 'No description'}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-3">
                              Type: {reel.contentType || 'other'}
                            </p>
                            <textarea
                              rows="2"
                              value={moderationNotes[reel._id || reel.id] || ''}
                              onChange={(e) => setModerationNotes((prev) => ({ ...prev, [reel._id || reel.id]: e.target.value }))}
                              placeholder="Required when rejecting: reason/note"
                              className="w-full mb-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-devotion-gold/40"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleModerateUserReel(reel._id || reel.id, 'approved')}
                                className="flex-1 px-3 py-2 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 text-[10px] font-black uppercase tracking-widest"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleModerateUserReel(reel._id || reel.id, 'rejected')}
                                className="flex-1 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-black uppercase tracking-widest"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleDeleteContent('videos', reel._id || reel.id, reel.title || 'Untitled')}
                                className="flex-1 px-3 py-2 rounded-xl bg-red-900/20 border border-red-700/40 text-red-200 text-[10px] font-black uppercase tracking-widest"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.videos.length === 0 ? (
                    <p className="text-gray-500 text-center py-12">No videos uploaded yet.</p>
                  ) : filteredAdminVideos.length === 0 ? (
                    <p className="text-gray-500 text-center py-12">No videos found for this collection.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredAdminVideos.map((video) => (
                        <div key={video._id || video.id} className="p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col">
                          {video.videoUrl && (
                            <div className="mb-4 rounded-xl overflow-hidden border border-devotion-gold/20 aspect-video bg-black">
                              <MediaPlayer
                                url={video.videoUrl}
                                title={video.title}
                                className="w-full h-full object-cover"
                                youtubeParams="autoplay=0&rel=0&modestbranding=1"
                                controls
                              />
                            </div>
                          )}
                          <h4 className="text-white font-bold text-lg mb-2">{video.title}</h4>
                          <p className="text-xs text-gray-400 mb-3">{video.collectionTitle || 'Bhagavad Gita'} • {video.category || 'General'} • {video.isKids ? 'Kids' : 'All Ages'}</p>
                          <p className="text-sm text-gray-300 line-clamp-2 mb-4">{video.description || 'No description'}</p>
                          <button
                            onClick={() => handleDeleteContent('videos', video._id || video.id, video.title || 'Untitled')}
                            className="mt-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-all text-[10px] font-black uppercase tracking-widest"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            )}

            {activeTab === 'quiz' && (
               <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 backdrop-blur-3xl">
                  <div className="flex justify-between items-center mb-10">
                     <h3 className="text-3xl font-serif font-black text-white uppercase tracking-tighter">Quiz <span className="text-devotion-gold">Library</span></h3>
                     <span className="bg-devotion-gold/10 text-devotion-gold px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest border border-devotion-gold/30">Total: {data.quizQuestions.length}</span>
                  </div>

                  {data.quizQuestions.length === 0 ? (
                    <p className="text-gray-500 text-center py-12">No quiz questions uploaded yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {data.quizQuestions.map((question) => (
                        <div key={question.id} className="p-6 rounded-2xl border border-white/10 bg-white/5 flex flex-col">
                          <p className="text-[10px] uppercase tracking-widest text-devotion-gold mb-2">{question.category || 'Gita Challenge'}</p>
                          <h4 className="text-white font-bold text-lg mb-4">{question.questionText}</h4>
                          <ul className="space-y-2 mb-5">
                            {(question.options || []).map((option, idx) => (
                              <li key={`${question.id}-${idx}`} className={`text-sm px-3 py-2 rounded-lg border ${option.isCorrect ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-white/10 text-gray-300'}`}>
                                {option.answerText}
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => handleDeleteContent('quiz/questions', question.id, question.questionText || 'Question')}
                            className="mt-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-all text-[10px] font-black uppercase tracking-widest"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            )}
         </div>
      </div>

      {/* Universal Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
           <div className="bg-[#0B1F3A] w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[3.5rem] border border-devotion-gold/30 p-10 md:p-20 relative shadow-[0_0_150px_rgba(255,215,0,0.2)]">
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  resetForms();
                }}
                className="absolute top-10 right-10 text-gray-500 hover:text-white p-3 rounded-full hover:bg-white/5 transition-all"
              >
                <X className="w-8 h-8" />
              </button>

              <h2 className="text-5xl font-serif font-black text-white mb-12 text-center uppercase tracking-tighter">
                {activeTab === 'stories' && editingStoryId ? 'Edit' : 'Publish'} <span className="text-devotion-gold">{activeTab === 'stories' ? 'Story' : currentContentLabel}</span>
              </h2>

              <form onSubmit={handleAddContent} className="space-y-10">
                 
                 {/* MOVIE FORM */}
                 {activeTab === 'movies' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                         <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2"><FileText className="w-3 h-3"/> Movie Title</label>
                         <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" placeholder="e.g. Shri Krishna" value={movieForm.title} onChange={e => setMovieForm({...movieForm, title: e.target.value})} />
                      </div>
                      <div className="space-y-4">
                         <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2"><LinkIcon className="w-3 h-3"/> Video URL</label>
                         <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" placeholder="https://cloudinary.com/... or https://example.com/video.mp4" value={movieForm.videoUrl} onChange={e => setMovieForm({...movieForm, videoUrl: e.target.value})} />
                      </div>
                      <div className="space-y-4">
                         <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2"><ImageIcon className="w-3 h-3"/> Thumbnail Link</label>
                         <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" placeholder="https://image..." value={movieForm.thumbnail} onChange={e => setMovieForm({...movieForm, thumbnail: e.target.value})} />
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Release Year</label>
                         <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={movieForm.releaseYear} onChange={e => setMovieForm({...movieForm, releaseYear: e.target.value})} />
                      </div>
                      <div className="md:col-span-2 space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Owner's Selection Insight</label>
                         <textarea rows="3" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" placeholder="Why this movie?" value={movieForm.ownerHistory} onChange={e => setMovieForm({...movieForm, ownerHistory: e.target.value})} />
                      </div>
                   </div>
                 )}

                 {/* STORY FORM */}
                 {activeTab === 'stories' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Story Title</label>
                         <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.title} onChange={e => setStoryForm({...storyForm, title: e.target.value})} />
                      </div>
                     <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Title Telugu</label>
                       <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.titleTelugu} onChange={e => setStoryForm({...storyForm, titleTelugu: e.target.value})} />
                     </div>
                     <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Title Hindi</label>
                       <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.titleHindi} onChange={e => setStoryForm({...storyForm, titleHindi: e.target.value})} />
                     </div>
                     <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Title English</label>
                       <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.titleEnglish} onChange={e => setStoryForm({...storyForm, titleEnglish: e.target.value})} />
                     </div>
                       <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Collection Title</label>
                         <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" placeholder="Bhagavad Gita or Ramayana" value={storyForm.seriesTitle} onChange={e => setStoryForm({...storyForm, seriesTitle: e.target.value})} />
                       </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Chapter Number</label>
                         <input type="number" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.chapter} onChange={e => setStoryForm({...storyForm, chapter: e.target.value})} />
                      </div>
                      <div className="md:col-span-2 space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Primary Language</label>
                         <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.language} onChange={e => setStoryForm({...storyForm, language: e.target.value})}>
                          <option value="telugu" className="bg-[#0B1F3A]">Telugu</option>
                          <option value="hindi" className="bg-[#0B1F3A]">Hindi</option>
                          <option value="english" className="bg-[#0B1F3A]">English</option>
                         </select>
                       </div>
                       <div className="md:col-span-2 space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Summary</label>
                         <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.summary} onChange={e => setStoryForm({...storyForm, summary: e.target.value})} />
                      </div>
                      <div className="md:col-span-2 space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Full Content</label>
                         <textarea rows="6" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.content} onChange={e => setStoryForm({...storyForm, content: e.target.value})} />
                      </div>
                       <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Summary Telugu</label>
                         <textarea rows="3" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.summaryTelugu} onChange={e => setStoryForm({...storyForm, summaryTelugu: e.target.value})} />
                       </div>
                       <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Summary Hindi</label>
                         <textarea rows="3" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.summaryHindi} onChange={e => setStoryForm({...storyForm, summaryHindi: e.target.value})} />
                       </div>
                       <div className="md:col-span-2 space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Summary English</label>
                         <textarea rows="3" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.summaryEnglish} onChange={e => setStoryForm({...storyForm, summaryEnglish: e.target.value})} />
                       </div>
                       <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Content Telugu</label>
                         <textarea rows="4" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.contentTelugu} onChange={e => setStoryForm({...storyForm, contentTelugu: e.target.value})} />
                       </div>
                       <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Content Hindi</label>
                         <textarea rows="4" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.contentHindi} onChange={e => setStoryForm({...storyForm, contentHindi: e.target.value})} />
                       </div>
                       <div className="md:col-span-2 space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Content English</label>
                         <textarea rows="4" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={storyForm.contentEnglish} onChange={e => setStoryForm({...storyForm, contentEnglish: e.target.value})} />
                       </div>
                   </div>
                 )}

                 {/* VIDEO FORM */}
                 {activeTab === 'videos' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Video Title</label>
                         <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={videoForm.title} onChange={e => setVideoForm({...videoForm, title: e.target.value})} />
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Video URL</label>
                         <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" placeholder="https://cloudinary.com/... or https://example.com/video.mp4" value={videoForm.videoUrl} onChange={e => setVideoForm({...videoForm, videoUrl: e.target.value})} />
                         {videoForm.videoUrl && (
                           <div className="mt-3 rounded-xl overflow-hidden border border-devotion-gold/30 aspect-video bg-black">
                             <MediaPlayer
                               url={videoForm.videoUrl}
                               title={videoForm.title}
                               className="w-full h-full object-cover"
                               youtubeParams="autoplay=0&rel=0&modestbranding=1"
                               controls
                             />
                           </div>
                         )}
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Description</label>
                         <textarea rows="3" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" placeholder="What's this video about?" value={videoForm.description} onChange={e => setVideoForm({...videoForm, description: e.target.value})} />
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Category</label>
                         <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={videoForm.category} onChange={e => {
                           const selectedCategory = e.target.value;
                           setVideoForm((prev) => ({
                             ...prev,
                             category: selectedCategory,
                             isKids: selectedCategory === 'animated' ? true : prev.isKids,
                           }));
                         }}>
                            <option value="reels" className="bg-[#0B1F3A]">Wisdom Reel</option>
                           <option value="animated" className="bg-[#0B1F3A]">Kids Animated</option>
                            <option value="lectures" className="bg-[#0B1F3A]">Full Lecture</option>
                            <option value="bhajans" className="bg-[#0B1F3A]">Bhajans</option>
                         </select>
                      </div>
                       <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Collection Title</label>
                         <select
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none"
                           value={VIDEO_COLLECTION_PRESETS.includes(videoForm.collectionTitle) ? videoForm.collectionTitle : 'custom'}
                           onChange={e => {
                             if (e.target.value === 'custom') {
                               setVideoForm((prev) => ({ ...prev, collectionTitle: '' }));
                             } else {
                               setVideoForm((prev) => ({ ...prev, collectionTitle: e.target.value }));
                             }
                           }}
                         >
                           {VIDEO_COLLECTION_PRESETS.map((item) => (
                             <option key={item} value={item} className="bg-[#0B1F3A]">{item}</option>
                           ))}
                           <option value="custom" className="bg-[#0B1F3A]">Custom</option>
                         </select>
                         {!VIDEO_COLLECTION_PRESETS.includes(videoForm.collectionTitle) && (
                           <input
                             required
                             className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none"
                             placeholder="Type custom collection name"
                             value={videoForm.collectionTitle}
                             onChange={e => setVideoForm({...videoForm, collectionTitle: e.target.value})}
                           />
                         )}
                       </div>
                      <div className="flex items-center gap-4 pt-10">
                         <input type="checkbox" className="w-6 h-6 rounded bg-white/5 border-white/10 text-devotion-gold" checked={videoForm.isKids} onChange={e => setVideoForm({...videoForm, isKids: e.target.checked})} />
                         <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold">Show in Kids Mode?</label>
                      </div>
                   </div>
                 )}

                  {/* QUIZ FORM */}
                  {activeTab === 'quiz' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="md:col-span-2 space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Question</label>
                       <textarea required rows="3" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={quizForm.questionText} onChange={e => setQuizForm({...quizForm, questionText: e.target.value})} />
                     </div>
                     <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Category</label>
                       <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={quizForm.category} onChange={e => setQuizForm({...quizForm, category: e.target.value})} />
                     </div>
                     <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Optional Video URL</label>
                       <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={quizForm.videoUrl} onChange={e => setQuizForm({...quizForm, videoUrl: e.target.value})} />
                     </div>
                     <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Option A</label>
                       <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={quizForm.optionA} onChange={e => setQuizForm({...quizForm, optionA: e.target.value})} />
                     </div>
                     <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Option B</label>
                       <input required className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={quizForm.optionB} onChange={e => setQuizForm({...quizForm, optionB: e.target.value})} />
                     </div>
                     <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Option C</label>
                       <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={quizForm.optionC} onChange={e => setQuizForm({...quizForm, optionC: e.target.value})} />
                     </div>
                     <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Option D</label>
                       <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={quizForm.optionD} onChange={e => setQuizForm({...quizForm, optionD: e.target.value})} />
                     </div>
                     <div className="md:col-span-2 space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Correct Option</label>
                      <select className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" value={quizForm.correctOption} onChange={e => setQuizForm({...quizForm, correctOption: e.target.value})}>
                        <option value="A" className="bg-[#0B1F3A]">Option A</option>
                        <option value="B" className="bg-[#0B1F3A]">Option B</option>
                        <option value="C" className="bg-[#0B1F3A]">Option C</option>
                        <option value="D" className="bg-[#0B1F3A]">Option D</option>
                      </select>
                     </div>
                   </div>
                  )}

                 {['movies', 'stories', 'videos'].includes(activeTab) && (
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-devotion-gold ml-2">Tags (comma separated)</label>
                    <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white focus:border-devotion-gold outline-none" placeholder="Motivation, Karma, Peace" 
                      value={activeTab === 'movies' ? movieForm.tags : (activeTab === 'stories' ? storyForm.tags : videoForm.tags)} 
                      onChange={e => {
                        if (activeTab === 'movies') setMovieForm({...movieForm, tags: e.target.value});
                        else if (activeTab === 'stories') setStoryForm({...storyForm, tags: e.target.value});
                        else if (activeTab === 'videos') setVideoForm({...videoForm, tags: e.target.value});
                      }} 
                    />
                 </div>
                 )}

                 <button 
                   type="submit"
                   disabled={loading}
                   className="w-full bg-devotion-gold text-devotion-darkBlue py-8 rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-2xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-4 group"
                 >
                    {loading ? <div className="w-6 h-6 border-2 border-devotion-darkBlue border-t-transparent rounded-full animate-spin"></div> : (
                      <>
                        <Upload className="w-6 h-6 group-hover:scale-125 transition-transform" />
                        {activeTab === 'stories' && editingStoryId ? 'UPDATE STORY' : 'PUBLISH TO DIVINE LIBRARY'}
                      </>
                    )}
                 </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}
