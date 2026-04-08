import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, Book, Video, BookOpen, ExternalLink, Film } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const RECENT_SEARCHES_KEY = 'gita_recent_searches';
const MAX_RECENT_SEARCHES = 8;

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ slokas: [], stories: [], videos: [], movies: [] });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    try {
      const savedSearches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      setRecentSearches(Array.isArray(savedSearches) ? savedSearches : []);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const normalizedQuery = query.trim();
      const searchUrl = normalizedQuery
        ? `${API_BASE_URL}/api/search?q=${encodeURIComponent(normalizedQuery)}`
        : `${API_BASE_URL}/api/search`;
      const response = await axios.get(searchUrl);
      setResults({
        slokas: Array.isArray(response.data?.slokas) ? response.data.slokas : [],
        stories: Array.isArray(response.data?.stories) ? response.data.stories : [],
        videos: Array.isArray(response.data?.videos) ? response.data.videos : [],
        movies: Array.isArray(response.data?.movies) ? response.data.movies : [],
      });

      if (normalizedQuery) {
        const updatedRecentSearches = [
          normalizedQuery,
          ...recentSearches.filter((item) => item.toLowerCase() !== normalizedQuery.toLowerCase()),
        ].slice(0, MAX_RECENT_SEARCHES);

        setRecentSearches(updatedRecentSearches);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedRecentSearches));
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults({ slokas: [], stories: [], videos: [], movies: [] });
    } finally {
      setLoading(false);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const ResultCard = ({ item, type, onOpen }) => {
    const icon = type === 'sloka'
      ? <BookOpen className="text-devotion-gold" />
      : type === 'story'
        ? <Book className="text-blue-400" />
        : type === 'video'
          ? <Video className="text-red-400" />
          : <Film className="text-yellow-300" />;
    
    return (
      <button
        type="button"
        onClick={onOpen}
        className="text-left w-full bg-glass-gradient backdrop-blur-md p-6 rounded-2xl border border-white/10 hover:border-devotion-gold/50 transition-all group shadow-lg"
      >
         <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
               <span className="text-[10px] uppercase font-black tracking-widest text-gray-500">{type}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-devotion-gold" />
         </div>
         <h4 className="text-xl font-bold text-white mb-2 group-hover:text-devotion-gold transition-colors">
            {item.title || (item.chapter ? `Chapter ${item.chapter}, Verse ${item.verse}` : 'Gita Wisdom')}
         </h4>
         <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
            {item.englishMeaning || item.summary || item.description || 'Dive into the ancient wisdom of Lord Krishna.'}
         </p>
         {Array.isArray(item.tags) && item.tags.length > 0 && (
           <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.slice(0, 3).map(tag => <span key={tag} className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-gray-500 uppercase tracking-tighter">#{tag}</span>)}
           </div>
         )}
      </button>
    );
  };

  const openResult = (item, type) => {
    if (type === 'story') {
      navigate('/stories', { state: { openStoryId: item._id || item.id } });
      return;
    }

    if (type === 'video') {
      const isKidsContent = Boolean(item?.isKids) || String(item?.category || '').toLowerCase().includes('animated') || String(item?.category || '').toLowerCase().includes('kids');
      if (isKidsContent) {
        navigate('/kids', { state: { openVideoId: item._id || item.id } });
      } else {
        navigate('/videos', { state: { openVideoId: item._id || item.id } });
      }
      return;
    }

    if (type === 'movie') {
      navigate('/movies', { state: { openMovieId: item._id || item.id } });
      return;
    }

    if (type === 'sloka') {
      navigate('/daily-sloka', { state: { savedVerse: item } });
    }
  };

  return (
     <div className="min-h-screen pt-28 pb-12 px-4 relative bg-[#06101E] text-white overflow-hidden">
       <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,215,0,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(122,46,46,0.2),transparent_28%)]"></div>
       <div className="max-w-6xl mx-auto relative z-10">
          
          {/* Search Header */}
          <div className="relative mb-12">
             <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <SearchIcon className="w-6 h-6 text-devotion-gold" />
             </div>
             <input 
               type="text" 
               className="w-full bg-white/5 backdrop-blur-md border-2 border-devotion-gold/30 rounded-3xl py-6 pl-16 pr-6 text-2xl font-light text-white placeholder:text-gray-500 focus:border-devotion-gold focus:outline-none transition-all shadow-2xl"
               placeholder="Search stress, anger, motivation..."
               value={query}
               onChange={(e) => setQuery(e.target.value)}
             />
             {query && (
               <button 
                 onClick={() => setQuery('')}
                 className="absolute inset-y-0 right-6 flex items-center text-gray-500 hover:text-white"
               >
                 <X className="w-6 h-6" />
               </button>
             )}
          </div>

          {/* Results Area */}
           {loading ? (
             <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-devotion-gold"></div>
             </div>
          ) : (results.slokas.length > 0 || results.stories.length > 0 || results.videos.length > 0 || results.movies.length > 0) ? (
            <div className="space-y-12 animate-fade-in-up">
               {results.slokas.length > 0 && (
                 <section>
                    <h3 className="text-devotion-gold font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-4">
                       <span className="w-8 h-px bg-devotion-gold/30"></span> Slokas ({results.slokas.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {results.slokas.map(s => <ResultCard key={s._id} item={s} type="sloka" onOpen={() => openResult(s, 'sloka')} />)}
                    </div>
                 </section>
               )}

               {results.stories.length > 0 && (
                 <section>
                      <h3 className="text-devotion-textYellow font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-4">
                        <span className="w-8 h-px bg-devotion-textYellow/30"></span> Stories ({results.stories.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {results.stories.map(s => <ResultCard key={s._id} item={s} type="story" onOpen={() => openResult(s, 'story')} />)}
                    </div>
                 </section>
               )}

                {results.videos.length > 0 && (
                 <section>
                      <h3 className="text-rose-300 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-4">
                        <span className="w-8 h-px bg-rose-300/30"></span> Videos ({results.videos.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {results.videos.map(v => <ResultCard key={v._id} item={v} type="video" onOpen={() => openResult(v, 'video')} />)}
                    </div>
                 </section>
               )}

                {results.movies.length > 0 && (
                  <section>
                     <h3 className="text-yellow-300 font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-4">
                      <span className="w-8 h-px bg-yellow-300/30"></span> Movies ({results.movies.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {results.movies.map(m => <ResultCard key={m._id} item={m} type="movie" onOpen={() => openResult(m, 'movie')} />)}
                    </div>
                  </section>
                )}

                {results.slokas.length === 0 && results.stories.length === 0 && results.videos.length === 0 && results.movies.length === 0 && (
                 <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl">
                    <div className="text-4xl mb-4 opacity-20">🔍</div>
                    <p className="text-gray-500 font-medium">No results found for "{query}"</p>
                 </div>
               )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl text-center px-6">
              <div className="text-4xl mb-4 opacity-20">🔍</div>
              <p className="text-gray-500 font-medium">No uploaded content is available yet.</p>
              <p className="text-gray-600 text-sm mt-2">When slokas, stories, videos, or movies are uploaded, they will appear here automatically.</p>
              {recentSearches.length > 0 && (
                <button
                  onClick={clearRecentSearches}
                  className="mt-6 text-[10px] uppercase tracking-widest font-black text-gray-400 hover:text-white transition-colors"
                >
                  Clear recent searches
                </button>
              )}
            </div>
          )}
       </div>
    </div>
  );
}
