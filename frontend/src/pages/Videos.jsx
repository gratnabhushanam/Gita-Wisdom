import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import MediaPlayer from '../components/MediaPlayer';
import VideoCard from '../components/VideoCard';

export default function Videos() {
  const location = useLocation();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState('all');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { data } = await axios.get('/api/videos');
        setVideos(data);
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  useEffect(() => {
    const openVideoId = location.state?.openVideoId;
    if (!openVideoId || videos.length === 0 || activeVideo) return;

    const matchedVideo = videos.find((video) => String(video._id || video.id) === String(openVideoId));
    if (matchedVideo) {
      setActiveVideo(matchedVideo);
    }
  }, [location.state, videos, activeVideo]);

  const closeVideo = () => setActiveVideo(null);

  const collections = ['all', ...Array.from(new Set(videos.map((item) => String(item.collectionTitle || 'Bhagavad Gita').trim()).filter(Boolean)))];
  const filteredVideos = selectedCollection === 'all'
    ? videos
    : videos.filter((item) => String(item.collectionTitle || 'Bhagavad Gita').trim() === selectedCollection);

  return (
    <div className="min-h-screen bg-[#06101E] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-4 cursor-default">
            Divine Discourses
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">Watch insightful explanations and stories from the Bhagavad Gita by realized souls.</p>
        </div>

        {loading ? (
          <div className="flex justify-center flex-col items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mb-4"></div>
            <p className="text-yellow-500 animate-pulse">Loading Devotional Videos...</p>
          </div>
        ) : (
          <>
          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            {collections.map((collection) => (
              <button
                key={collection}
                type="button"
                onClick={() => setSelectedCollection(collection)}
                className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${selectedCollection === collection ? 'bg-devotion-gold/20 border-devotion-gold/50 text-devotion-gold' : 'bg-white/5 border-white/15 text-gray-300 hover:border-devotion-gold/40 hover:text-white'}`}
              >
                {collection === 'all' ? 'All Collections' : collection}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVideos.map(video => (
              <button
                key={video._id}
                type="button"
                onClick={() => setActiveVideo(video)}
                className="text-left"
              >
                <VideoCard 
                  title={`${video.title}${video.collectionTitle ? ` • ${video.collectionTitle}` : ''}`}
                  url={video.url}
                  description={video.description}
                />
              </button>
            ))}
          </div>
          </>
        )}
      </div>

      {activeVideo && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-md p-4 sm:p-6">
          <div className="my-6 w-full max-w-4xl rounded-[2rem] border border-white/10 bg-[#0B1F3A] p-6 sm:p-8 shadow-[0_30px_100px_rgba(0,0,0,0.55)] max-h-[92vh] overflow-y-auto">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-devotion-gold/70">video</p>
                <h2 className="mt-2 text-3xl font-serif font-bold text-white">{activeVideo.title}</h2>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-devotion-gold/80">{activeVideo.collectionTitle || 'Bhagavad Gita'}</p>
              </div>
              <button
                type="button"
                onClick={closeVideo}
                className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/70 hover:text-white hover:border-white/25"
              >
                Close
              </button>
            </div>

            <div className="space-y-5">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                <MediaPlayer
                  url={activeVideo.videoUrl || activeVideo.url}
                  title={activeVideo.title}
                  className="w-full aspect-video"
                  youtubeParams="autoplay=1&rel=0&modestbranding=1"
                  controls
                  autoPlay
                />
              </div>
              <p className="text-sm leading-7 text-white/80">{activeVideo.description || 'No description available.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
