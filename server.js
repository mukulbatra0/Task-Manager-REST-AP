const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// In-memory storage for tasks
let tasks = [];
let nextId = 1;

// GET /tasks - Retrieve all tasks
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// GET /tasks/:id - Retrieve a single task by id
app.get('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// POST /tasks - Create a new task
app.post('/tasks', (req, res) => {
  const { title, description, completed } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  const task = {
    id: nextId++,
    title: title,
    description: description || '',
    completed: completed ?? false
  };
  tasks.push(task);
  res.status(201).json(task);
});

// PUT /tasks/:id - Update an existing task
app.put('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const { title, description, completed } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (completed !== undefined) task.completed = completed;
  res.json(task);
});

// DELETE /tasks/:id - Delete a task
app.delete('/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }
  const deletedTask = tasks.splice(index, 1);
  res.json(deletedTask[0]);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});