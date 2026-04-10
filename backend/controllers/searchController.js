const { Sloka, Story, Video, Movie } = require('../models');
const mongoose = require('mongoose');
const SlokaMongo = require('../models/mongo/SlokaMongo');
const StoryMongo = require('../models/mongo/StoryMongo');
const VideoMongo = require('../models/mongo/VideoMongo');
const MovieMongo = require('../models/mongo/MovieMongo');
const { Op } = require('sequelize');
const { mapSloka, mapStory, mapVideo, mapMovie } = require('../utils/responseMappers');
const mockContentStore = require('../utils/mockContentStore');
const { isMockMode } = require('./authController');

const isMongoEnabled = String(process.env.USE_MONGODB || 'false').toLowerCase() === 'true';
const isMongoConnected = () => mongoose.connection && mongoose.connection.readyState === 1;
const useMongoStore = () => isMongoEnabled && isMongoConnected();

const mongoRegex = (value) => new RegExp(String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const containsQuery = (value, query) => String(value || '').toLowerCase().includes(String(query || '').toLowerCase());

const storyMatches = (story, query) => (
  containsQuery(story.title, query)
  || containsQuery(story.titleTelugu, query)
  || containsQuery(story.titleHindi, query)
  || containsQuery(story.titleEnglish, query)
  || containsQuery(story.summary, query)
  || containsQuery(story.summaryTelugu, query)
  || containsQuery(story.summaryHindi, query)
  || containsQuery(story.summaryEnglish, query)
  || containsQuery(story.content, query)
  || containsQuery(story.contentTelugu, query)
  || containsQuery(story.contentHindi, query)
  || containsQuery(story.contentEnglish, query)
  || containsQuery(story.seriesTitle, query)
);

const videoMatches = (video, query) => (
  containsQuery(video.title, query)
  || containsQuery(video.description, query)
  || containsQuery(video.category, query)
  || containsQuery(video.language, query)
  || containsQuery(video.moral, query)
);

const movieMatches = (movie, query) => (
  containsQuery(movie.title, query)
  || containsQuery(movie.description, query)
  || containsQuery(movie.ownerHistory, query)
  || containsQuery(movie.releaseYear, query)
  || (Array.isArray(movie.tags) && movie.tags.some((tag) => containsQuery(tag, query)))
);

const isSearchableVideo = (video) => {
  const isUserReel = Boolean(video?.isUserReel);
  const category = String(video?.category || '').trim().toLowerCase();
  return !isUserReel && category !== 'reels';
};

const searchMockContent = (query) => ({
  slokas: [],
  stories: mockContentStore.listStories().filter((story) => storyMatches(story, query)).map(mapStory),
  videos: mockContentStore
    .listVideos()
    .filter((video) => isSearchableVideo(video))
    .filter((video) => videoMatches(video, query))
    .map(mapVideo),
  movies: mockContentStore.listMovies().filter((movie) => movieMatches(movie, query)).map((movie) => mapMovie(movie)),
});


exports.searchAll = async (req, res) => {
  try {
    const { q, type, category, language } = req.query;
    const normalizedQuery = String(q || '').trim();
    const normalizedType = String(type || 'all').toLowerCase();
    const normalizedCategory = String(category || 'all').toLowerCase();
    const normalizedLanguage = String(language || 'all').toLowerCase();

    // Helper to filter arrays by category/language
    const filterBy = (arr, opts = {}) => arr.filter(item => {
      if (opts.category && opts.category !== 'all') {
        if (String(item.category || '').toLowerCase() !== opts.category) return false;
      }
      if (opts.language && opts.language !== 'all') {
        if (String(item.language || '').toLowerCase() !== opts.language) return false;
      }
      return true;
    });

    // If type is set, only return that type
    const typeMap = {
      sloka: 'slokas',
      story: 'stories',
      video: 'videos',
      movie: 'movies',
    };

    if (!normalizedQuery) {
      if (isMockMode()) {
        let results = searchMockContent('');
        // Apply filters
        Object.keys(results).forEach(key => {
          results[key] = filterBy(results[key], { category: normalizedCategory, language: normalizedLanguage });
        });
        if (typeMap[normalizedType]) {
          Object.keys(results).forEach(key => { if (key !== typeMap[normalizedType]) results[key] = []; });
        }
        return res.json(results);
      }

      if (useMongoStore()) {
        const [slokas, stories, videos, movies] = await Promise.all([
          SlokaMongo.find({}),
          StoryMongo.find({}),
          VideoMongo.find({ isUserReel: { $ne: true } }),
          MovieMongo.find({}),
        ]);
        let results = {
          slokas: filterBy(slokas.map(mapSloka), { category: normalizedCategory, language: normalizedLanguage }),
          stories: filterBy(stories.map(mapStory), { category: normalizedCategory, language: normalizedLanguage }),
          videos: filterBy(videos.filter((video) => isSearchableVideo(video)).map(mapVideo), { category: normalizedCategory, language: normalizedLanguage }),
          movies: filterBy(movies.map(mapMovie), { category: normalizedCategory, language: normalizedLanguage }),
        };
        if (typeMap[normalizedType]) {
          Object.keys(results).forEach(key => { if (key !== typeMap[normalizedType]) results[key] = []; });
        }
        return res.json(results);
      }

      const [slokas, stories, videos, movies] = await Promise.all([
        Sloka.findAll(),
        Story.findAll({
          attributes: ['id', 'title', 'summary', 'content', 'chapter', 'language', 'thumbnail', 'tags', 'createdBy', 'createdAt', 'updatedAt'],
        }),
        Video.findAll({
          attributes: ['id', 'title', 'description', 'videoUrl', 'youtubeUrl', 'thumbnail', 'category', 'language', 'duration', 'tags', 'views', 'isKids', 'isUserReel', 'uploadedBy', 'uploadSource', 'contentType', 'moderationStatus', 'moderationNote', 'reviewedBy', 'likesCount', 'sharesCount', 'commentsCount', 'likedBy', 'comments', 'chapter', 'moral', 'script', 'createdAt', 'updatedAt'],
          where: {
            isUserReel: { [Op.not]: true },
          },
        }),
        Movie.findAll({
          attributes: ['id', 'title', 'description', 'videoUrl', 'youtubeUrl', 'thumbnail', 'releaseYear', 'ownerHistory', 'tags', 'createdAt', 'updatedAt'],
        }),
      ]);
      let results = {
        slokas: filterBy(slokas.map(mapSloka), { category: normalizedCategory, language: normalizedLanguage }),
        stories: filterBy(stories.map(mapStory), { category: normalizedCategory, language: normalizedLanguage }),
        videos: filterBy(videos.filter((video) => isSearchableVideo(video)).map(mapVideo), { category: normalizedCategory, language: normalizedLanguage }),
        movies: filterBy(movies.map(mapMovie), { category: normalizedCategory, language: normalizedLanguage }),
      };
      if (typeMap[normalizedType]) {
        Object.keys(results).forEach(key => { if (key !== typeMap[normalizedType]) results[key] = []; });
      }
      return res.json(results);
    }


    if (isMockMode()) {
      let results = searchMockContent(normalizedQuery);
      Object.keys(results).forEach(key => {
        results[key] = filterBy(results[key], { category: normalizedCategory, language: normalizedLanguage });
      });
      if (typeMap[normalizedType]) {
        Object.keys(results).forEach(key => { if (key !== typeMap[normalizedType]) results[key] = []; });
      }
      return res.json(results);
    }


    if (useMongoStore()) {
      const qRegex = mongoRegex(normalizedQuery);
      const [slokas, stories, videos, movies] = await Promise.all([
        SlokaMongo.find({
          $or: [
            { sanskrit: qRegex },
            { englishMeaning: qRegex },
            { teluguMeaning: qRegex },
            { hindiMeaning: qRegex },
          ],
        }),
        StoryMongo.find({
          $or: [
            { title: qRegex },
            { summary: qRegex },
            { content: qRegex },
            { titleEnglish: qRegex },
            { titleHindi: qRegex },
            { titleTelugu: qRegex },
            { summaryEnglish: qRegex },
            { summaryHindi: qRegex },
            { summaryTelugu: qRegex },
          ],
        }),
        VideoMongo.find({
          $and: [
            { isUserReel: { $ne: true } },
            {
              $or: [
                { title: qRegex },
                { description: qRegex },
                { category: qRegex },
                { language: qRegex },
              ],
            },
          ],
        }),
        MovieMongo.find({
          $or: [
            { title: qRegex },
            { description: qRegex },
            { ownerHistory: qRegex },
          ],
        }),
      ]);
      let results = {
        slokas: filterBy(slokas.map(mapSloka), { category: normalizedCategory, language: normalizedLanguage }),
        stories: filterBy(stories.map(mapStory), { category: normalizedCategory, language: normalizedLanguage }),
        videos: filterBy(videos.filter((video) => isSearchableVideo(video)).map(mapVideo), { category: normalizedCategory, language: normalizedLanguage }),
        movies: filterBy(movies.map(mapMovie), { category: normalizedCategory, language: normalizedLanguage }),
      };
      if (typeMap[normalizedType]) {
        Object.keys(results).forEach(key => { if (key !== typeMap[normalizedType]) results[key] = []; });
      }
      return res.json(results);
    }

    const [slokas, stories, videos, movies] = await Promise.all([
      Sloka.findAll({
        where: {
          [Op.or]: [
            { sanskrit: { [Op.like]: `%${q}%` } },
            { englishMeaning: { [Op.like]: `%${q}%` } },
            { teluguMeaning: { [Op.like]: `%${q}%` } }
          ],
          ...(normalizedCategory !== 'all' ? { category: normalizedCategory } : {}),
          ...(normalizedLanguage !== 'all' ? { language: normalizedLanguage } : {}),
        }
      }),
      Story.findAll({
        attributes: ['id', 'title', 'summary', 'content', 'chapter', 'language', 'thumbnail', 'tags', 'createdBy', 'createdAt', 'updatedAt'],
        where: {
          [Op.or]: [
            { title: { [Op.like]: `%${q}%` } },
            { summary: { [Op.like]: `%${q}%` } },
            { content: { [Op.like]: `%${q}%` } }
          ],
          ...(normalizedCategory !== 'all' ? { category: normalizedCategory } : {}),
          ...(normalizedLanguage !== 'all' ? { language: normalizedLanguage } : {}),
        }
      }),
      Video.findAll({
        attributes: ['id', 'title', 'description', 'videoUrl', 'youtubeUrl', 'thumbnail', 'category', 'language', 'duration', 'tags', 'views', 'isKids', 'isUserReel', 'uploadedBy', 'uploadSource', 'contentType', 'moderationStatus', 'moderationNote', 'reviewedBy', 'likesCount', 'sharesCount', 'commentsCount', 'likedBy', 'comments', 'chapter', 'moral', 'script', 'createdAt', 'updatedAt'],
        where: {
          isUserReel: { [Op.not]: true },
          [Op.or]: [
            { title: { [Op.like]: `%${q}%` } },
            { description: { [Op.like]: `%${q}%` } },
            { category: { [Op.like]: `%${q}%` } },
            { language: { [Op.like]: `%${q}%` } }
          ],
          ...(normalizedCategory !== 'all' ? { category: normalizedCategory } : {}),
          ...(normalizedLanguage !== 'all' ? { language: normalizedLanguage } : {}),
        }
      }),
      Movie.findAll({
        where: {
          [Op.or]: [
            { title: { [Op.like]: `%${q}%` } },
            { description: { [Op.like]: `%${q}%` } },
            { ownerHistory: { [Op.like]: `%${q}%` } }
          ],
          ...(normalizedCategory !== 'all' ? { category: normalizedCategory } : {}),
          ...(normalizedLanguage !== 'all' ? { language: normalizedLanguage } : {}),
        }
      })
    ]);
    let results = {
      slokas: slokas.map(mapSloka),
      stories: stories.map(mapStory),
      videos: videos.filter((video) => isSearchableVideo(video)).map(mapVideo),
      movies: movies.map(mapMovie),
    };
    if (typeMap[normalizedType]) {
      Object.keys(results).forEach(key => { if (key !== typeMap[normalizedType]) results[key] = []; });
    }
    return res.json(results);
  } catch (error) {
    if (String(error.message || '').toLowerCase().includes('no such column')) {
      return res.json(searchMockContent(String(req.query?.q || '').trim()));
    }

    res.status(500).json({ message: error.message });
  }
};
