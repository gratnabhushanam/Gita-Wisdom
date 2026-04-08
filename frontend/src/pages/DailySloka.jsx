import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Bell, Volume2, Pause, BookOpen, Share2, Copy, CheckCircle, Bookmark, Trash2, ChevronLeft, CalendarDays } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { requestNotificationPermission, sendNotification } from '../utils/notificationService';

export default function DailySloka() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  const API_ORIGIN = API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8888` : 'http://localhost:8888');
  const HISTORY_KEY = 'daily_sloka_history_v1';
  const SAVED_VERSES_KEY = 'daily_saved_verses_v1';
  const formatLocalDateKey = (date = new Date()) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const todayDateKey = formatLocalDateKey();
  const [dailySloka, setDailySloka] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('english');
  const [isPlaying, setIsPlaying] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voices, setVoices] = useState([]);
  const [history, setHistory] = useState([]);
  const [savedVerses, setSavedVerses] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [playbackSource, setPlaybackSource] = useState(null);
  const [selectedDateKey, setSelectedDateKey] = useState(() => formatLocalDateKey());
  const [showCalendar, setShowCalendar] = useState(false);
  const location = useLocation();
  const audioRef = useRef(null);

  const isSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    // Load voices
    if (isSpeechSupported) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (Array.isArray(availableVoices) && availableVoices.length) {
          setVoices(availableVoices);
        }
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    }
  }, []);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (isSpeechSupported) {
      window.speechSynthesis.cancel();
    }
  }, [isSpeechSupported]);

  useEffect(() => {
    const savedVerse = location.state && location.state.savedVerse;
    if (savedVerse && hasValidSloka(savedVerse)) {
      setDailySloka({
        ...savedVerse,
        localizedMeaning: {
          english: savedVerse.englishMeaning || '',
          hindi: savedVerse.hindiMeaning || savedVerse.englishMeaning || '',
          telugu: savedVerse.teluguMeaning || savedVerse.englishMeaning || '',
        },
      });
      setLoading(false);
      setSaveStatus('Loaded saved verse');
      window.setTimeout(() => setSaveStatus(''), 2000);
    } else {
      fetchDailySloka();
    }

    checkNotificationStatus();
    loadHistory();
    loadSavedVerses();
  }, [location.state]);

  const hasValidSloka = (payload) => Boolean(payload && typeof payload.sanskrit === 'string' && payload.sanskrit.trim().length > 0);

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/slokas/daily/history`);
      const apiItems = response.data && Array.isArray(response.data.items) ? response.data.items : [];
      if (apiItems.length) {
        setHistory(apiItems);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(apiItems));
        return;
      }
    } catch (error) {
      console.error('Failed to load API daily history, using local cache:', error);
    }

    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setHistory(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Failed to load daily sloka history:', error);
      setHistory([]);
    }
  };

  const loadSavedVerses = () => {
    try {
      const raw = localStorage.getItem(SAVED_VERSES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedVerses(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Failed to load saved daily verses:', error);
      setSavedVerses([]);
    }
  };

  const getVerseKey = (item) => `${item.chapter || '0'}:${item.verse || '0'}:${String(item.sanskrit || '').trim()}`;

  const saveHistory = async (entry) => {
    try {
      await axios.post(`${API_BASE_URL}/api/slokas/daily/history`, entry);
    } catch (error) {
      console.error('Failed to save daily history to API, using local cache:', error);
    }

    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const base = Array.isArray(parsed) ? parsed : [];
      const deduped = base.filter((item) => item.dailyKey !== entry.dailyKey && item.id !== entry.id);
      const next = [entry, ...deduped].slice(0, 30);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setHistory(next);
    } catch (error) {
      console.error('Failed to save daily sloka history:', error);
    }
  };

  const shiftDateKey = (dateKey, offsetDays) => {
    const parsed = new Date(dateKey);
    const safe = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    safe.setDate(safe.getDate() + offsetDays);
    const yyyy = safe.getFullYear();
    const mm = String(safe.getMonth() + 1).padStart(2, '0');
    const dd = String(safe.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const fetchDailySloka = async (dateKey = selectedDateKey) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/slokas/daily?date=${encodeURIComponent(dateKey)}`);
      const payload = response.data;
      if (hasValidSloka(payload)) {
        setDailySloka(payload);
        await saveHistory({
          id: payload.id,
          chapter: payload.chapter,
          verse: payload.verse,
          sanskrit: payload.sanskrit,
          englishMeaning: payload.englishMeaning || (payload.localizedMeaning && payload.localizedMeaning.english) || '',
          dailyKey: dateKey || payload.dailyKey || new Date().toISOString().slice(0, 10),
          viewedAt: new Date().toISOString(),
        });
      } else {
        setDailySloka(null);
      }
    } catch (error) {
      console.error('Error fetching daily sloka:', error);
      setDailySloka(null);
    } finally {
      setLoading(false);
    }
  };

  const openPreviousDay = async () => {
    stopPlayback();
    const previousDate = shiftDateKey(selectedDateKey, -1);
    setSelectedDateKey(previousDate);
    await fetchDailySloka(previousDate);
  };

  const handleDateSelection = async (event) => {
    const pickedDate = String(event.target.value || '').trim();
    if (!pickedDate) return;
    if (pickedDate > todayDateKey) {
      setSaveStatus('Future dates are disabled');
      window.setTimeout(() => setSaveStatus(''), 2000);
      return;
    }
    stopPlayback();
    setSelectedDateKey(pickedDate);
    await fetchDailySloka(pickedDate);
  };

  const checkNotificationStatus = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const hasPermission = Notification.permission === 'granted';
    setNotificationEnabled(hasPermission);
  };

  const enableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationEnabled(permission === 'granted');
    if (permission === 'granted' && dailySloka) {
      const meaning = getMeaningByLanguage(dailySloka, language);
      sendNotification('Daily Sloka', {
        body: dailySloka.sanskrit,
        tag: 'daily-sloka',
        requireInteraction: false,
      });
    }
  };

  const getMeaningByLanguage = (sloka, lang) => {
    if (!sloka) return '';
    const localized = sloka.localizedMeaning || {};
    if (lang === 'telugu') {
      return localized.telugu || sloka.teluguMeaning || sloka.englishMeaning || '';
    }
    if (lang === 'hindi') {
      return localized.hindi || sloka.hindiMeaning || sloka.englishMeaning || '';
    }
    return localized.english || sloka.englishMeaning || '';
  };

  const getAudioByLanguage = (sloka, lang) => {
    if (!sloka) return '';
    const audioByLanguage = sloka.audioByLanguage || {};
    return audioByLanguage[lang] || sloka.audioUrl || '';
  };

  const resolveAudioUrl = (rawUrl) => {
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
    return value;
  };

  const getSpeechLang = (lang) => {
    if (lang === 'hindi') return 'hi-IN';
    if (lang === 'telugu') return 'te-IN';
    return 'en-US';
  };

  const getSpeechText = (sloka, lang) => {
    if (!sloka) return '';
    const meaning = getMeaningByLanguage(sloka, lang);
    return `${sloka.sanskrit}\n\n${meaning}`.trim();
  };

  const getSpeechVoice = (lang) => {
    const voiceLanguageHints = {
      english: ['en-us', 'en-gb', 'en-in'],
      hindi: ['hi-in', 'hi'],
      telugu: ['te-in', 'te'],
    };
    const hints = voiceLanguageHints[lang] || voiceLanguageHints.english;
    for (const hint of hints) {
      const byLang = voices.find((voice) => String(voice.lang || '').toLowerCase().startsWith(hint));
      if (byLang) return byLang;
      const byName = voices.find((voice) => String(voice.name || '').toLowerCase().includes(hint.replace('-', '')));
      if (byName) return byName;
    }
    return voices.find((voice) => voice.default) || voices[0] || null;
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (isSpeechSupported) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setPlaybackSource(null);
  };

  const startSpeechPlayback = (lang = language) => {
    if (!isSpeechSupported) {
      return false;
    }

    const speechText = getSpeechText(dailySloka, lang);
    if (!speechText) {
      return false;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = getSpeechLang(lang);
    const selectedVoice = getSpeechVoice(lang);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    setPlaybackSource('speech');
    window.speechSynthesis.speak(utterance);
    return true;
  };

  const startPlayback = (lang = language) => {
    stopPlayback();
    const audioUrl = resolveAudioUrl(getAudioByLanguage(dailySloka, lang));
    if (audioUrl) {
      const newAudio = new Audio(audioUrl);
      audioRef.current = newAudio;
      setIsPlaying(true);
      setPlaybackSource('file');
      newAudio.play().catch((e) => {
        console.error('Audio playback failed, falling back to speech synthesis:', e);
        audioRef.current = null;
        const started = startSpeechPlayback(lang);
        if (!started) {
          setIsPlaying(false);
          setPlaybackSource(null);
        }
      });
      newAudio.onended = () => {
        audioRef.current = null;
        setIsPlaying(false);
        setPlaybackSource(null);
      };
      newAudio.onerror = () => {
        audioRef.current = null;
        const started = startSpeechPlayback(lang);
        if (!started) {
          setIsPlaying(false);
          setPlaybackSource(null);
        }
      };
      return;
    }

    const started = startSpeechPlayback(lang);
    if (!started) {
      setSaveStatus('Audio unavailable for this verse on this browser');
      window.setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const toggleAudio = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback(language);
    }
  };

  const copyToClipboard = () => {
    if (!dailySloka) return;
    const meaning = getMeaningByLanguage(dailySloka, language);
    const text = `${dailySloka.sanskrit}\n\n${meaning}`;
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareSloka = async () => {
    if (!dailySloka || typeof navigator === 'undefined' || !navigator.share) return;
    const meaning = getMeaningByLanguage(dailySloka, language);
    try {
      await navigator.share({
        title: 'Daily Sloka from Gita Wisdom',
        text: `${dailySloka.sanskrit}\n\n${meaning}`,
        url: window.location.href,
      });
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  const handleToggleSaveVerse = () => {
    if (!dailySloka) return;

    const verseKey = getVerseKey(dailySloka);
    const exists = savedVerses.some((item) => item.verseKey === verseKey);

    const entry = {
      verseKey,
      chapter: dailySloka.chapter || null,
      verse: dailySloka.verse || null,
      sanskrit: dailySloka.sanskrit || '',
      englishMeaning: dailySloka.englishMeaning || (dailySloka.localizedMeaning && dailySloka.localizedMeaning.english) || '',
      dailyKey: dailySloka.dailyKey || new Date().toISOString().slice(0, 10),
      savedAt: new Date().toISOString(),
    };

    const next = exists
      ? savedVerses.filter((item) => item.verseKey !== verseKey)
      : [entry, ...savedVerses].slice(0, 80);

    setSavedVerses(next);
    localStorage.setItem(SAVED_VERSES_KEY, JSON.stringify(next));
    setSaveStatus(exists ? 'Verse removed from saved list' : 'Verse saved successfully');

    window.setTimeout(() => {
      setSaveStatus('');
    }, 2000);
  };

  const handleLoadSavedVerse = (item) => {
    if (!item) return;

    stopPlayback();

    setDailySloka((prev) => ({
      ...(prev || {}),
      ...item,
      localizedMeaning: {
        english: item.englishMeaning || '',
        hindi: item.hindiMeaning || item.englishMeaning || '',
        telugu: item.teluguMeaning || item.englishMeaning || '',
      },
    }));

    setSaveStatus('Saved verse loaded');
    window.setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleRemoveSavedVerse = (verseKey) => {
    const next = savedVerses.filter((item) => item.verseKey !== verseKey);
    setSavedVerses(next);
    localStorage.setItem(SAVED_VERSES_KEY, JSON.stringify(next));
    setSaveStatus('Saved verse removed');
    window.setTimeout(() => setSaveStatus(''), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-28 pb-12 px-4 flex items-center justify-center bg-[#06101E]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-devotion-gold"></div>
      </div>
    );
  }

  if (!dailySloka) {
    return (
      <div className="min-h-screen pt-28 pb-12 px-4 flex items-center justify-center bg-[#06101E]">
        <p className="text-gray-400 text-lg">Unable to load today's sloka. Please verify API at /api/slokas/daily.</p>
      </div>
    );
  }

  const meaning = getMeaningByLanguage(dailySloka, language);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const isCurrentVerseSaved = savedVerses.some((item) => item.verseKey === getVerseKey(dailySloka));

  return (
    <div className="min-h-screen pt-28 pb-12 px-4 sm:px-6 lg:px-8 relative bg-[#06101E] text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,215,0,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(122,46,46,0.2),transparent_30%)]"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-devotion-gold/30 bg-devotion-gold/10 text-devotion-gold text-[10px] font-black tracking-[0.4em] uppercase mb-6">
            Daily Wisdom
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-black text-devotion-gold drop-shadow-2xl mb-4 tracking-tight uppercase">
            Daily Sloka
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-light font-serif italic max-w-2xl mx-auto">
            A verse from the Bhagavad Gita to guide your day
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={openPreviousDay}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Day
            </button>
            <span className="px-4 py-2 rounded-xl border border-devotion-gold/30 bg-devotion-gold/10 text-devotion-gold text-[10px] font-black uppercase tracking-widest">
              {selectedDateKey}
            </span>
          </div>
          
          {/* Collapsible Calendar */}
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-devotion-gold/25 bg-white/5 hover:bg-white/10 text-gray-200 text-[10px] font-black uppercase tracking-widest transition-all hover:border-devotion-gold/50"
            >
              <CalendarDays className="w-4 h-4 text-devotion-gold" />
              <span>{showCalendar ? 'Hide' : 'Choose'} Date</span>
            </button>
            {showCalendar && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-devotion-gold/30 bg-devotion-darkBlue/60 backdrop-blur-md">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2">Select Date:</span>
                <input
                  type="date"
                  value={selectedDateKey}
                  max={todayDateKey}
                  onChange={handleDateSelection}
                  className="bg-transparent text-white text-xs font-bold outline-none px-2 py-1 rounded border border-devotion-gold/40 hover:border-devotion-gold/70 focus:border-devotion-gold transition-all"
                  aria-label="Choose daily sloka date"
                  style={{
                    colorScheme: 'dark'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Sloka Card */}
        <div className="bg-glass-gradient backdrop-blur-3xl rounded-[3rem] p-8 md:p-16 border border-devotion-gold/30 shadow-[0_0_100px_rgba(0,0,0,0.4)] mb-12 animate-fade-in-up relative overflow-hidden group">
          <div className="absolute top-0 right-0 opacity-5 text-[15rem] -rotate-12 translate-x-20 translate-y-20 select-none pointer-events-none">🕉️</div>

          <div className="relative z-10">
            {/* Sanskrit */}
            <div className="mb-10 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-devotion-gold mb-4">Sacred Verse</p>
              <p className="text-3xl md:text-5xl font-serif text-white leading-relaxed italic mb-6 drop-shadow-lg">
                {(dailySloka.sanskrit || '').split('\n').map((line, i) => (
                  <span key={i} className="block mb-2">
                    {line}
                  </span>
                ))}
              </p>
              <div className="h-px bg-gradient-to-r from-transparent via-devotion-gold/40 to-transparent mb-8"></div>
              <p className="text-sm md:text-base text-gray-400">
                {dailySloka.chapter && dailySloka.verse && `Chapter ${dailySloka.chapter}, Verse ${dailySloka.verse}`}
              </p>
            </div>

            {/* Language Selector */}
            <div className="flex justify-center mb-10 flex-wrap gap-3">
              <button
                onClick={() => {
                  setLanguage('english');
                  if (isPlaying) {
                    stopPlayback();
                  }
                }}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === 'english' ? 'bg-devotion-gold text-devotion-darkBlue shadow-lg scale-105' : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white'}`}
              >
                English
              </button>
              <button
                onClick={() => {
                  setLanguage('hindi');
                  if (isPlaying) {
                    stopPlayback();
                  }
                }}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === 'hindi' ? 'bg-devotion-gold text-devotion-darkBlue shadow-lg scale-105' : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white'}`}
              >
                हिंदी
              </button>
              <button
                onClick={() => {
                  setLanguage('telugu');
                  if (isPlaying) {
                    stopPlayback();
                  }
                }}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === 'telugu' ? 'bg-devotion-gold text-devotion-darkBlue shadow-lg scale-105' : 'bg-white/5 border border-white/10 text-gray-300 hover:text-white'}`}
              >
                తెలుగు
              </button>
            </div>

            {/* Meaning */}
            <div className="bg-devotion-darkBlue/40 backdrop-blur-md p-8 rounded-3xl border border-white/5 mb-10">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-devotion-gold mb-4">Meaning</p>
              <p className="text-lg md:text-xl font-medium leading-relaxed text-white">
                {meaning}
              </p>
            </div>

            {/* Explanation & Example */}
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {dailySloka.simpleExplanation && (
                <div className="bg-devotion-darkBlue/40 backdrop-blur-md p-8 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-3">Modern Insight</p>
                  <p className="text-gray-200 leading-relaxed">{dailySloka.simpleExplanation}</p>
                </div>
              )}
              {dailySloka.realLifeExample && (
                <div className="bg-devotion-darkBlue/40 backdrop-blur-md p-8 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 bg-devotion-gold/10 rounded-xl flex items-center justify-center mb-4 border border-devotion-gold/20">
                    <CheckCircle className="w-5 h-5 text-devotion-gold" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-devotion-gold mb-3">Applied Wisdom</p>
                  <p className="text-gray-200 leading-relaxed">{dailySloka.realLifeExample}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <button
                onClick={toggleAudio}
                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-widest"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                {isPlaying ? 'Stop' : 'Listen'}
              </button>

              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${copied ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
              >
                <Copy className="w-5 h-5" />
                {copied ? 'Copied!' : 'Copy'}
              </button>

              {canShare && (
                <button
                  onClick={shareSloka}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-widest"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              )}

              <button
                onClick={handleToggleSaveVerse}
                className={`flex items-center gap-3 border px-6 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${isCurrentVerseSaved ? 'bg-devotion-gold/20 border-devotion-gold/50 text-devotion-gold' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'}`}
              >
                <Bookmark className="w-5 h-5 text-devotion-gold" />
                {isCurrentVerseSaved ? 'Saved Verse' : 'Save Verse'}
              </button>

              <button
                onClick={enableNotifications}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ml-auto ${notificationEnabled ? 'bg-purple-500/20 border border-purple-500/50 text-purple-400' : 'bg-white/5 hover:bg-white/10 border border-white/10'}`}
              >
                <Bell className="w-5 h-5" />
                {notificationEnabled ? 'Notifications On' : 'Enable Notifications'}
              </button>
            </div>

            {saveStatus && (
              <p className="mt-4 text-center text-xs font-black uppercase tracking-widest text-devotion-gold">
                {saveStatus}
              </p>
            )}

            {isPlaying && playbackSource && (
              <p className={`mt-2 text-center text-[10px] font-black uppercase tracking-widest ${playbackSource === 'file' ? 'text-devotion-gold' : 'text-sky-300'}`}>
                Audio Source: {playbackSource === 'file' ? 'File Audio' : 'Divine Narration'}
              </p>
            )}

            {/* Tags */}
            {dailySloka.tags && dailySloka.tags.length > 0 && (
              <div className="mt-10 pt-8 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-devotion-gold mb-4">Related Topics</p>
                <div className="flex flex-wrap gap-2">
                  {dailySloka.tags.map((tag) => (
                    <span key={tag} className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full uppercase text-[9px] font-black tracking-widest text-gray-400 hover:text-devotion-gold transition-colors">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {history.length > 1 && (
              <div className="mt-12 pt-8 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-devotion-gold mb-4">Previous Daily Slokas</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {history.slice(1, 7).map((item) => (
                    <div key={`${item.dailyKey}-${item.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">{item.dailyKey}</p>
                      <p className="text-sm text-white line-clamp-2 italic mb-2">{item.sanskrit}</p>
                      <p className="text-xs text-gray-300 line-clamp-2">{item.englishMeaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {savedVerses.length > 0 && (
              <div className="mt-12 pt-8 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-devotion-gold mb-4">Saved Daily Verses</p>
                <div className="grid md:grid-cols-2 gap-4">
                  {savedVerses.slice(0, 8).map((item) => (
                    <div key={item.verseKey} className="rounded-2xl border border-devotion-gold/25 bg-devotion-gold/5 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-devotion-gold mb-2">
                        {item.chapter && item.verse ? `Chapter ${item.chapter}, Verse ${item.verse}` : item.dailyKey || 'Saved Verse'}
                      </p>
                      <p className="text-sm text-white line-clamp-2 italic mb-2">{item.sanskrit}</p>
                      <p className="text-xs text-gray-300 line-clamp-2 mb-3">{item.englishMeaning}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleLoadSavedVerse(item)}
                          className="flex-1 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => handleRemoveSavedVerse(item.verseKey)}
                          className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-400/20"
                          aria-label="Remove saved verse"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
