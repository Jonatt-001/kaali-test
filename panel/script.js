import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- 1. SUPABASE CONFIG ---
const supabaseUrl = 'https://umzpdqsjrthzxjdjfdej.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtenBkcXNqcnRoenhqZGpmZGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxOTkzNDUsImV4cCI6MjA5ODc3NTM0NX0.WL5o3fEwdlmE03zarFEv-PvQjedCklSqVcKR_ButMCE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 2. DOM ELEMENTS ---
const userNameEl = document.getElementById('user-name');
const userEmailEl = document.getElementById('user-email');
const userAvatarEl = document.getElementById('user-avatar');
const headerNameEl = document.getElementById('header-name');
const authBtn = document.getElementById('auth-btn');

// --- 3. AUTH LOGIC ---
async function updateAuthUI(session) {
  if (session) {
    const user = session.user;
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    if(userNameEl) userNameEl.textContent = name;
    if(userEmailEl) userEmailEl.textContent = user.email;
    if(userAvatarEl) userAvatarEl.textContent = initials;
    if(headerNameEl) headerNameEl.textContent = name.split(' ')[0];
    if(authBtn) authBtn.textContent = 'Sign Out';
  } else {
    if(userNameEl) userNameEl.textContent = 'Guest';
    if(userAvatarEl) userAvatarEl.textContent = 'GU';
    if(authBtn) authBtn.textContent = 'Sign In';
  }
}

if(authBtn) {
  authBtn.addEventListener('click', async () => {
    if (authBtn.textContent === 'Sign Out') await supabase.auth.signOut();
  });
}

supabase.auth.onAuthStateChange((event, session) => {
  updateAuthUI(session);
  if (session) fetchAllDashboardData();
  else loadMockData();
});

// --- 4. UI INTERACTIONS & QUICK ACTIONS ---
// Lightweight Toast notification helper
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Wire up Quick Actions Buttons
document.getElementById('btn-new-post')?.addEventListener('click', () => {
  showToast('Opening Post Editor...');
  // window.location.href = 'editor.html?type=post';
});

document.getElementById('btn-new-page')?.addEventListener('click', () => {
  showToast('Opening Page Editor...');
  // window.location.href = 'editor.html?type=page';
});

document.getElementById('btn-manage-media')?.addEventListener('click', () => {
  window.location.href = 'media.html';
});

document.getElementById('btn-manage-users')?.addEventListener('click', () => {
  showToast('Opening User Management...');
  // window.location.href = 'users.html';
});

// Wire up System Logs Refresh Button
document.querySelector('#system-logs-card .btn-secondary')?.addEventListener('click', async (e) => {
  const btn = e.target;
  btn.textContent = 'Refreshing...';
  btn.disabled = true;
  await fetchSystemLogs();
  btn.textContent = 'Refresh';
  btn.disabled = false;
});

// --- 5. ROBUST DATA FETCHING ---
async function fetchAllDashboardData() {
  try {
    // Use Promise.allSettled so if ONE table is missing/throws an error, the REST still load perfectly
    const [pagesRes, postsRes, usersRes, storageRes] = await Promise.allSettled([
      supabase.from('pages').select('id', { count: 'exact', head: true }),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }), // Assumes a public 'users' or 'profiles' table
      supabase.from('storage_stats').select('used_gb').single() // Assumes a view or table for storage
    ]);

    // Update Stats safely
    if (pagesRes.status === 'fulfilled' && !pagesRes.value.error) {
      updateStat('stat-pages', pagesRes.value.count || 24);
    }
    if (postsRes.status === 'fulfilled' && !postsRes.value.error) {
      updateStat('stat-posts', postsRes.value.count || 142);
    }
    if (usersRes.status === 'fulfilled' && !usersRes.value.error) {
      updateStat('stat-users', usersRes.value.count || 1204);
    }
    
    // Update Storage Card dynamically
    if (storageRes.status === 'fulfilled' && !storageRes.value.error && storageRes.value.data) {
      const used = storageRes.value.data.used_gb || 4.2;
      const limit = 10;
      const pct = Math.round((used / limit) * 100);
      const storageUsedEl = document.getElementById('storage-used');
      const storageFillEl = document.getElementById('storage-fill');
      if(storageUsedEl) storageUsedEl.textContent = `${used} GB`;
      if(storageFillEl) storageFillEl.style.width = `${pct}%`;
    }

    // Fetch Lists concurrently
    await Promise.all([
      fetchRecentContent(),
      fetchActivities(),
      fetchNotifications(),
      fetchProjects(),
      fetchScheduledTasks(),
      fetchSystemLogs()
    ]);

  } catch (error) {
    console.warn('Unexpected error in dashboard fetch. Loading mock data...', error.message);
    loadMockData();
  }
}

// Individual fetch functions for clean code
async function fetchRecentContent() {
  const { data, error } = await supabase.from('posts').select('title, type, status').order('created_at', { ascending: false }).limit(5);
  renderRecentContent(error ? [] : data || []);
}

async function fetchActivities() {
  const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5);
  renderActivityList('activity-list', error ? [] : data || []);
}

async function fetchNotifications() {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(5);
  renderActivityList('notifications-list', error ? [] : data || []);
}

async function fetchProjects() {
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(5);
  renderProjectsTable(error ? [] : data || []);
}

