const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ===== Persistence =====
// Three storage backends, selected automatically:
//   1. Upstash Redis (REST API) — used when UPSTASH_REDIS_REST_URL and
//      UPSTASH_REDIS_REST_TOKEN are set. Recommended for Vercel (data persists
//      across serverless invocations).
//   2. JSON file — used locally (DATA_FILE, default ./tasks.json).
//   3. In-memory — fallback on read-only filesystems without Redis.
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'tasks.json');
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = process.env.REDIS_KEY || 'taskmanager:data';
const useRedis = Boolean(REDIS_URL && REDIS_TOKEN);

let tasks = [];
let nextId = 1;
let storageWritable = true;

async function redisCommand(command, ...args) {
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([command, ...args])
  });
  if (!response.ok) {
    throw new Error(`Upstash Redis request failed (${response.status})`);
  }
  return response.json();
}

async function loadTasks() {
  try {
    let data = null;
    if (useRedis) {
      const result = await redisCommand('GET', REDIS_KEY);
      if (result && result.result) {
        data = JSON.parse(result.result);
      }
    } else if (fs.existsSync(DATA_FILE)) {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    if (data) {
      tasks = Array.isArray(data.tasks) ? data.tasks : [];
      nextId = data.nextId || (tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1);
    }
  } catch (err) {
    console.error('Could not load tasks, starting fresh:', err.message);
    tasks = [];
    nextId = 1;
  }
}

async function saveTasks() {
  const payload = JSON.stringify({ tasks, nextId });
  if (useRedis) {
    try {
      await redisCommand('SET', REDIS_KEY, payload);
    } catch (err) {
      console.error('Failed to save tasks to Redis:', err.message);
    }
    return;
  }
  if (!storageWritable) return; // in-memory fallback (serverless)
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks, nextId }, null, 2));
  } catch (err) {
    if (err.code === 'EROFS' || err.code === 'EACCES' || err.code === 'EDATA') {
      console.warn('Filesystem is read-only; using in-memory storage only. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for persistent serverless storage.');
      storageWritable = false;
    } else {
      console.error('Failed to save tasks:', err.message);
    }
  }
}

// Expose storage mode so the frontend can warn users about ephemeral storage.
function getStorageMode() {
  if (useRedis) return 'redis';
  if (storageWritable) return 'file';
  return 'memory';
}

let loaded = false;
app.use(async (req, res, next) => {
  if (!loaded) {
    await loadTasks();
    loaded = true;
  }
  next();
});

// Middleware to parse JSON bodies
app.use(express.json());

// ===== Shared validation =====
// Returns an error message string if invalid, otherwise null.
function validateTaskFields({ title, description, completed }) {
  if (title !== undefined && (typeof title !== 'string' || !title.trim() || title.trim().length > 100)) {
    return 'Title must be a non-empty string of 100 characters or fewer';
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 200)) {
    return 'Description must be a string of 200 characters or fewer';
  }
  if (completed !== undefined && typeof completed !== 'boolean') {
    return 'Completed must be a boolean';
  }
  return null;
}

// Parse and validate the :id route param. Sends a response and returns null if invalid.
function parseTaskId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid task id' });
    return null;
  }
  return id;
}

// Serve static files from a path independent of the process working directory.
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// In-memory fallback storage (used when filesystem is read-only)
// tasks and nextId are declared above and loaded from tasks.json

// GET /storage - Reports which storage backend is active
app.get('/storage', (req, res) => {
  res.json({ mode: getStorageMode(), persistent: getStorageMode() !== 'memory' });
});

// GET /tasks - Retrieve all tasks
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// GET /tasks/:id - Retrieve a single task by id
app.get('/tasks/:id', (req, res) => {
  const id = parseTaskId(req, res);
  if (id === null) return;
  const task = tasks.find(t => t.id === id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// POST /tasks - Create a new task
app.post('/tasks', async (req, res) => {
  const { title, description, completed } = req.body;
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const validationError = validateTaskFields({ title, description, completed });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const task = {
    id: nextId++,
    title: title,
    description: description || '',
    completed: completed ?? false
  };
  tasks.push(task);
  await saveTasks();
  res.status(201).json(task);
});

// PUT /tasks/:id - Update an existing task
app.put('/tasks/:id', async (req, res) => {
  const id = parseTaskId(req, res);
  if (id === null) return;
  const task = tasks.find(t => t.id === id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const { title, description, completed } = req.body;
  const validationError = validateTaskFields({ title, description, completed });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description;
  if (completed !== undefined) task.completed = completed;
  await saveTasks();
  res.json(task);
});

// DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', async (req, res) => {
  const id = parseTaskId(req, res);
  if (id === null) return;
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const deletedTask = tasks.splice(index, 1);
  await saveTasks();
  res.json(deletedTask[0]);
});

// JSON 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler (e.g. malformed JSON bodies) — always responds with JSON
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

// Start the server locally; Vercel uses the exported app as the handler.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;