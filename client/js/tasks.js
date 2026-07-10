let currentPage = 1;
let totalPages = 1;
const limit = 8;
let categoriesList = [];
let checkedTaskIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
  if (auth.isAdmin()) {
    document.getElementById('adminNavLink').style.display = 'block';
  }

  // Load all startup context
  loadCategories();
  loadReminders();
  loadTasks();

  // Setup input bindings for real-time search and filter updates
  document.getElementById('filterSearch').addEventListener('input', debounce(loadTasks, 300));
  document.getElementById('filterStatus').addEventListener('change', loadTasks);
  document.getElementById('filterPriority').addEventListener('change', loadTasks);
  document.getElementById('filterCategory').addEventListener('change', loadTasks);
  document.getElementById('sortBy').addEventListener('change', loadTasks);
  document.getElementById('sortOrder').addEventListener('change', loadTasks);

  // Form submit hooks
  document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
  document.getElementById('categoryForm').addEventListener('submit', handleCategoryFormSubmit);
  document.getElementById('reminderForm').addEventListener('submit', handleReminderFormSubmit);
});

// Helper debounce for input search queries
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function loadCategories() {
  try {
    const res = await api.get('/categories');
    categoriesList = res.data;

    // Populate Sidebar category list
    const sidebarList = document.getElementById('categorySidebarList');
    if (categoriesList.length === 0) {
      sidebarList.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted);">No custom categories yet.</div>`;
    } else {
      sidebarList.innerHTML = categoriesList.map(cat => `
        <div class="category-list-item">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="category-color-dot" style="background: ${cat.color};"></div>
            <span style="font-size: 0.9rem; font-weight: 500;">${cat.name}</span>
          </div>
          ${cat.name.toLowerCase() !== 'general' ? `
            <button class="btn" style="padding: 2px 6px; font-size: 0.75rem; background: transparent; color: var(--color-danger);" onclick="deleteCategory('${cat._id}')">🗑️</button>
          ` : ''}
        </div>
      `).join('');
    }

    // Populate Category Dropdowns
    const filterCatDropdown = document.getElementById('filterCategory');
    const taskCatDropdown = document.getElementById('taskCategory');

    const defaultFilterOption = `<option value="">All Categories</option>`;
    filterCatDropdown.innerHTML = defaultFilterOption + categoriesList.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');

    taskCatDropdown.innerHTML = categoriesList.map(cat => `<option value="${cat._id}">${cat.name}</option>`).join('');

  } catch (err) {
    showToast('Failed to load categories', 'error');
  }
}