async function fetchScheduledTasks() {
  const { data, error } = await supabase.from('scheduled_tasks').select('*').order('next_run', { ascending: true }).limit(5);
  renderActivityList('scheduled-tasks-list', error ? [] : data || []);
}

async function fetchSystemLogs() {
  const { data, error } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(20);
  renderSystemLogs(error ? [] : data || []);
}

// --- 6. RENDER FUNCTIONS ---
function updateStat(id, value) {
  const el = document.querySelector(`#${id} .stat-value`);
  if (el) el.textContent = value.toLocaleString();
}

function renderRecentContent(items) {
  const tbody = document.getElementById('recent-content-body');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 2rem; color: var(--text-tertiary);">No recent content.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(item => `
    <tr>
      <td class="font-semibold">${item.title}</td>
      <td><span class="badge badge-neutral">${item.type || 'Post'}</span></td>
      <td><span class="badge ${getBadgeClass(item.status)}">${item.status || 'Draft'}</span></td>
    </tr>
  `).join('');
}

function renderActivityList(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<p class="text-secondary text-sm">No items to show.</p>';
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div class="activity-content">
        <p>${item.description || item.title || item.task_name}</p>
        <span>${formatTimeAgo(item.created_at || item.next_run)}</span>
      </div>
    </div>
  `).join('');
}

function renderProjectsTable(projects) {
  const tbody = document.getElementById('projects-table-body');
  if (!tbody) return;
  if (!projects.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 2rem; color: var(--text-tertiary);">No active projects.</td></tr>';
    return;
  }
  tbody.innerHTML = projects.map(p => `
    <tr>
      <td class="font-semibold">${p.name}</td>
      <td><span class="badge ${getBadgeClass(p.status)}">${p.status}</span></td>
      <td class="text-secondary">${formatDate(p.due_date)}</td>
    </tr>
  `).join('');
}

function renderSystemLogs(logs) {
  const container = document.getElementById('system-logs-body');
  if (!container) return;
  if (!logs.length) {
    container.innerHTML = '<p style="color: var(--text-tertiary);">No system logs available.</p>';
    return;
  }
  container.innerHTML = logs.map(log => `
    <div style="margin-bottom: 4px; border-bottom: 1px solid var(--border); padding-bottom: 4px;">
      <span style="color: var(--text-tertiary);">[${new Date(log.created_at).toLocaleTimeString()}]</span>
      <span style="color: ${log.level === 'ERROR' ? 'var(--danger)' : log.level === 'WARN' ? 'var(--warning)' : 'var(--text-secondary)'}; font-weight: 600;">${log.level}</span>
      ${log.message}
    </div>
  `).join('');
}

// --- 7. MOCK DATA FALLBACK ---
function loadMockData() {
  updateStat('stat-pages', 24);
  updateStat('stat-posts', 142);
  updateStat('stat-users', 1204);
  
  // Update Storage Mock
  const storageUsedEl = document.getElementById('storage-used');
  const storageFillEl = document.getElementById('storage-fill');
  if(storageUsedEl) storageUsedEl.textContent = '4.2 GB';
  if(storageFillEl) storageFillEl.style.width = '42%';

  renderRecentContent([
    { title: 'Getting Started with Nexus CMS', type: 'Guide', status: 'Published' },
    { title: 'Top 10 Design Trends for 2026', type: 'Blog', status: 'Draft' },
    { title: 'Product Update: v2.0', type: 'Page', status: 'Published' }
  ]);

  renderActivityList('activity-list', [
    { description: 'Alice published a new post', created_at: new Date().toISOString() },
    { description: 'Bob updated the homepage', created_at: new Date(Date.now() - 3600000).toISOString() }
  ]);

  renderActivityList('notifications-list', [
    { description: 'New user registration: charlie@example.com', created_at: new Date().toISOString() },
    { description: 'Storage usage reached 80%', created_at: new Date(Date.now() - 7200000).toISOString() }
  ]);

  renderProjectsTable([
    { name: 'Website Redesign', status: 'In Progress', due_date: '2026-08-15' },
    { name: 'Mobile App v2', status: 'Completed', due_date: '2026-06-01' }
  ]);

  renderActivityList('scheduled-tasks-list', [
    { task_name: 'Database Backup', next_run: new Date(Date.now() + 3600000).toISOString() },
    { task_name: 'Clear Cache', next_run: new Date(Date.now() + 86400000).toISOString() }
  ]);

  renderSystemLogs([
    { level: 'INFO', message: 'Server started successfully', created_at: new Date().toISOString() },
    { level: 'WARN', message: 'High memory usage detected', created_at: new Date(Date.now() - 1800000).toISOString() },
    { level: 'ERROR', message: 'Failed to connect to external API', created_at: new Date(Date.now() - 3600000).toISOString() }
  ]);
}

// --- 8. UTILITIES ---
function getBadgeClass(status) {
  const map = { 'Completed': 'badge-success', 'In Progress': 'badge-warning', 'Pending': 'badge-neutral', 'Published': 'badge-success', 'Draft': 'badge-neutral' };
  return map[status] || 'badge-neutral';
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'N/A';
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  let interval = seconds / 3600;
  if (interval > 24) return Math.floor(interval / 24) + " days ago";
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
}

// --- INIT ---
supabase.auth.getSession().then(({ data: { session } }) => {
  updateAuthUI(session);
  if (session) fetchAllDashboardData();
  else loadMockData();
});

