import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Share2, Bookmark, Volume2, Info, Pause } from 'lucide-react';

export default function Sloka() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  const [sloka, setSloka] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('english');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);
  const [playbackType, setPlaybackType] = useState(null);
  const [voices, setVoices] = useState([]);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const getMeaningByLanguage = (currentSloka, selectedLanguage) => {
    if (!currentSloka) return '';
    const localized = currentSloka.localizedMeaning || {};

    if (selectedLanguage === 'telugu') {
      return localized.telugu || currentSloka.teluguMeaning || currentSloka.englishMeaning || '';
    }

    if (selectedLanguage === 'hindi') {
      return localized.hindi || currentSloka.hindiMeaning || currentSloka.englishMeaning || '';
    }

    return localized.english || currentSloka.englishMeaning || currentSloka.teluguMeaning || '';
  };

  const getAudioUrlByLanguage = (currentSloka, selectedLanguage) => {
    if (!currentSloka) return '';
    const audioByLanguage = currentSloka.audioByLanguage || {};
    return audioByLanguage[selectedLanguage] || currentSloka.audioUrl || '';
  };

  const isSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    if (!isSpeechSupported) return undefined;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (Array.isArray(availableVoices) && availableVoices.length) {
        setVoices(availableVoices);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const getSpeechLang = (selectedLanguage) => {
    if (selectedLanguage === 'hindi') return 'hi-IN';
    if (selectedLanguage === 'telugu') return 'te-IN';
    return 'en-US';
  };

  const getSpeechText = (currentSloka, selectedLanguage) => {
    if (!currentSloka) return '';
    const meaning = getMeaningByLanguage(currentSloka, selectedLanguage);
    return `${currentSloka.sanskrit}\n\n${meaning}`.trim();
  };

  const getSpeechVoice = (selectedLanguage) => {
    const voiceLanguageHints = {
      english: ['en-us', 'en-gb', 'en-in'],
      hindi: ['hi-in', 'hi'],
      telugu: ['te-in', 'te'],
    };

    const hints = voiceLanguageHints[selectedLanguage] || voiceLanguageHints.english;
    const normalizedVoices = voices.map((voice) => ({ ...voice, normalizedLang: String(voice.lang || '').toLowerCase(), normalizedName: String(voice.name || '').toLowerCase() }));

    for (const hint of hints) {
      const byLang = normalizedVoices.find((voice) => voice.normalizedLang.startsWith(hint));
      if (byLang) return byLang;

      const byName = normalizedVoices.find((voice) => voice.normalizedName.includes(hint.replace('-', '')));
      if (byName) return byName;
    }

    return normalizedVoices.find((voice) => voice.default) || normalizedVoices[0] || null;
  };

  const getVoiceLabel = () => {
    if (!isSpeechSupported) return 'Browser narration unavailable';
    if (!voices.length) return 'Loading voices';

    const voice = getSpeechVoice(language);
    if (!voice) return 'Default browser voice';

    const normalizedName = String(voice.name || '').toLowerCase();
    const normalizedLang = String(voice.lang || '').toLowerCase();

    if (language === 'hindi' && (normalizedLang.startsWith('hi') || normalizedName.includes('hindi'))) {
      return `Hindi voice: ${voice.name}`;
    }

    if (language === 'telugu' && (normalizedLang.startsWith('te') || normalizedName.includes('telugu'))) {
      return `Telugu voice: ${voice.name}`;
    }

    if (language === 'english' && normalizedLang.startsWith('en')) {
      return `English voice: ${voice.name}`;
    }

    return `Fallback voice: ${voice.name}`;
  };

  const activeAudioUrl = getAudioUrlByLanguage(sloka, language);
  const canPlayAudio = Boolean(activeAudioUrl) || isSpeechSupported;

  const stopPlayback = () => {
    if (playbackType === 'file' && audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    if (playbackType === 'speech' && isSpeechSupported) {
      window.speechSynthesis.cancel();
    }

    setIsPlaying(false);
    setPlaybackType(null);
  };

  const startPlayback = (selectedLanguage = language) => {
    const currentAudioUrl = getAudioUrlByLanguage(sloka, selectedLanguage);

    if (currentAudioUrl) {
      const newAudio = new Audio(currentAudioUrl);
      setAudio(newAudio);
      setPlaybackType('file');
      setIsPlaying(true);
      newAudio.play().catch((e) => {
        console.error('Audio playback failed', e);
        setIsPlaying(false);
        setPlaybackType(null);
      });
      newAudio.onended = () => {
        setIsPlaying(false);
        setPlaybackType(null);
      };
      return;
    }

    if (!isSpeechSupported) {
      return;
    }

    const speechText = getSpeechText(sloka, selectedLanguage);
    if (!speechText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = getSpeechLang(selectedLanguage);
    utterance.voice = getSpeechVoice(selectedLanguage);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => {
      setIsPlaying(false);
      setPlaybackType(null);
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setPlaybackType(null);
    };

    setPlaybackType('speech');
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const fetchSloka = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/slokas/daily`);
        setSloka(response.data);
        
        const token = localStorage.getItem('token');
        if (token) {
          axios.post(`${API_BASE_URL}/api/auth/streak`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => {
            const userData = JSON.parse(localStorage.getItem('user'));
            if (userData) {
              userData.streak = res.data.streak;
              localStorage.setItem('user', JSON.stringify(userData));
            }
          }).catch(err => console.error("Streak update failed:", err));
        }
      } catch (error) {
        console.error('Error fetching sloka:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSloka();
  }, []);

  useEffect(() => {
    if (!isPlaying || !sloka) return;

    stopPlayback();
    startPlayback(language);
  }, [language]);

  const toggleAudio = () => {
    if (isPlaying) {
      stopPlayback();
      if (isSpeechSupported) {
        window.speechSynthesis.cancel();
      }
    } else {
      startPlayback(language);
    }
  };

  const handleSaveVerse = async () => {
    if (!sloka?.id) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setActionError('Please login to save this verse.');
      setTimeout(() => setActionError(''), 2500);
      return;
    }

    try {
      setBookmarkLoading(true);
      setActionError('');
      setActionMessage('');

      const response = await axios.post(
        `${API_BASE_URL}/api/auth/bookmarks`,
        { slokaId: sloka.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const removed = String(response.data?.message || '').toLowerCase().includes('removed');
      setIsBookmarked(!removed);
      setActionMessage(removed ? 'Verse removed from saved list.' : 'Verse saved successfully.');
      setTimeout(() => setActionMessage(''), 2500);
    } catch (error) {
      setActionError(error.response?.data?.message || 'Failed to save verse.');
      setTimeout(() => setActionError(''), 2500);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleShareVerse = async () => {
    if (!sloka) return;

    const verseTitle = `Bhagavad Gita ${sloka.chapter}:${sloka.verse}`;
    const verseText = `${verseTitle}\n\n${sloka.sanskrit}\n\n${getMeaningByLanguage(sloka, language)}`;

    try {
      setActionError('');
      if (navigator.share) {
        await navigator.share({
          title: verseTitle,
          text: verseText,
          url: window.location.href,
        });
        setActionMessage('Verse shared successfully.');
      } else {
        await navigator.clipboard.writeText(verseText);
        setActionMessage('Verse copied to clipboard.');
      }
      setTimeout(() => setActionMessage(''), 2500);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setActionError('Unable to share right now. Please try again.');
      setTimeout(() => setActionError(''), 2500);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-[#06101E] text-white overflow-hidden">
      {/* Background with overlay handled by App.jsx, adding specific glow */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,215,0,0.14),transparent_30%),radial-gradient(circle_at_bottom,rgba(122,46,46,0.18),transparent_28%)]"></div>

      <div className="relative z-10 max-w-5xl w-full mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-block px-4 py-1 rounded-full border border-devotion-gold/30 bg-devotion-gold/10 backdrop-blur-md mb-6 text-devotion-gold text-[10px] font-black tracking-[0.3em] shadow-[0_0_15px_rgba(255,215,0,0.1)] uppercase">
            Divine Wisdom for Today
          </div>
          <h1 className="text-6xl md:text-8xl font-serif font-black text-devotion-gold drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] tracking-tighter">
            Daily <span className="text-white opacity-90 italic font-light drop-shadow-none tracking-normal">Sloka</span>
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-96 bg-glass-gradient backdrop-blur-3xl rounded-[3rem] border border-devotion-gold/20 shadow-2xl">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-devotion-gold"></div>
          </div>
        ) : sloka && (
          <div className="bg-glass-gradient backdrop-blur-3xl rounded-[3rem] border border-devotion-gold/30 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.4)] transition-all duration-700 hover:border-devotion-gold/60 group">
            
            <div className="flex justify-between items-center bg-devotion-darkBlue/40 px-10 py-6 border-b border-devotion-gold/20">
              <span className="text-devotion-gold font-black tracking-[0.2em] text-xs uppercase">
                CHAPTER {sloka.chapter} • VERSE {sloka.verse}
              </span>
              
              <div className="flex bg-devotion-darkBlue/60 rounded-full p-1 border border-white/10 backdrop-blur-md">
                <button 
                  onClick={() => setLanguage('english')}
                  className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === 'english' ? 'bg-devotion-gold text-devotion-darkBlue shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  English
                </button>
                <button 
                  onClick={() => setLanguage('hindi')}
                  className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === 'hindi' ? 'bg-devotion-gold text-devotion-darkBlue shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Hindi
                </button>
                <button 
                  onClick={() => setLanguage('telugu')}
                  className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === 'telugu' ? 'bg-devotion-gold text-devotion-darkBlue shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  తెలుగు
                </button>
              </div>
            </div>

            <div className="p-10 md:p-20 text-center relative">
              <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none select-none flex items-center justify-center">
                 <img src="/krishna-line-art.svg" alt="" className="w-1/2 h-auto" />
              </div>

              <div className="mb-12 relative z-10">
                <p className="text-3xl md:text-5xl text-white font-serif leading-[1.6] whitespace-pre-line drop-shadow-2xl">
                  {sloka.sanskrit}
                </p>
              </div>
              
              <div className="mt-16 relative z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 text-8xl text-devotion-gold/10 font-serif select-none italic">"</div>
                <p className={`text-xl md:text-3xl text-gray-200 font-light leading-relaxed px-4 italic font-serif ${language === 'telugu' ? 'font-telugu leading-[2]' : ''}`}>
                  {getMeaningByLanguage(sloka, language)}
                </p>
              </div>
            </div>
            
            <div className="bg-devotion-darkBlue/40 px-10 py-8 border-t border-devotion-gold/20 flex flex-wrap justify-center gap-8">
              <button 
                onClick={toggleAudio}
                disabled={!canPlayAudio}
                className={`${canPlayAudio ? 'text-devotion-gold hover:text-white' : 'text-gray-600 cursor-not-allowed'} transition-all flex items-center gap-3 font-black uppercase tracking-[0.2em] text-[10px] transform hover:scale-105`}
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current animate-pulse" /> : <Volume2 className="w-6 h-6" />}
                {isPlaying ? 'STOP CHANTING' : activeAudioUrl ? 'LISTEN CHANT' : 'AUTO NARRATE'}
              </button>
              
              <button
                onClick={handleSaveVerse}
                disabled={bookmarkLoading}
                className="text-gray-400 hover:text-devotion-gold transition-all flex items-center gap-3 font-black uppercase tracking-[0.2em] text-[10px] transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Bookmark className="w-6 h-6" />
                {bookmarkLoading ? 'SAVING...' : isBookmarked ? 'SAVED' : 'SAVE VERSE'}
              </button>
              
              <button
                onClick={handleShareVerse}
                className="text-gray-400 hover:text-devotion-gold transition-all flex items-center gap-3 font-black uppercase tracking-[0.2em] text-[10px] transform hover:scale-105"
              >
                <Share2 className="w-6 h-6" />
                SHARE WISDOM
              </button>
            </div>

            <div className="px-10 pb-3 text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
              {isPlaying
                ? playbackType === 'file'
                  ? 'Playing uploaded audio'
                  : 'Using browser narration'
                : activeAudioUrl
                  ? 'Audio ready for selected language'
                  : 'Browser narration ready for selected language'}
            </div>

            <div className="px-10 pb-6 text-center text-[10px] font-black uppercase tracking-[0.25em] text-devotion-gold/70">
              {getVoiceLabel()}
            </div>

            {(actionMessage || actionError) && (
              <div className={`px-10 pb-8 text-center text-sm font-semibold ${actionError ? 'text-red-300' : 'text-devotion-gold'}`}>
                {actionError || actionMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Card */}
      {!loading && sloka && (
        <div className="mt-12 max-w-4xl w-full bg-glass-gradient backdrop-blur-2xl rounded-3xl p-8 border border-white/5 flex items-start gap-6 animate-fade-in-up shadow-2xl">
           <div className="bg-devotion-gold/10 p-4 rounded-2xl border border-devotion-gold/20"><Info className="text-devotion-gold w-8 h-8" /></div>
           <div>
              <h4 className="text-devotion-gold font-black uppercase tracking-widest text-xs mb-2">Devotional Tip</h4>
              <p className="text-gray-300 text-lg font-light leading-relaxed">Contemplating on a single verse throughout the day brings deep inner peace. Try to memorize this sloka to carry Krishna's wisdom with you always.</p>
           </div>
        </div>
      )}
    </div>
  );
}
