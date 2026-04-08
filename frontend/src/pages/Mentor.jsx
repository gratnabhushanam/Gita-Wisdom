import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Target, AlertTriangle, MessageSquarePlus, Wind, Zap, PlayCircle, BookOpen, X, Bookmark, Volume2, Pause, ChevronRight, FileText, Film } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import MediaPlayer from '../components/MediaPlayer';

export default function Mentor() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  const API_ORIGIN = API_BASE_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8888` : 'http://localhost:8888');
  const HISTORY_KEY = 'mentor_history_v1';
  const SAVED_VERSES_KEY = 'mentor_saved_verses_v1';
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState(null);
  const [relatedContent, setRelatedContent] = useState({ slokas: [], stories: [], videos: [] });
  const [mentorHistory, setMentorHistory] = useState([]);
  const [showVideo, setShowVideo] = useState(false);
  const [language, setLanguage] = useState('english');
  const [voiceCharacter, setVoiceCharacter] = useState('krishna');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);
  const [playbackType, setPlaybackType] = useState(null);
  const [voices, setVoices] = useState([]);
  const [savedVerses, setSavedVerses] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const location = useLocation();

  const problems = [
    { id: 'stress', name: 'Stress', icon: <Wind className="w-8 h-8" />, color: 'from-blue-500 to-cyan-400' },
    { id: 'fear', name: 'Fear', icon: <AlertTriangle className="w-8 h-8" />, color: 'from-orange-500 to-red-400' },
    { id: 'anger', name: 'Anger', icon: <Target className="w-8 h-8" />, color: 'from-red-600 to-rose-400' },
    { id: 'confusion', name: 'Confusion', icon: <MessageSquarePlus className="w-8 h-8" />, color: 'from-purple-500 to-indigo-400' },
    { id: 'motivation', name: 'Motivation', icon: <Zap className="w-8 h-8" />, color: 'from-[#FFD700] to-[#FF9F1C]' },
  ];

  const hasValidSloka = (payload) => Boolean(payload && typeof payload.sanskrit === 'string' && payload.sanskrit.trim().length > 0);

  const loadMentorHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/slokas/mentor/history`);
      const apiItems = response.data && Array.isArray(response.data.items) ? response.data.items : [];
      if (apiItems.length) {
        setMentorHistory(apiItems);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(apiItems));
        return;
      }
    } catch (error) {
      console.error('Failed to load API mentor history, using local cache:', error);
    }

    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setMentorHistory(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Failed to load mentor history:', error);
      setMentorHistory([]);
    }
  };

  const saveMentorHistory = async (entry) => {
    try {
      await axios.post(`${API_BASE_URL}/api/slokas/mentor/history`, entry);
    } catch (error) {
      console.error('Failed to save mentor history to API, using local cache:', error);
    }

    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const base = Array.isArray(parsed) ? parsed : [];
      const deduped = base.filter((item) => !(item.problem === entry.problem && item.sanskrit === entry.sanskrit));
      const next = [entry, ...deduped].slice(0, 40);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setMentorHistory(next);
    } catch (error) {
      console.error('Failed to save mentor history:', error);
    }
  };

  useEffect(() => {
    loadMentorHistory();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_VERSES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedVerses(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error('Failed to load saved mentor verses:', error);
      setSavedVerses([]);
    }
  }, []);

  useEffect(() => {
    const savedVerse = location.state && location.state.savedVerse;
    if (!savedVerse || !hasValidSloka(savedVerse)) return;

    setSolution({
      ...savedVerse,
      localizedMeaning: {
        english: savedVerse.englishMeaning || '',
        hindi: savedVerse.hindiMeaning || savedVerse.englishMeaning || '',
        telugu: savedVerse.teluguMeaning || savedVerse.englishMeaning || '',
      },
      mentorTitle: savedVerse.mentorTitle || 'Saved Guidance',
      mentorTip: savedVerse.mentorTip || 'Reflect on this saved verse and apply it calmly.',
      mentorPractice: savedVerse.mentorPractice || 'Practice this wisdom once today in real life.',
    });

    if (savedVerse.problem) {
      setSelectedProblem(savedVerse.problem);
    }

    setLoading(false);
    setSaveStatus('Loaded saved verse');
    window.setTimeout(() => setSaveStatus(''), 2000);
  }, [location.state]);

  const fetchSolution = async (problemId) => {
    setSelectedProblem(problemId);
    setLoading(true);
    setShowVideo(false);
    setIsPlaying(false);
    setAudio(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/slokas/mentor?problem=${problemId}`);
      if (hasValidSloka(response.data)) {
        setSolution(response.data);
        await saveMentorHistory({
          problem: problemId,
          sanskrit: response.data.sanskrit,
          englishMeaning: response.data.englishMeaning || (response.data.localizedMeaning && response.data.localizedMeaning.english) || '',
          mentorTitle: response.data.mentorTitle || '',
          viewedAt: new Date().toISOString(),
        });
      } else {
        setSolution(null);
      }
    } catch (error) {
      console.error('Error fetching mentor sloka:', error);
      setSolution(null);
    }
    
    try {
      const contentResponse = await axios.get(`${API_BASE_URL}/api/slokas/mentor/content?problem=${problemId}`);
      setRelatedContent({
        slokas: contentResponse.data.slokas || [],
        stories: contentResponse.data.stories || [],
        videos: contentResponse.data.videos || [],
      });
    } catch (contentError) {
      console.error('Error fetching related content:', contentError);
      setRelatedContent({ slokas: [], stories: [], videos: [] });
    } finally {
      setLoading(false);
    }
  };

  const getMeaningByLanguage = (currentSolution, selectedLanguage) => {
    if (!currentSolution) return '';
    const localized = currentSolution.localizedMeaning || {};
    if (selectedLanguage === 'telugu') {
      return localized.telugu || currentSolution.teluguMeaning || currentSolution.englishMeaning || '';
    }
    if (selectedLanguage === 'hindi') {
      return localized.hindi || currentSolution.hindiMeaning || currentSolution.englishMeaning || '';
    }
    return localized.english || currentSolution.englishMeaning || currentSolution.teluguMeaning || '';
  };

  const getAudioByLanguage = (currentSolution, selectedLanguage) => {
    if (!currentSolution) return '';
    const audioByLanguage = currentSolution.audioByLanguage || {};
    return audioByLanguage[selectedLanguage] || currentSolution.audioUrl || '';
  };

  const resolveAudioUrl = (rawUrl) => {
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
    return value;
  };

  const activeAudioUrl = resolveAudioUrl(getAudioByLanguage(solution, language));
  const canPlayAudio = Boolean(activeAudioUrl) || (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined');

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

  const getSpeechText = (currentSolution, selectedLanguage) => {
    if (!currentSolution) return '';
    const meaning = getMeaningByLanguage(currentSolution, selectedLanguage);
    return `${currentSolution.sanskrit}\n\n${meaning}`.trim();
  };

  const getSpeechVoice = (selectedLanguage) => {
    const voiceLanguageHints = {
      english: ['en-us', 'en-gb', 'en-in'],
      hindi: ['hi-in', 'hi'],
      telugu: ['te-in', 'te'],
    };
    const hints = voiceLanguageHints[selectedLanguage] || voiceLanguageHints.english;

    for (const hint of hints) {
      const byLang = voices.find((voice) => String(voice.lang || '').toLowerCase().startsWith(hint));
      if (byLang) return byLang;

      const byName = voices.find((voice) => String(voice.name || '').toLowerCase().includes(hint.replace('-', '')));
      if (byName) return byName;
    }

    return voices.find((voice) => voice.default) || voices[0] || null;
  };

  const getVoiceByCharacter = (selectedLanguage) => {
    // Get language-matching voices
    const langHint = selectedLanguage === 'hindi' ? 'hi' : selectedLanguage === 'telugu' ? 'te' : 'en';
    const langVoices = voices.filter((voice) => String(voice.lang || '').toLowerCase().startsWith(langHint));

    if (langVoices.length === 0) {
      return voices.find((voice) => voice.default) || voices[0] || null;
    }

    // Select voice based on character (prefer different voice for each character)
    const voiceIndex = ['ram', 'krishna', 'hanuman', 'arjuna'].indexOf(voiceCharacter);
    const selectedVoiceIndex = Math.min(voiceIndex >= 0 ? voiceIndex : 0, langVoices.length - 1);
    
    return langVoices[selectedVoiceIndex] || langVoices[0] || null;
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
    stopPlayback();

    const currentAudioUrl = resolveAudioUrl(getAudioByLanguage(solution, selectedLanguage));
    if (currentAudioUrl) {
      const newAudio = new Audio(currentAudioUrl);
      setAudio(newAudio);
      setPlaybackType('file');
      setIsPlaying(true);

      newAudio.play().catch((e) => {
        console.error('Audio playback failed, falling back to speech synthesis:', e);
        setAudio(null);
        setIsPlaying(false);
        setPlaybackType(null);
        const speechText = getSpeechText(solution, selectedLanguage);
        if (!speechText || !isSpeechSupported) {
          return;
        }
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = getSpeechLang(selectedLanguage);
        const selectedVoice = getVoiceByCharacter(selectedLanguage);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        const characterVoiceTraits = {
          ram: { pitch: 0.95, rate: 0.9 },
          krishna: { pitch: 0.9, rate: 0.85 },
          hanuman: { pitch: 1.0, rate: 0.92 },
          arjuna: { pitch: 0.98, rate: 0.88 },
        };
        const traits = characterVoiceTraits[voiceCharacter] || characterVoiceTraits.krishna;
        utterance.pitch = traits.pitch;
        utterance.rate = traits.rate;
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
      });

      newAudio.onended = () => {
        setIsPlaying(false);
        setPlaybackType(null);
      };

      newAudio.onerror = () => {
        const speechText = getSpeechText(solution, selectedLanguage);
        if (!speechText || !isSpeechSupported) {
          setIsPlaying(false);
          setPlaybackType(null);
          setSaveStatus('Audio unavailable for this verse on this browser');
          window.setTimeout(() => setSaveStatus(''), 2000);
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = getSpeechLang(selectedLanguage);
        const selectedVoice = getVoiceByCharacter(selectedLanguage);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        const characterVoiceTraits = {
          ram: { pitch: 0.95, rate: 0.9 },
          krishna: { pitch: 0.9, rate: 0.85 },
          hanuman: { pitch: 1.0, rate: 0.92 },
          arjuna: { pitch: 0.98, rate: 0.88 },
        };
        const traits = characterVoiceTraits[voiceCharacter] || characterVoiceTraits.krishna;
        utterance.pitch = traits.pitch;
        utterance.rate = traits.rate;
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

      return;
    }

    if (!isSpeechSupported) {
      setSaveStatus('Audio unavailable for this verse on this browser');
      window.setTimeout(() => setSaveStatus(''), 2000);
      return;
    }

    const speechText = getSpeechText(solution, selectedLanguage);
    if (!speechText) {
      setSaveStatus('Audio unavailable for this verse on this browser');
      window.setTimeout(() => setSaveStatus(''), 2000);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = getSpeechLang(selectedLanguage);
    const selectedVoice = getVoiceByCharacter(selectedLanguage);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Apply voice character traits
    const characterVoiceTraits = {
      ram: { pitch: 0.95, rate: 0.9 },
      krishna: { pitch: 0.9, rate: 0.85 },
      hanuman: { pitch: 1.0, rate: 0.92 },
      arjuna: { pitch: 0.98, rate: 0.88 },
    };
    const traits = characterVoiceTraits[voiceCharacter] || characterVoiceTraits.krishna;
    utterance.pitch = traits.pitch;
    utterance.rate = traits.rate;
    
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
    return () => {
      if (isSpeechSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!isPlaying || !solution) return;
    stopPlayback();
    startPlayback(language);
  }, [language, voiceCharacter]);

  const toggleAudio = () => {
    if (isPlaying) {
      stopPlayback();
      if (isSpeechSupported) {
        window.speechSynthesis.cancel();
      }
      return;
    }
    startPlayback(language);
  };

  const getVerseKey = (item) => `${item.chapter || '0'}:${item.verse || '0'}:${String(item.sanskrit || '').trim()}`;

  const isCurrentVerseSaved = Boolean(
    solution && savedVerses.some((item) => item.verseKey === getVerseKey(solution))
  );

  const handleToggleSaveVerse = () => {
    if (!solution) return;

    const verseKey = getVerseKey(solution);
    const exists = savedVerses.some((item) => item.verseKey === verseKey);
    const entry = {
      verseKey,
      problem: selectedProblem || solution.problem || '',
      chapter: solution.chapter || null,
      verse: solution.verse || null,
      sanskrit: solution.sanskrit || '',
      englishMeaning: solution.englishMeaning || (solution.localizedMeaning && solution.localizedMeaning.english) || '',
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

  return (
    <div className="min-h-screen pt-28 pb-12 px-4 sm:px-6 lg:px-8 relative bg-[#06101E] text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,215,0,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(122,46,46,0.2),transparent_30%)]"></div>
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-14 animate-fade-in-up">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-devotion-gold/30 bg-devotion-gold/10 text-devotion-gold text-[10px] font-black tracking-[0.4em] uppercase mb-6">
            Divine Guidance
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-black text-devotion-gold drop-shadow-2xl mb-4 tracking-tight uppercase">
            Gita Mentor
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-light font-serif italic max-w-2xl mx-auto">Seeking guidance in Lord Krishna's eternal words.</p>
        </div>

        {/* Problem Selection */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-16">
          {problems.map(problem => (
            <button
              key={problem.id}
              onClick={() => fetchSolution(problem.id)}
              className={`flex flex-col items-center justify-center p-6 md:p-8 rounded-[2rem] transition-all duration-500 transform active:scale-95 border ${selectedProblem === problem.id ? 'bg-gradient-to-br ' + problem.color + ' text-white scale-[1.03] shadow-[0_0_40px_rgba(255,215,0,0.18)] border-white/30' : 'bg-glass-gradient backdrop-blur-3xl text-gray-300 hover:text-devotion-gold border-white/5 hover:border-devotion-gold/40 shadow-xl'}`}
            >
              <div className={`mb-4 transition-all duration-500 ${selectedProblem === problem.id ? 'text-white scale-125' : 'text-devotion-gold'}`}>
                {problem.icon}
              </div>
              <span className="font-black text-[10px] uppercase tracking-[0.2em]">{problem.name}</span>
            </button>
          ))}
        </div>

        {/* Solution Area */}
        {loading ? (
          <div className="flex justify-center items-center h-80">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-devotion-gold shadow-[0_0_20px_rgba(255,215,0,0.4)]"></div>
          </div>
        ) : solution ? (
          <div className="bg-glass-gradient backdrop-blur-3xl rounded-[3rem] p-8 md:p-16 border border-devotion-gold/30 shadow-[0_0_100px_rgba(0,0,0,0.4)] animate-fade-in-up relative overflow-hidden group">
            <div className="absolute top-0 right-0 opacity-5 text-[15rem] -rotate-12 translate-x-20 translate-y-20 select-none pointer-events-none group-hover:rotate-0 transition-transform duration-1000">🕉️</div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-10">
                <div className="h-px flex-grow bg-gradient-to-r from-transparent to-devotion-gold/40"></div>
                <h3 className="text-devotion-gold font-black tracking-[0.4em] uppercase text-xs">Divine Guidance</h3>
                <div className="h-px flex-grow bg-gradient-to-l from-transparent to-devotion-gold/40"></div>
              </div>

              <div className="mb-10 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-devotion-gold mb-2">Focus</p>
                  <p className="text-white text-lg font-serif">{solution.mentorTitle || 'Seek guidance with patience'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-devotion-gold mb-2">Guidance</p>
                  <p className="text-gray-200 text-sm leading-relaxed">{solution.mentorTip || 'Return to the verse and keep practicing.'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-devotion-gold mb-2">Practice</p>
                  <p className="text-gray-200 text-sm leading-relaxed">{solution.mentorPractice || 'Read the verse morning and night.'}</p>
                </div>
              </div>
              
              <p className="text-3xl md:text-5xl font-serif text-white leading-relaxed mb-12 italic text-center drop-shadow-lg">
                {solution.sanskrit && solution.sanskrit.split('\n').map((line, i) => <span key={i} className="block mb-2">{line}</span>)}
              </p>

              <div className="grid md:grid-cols-3 gap-8 mt-12">
                <div className="bg-devotion-darkBlue/40 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-blue-500/40 transition-colors group/box shadow-2xl">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover/box:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                  </div>
                  <h4 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Meaning</h4>
                  <div className="mb-4 flex bg-devotion-darkBlue/60 rounded-full p-1 border border-white/10 backdrop-blur-md w-fit">
                    <button
                      onClick={() => setLanguage('english')}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === 'english' ? 'bg-devotion-gold text-devotion-darkBlue shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage('hindi')}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === 'hindi' ? 'bg-devotion-gold text-devotion-darkBlue shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                      Hindi
                    </button>
                    <button
                      onClick={() => setLanguage('telugu')}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === 'telugu' ? 'bg-devotion-gold text-devotion-darkBlue shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                      తెలుగు
                    </button>
                  </div>
                  <p className={`text-white text-lg font-medium leading-relaxed ${language === 'telugu' ? 'font-telugu text-xl' : ''}`}>
                    {getMeaningByLanguage(solution, language)}
                  </p>
                </div>

                <div className="bg-devotion-darkBlue/40 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-green-500/40 transition-colors group/box shadow-2xl">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 border border-green-500/20 group-hover/box:scale-110 transition-transform">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <h4 className="text-green-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Modern Insight</h4>
                  <p className="text-white text-lg font-light leading-relaxed">{solution.simpleExplanation}</p>
                </div>

                <div className="bg-devotion-darkBlue/40 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:border-devotion-gold/40 transition-colors group/box shadow-2xl">
                  <div className="w-10 h-10 bg-devotion-gold/10 rounded-xl flex items-center justify-center mb-6 border border-devotion-gold/20 group-hover/box:scale-110 transition-transform">
                    <Target className="w-5 h-5 text-devotion-gold" />
                  </div>
                  <h4 className="text-devotion-gold text-[10px] font-black uppercase tracking-[0.2em] mb-4">Application</h4>
                  <p className="text-white text-lg font-light leading-relaxed">{solution.realLifeExample}</p>
                </div>
              </div>

              <div className="mt-16 pt-10 border-t border-white/10 flex flex-col lg:flex-row gap-6 justify-between items-center">
                <div className="flex flex-wrap gap-3">
                  {solution.tags && solution.tags.map(tag => (
                    <span key={tag} className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-1 rounded-full uppercase text-[9px] font-black tracking-widest text-gray-400">#{tag}</span>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleAudio}
                      disabled={!canPlayAudio}
                      className={`${canPlayAudio ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'} flex items-center gap-3 px-8 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest`}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      {isPlaying ? 'Stop Chant' : activeAudioUrl ? 'Listen Chant' : 'Auto Narrate'}
                    </button>
                    
                    {/* Voice Character Selector */}
                    <select
                      value={voiceCharacter}
                      onChange={(e) => setVoiceCharacter(e.target.value)}
                      className="px-4 py-4 rounded-2xl bg-devotion-darkBlue/60 border border-devotion-gold/30 text-white font-black text-xs uppercase tracking-widest hover:border-devotion-gold/60 transition-all focus:outline-none focus:border-devotion-gold"
                    >
                      <option value="krishna">🔵 Krishna Voice</option>
                      <option value="ram">🌟 Ram Voice</option>
                      <option value="hanuman">🐵 Hanuman Voice</option>
                      <option value="arjuna">⚔️ Arjuna Voice</option>
                    </select>
                  </div>
                  <button
                    onClick={handleToggleSaveVerse}
                    className={`flex items-center gap-3 border px-8 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${isCurrentVerseSaved ? 'bg-devotion-gold/20 border-devotion-gold/50 text-devotion-gold' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'}`}
                  >
                    <Bookmark className="w-5 h-5 text-devotion-gold" /> {isCurrentVerseSaved ? 'Saved Verse' : 'Save Verse'}
                  </button>
                  <button 
                    onClick={() => setShowVideo(true)}
                    disabled={!solution.recommendedVideo}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest shadow-2xl ${solution.recommendedVideo ? 'bg-gradient-to-r from-devotion-gold to-[#FF9F1C] text-devotion-darkBlue hover:scale-105 shadow-[0_10px_30px_rgba(255,215,0,0.2)]' : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'}`}
                  >
                    <PlayCircle className="w-6 h-6" fill="currentColor" /> Recommended Video
                  </button>
                </div>
              </div>

              {saveStatus && (
                <p className="mt-4 text-center text-xs font-black uppercase tracking-widest text-devotion-gold">
                  {saveStatus}
                </p>
              )}

              {isPlaying && playbackType && (
                <p className={`mt-2 text-center text-[10px] font-black uppercase tracking-widest ${playbackType === 'file' ? 'text-devotion-gold' : 'text-sky-300'}`}>
                  Audio Source: {playbackType === 'file' ? 'File Audio' : 'Divine Narration'}
                </p>
              )}
            </div>

            {/* Video Modal */}
            {showVideo && solution.recommendedVideo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                <div className="relative w-full max-w-4xl aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
                  <button 
                    onClick={() => setShowVideo(false)}
                    className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <MediaPlayer
                    url={solution.recommendedVideo.videoUrl || solution.recommendedVideo.youtubeUrl || solution.recommendedVideo.url}
                    title={solution.recommendedVideo.title}
                    className="w-full h-full object-cover bg-black"
                    youtubeParams="autoplay=1&rel=0&modestbranding=1"
                    autoPlay
                    controls
                  />
                </div>
              </div>
            )}

            {/* Related Verses */}
            {relatedContent.slokas && relatedContent.slokas.length > 0 && (
              <div className="mt-16 pt-12 border-t border-white/10">
                <h3 className="text-3xl font-serif font-black text-devotion-gold mb-6 tracking-tight uppercase">Related Verses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedContent.slokas.map((sloka) => (
                    <div
                      key={sloka.id}
                      onClick={() => {
                        setSolution(sloka);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="bg-devotion-darkBlue/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 hover:border-devotion-gold/40 transition-all cursor-pointer hover:scale-105 group shadow-xl"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-devotion-gold mb-3 opacity-70 group-hover:opacity-100">
                        {sloka.chapter && sloka.verse ? `Ch ${sloka.chapter}: V ${sloka.verse}` : 'Sacred Verse'}
                      </p>
                      <p className="text-sm font-serif text-white mb-4 line-clamp-3 italic">{sloka.sanskrit}</p>
                      <p className="text-xs text-gray-400 mb-4 line-clamp-2">{getMeaningByLanguage(sloka, language)}</p>
                      <div className="flex items-center text-devotion-gold text-xs font-black uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                        View <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Stories */}
            {relatedContent.stories && relatedContent.stories.length > 0 && (
              <div className="mt-12">
                <h3 className="text-3xl font-serif font-black text-devotion-gold mb-6 tracking-tight uppercase flex items-center gap-3">
                  <FileText className="w-8 h-8" />Related Stories
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {relatedContent.stories.map((story) => (
                    <div key={story.id} className="bg-devotion-darkBlue/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 hover:border-devotion-gold/40 transition-all cursor-pointer hover:scale-105 group shadow-xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-3">Story</p>
                      <h4 className="text-lg font-serif font-black text-white mb-3 line-clamp-2">{story.title}</h4>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{story.summary || story.description}</p>
                      <div className="flex items-center text-devotion-gold text-xs font-black uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                        Read <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Videos */}
            {relatedContent.videos && relatedContent.videos.length > 0 && (
              <div className="mt-12">
                <h3 className="text-3xl font-serif font-black text-devotion-gold mb-6 tracking-tight uppercase flex items-center gap-3">
                  <Film className="w-8 h-8" />Related Videos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {relatedContent.videos.map((video) => (
                    <div key={video.id} className="bg-devotion-darkBlue/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 hover:border-devotion-gold/40 transition-all cursor-pointer hover:scale-105 group shadow-xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-400 mb-3">Video</p>
                      <h4 className="text-lg font-serif font-black text-white mb-3 line-clamp-2">{video.title}</h4>
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{video.description}</p>
                      <div className="flex items-center text-devotion-gold text-xs font-black uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                        Watch <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mentorHistory.length > 1 && (
              <div className="mt-12 pt-8 border-t border-white/10">
                <h3 className="text-2xl font-serif font-black text-devotion-gold mb-6 tracking-tight uppercase">Previous Mentor Guidance</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {mentorHistory.slice(1, 9).map((item, index) => (
                    <div key={`${item.problem}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-devotion-gold mb-2">{item.problem}</p>
                      <p className="text-sm text-white line-clamp-2 italic mb-2">{item.sanskrit}</p>
                      <p className="text-xs text-gray-300 line-clamp-2">{item.englishMeaning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-white/10 rounded-3xl backdrop-blur-sm bg-white/5">
            <p className="text-gray-400 font-serif italic text-lg">Select a problem above to seek divine guidance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
