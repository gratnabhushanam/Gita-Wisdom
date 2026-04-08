import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { Play, Star, Award, BookOpen, X, Sparkles } from 'lucide-react';
import MediaPlayer from '../components/MediaPlayer';

const KRISHNA_MODAL_BACKGROUNDS = [
  '/scene-krishna.svg',
  '/krishna-line-art.svg',
  '/krishna-symbol.svg',
];

export default function KidsMode() {
  const location = useLocation();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [modalBgIndex, setModalBgIndex] = useState(0);
  const consumedOpenVideoIdRef = useRef(null);

  useEffect(() => {
    const fetchKidsVideos = async () => {
      try {
        const response = await axios.get('/api/videos/kids');
        setVideos(response.data);
      } catch (error) {
        console.error('Error fetching kids videos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchKidsVideos();
  }, []);

  useEffect(() => {
    const openVideoId = location.state?.openVideoId;
    if (!openVideoId || videos.length === 0 || selectedVideo) return;
    if (consumedOpenVideoIdRef.current === String(openVideoId)) return;

    const matchedVideo = videos.find((video) => String(video._id || video.id) === String(openVideoId));
    if (matchedVideo) {
      consumedOpenVideoIdRef.current = String(openVideoId);
      setSelectedVideo(matchedVideo);
    }
  }, [location.state, videos, selectedVideo]);

  useEffect(() => {
    if (!selectedVideo) {
      setModalBgIndex(0);
      return undefined;
    }

    const interval = setInterval(() => {
      setModalBgIndex((prev) => (prev + 1) % KRISHNA_MODAL_BACKGROUNDS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedVideo]);

  const colors = [
    'from-[#2D0808] to-[#4A1515] border-devotion-gold/40',
    'from-[#09182F] to-[#102B50] border-devotion-gold/30',
    'from-[#32131F] to-[#5A1D2B] border-devotion-gold/35',
    'from-[#1D2A16] to-[#31441F] border-devotion-gold/25',
    'from-[#4A2A09] to-[#6B3B10] border-devotion-gold/35',
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#06101E] flex flex-col items-center justify-center text-white">
       <div className="w-20 h-20 rounded-full border-4 border-devotion-gold/30 border-t-devotion-gold animate-spin mb-6"></div>
       <p className="text-devotion-gold font-serif text-2xl italic">Preparing Krishna stories...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#06101E] pt-28 pb-12 px-4 sm:px-6 lg:px-8 text-white overflow-x-hidden relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,215,0,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(122,46,46,0.18),transparent_28%)]"></div>
      
      <div className="relative max-w-4xl mx-auto text-center mb-16 animate-fade-in-up">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-devotion-gold/30 bg-devotion-gold/10 text-devotion-gold text-[10px] font-black tracking-[0.4em] uppercase mb-6">
          <Sparkles className="w-4 h-4" /> Kids Mode
        </div>
        <h1 className="text-6xl md:text-8xl font-serif font-black text-devotion-gold drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] mb-6 uppercase tracking-tight">
          Little Krishna
        </h1>
        <div className="inline-block relative">
           <p className="text-xl md:text-2xl text-gray-300 font-serif italic border-b border-devotion-gold/30 pb-4">
              Gentle stories, songs, and lessons for young hearts.
           </p>
           <div className="absolute -right-12 -top-12 text-5xl opacity-60">ॐ</div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {videos.map((video, index) => (
          <div 
            key={video._id}
            className={`p-8 rounded-[2.5rem] border backdrop-blur-3xl bg-gradient-to-br transition-all duration-500 transform hover:-translate-y-3 cursor-pointer group relative overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${colors[index % colors.length]}`}
            onClick={() => setSelectedVideo(video)}
          >
            <div className="absolute -top-10 -right-10 text-white/10 text-[10rem] group-hover:rotate-12 transition-transform select-none">🕉️</div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-20 h-20 bg-devotion-gold/10 rounded-3xl flex items-center justify-center text-5xl mb-6 border border-devotion-gold/20 group-hover:scale-110 transition-transform rotate-3">
                <Play className="w-10 h-10 text-devotion-gold fill-current ml-1" />
              </div>
              <h3 className="text-3xl font-serif font-black text-white mb-4 leading-tight drop-shadow-md">
                Chapter {video.chapter}: {video.title}
              </h3>
              <p className="text-gray-300 font-light text-lg mb-8 line-clamp-2 leading-relaxed">
                {video.description || "Join Krishna for a fun adventure!"}
              </p>
              
              <div className="mt-auto flex items-center justify-between">
                 <button className="bg-gradient-to-r from-devotion-gold to-[#FFB800] text-devotion-darkBlue px-8 py-3 rounded-full font-black text-sm uppercase tracking-[0.2em] flex items-center gap-3 shadow-[0_10px_30px_rgba(255,215,0,0.18)] group-hover:shadow-[0_14px_34px_rgba(255,215,0,0.24)] transition-all active:translate-y-1">
                   Watch Now <Play className="w-5 h-5 fill-current" />
                 </button>
                 <div className="flex gap-3">
                    <Star className="text-devotion-gold w-8 h-8 fill-current" />
                    <Award className="text-white/50 w-8 h-8 group-hover:text-devotion-gold transition-colors" />
                 </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {videos.length === 0 && (
          <div className="col-span-full bg-glass-gradient backdrop-blur-3xl p-16 rounded-[3rem] border border-devotion-gold/20 text-center shadow-2xl">
             <div className="text-7xl mb-6 opacity-30">🕉️</div>
             <p className="text-3xl font-serif text-devotion-gold mb-4">Stories are being prepared.</p>
             <p className="text-gray-300 text-lg font-light">Check back soon for new Krishna adventures for children.</p>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-10 overflow-hidden">
           {KRISHNA_MODAL_BACKGROUNDS.map((bgImage, index) => (
             <div
               key={bgImage}
               className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${index === modalBgIndex ? 'opacity-100' : 'opacity-0'}`}
               style={{ backgroundImage: `url('${bgImage}')` }}
               aria-hidden="true"
             />
           ))}
           <div className="absolute inset-0 bg-[#06101E]/88 backdrop-blur-md" />
           <div className="bg-[#06101E] w-full max-w-5xl max-h-[95vh] rounded-[3rem] border border-devotion-gold/30 overflow-y-auto p-8 md:p-14 relative animate-fade-in-up shadow-[0_0_120px_rgba(255,215,0,0.12)]">
              
              <button 
                onClick={() => setSelectedVideo(null)}
                className="absolute top-6 right-6 bg-devotion-gold/10 text-devotion-gold w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border border-devotion-gold/20 hover:bg-devotion-gold/20 transition-all hover:-translate-y-1 active:translate-y-1"
              >
                <X />
              </button>

              <div className="flex flex-col items-center text-center mb-12">
                <div className="bg-devotion-gold/10 p-5 rounded-[2rem] mb-6 inline-block rotate-3 border border-devotion-gold/20">
                   <Star className="text-devotion-gold w-14 h-14 fill-current" />
                </div>
                <h2 className="text-4xl md:text-6xl font-serif font-black text-devotion-gold mb-4 uppercase leading-tight drop-shadow-sm">
                  {selectedVideo.title}
                </h2>
                <div className="flex gap-4">
                   <span className="bg-white/5 text-gray-200 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.25em] border border-white/10">
                     Animated Story
                   </span>
                   <span className="bg-devotion-gold/10 text-devotion-gold px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.25em] border border-devotion-gold/20">
                     Chapter {selectedVideo.chapter}
                   </span>
                </div>
              </div>

              {/* Video Player */}
              <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden border border-devotion-gold/20 shadow-2xl mb-12 bg-black">
                <MediaPlayer
                  url={selectedVideo.videoUrl || selectedVideo.youtubeUrl || selectedVideo.url}
                  title={selectedVideo.title}
                  className="w-full h-full object-cover"
                  youtubeParams="autoplay=1&rel=0"
                  autoPlay
                  muted
                  controls
                />
              </div>

              {/* Script/Story Text */}
              {selectedVideo.script && (
                 <div className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 mb-12 relative">
                   <div className="absolute -top-6 -left-6 bg-devotion-gold p-4 rounded-2xl rotate-12 shadow-lg">
                     <BookOpen className="text-devotion-darkBlue w-8 h-8" />
                   </div>
                   <h4 className="text-xl font-black text-devotion-gold uppercase mb-6 tracking-[0.25em]">Read Along</h4>
                   <p className="text-xl md:text-2xl text-gray-200 font-serif leading-relaxed italic">
                      {selectedVideo.script}
                   </p>
                </div>
              )}

              {/* Moral Section */}
                <div className="bg-devotion-maroon/40 p-12 rounded-[2.5rem] border border-devotion-gold/20 text-center relative overflow-hidden group/moral">
                  <div className="absolute top-0 right-0 p-8 text-white/10 text-[10rem] group-hover/moral:scale-110 transition-transform">ॐ</div>
                  <h4 className="text-2xl md:text-3xl font-black text-devotion-gold uppercase mb-4 flex items-center justify-center gap-4 tracking-[0.2em]">
                   <Award className="w-12 h-12" /> Krishna's Big Lesson
                 </h4>
                  <p className="text-3xl md:text-5xl font-serif font-black text-white leading-snug drop-shadow-sm">
                   "{selectedVideo.moral || "Always be brave like Arjuna!"}"
                 </p>
              </div>

              <div className="mt-16 flex flex-col sm:flex-row justify-center gap-8">
                  <Link
                    to="/quiz"
                    className="bg-devotion-gold text-devotion-darkBlue px-12 py-5 rounded-[2rem] font-black text-lg uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(255,215,0,0.18)] hover:brightness-110 transform transition-all hover:-translate-y-2 active:translate-y-1 flex items-center justify-center gap-4"
                  >
                   Play Quiz <Star className="w-8 h-8" />
                 </Link>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
