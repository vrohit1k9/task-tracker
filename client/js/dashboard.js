document.addEventListener('DOMContentLoaded', () => {
  const user = auth.getUser();
  if (user) {
    document.getElementById('welcomeUser').textContent = `Welcome, ${user.username}`;
    if (auth.isAdmin()) {
      document.getElementById('adminNavLink').style.display = 'block';
    }
  }

  loadStats();
  loadCharts();
  loadDeadlines();
  loadNotifications();
});

let weeklyChartInstance = null;
let categoryChartInstance = null;

async function loadStats() {
  try {
    const res = await api.get('/analytics/overview');
    const { stats } = res.data;

    document.getElementById('statTotal').textContent = stats.total;
    document.getElementById('statCompleted').textContent = stats.completed;
    document.getElementById('statPending').textContent = stats.pending;
    document.getElementById('statOverdue').textContent = stats.overdue;
  } catch (err) {
    showToast('Failed to load statistics', 'error');
  }
}

async function loadCharts() {
  try {
    // 1. Load category data
    const resOverview = await api.get('/analytics/overview');
    const { categoryStats } = resOverview.data;

    // Render Category Chart
    const ctxCat = document.getElementById('categoryChart').getContext('2d');
    const catLabels = categoryStats.map(c => c.name);
    const catCounts = categoryStats.map(c => c.count);
    const catColors = categoryStats.map(c => c.color || '#6366f1');

    if (categoryChartInstance) categoryChartInstance.destroy();
    
    categoryChartInstance = new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catCounts,
          backgroundColor: catColors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() }
          }
        }
      }
    });

    // 2. Load weekly line chart data
    const resWeekly = await api.get('/analytics/weekly');
    const { labels, completed, created } = resWeekly.data;

    const ctxWeek = document.getElementById('weeklyChart').getContext('2d');
    if (weeklyChartInstance) weeklyChartInstance.destroy();

    weeklyChartInstance = new Chart(ctxWeek, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Completed Tasks',
            data: completed,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Created Tasks',
            data: created,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() }
          },
          x: {
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() }
          }
        },
        plugins: {
          legend: {
            labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() }
          }
        }
      }
    });

  } catch (err) {
    showToast('Failed to generate charts', 'error');
  }
}

async function loadDeadlines() {
  try {
    // Fetch pending tasks sorted by due date
    const res = await api.get('/tasks?status=pending&sortBy=dueDate&sortOrder=asc&limit=5');
    const container = document.getElementById('deadlinesList');

    if (res.data.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">No upcoming tasks. Enjoy your day!</div>`;
      return;
    }

    container.innerHTML = res.data.map(task => {
      const dueDate = new Date(task.dueDate);
      const isOverdue = dueDate < new Date();
      const timeStr = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="deadline-item">
          <div>
            <div style="font-weight: 600; font-size: 0.95rem;">${task.title}</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">Category: ${task.category ? task.category.name : 'None'}</div>
          </div>
          <div style="text-align: right;">
            <span class="tag" style="background: ${task.category ? task.category.color : '#6366f1'}20; color: ${task.category ? task.category.color : '#6366f1'}">${task.priority}</span>
            <div style="font-size: 0.8rem; font-weight: 500; margin-top: 4px; color: ${isOverdue ? 'var(--color-danger)' : 'var(--text-secondary)'};">
              ${isOverdue ? 'Overdue: ' : 'Due: '}${timeStr}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showToast('Failed to load upcoming deadlines', 'error');
  }
}

async function loadNotifications() {
  try {
    const res = await api.get('/notifications?limit=5');
    const container = document.getElementById('notificationsList');

    if (res.data.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">No notifications yet.</div>`;
      return;
    }

    container.innerHTML = res.data.map(notif => {
      const timeStr = new Date(notif.createdAt).toLocaleDateString(undefined, { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="notif-item ${notif.read ? 'read' : ''}" onclick="markNotificationRead('${notif._id}')" style="cursor: pointer;">
          <div>${notif.message}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; text-align: right;">${timeStr}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    showToast('Failed to load notifications', 'error');
  }
}

async function markNotificationRead(id) {
  try {
    await api.put(`/notifications/${id}/read`);
    loadNotifications();
  } catch (err) {
    console.error(err);
  }
}

async function markAllNotificationsRead() {
  try {
    await api.put('/notifications/read-all');
    showToast('All alerts marked read', 'success');
    loadNotifications();
  } catch (err) {
    showToast('Failed to clear notifications', 'error');
  }
}