async function loadReminders() {
  try {
    const res = await api.get('/reminders');
    const container = document.getElementById('reminderSidebarList');

    // Filter to show active reminders only (trigger in future and unsent)
    const active = res.data.filter(r => !r.sent && new Date(r.remindAt) > new Date());

    if (active.length === 0) {
      container.innerHTML = `<div style="font-size: 0.85rem; color: var(--text-muted);">No pending reminders.</div>`;
      return;
    }

    container.innerHTML = active.map(rem => {
      const timeStr = new Date(rem.remindAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="category-list-item" style="font-size: 0.85rem; display: block; padding: 10px;">
          <div style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${rem.task ? rem.task.title : 'Deleted Task'}</div>
          <div class="flex-between" style="margin-top: 4px;">
            <span style="color: var(--text-secondary); font-size: 0.75rem;">🔔 ${timeStr}</span>
            <button class="btn" style="padding: 1px 4px; font-size: 0.7rem; color: var(--color-danger);" onclick="deleteReminder('${rem._id}')">Cancel</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadTasks() {
  try {
    const search = document.getElementById('filterSearch').value;
    const status = document.getElementById('filterStatus').value;
    const priority = document.getElementById('filterPriority').value;
    const category = document.getElementById('filterCategory').value;
    const sortBy = document.getElementById('sortBy').value;
    const sortOrder = document.getElementById('sortOrder').value;

    let query = `/tasks?page=${currentPage}&limit=${limit}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (status) query += `&status=${status}`;
    if (priority) query += `&priority=${priority}`;
    if (category) query += `&category=${category}`;
    if (sortBy) query += `&sortBy=${sortBy}`;
    if (sortOrder) query += `&sortOrder=${sortOrder}`;

    const res = await api.get(query);
    const container = document.getElementById('tasksList');

    totalPages = res.pagination.pages || 1;
    document.getElementById('pageIndicator').textContent = `Page ${currentPage} of ${totalPages || 1}`;

    // Manage Prev/Next buttons status
    document.getElementById('btnPrevPage').disabled = currentPage <= 1;
    document.getElementById('btnNextPage').disabled = currentPage >= totalPages;

    if (res.data.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">No tasks found. Click "Create New Task" to begin!</div>`;
      return;
    }

    container.innerHTML = res.data.map(task => {
      const isChecked = checkedTaskIds.has(task._id);
      const isCompleted = task.status === 'completed';
      const dueDate = new Date(task.dueDate);
      const isOverdue = dueDate < new Date() && !isCompleted;
      const dateStr = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      return `
        <div class="task-item priority-${task.priority} ${isCompleted ? 'completed' : ''}">
          <!-- Bulk Action Checkbox -->
          <input type="checkbox" class="task-bulk-chk" value="${task._id}" ${isChecked ? 'checked' : ''} onchange="toggleTaskChecked('${task._id}', this.checked)" style="margin-right: 12px; width: 16px; height: 16px;">
          
          <div class="task-checkbox ${isCompleted ? 'checked' : ''}" onclick="toggleTaskStatus('${task._id}', '${task.status}')">
            ${isCompleted ? '✓' : ''}
          </div>
          
          <div class="task-details">
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
              <span class="tag tag-category" style="background: ${task.category ? task.category.color : '#6366f1'}20; color: ${task.category ? task.category.color : '#6366f1'}">
                ${task.category ? task.category.name : 'Uncategorized'}
              </span>
              <span style="font-weight: 500; color: ${isOverdue ? 'var(--color-danger)' : 'var(--text-secondary)'};">
                📅 ${dateStr} ${isOverdue ? '(Overdue)' : ''}
              </span>
              <span style="font-weight: 500;">
                🚦 ${task.status}
              </span>
            </div>
            ${task.description ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 6px;">${task.description}</p>` : ''}
          </div>

          <div class="task-item-actions">
            <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.8rem;" onclick="openReminderModal('${task._id}')">⏰ Alert</button>
            <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.8rem;" onclick="openEditTaskModal('${task._id}')">✏️ Edit</button>
            <button class="btn" style="padding: 6px 10px; font-size: 0.8rem; background: transparent; color: var(--color-danger);" onclick="deleteTask('${task._id}')">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    updateBulkBar();

  } catch (err) {
    showToast('Failed to load tasks', 'error');
  }
}

// Bulk Selection Management
function toggleTaskChecked(id, isChecked) {
  if (isChecked) {
    checkedTaskIds.add(id);
  } else {
    checkedTaskIds.delete(id);
  }
  updateBulkBar();
}

function updateBulkBar() {
  const bulkBar = document.getElementById('bulkBar');
  const bulkCountText = document.getElementById('bulkCountText');
  
  if (checkedTaskIds.size > 0) {
    bulkBar.style.display = 'flex';
    bulkCountText.textContent = `${checkedTaskIds.size} item(s) selected`;
  } else {
    bulkBar.style.display = 'none';
  }
}

function clearBulkSelections() {
  checkedTaskIds.clear();
  // Uncheck checkboxes in HTML
  document.querySelectorAll('.task-bulk-chk').forEach(chk => chk.checked = false);
  updateBulkBar();
}

async function applyBulkUpdate() {
  const status = document.getElementById('bulkStatus').value;
  const priority = document.getElementById('bulkPriority').value;

  if (!status && !priority) {
    showToast('Please choose a status or priority to update', 'warning');
    return;
  }

  try {
    const ids = Array.from(checkedTaskIds);
    await api.post('/tasks/bulk-update', { ids, status, priority });
    showToast('Tasks updated successfully', 'success');
    checkedTaskIds.clear();
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function applyBulkDelete() {
  if (!confirm('Are you sure you want to delete the selected tasks?')) return;

  try {
    const ids = Array.from(checkedTaskIds);
    await api.post('/tasks/bulk-delete', { ids });
    showToast('Tasks deleted successfully', 'success');
    checkedTaskIds.clear();
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Single task status checktoggle
async function toggleTaskStatus(id, currentStatus) {
  try {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await api.put(`/tasks/${id}`, { status: nextStatus });
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Modal Control Functions
function openTaskModal() {
  document.getElementById('taskModalTitle').textContent = 'Create Task';
  document.getElementById('taskForm').reset();
  document.getElementById('taskIdField').value = '';
  document.getElementById('taskStatusGroup').style.display = 'none';
  if (document.getElementById('btnDeleteTaskModal')) {
    document.getElementById('btnDeleteTaskModal').style.display = 'none';
  }
  
  // Set default due date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
  document.getElementById('taskDueDate').value = tomorrow.toISOString().slice(0, 16);

  document.getElementById('taskModal').style.display = 'flex';
}

async function openEditTaskModal(id) {
  try {
    document.getElementById('taskModalTitle').textContent = 'Edit Task';
    document.getElementById('taskStatusGroup').style.display = 'block';
    if (document.getElementById('btnDeleteTaskModal')) {
      document.getElementById('btnDeleteTaskModal').style.display = 'block';
    }

    const res = await api.get('/tasks');
    const task = res.data.find(t => t._id === id);

    if (!task) return;

    document.getElementById('taskIdField').value = task._id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.description || '';
    document.getElementById('taskCategory').value = task.category ? task.category._id : '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;
    
    // Format date string for datetime-local
    const d = new Date(task.dueDate);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    document.getElementById('taskDueDate').value = d.toISOString().slice(0, 16);

    document.getElementById('taskModal').style.display = 'flex';
  } catch (err) {
    showToast('Failed to fetch task information', 'error');
  }
}

function closeTaskModal() {
  document.getElementById('taskModal').style.display = 'none';
}

function openCategoryModal() {
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryModal').style.display = 'flex';
}

function closeCategoryModal() {
  document.getElementById('categoryModal').style.display = 'none';
}

function openReminderModal(taskId) {
  document.getElementById('reminderForm').reset();
  document.getElementById('reminderTaskId').value = taskId;

  // Set default trigger time to 1 hour from now
  const triggerTime = new Date();
  triggerTime.setHours(triggerTime.getHours() + 1);
  triggerTime.setMinutes(triggerTime.getMinutes() - triggerTime.getTimezoneOffset());
  document.getElementById('remindTime').value = triggerTime.toISOString().slice(0, 16);

  document.getElementById('reminderModal').style.display = 'flex';
}

function closeReminderModal() {
  document.getElementById('reminderModal').style.display = 'none';
}

// Form Handlers
async function handleTaskFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('taskIdField').value;
  
  const localDateVal = document.getElementById('taskDueDate').value;
  if (!localDateVal) return;
  const isoDueDate = new Date(localDateVal).toISOString();

  const body = {
    title: document.getElementById('taskTitle').value,
    description: document.getElementById('taskDesc').value,
    categoryId: document.getElementById('taskCategory').value,
    dueDate: isoDueDate,
    priority: document.getElementById('taskPriority').value
  };

  try {
    if (id) {
      body.status = document.getElementById('taskStatus').value;
      await api.put(`/tasks/${id}`, body);
      showToast('Task updated successfully', 'success');
    } else {
      await api.post('/tasks', body);
      showToast('Task created successfully', 'success');
    }
    closeTaskModal();
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleCategoryFormSubmit(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('catName').value,
    color: document.getElementById('catColor').value
  };

  try {
    await api.post('/categories', body);
    showToast('Category created successfully', 'success');
    closeCategoryModal();
    loadCategories();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleReminderFormSubmit(e) {
  e.preventDefault();
  const taskId = document.getElementById('reminderTaskId').value;
  const localRemindVal = document.getElementById('remindTime').value;
  if (!localRemindVal) return;
  const isoRemindAt = new Date(localRemindVal).toISOString();

  try {
    await api.post('/reminders', { taskId, remindAt: isoRemindAt });
    showToast('Reminder scheduled successfully', 'success');
    closeReminderModal();
    loadReminders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleModalDeleteTask() {
  const id = document.getElementById('taskIdField').value;
  if (!id) return;
  if (confirm('Are you sure you want to delete this task?')) {
    try {
      await api.delete(`/tasks/${id}`);
      showToast('Task deleted successfully', 'success');
      closeTaskModal();
      loadTasks();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

// Delete Handlers
async function deleteTask(id) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    await api.delete(`/tasks/${id}`);
    showToast('Task deleted successfully', 'success');
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteCategory(id) {
  if (!confirm('Are you sure you want to delete this category? All associated tasks will be reassigned to General.')) return;
  try {
    const res = await api.delete(`/categories/${id}`);
    showToast(res.message, 'success');
    loadCategories();
    loadTasks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteReminder(id) {
  try {
    await api.delete(`/reminders/${id}`);
    showToast('Reminder cancelled', 'success');
    loadReminders();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Pagination Controls
function changePage(direction) {
  currentPage += direction;
  loadTasks();
}
