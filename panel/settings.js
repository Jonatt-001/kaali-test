import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- 1. SUPABASE CONFIG ---
const supabaseUrl = 'https://umzpdqsjrthzxjdjfdej.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtenBkcXNqcnRoenhqZGpmZGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxOTkzNDUsImV4cCI6MjA5ODc3NTM0NX0.WL5o3fEwdlmE03zarFEv-PvQjedCklSqVcKR_ButMCE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 2. DOM ELEMENTS ---
const navLinks = document.querySelectorAll('.settings-nav-link');
const sections = document.querySelectorAll('.settings-section');
const generalForm = document.getElementById('general-form');
const apiKeyDisplay = document.getElementById('api-key-display');
const apiFormInputs = [document.getElementById('webhook-url')];

// Auth elements
const userNameEl = document.getElementById('user-name');
const userAvatarEl = document.getElementById('user-avatar');
const authBtn = document.getElementById('auth-btn');

// --- 3. AUTH UI ---
async function updateAuthUI(session) {
  if (session) {
    const user = session.user;
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    if(userNameEl) userNameEl.textContent = name;
    if(userAvatarEl) userAvatarEl.textContent = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if(authBtn) authBtn.textContent = 'Sign Out';
  }
}
if(authBtn) authBtn.addEventListener('click', async () => { if (authBtn.textContent === 'Sign Out') await supabase.auth.signOut(); });
supabase.auth.onAuthStateChange((event, session) => { updateAuthUI(session); loadSettings(); });

// --- 4. NAVIGATION LOGIC ---
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href').substring(1);
    
    // Update active link
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    // Show target section, hide others
    sections.forEach(section => {
      if (section.id === targetId) {
        section.style.display = 'block';
      } else {
        section.style.display = 'none';
      }
    });
  });
});

// --- 5. DATA FETCHING & RENDERING ---
async function loadSettings() {
  try {
    const { data, error } = await supabase.from('settings').select('*').single();
    
    if (error) {
      console.warn('Settings table not found or empty. Using defaults.');
      populateFormDefaults();
      return;
    }
    
    // Populate General Form
    document.getElementById('site-name').value = data.site_name || '';
    document.getElementById('site-url').value = data.site_url || '';
    document.getElementById('site-lang').value = data.site_lang || 'en';
    document.getElementById('site-timezone').value = data.site_timezone || 'UTC';
    
    // Populate API
    apiKeyDisplay.value = data.api_key || 'Not generated';
    document.getElementById('webhook-url').value = data.webhook_url || '';
    
    // Populate Security
    document.getElementById('toggle-2fa').checked = data.two_factor_enabled || false;
    document.getElementById('session-timeout').value = data.session_timeout || '30';
    document.getElementById('toggle-maintenance').checked = data.maintenance_mode || false;

  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

function populateFormDefaults() {
  apiKeyDisplay.value = 'nx_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// --- 6. SAVE LOGIC ---
generalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    site_name: document.getElementById('site-name').value,
    site_url: document.getElementById('site-url').value,
    site_lang: document.getElementById('site-lang').value,
    site_timezone: document.getElementById('site-timezone').value,
    updated_at: new Date().toISOString()
  };
  await saveSettings(payload);
});

document.getElementById('save-api-btn').addEventListener('click', async () => {
  const payload = {
    webhook_url: document.getElementById('webhook-url').value,
    updated_at: new Date().toISOString()
  };
  await saveSettings(payload);
});

document.getElementById('save-security-btn').addEventListener('click', async () => {
  const payload = {
    two_factor_enabled: document.getElementById('toggle-2fa').checked,
    session_timeout: parseInt(document.getElementById('session-timeout').value),
    maintenance_mode: document.getElementById('toggle-maintenance').checked,
    updated_at: new Date().toISOString()
  };
  await saveSettings(payload);
});

async function saveSettings(payload) {
  try {
    // Upsert: Insert if no ID exists, or Update if it does. 
    // For simplicity, we assume a single row with id = 1.
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 1, ...payload }, { onConflict: 'id' });
      
    if (error) throw error;
    showToast('Settings saved successfully!');
  } catch (error) {
    console.error('Save error:', error);
    showToast('Failed to save settings.');
  }
}

// --- 7. ACTIONS ---
document.getElementById('copy-api-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(apiKeyDisplay.value);
  showToast('API Key copied to clipboard!');
});

document.getElementById('regenerate-api-btn').addEventListener('click', async () => {
  if (confirm('Are you sure? This will break any active integrations.')) {
    const newKey = 'nx_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await saveSettings({ api_key: newKey });
    apiKeyDisplay.value = newKey;
    showToast('New API Key generated.');
  }
});

document.getElementById('delete-site-btn').addEventListener('click', async () => {
  const input = prompt('Type "DELETE" to confirm site deletion:');
  if (input === 'DELETE') {
    showToast('Deleting site... (This is a demo)');
    // In real app: await supabase.from('sites').delete().eq('id', currentSiteId);
  }
});

// --- UTILITIES ---
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

// --- INIT ---
supabase.auth.getSession().then(({ data: { session } }) => {
  updateAuthUI(session);
  if (session) loadSettings();
  else populateFormDefaults(); // Show mock data for demo
});
