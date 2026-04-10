const path = require('path');
const fs = require('fs');
const { transcodeToHLS } = require('../utils/hlsTranscoder');
const { uploadToVercelBlob } = require('../utils/vercelBlob');
const { getVideoDurationSeconds } = require('../utils/videoMetadata');
const VideoMongo = require('../models/mongo/VideoMongo');
const { mapVideo } = require('../utils/responseMappers');

// Save video metadata and trigger HLS after resumable upload
async function handleResumableUpload(req, res) {
  try {
    if (!req.resumableUpload) return res.status(400).json({ message: 'No file assembled' });
    const { filePath, fileName } = req.resumableUpload;
    const user = req.user;
    const title = req.headers['video-title'] || fileName;
    const description = req.headers['video-description'] || '';
    const tags = (req.headers['video-tags'] || '').split(',').map(t => t.trim()).filter(Boolean);
    const isKids = req.headers['video-kids'] === 'true';
    const collectionTitle = req.headers['video-collection'] || 'Bhagavad Gita';
    const category = req.headers['video-category'] || 'reels';
    const contentType = req.headers['video-content-type'] || 'short';
    const moderationStatus = user && user.role === 'admin' ? 'approved' : 'pending';
    const uploadSource = user && user.role === 'admin' ? 'admin' : 'user';
    let duration = req.headers['video-duration'];
    let orientation = req.headers['video-orientation'];

    // Always probe duration if possible
    try {
      duration = await getVideoDurationSeconds(filePath);
    } catch {}
    // Validate for Instagram-type reels (short)
    if (contentType === 'short') {
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      if (fileSizeMB > 100) {
        console.error(`[Validation] Short-form file too large: ${fileName}, user: ${user?.id || 'unknown'}, size: ${fileSizeMB}MB`);
        fs.unlink(filePath, () => {});
        return res.status(400).json({ message: 'Short-form reels must be <= 100MB.' });
      }
      if (duration < 3 || duration > 90) {
        console.error(`[Validation] Short-form invalid duration: ${fileName}, user: ${user?.id || 'unknown'}, duration: ${duration}s`);
        fs.unlink(filePath, () => {});
        return res.status(400).json({ message: 'Short-form reels must be between 3 and 90 seconds.' });
      }
      // Aspect ratio check (9:16 or 1:1)
      let aspect = 0;
      try {
        const ffmpeg = require('fluent-ffmpeg');
        await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (!err && metadata && metadata.streams && metadata.streams[0]) {
              const w = metadata.streams[0].width;
              const h = metadata.streams[0].height;
              aspect = w / h;
            }
            resolve();
          });
        });
      } catch (e) {
        console.error(`[Validation] Short-form aspect ratio probe error: ${fileName}, user: ${user?.id || 'unknown'}`, e);
      }
      if (!(Math.abs(aspect - 0.56) < 0.1 || Math.abs(aspect - 1.0) < 0.1)) {
        console.error(`[Validation] Short-form invalid aspect ratio: ${fileName}, user: ${user?.id || 'unknown'}, aspect: ${aspect}`);
        fs.unlink(filePath, () => {});
        return res.status(400).json({ message: 'Short-form reels must be 9:16 (vertical) or 1:1 (square) aspect ratio.' });
      }
    }
    // Strong validation for long-form OTT videos
    if (contentType === 'long') {
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      if (fileSizeMB > 5120) {
        console.error(`[Validation] Long-form file too large: ${fileName}, user: ${user?.id || 'unknown'}, size: ${fileSizeMB}MB`);
        fs.unlink(filePath, () => {});
        return res.status(400).json({ message: 'Long-form videos must be <= 5GB.' });
      }
      if (duration < 91 || duration > 14400) {
        console.error(`[Validation] Long-form invalid duration: ${fileName}, user: ${user?.id || 'unknown'}, duration: ${duration}s`);
        fs.unlink(filePath, () => {});
        return res.status(400).json({ message: 'Long-form videos must be between 91 seconds and 4 hours.' });
      }
      // Aspect ratio check (16:9 or 4:3)
      let aspect = 0;
      try {
        const ffmpeg = require('fluent-ffmpeg');
        await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (!err && metadata && metadata.streams && metadata.streams[0]) {
              const w = metadata.streams[0].width;
              const h = metadata.streams[0].height;
              aspect = w / h;
            }
            resolve();
          });
        });
      } catch (e) {
        console.error(`[Validation] Long-form aspect ratio probe error: ${fileName}, user: ${user?.id || 'unknown'}`, e);
      }
      if (!(Math.abs(aspect - 1.78) < 0.1 || Math.abs(aspect - 1.33) < 0.1)) {
        console.error(`[Validation] Long-form invalid aspect ratio: ${fileName}, user: ${user?.id || 'unknown'}, aspect: ${aspect}`);
        fs.unlink(filePath, () => {});
        return res.status(400).json({ message: 'Long-form videos must be 16:9 (landscape) or 4:3 aspect ratio.' });
      }
    }

    // HLS transcoding
    const hlsOutputDir = path.join(__dirname, '..', 'uploads', 'hls', path.parse(fileName).name);
    const baseName = 'playlist';
    let hlsUrl = '';
    await new Promise((resolve) => {
      transcodeToHLS(filePath, hlsOutputDir, baseName, (err, masterPlaylistPath) => {
        resolve();
      });
    });

    // Upload HLS master playlist and segments to Vercel Blob
    const hlsFiles = fs.readdirSync(hlsOutputDir).filter(f => f.endsWith('.m3u8') || f.endsWith('.ts'));
    const blobBase = `videos/${path.parse(fileName).name}/`;
    let masterPlaylistCdnUrl = '';
    for (const f of hlsFiles) {
      const localPath = path.join(hlsOutputDir, f);
      const blobPath = `${blobBase}${f}`;
      const cdnUrl = await uploadToVercelBlob(localPath, blobPath);
      if (f.endsWith('_master.m3u8')) masterPlaylistCdnUrl = cdnUrl;
    }

    // Upload original video file to Vercel Blob
    const videoBlobPath = `videos/${fileName}`;
    const videoCdnUrl = await uploadToVercelBlob(filePath, videoBlobPath);

    // Save to DB (Mongo only for now)
    const newVideo = await VideoMongo.create({
      title,
      videoUrl: videoCdnUrl,
      hlsUrl: masterPlaylistCdnUrl,
      description,
      tags,
      category,
      isKids,
      collectionTitle,
      isUserReel: uploadSource === 'user',
      uploadedBy: user ? user.id : undefined,
      uploadSource,
      moderationStatus,
      contentType,
      duration,
      orientation,
      likesCount: 0,
      sharesCount: 0,
      commentsCount: 0,
      likedBy: [],
      comments: [],
    });
    res.status(201).json({ ...mapVideo(newVideo), message: 'Video uploaded and processed (CDN-backed)' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
}

module.exports = { handleResumableUpload };
