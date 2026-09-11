document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');
    const titleInput = document.getElementById('title');
    const descriptionInput = document.getElementById('description');

    let editingId = null;

    // Fetch and render tasks
    async function fetchTasks() {
        try {
            const response = await fetch('/tasks');
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }

    // Render tasks list
    function renderTasks(tasks) {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const li = document.createElement('li');
            if (task.completed) li.classList.add('completed');
            li.innerHTML = `
                <input type="checkbox" class="task-complete" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                <span class="task-title">${task.title}</span>
                <span class="task-description">${task.description}</span>
                <div class="task-actions">
                    <button class="edit-btn" data-id="${task.id}">Edit</button>
                    <button class="delete-btn" data-id="${task.id}">Delete</button>
                </div>
            `;
            taskList.appendChild(li);
        });
        // Add event listeners to edit/delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', handleEdit);
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
        // Add event listeners to checkboxes
        document.querySelectorAll('.task-complete').forEach(chk => {
            chk.addEventListener('change', handleToggleComplete);
        });
    }

    // Handle form submit (add or update)
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        if (!title) return;

        try {
            if (editingId === null) {
                // Create new task
                const response = await fetch('/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description })
                });
                const newTask = await response.json();
                if (response.ok) {
                    // Reset form and refetch
                    taskForm.reset();
                    fetchTasks();
                }
            } else {
                // Update existing task
                const response = await fetch(`/tasks/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description })
                });
                if (response.ok) {
                    editingId = null;
                    taskForm.querySelector('button[type="submit"]').textContent = 'Add Task';
                    taskForm.reset();
                    fetchTasks();
                }
            }
        } catch (error) {
            console.error('Error saving task:', error);
        }
    });

    // Handle edit button
    async function handleEdit(e) {
        const id = parseInt(e.target.dataset.id);
        try {
            const response = await fetch(`/tasks/${id}`);
            const task = await response.json();
            if (response.ok) {
                titleInput.value = task.title;
                descriptionInput.value = task.description;
                editingId = task.id;
                taskForm.querySelector('button[type="submit"]').textContent = 'Update Task';
                titleInput.focus();
            }
        } catch (error) {
            console.error('Error fetching task for edit:', error);
        }
    }

    // Handle delete button
    async function handleDelete(e) {
        const id = parseInt(e.target.dataset.id);
        if (!confirm('Delete this task?')) return;
        try {
            const response = await fetch(`/tasks/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchTasks();
            }
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    }

    // Handle toggle complete
    async function handleToggleComplete(e) {
        const id = parseInt(e.target.dataset.id);
        const completed = e.target.checked;
        try {
            const response = await fetch(`/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed })
            });
            if (!response.ok) {
                // if error, revert checkbox
                e.target.checked = !completed;
                console.error('Failed to toggle task completion');
            }
        } catch (error) {
            e.target.checked = !completed;
            console.error('Error toggling task completion:', error);
        }
    }

    // Initial load
    fetchTasks();
});