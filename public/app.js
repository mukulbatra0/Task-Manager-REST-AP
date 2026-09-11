document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');
    const dueDateInput = document.getElementById('due-date');
    const priorityInput = document.getElementById('priority');

    // ===== Theme (dark mode) =====
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
    }

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
    });

    let tasks = [];
    let editingId = null;
    let currentFilter = 'all';

    // ===== Utilities =====

    // Escape user input to prevent XSS
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Toast notification (optionally with an action button, e.g. Undo)
    let toastTimeout;
    function showToast(message, type = '', action = null) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = '';
        const text = document.createElement('span');
        text.textContent = message;
        toast.appendChild(text);
        if (action) {
            const btn = document.createElement('button');
            btn.className = 'toast-action';
            btn.textContent = action.label;
            btn.addEventListener('click', () => {
                clearTimeout(toastTimeout);
                toast.classList.remove('show');
                action.callback();
            });
            toast.appendChild(btn);
        }
        toast.className = `toast show ${type}`;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.remove('show'), action ? 6000 : 2500);
    }

    function getFilteredTasks() {
        if (currentFilter === 'active') return tasks.filter(t => !t.completed);
        if (currentFilter === 'completed') return tasks.filter(t => t.completed);
        return tasks;
    }

    // ===== API helpers =====
    async function api(url, options) {
        const response = await fetch(url, options);
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${response.status})`);
        }
        return response.json();
    }

    // ===== Fetch and render =====
    async function fetchTasks() {
        taskList.innerHTML = '<li class="loading">Loading tasks…</li>';
        try {
            tasks = await api('/tasks');
            renderTasks();
        } catch (error) {
            console.error('Error fetching tasks:', error);
            taskList.innerHTML = '<li class="empty-state">⚠️ Failed to load tasks. Please refresh.</li>';
            showToast('Failed to load tasks', 'error');
        }
    }

    function getDueInfo(dueDate) {
        if (!dueDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate + 'T00:00:00');
        const diffDays = Math.round((due - today) / 86400000);
        const formatted = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (diffDays < 0) return { label: `⚠️ Overdue · ${formatted}`, cls: 'overdue' };
        if (diffDays === 0) return { label: `⏰ Due today`, cls: 'due-today' };
        return { label: `📅 ${formatted}`, cls: '' };
    }

    function renderTasks() {
        taskList.innerHTML = '';
        const visible = getFilteredTasks();

        if (visible.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'empty-state';
            empty.textContent = tasks.length === 0
                ? '📭 No tasks yet. Add one above!'
                : '🔍 No tasks match this filter.';
            taskList.appendChild(empty);
            updateCount();
            return;
        }

        visible.forEach(task => {
            const li = document.createElement('li');
            if (task.completed) li.classList.add('completed');
            li.classList.add(`priority-${task.priority || 'medium'}`);
            const due = getDueInfo(task.dueDate);
            const priority = task.priority || 'medium';
            // Use textContent-based escaping to prevent XSS
            li.innerHTML = `
                <input type="checkbox" class="task-complete" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <span class="task-title">${escapeHtml(task.title)}</span>
                    ${task.description ? `<span class="task-description">${escapeHtml(task.description)}</span>` : ''}
                    <span class="task-meta">
                        <span class="badge badge-priority priority-${priority}">${priority}</span>
                        ${due ? `<span class="badge badge-due ${due.cls}">${escapeHtml(due.label)}</span>` : ''}
                    </span>
                </div>
                <div class="task-actions">
                    <button class="edit-btn" data-id="${task.id}">Edit</button>
                    <button class="delete-btn" data-id="${task.id}">Delete</button>
                </div>
            `;
            taskList.appendChild(li);
        });
        updateCount();
    }

    function updateCount() {
        const countEl = document.getElementById('task-count');
        const remaining = tasks.filter(t => !t.completed).length;
        countEl.textContent = `${remaining} of ${tasks.length} task${tasks.length === 1 ? '' : 's'} remaining`;
    }

    // ===== Event delegation (no re-attaching listeners on every render) =====
    taskList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const id = parseInt(btn.dataset.id);
        if (btn.classList.contains('edit-btn')) handleEdit(id);
        if (btn.classList.contains('delete-btn')) handleDelete(id);
    });

    taskList.addEventListener('change', (e) => {
        if (e.target.classList.contains('task-complete')) {
            handleToggleComplete(e);
        }
    });

    // ===== Form submit (add or update) =====
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        if (!title) return;

        const submitBtn = taskForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        try {
            if (editingId === null) {
                await api('/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        description,
                        dueDate: dueDateInput.value,
                        priority: priorityInput.value
                    })
                });
                showToast('✅ Task added', 'success');
            } else {
                await api(`/tasks/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title,
                        description,
                        dueDate: dueDateInput.value,
                        priority: priorityInput.value
                    })
                });
                editingId = null;
                submitBtn.textContent = 'Add Task';
                showToast('✏️ Task updated', 'success');
            }
            taskForm.reset();
            await fetchTasks();
        } catch (error) {
            console.error('Error saving task:', error);
            showToast(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });

    // ===== Edit =====
    function handleEdit(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) {
            showToast('Task not found', 'error');
            return;
        }
        titleInput.value = task.title;
        descriptionInput.value = task.description || '';
        dueDateInput.value = task.dueDate || '';
        priorityInput.value = task.priority || 'medium';
        editingId = task.id;
        taskForm.querySelector('button[type="submit"]').textContent = 'Update Task';
        titleInput.focus();
    }

    // ===== Delete with undo =====
    async function handleDelete(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;
        try {
            await api(`/tasks/${id}`, { method: 'DELETE' });
            tasks = tasks.filter(t => t.id !== id);
            renderTasks();
            showToast('🗑️ Task deleted', 'success', {
                label: 'Undo',
                callback: async () => {
                    try {
                        await api('/tasks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                title: task.title,
                                description: task.description,
                                completed: task.completed,
                                dueDate: task.dueDate,
                                priority: task.priority
                            })
                        });
                        await fetchTasks();
                        showToast('↩️ Task restored', 'success');
                    } catch (error) {
                        console.error('Error restoring task:', error);
                        showToast(error.message, 'error');
                    }
                }
            });
            if (editingId === id) {
                editingId = null;
                taskForm.reset();
                taskForm.querySelector('button[type="submit"]').textContent = 'Add Task';
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            showToast(error.message, 'error');
        }
    }

    // ===== Toggle complete =====
    async function handleToggleComplete(e) {
        const id = parseInt(e.target.dataset.id);
        const completed = e.target.checked;
        try {
            await api(`/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed })
            });
            const task = tasks.find(t => t.id === id);
            if (task) task.completed = completed;
            // Optimistic UI update without full refetch
            e.target.closest('li').classList.toggle('completed', completed);
            if (currentFilter !== 'all') renderTasks();
            updateCount();
        } catch (error) {
            e.target.checked = !completed;
            console.error('Error toggling task completion:', error);
            showToast(error.message, 'error');
        }
    }

    // ===== Filters =====
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });

    // Initial load
    checkStorageMode();
    fetchTasks();

    // Warn the user if tasks won't persist (ephemeral in-memory storage)
    async function checkStorageMode() {
        try {
            const res = await fetch('/storage');
            const info = await res.json();
            if (info.mode === 'memory') {
                document.getElementById('storage-warning').classList.remove('hidden');
            }
        } catch (e) {
            /* non-critical */
        }
    }
});
