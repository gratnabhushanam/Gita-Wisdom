import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Upload, FileText, Tag, Check, ArrowLeft, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const MAX_REEL_DURATION_SECONDS = 90;

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

export default function UploadReel() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoValidationError, setVideoValidationError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: ''
  });

  useEffect(() => {
    if (!videoFile) {
      setPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(videoFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [videoFile]);

  const handleVideoSelection = async (file) => {
    if (!file) {
      setVideoFile(null);
      setVideoValidationError('');
      return;
    }

    try {
      const duration = await getVideoDuration(file);
      if (!duration || duration > MAX_REEL_DURATION_SECONDS) {
        setVideoFile(null);
        setVideoValidationError(`Video must be ${MAX_REEL_DURATION_SECONDS} seconds or less.`);
        return;
      }

      setVideoFile(file);
      setVideoValidationError('');
    } catch (error) {
      setVideoFile(null);
      setVideoValidationError('Could not validate this file. Please choose another video.');
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const droppedFile = event.dataTransfer?.files?.[0] || null;
    await handleVideoSelection(droppedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      alert('Please select a video file to upload.');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    try {
      const token = localStorage.getItem('token');
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('contentType', 'spiritual');
      payload.append('tags', formData.tags);
      payload.append('video', videoFile);

      const { data } = await axios.post('/api/videos/user-reels', payload, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.min(100, Math.round((event.loaded * 100) / event.total));
          setUploadProgress(percent);
        },
      });
      setStatusMessage(data?.message || 'Uploaded successfully');
      setSuccess(true);
      setTimeout(() => navigate('/reels'), 2000);
    } catch (error) {
      console.error('Error uploading reel:', error);
      alert(error.response?.data?.message || 'Upload failed. Only spiritual content is allowed.');
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 700);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-12 px-4 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-devotion-gold/5 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        
        <Link to="/reels" className="inline-flex items-center gap-2 text-gray-400 hover:text-devotion-gold mb-10 transition-colors group">
           <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back to Reels
        </Link>

        <div className="bg-glass-gradient backdrop-blur-3xl rounded-[3rem] border border-devotion-gold/20 p-10 md:p-16 shadow-2xl relative">
           
           <div className="text-center mb-12">
              <div className="w-20 h-20 bg-devotion-gold/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-devotion-gold/20">
                 <Upload className="text-devotion-gold w-10 h-10" />
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-black text-white mb-4 uppercase tracking-tighter">
                Share <span className="text-devotion-gold">Wisdom</span>
              </h1>
              <p className="text-gray-400 font-serif italic">Spread Lord Krishna's light through your short videos.</p>
           </div>

           {success ? (
             <div className="text-center py-20 animate-fade-in-up">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                   <Check className="text-green-500 w-12 h-12" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Upload Successful!</h2>
                 <p className="text-gray-400">{statusMessage || 'Your reel is uploaded and waiting for admin approval before it appears in public reels.'}</p>
             </div>
           ) : (
             <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-devotion-gold ml-2">
                         <FileText className="w-4 h-4" /> Video Title
                      </label>
                      <input 
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:border-devotion-gold focus:outline-none transition-all"
                        placeholder="e.g. Overcoming Fear with Sloka 2.3"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                   </div>

                   <div className="space-y-4">
                     <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-devotion-gold ml-2">
                       <Upload className="w-4 h-4" /> Video File
                      </label>
                      <div
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragActive(false);
                        }}
                        onDrop={handleDrop}
                        className={`rounded-2xl border-2 border-dashed p-5 transition-all ${dragActive ? 'border-devotion-gold bg-devotion-gold/10' : 'border-white/20 bg-white/5'}`}
                      >
                        <input
                          required
                          type="file"
                          accept="video/*"
                          className="w-full bg-transparent text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-devotion-gold file:px-4 file:py-2 file:text-xs file:font-black file:text-devotion-darkBlue"
                          onChange={(e) => handleVideoSelection(e.target.files?.[0] || null)}
                        />
                        <p className="mt-3 text-xs text-gray-400">Drag and drop your reel here or choose file</p>
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Upload MP4/WEBM/MOV file • Max 90s</p>
                      {videoValidationError && (
                        <p className="text-[11px] text-red-300 font-bold">{videoValidationError}</p>
                      )}
                   </div>
                </div>

                {previewUrl && (
                  <div className="space-y-4">
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-devotion-gold ml-2">
                      <Upload className="w-4 h-4" /> Reel Preview
                    </label>
                    <div className="rounded-2xl overflow-hidden border border-devotion-gold/20 bg-black aspect-[9/16] max-h-[500px] mx-auto max-w-[280px]">
                      <video src={previewUrl} controls className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                   <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-devotion-gold ml-2">
                      <Tag className="w-4 h-4" /> Tags (comma separated)
                   </label>
                   <input 
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:border-devotion-gold focus:outline-none transition-all"
                     placeholder="motivation, fear, student life"
                     value={formData.tags}
                     onChange={(e) => setFormData({...formData, tags: e.target.value})}
                   />
                </div>

                <div className="space-y-4">
                   <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-devotion-gold ml-2">
                      <FileText className="w-4 h-4" /> Short Description
                   </label>
                   <textarea 
                     rows="4"
                     className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-gray-600 focus:border-devotion-gold focus:outline-none transition-all"
                     placeholder="Tell seekers what this video is about..."
                     value={formData.description}
                     onChange={(e) => setFormData({...formData, description: e.target.value})}
                   />
                </div>

                <div className="pt-6">
                   <p className="text-center text-[11px] text-devotion-gold/90 mb-4 uppercase tracking-wider font-black">
                     Only spiritual content reels are allowed. Admin will review and approve.
                   </p>
                   <button 
                     type="submit"
                     disabled={loading || Boolean(videoValidationError)}
                     className="w-full bg-gradient-to-br from-devotion-gold via-[#FFB800] to-[#FF9F1C] text-devotion-darkBlue py-6 rounded-2xl font-black text-lg uppercase tracking-widest shadow-2xl hover:shadow-[0_0_50px_rgba(255,215,0,0.4)] transform hover:-translate-y-1 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:translate-y-0"
                   >
                      {loading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-devotion-darkBlue"></div>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6" /> Publish Wisdom
                        </>
                      )}
                   </button>
                   {loading && (
                     <div className="mt-4">
                       <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                         <div
                           className="h-full bg-devotion-gold transition-all duration-200"
                           style={{ width: `${uploadProgress}%` }}
                         ></div>
                       </div>
                       <p className="text-center text-[11px] text-gray-400 mt-2 font-black tracking-wider uppercase">
                         Uploading {uploadProgress}%
                       </p>
                     </div>
                   )}
                   <p className="text-center text-[10px] text-gray-500 mt-6 uppercase tracking-widest">By publishing, you agree to share spiritual light with the community.</p>
                </div>
             </form>
           )}
        </div>
      </div>
    </div>
  );
}
