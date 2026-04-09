const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join(__dirname, '..', 'data', 'quizQuestions.json');

const defaultQuestions = [
  {
    id: 1,
    questionText: 'Bhagavad Gita was spoken by Lord Krishna to whom?',
    category: 'Gita Basics',
    videoUrl: '',
    options: [
      { answerText: 'Bhishma', isCorrect: false },
      { answerText: 'Arjuna', isCorrect: true },
      { answerText: 'Yudhishthira', isCorrect: false },
      { answerText: 'Karna', isCorrect: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    questionText: 'How many chapters are there in the Bhagavad Gita?',
    category: 'Gita Basics',
    videoUrl: '',
    options: [
      { answerText: '12', isCorrect: false },
      { answerText: '18', isCorrect: true },
      { answerText: '24', isCorrect: false },
      { answerText: '108', isCorrect: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const loadStore = () => {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(defaultQuestions, null, 2), 'utf8');
      return [...defaultQuestions];
    }

    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length) {
      return parsed;
    }

    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultQuestions, null, 2), 'utf8');
    return [...defaultQuestions];
  } catch (error) {
    return [...defaultQuestions];
  }
};

const saveStore = (questions) => {
  // Backup before writing
  try {
    const backupPath = STORE_FILE.replace('.json', `_backup_${Date.now()}.json`);
    if (fs.existsSync(STORE_FILE)) {
      fs.copyFileSync(STORE_FILE, backupPath);
    }
  } catch (e) {
    // Ignore backup errors
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(questions, null, 2), 'utf8');
};

const sanitizeOption = (option) => {
  if (!option || typeof option !== 'object') return null;
  const answerText = String(option.answerText || '').trim();
  if (!answerText) return null;
  return {
    answerText,
    isCorrect: Boolean(option.isCorrect),
  };
};

const normalizeOptions = (options) => {
  const list = Array.isArray(options) ? options.map(sanitizeOption).filter(Boolean) : [];
  return list;
};

exports.getQuizQuestions = (req, res) => {
  try {
    const questions = loadStore();
    return res.json(questions);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load quiz questions' });
  }
};

exports.addQuizQuestion = (req, res) => {
  try {
    console.log('[QUIZ][UPLOAD] Incoming body:', req.body);
    const questionText = String(req.body?.questionText || '').trim();
    const category = String(req.body?.category || 'Gita Challenge').trim();
    const videoUrl = String(req.body?.videoUrl || '').trim();
    const videoId = req.body?.videoId || null;
    const options = normalizeOptions(req.body?.options);

    if (!questionText) {
      console.warn('[QUIZ][UPLOAD] Missing questionText');
      return res.status(400).json({ message: 'questionText is required' });
    }
    if (options.length < 2) {
      console.warn('[QUIZ][UPLOAD] Less than 2 options');
      return res.status(400).json({ message: 'At least 2 options are required' });
    }
    if (!options.some((item) => item.isCorrect)) {
      console.warn('[QUIZ][UPLOAD] No correct option');
      return res.status(400).json({ message: 'At least one correct option is required' });
    }

    const questions = loadStore();
    const maxId = questions.reduce((acc, item) => Math.max(acc, Number(item.id) || 0), 0);
    const now = new Date().toISOString();

    const created = {
      id: maxId + 1,
      questionText,
      category,
      videoUrl,
      videoId,
      options,
      createdAt: now,
      updatedAt: now,
    };

    questions.push(created);
    saveStore(questions);
    console.log('[QUIZ][UPLOAD] Saved new quiz question:', created);

    return res.status(201).json(created);
  } catch (error) {
    console.error('[QUIZ][UPLOAD] Error:', error);
    return res.status(500).json({ message: 'Failed to add quiz question' });
  }
};

exports.deleteQuizQuestion = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Valid question id is required' });
    }

    const questions = loadStore();
    const index = questions.findIndex((item) => Number(item.id) === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Quiz question not found' });
    }

    const [removed] = questions.splice(index, 1);
    saveStore(questions);
    return res.json({ message: 'Quiz question deleted', question: removed });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete quiz question' });
  }
};
