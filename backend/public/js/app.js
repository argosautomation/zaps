// Zaps.ai Admin Dashboard Logic

const API_BASE = '/api/admin';

// --- Utils ---
async function api(endpoint, method = 'GET', body = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    if (res.status === 401) {
        window.location.href = 'index.html';
        return null;
    }
    return res;
}

// --- Main Views ---

// --- Modal Helpers ---
function modal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

function customAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    modal('alertModal');
}

function customConfirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;

    // Clone button to remove old listeners
    const oldBtn = document.getElementById('confirmActionBtn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    newBtn.onclick = () => {
        closeModal('confirmModal');
        onConfirm();
    };

    modal('confirmModal');
}

// --- Main Views ---

async function loadKeys() {
    const tbody = document.querySelector('#keysTable tbody');
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

    const res = await api('/keys');
    if (!res) return;
    const keys = (await res.json()) || [];

    tbody.innerHTML = keys.length ? '' : '<tr><td colspan="5">No keys found.</td></tr>';

    keys.forEach(k => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${k.name}</td>
            <td><code>${k.prefix}</code></td>
            <td>${new Date(k.created).toLocaleDateString()}</td>
            <td><span class="status-badge">Active</span></td>
            <td><button class="btn-danger btn-sm" onclick="deleteKey('${k.key_id}')">Delete</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function openKeyModal() {
    document.getElementById('keyName').value = '';
    modal('createKeyModal');
    setTimeout(() => document.getElementById('keyName').focus(), 100);
}

async function generateKey(e) {
    e.preventDefault();
    const name = document.getElementById('keyName').value;
    if (!name) return;

    closeModal('createKeyModal');

    // Call API
    try {
        const res = await api('/keys', 'POST', { name });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('newKeyDisplay').value = data.key;
            modal('keySuccessModal');
            loadKeys();
        } else {
            customAlert('Error', data.error);
        }
    } catch (err) {
        customAlert('Error', 'Failed to generate key');
    }
}

function deleteKey(keyId) {
    customConfirm('Delete API Key', 'Are you sure you want to delete this key? Access will be revoked immediately.', async () => {
        await api('/keys', 'DELETE', { key: keyId });
        loadKeys();
    });
}

// --- Whitelist ---

async function loadWhitelist() {
    const tbody = document.querySelector('#whitelistTable tbody');
    tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    const res = await api('/whitelist');
    if (!res) return;
    const list = await res.json();

    tbody.innerHTML = Object.keys(list).length ? '' : '<tr><td colspan="3">No IPs whitelisted.</td></tr>';

    Object.entries(list).forEach(([ip, label]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${ip}</code></td>
            <td>${label}</td>
            <td><button class="btn-danger btn-sm" onclick="removeIP('${ip}')">Remove</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function openIpModal() {
    document.getElementById('newIp').value = '';
    document.getElementById('newIpLabel').value = '';
    modal('addIpModal');
    setTimeout(() => document.getElementById('newIp').focus(), 100);
}

async function addIpSubmit(e) {
    e.preventDefault();
    const ip = document.getElementById('newIp').value;
    const label = document.getElementById('newIpLabel').value;

    if (!ip || !label) return;

    closeModal('addIpModal');
    await api('/whitelist', 'POST', { ip, label });
    loadWhitelist();
}

async function removeIP(ip) {
    customConfirm('Revoke Access', `Remove access for ${ip}?`, async () => {
        await api('/whitelist', 'DELETE', { ip });
        loadWhitelist();
    });
}

// --- Config ---
async function loadConfig() {
    // Only load global config if admin? Or just ignore for now as we have Per-User config above
}

// --- Providers ---
async function loadProviders() {
    // Clear first
    document.getElementById('prov-openai').value = '';
    document.getElementById('prov-deepseek').value = '';
    document.getElementById('prov-anthropic').value = '';

    const res = await api('/providers');
    if (!res) return;
    const data = await res.json();

    // Data is { openai: "sk-...", deepseek: "..." } (masked)
    // We only set placeholder/value if exists? 
    // Actually password fields shouldn't show masked value as value.
    // We'll show "********" as placeholder to indicate it is set.

    if (data.openai) document.getElementById('prov-openai').placeholder = "******** (Configured)";
    if (data.deepseek) document.getElementById('prov-deepseek').placeholder = "******** (Configured)";
    if (data.anthropic) document.getElementById('prov-anthropic').placeholder = "******** (Configured)";
}

async function saveProviders(e) {
    e.preventDefault();

    const body = {
        openai: document.getElementById('prov-openai').value,
        deepseek: document.getElementById('prov-deepseek').value,
        anthropic: document.getElementById('prov-anthropic').value
    };

    // Only send fields that track changes
    if (!body.openai) delete body.openai;
    if (!body.deepseek) delete body.deepseek;
    if (!body.anthropic) delete body.anthropic;

    if (Object.keys(body).length === 0) {
        customAlert('Info', 'No changes to save.');
        return;
    }

    try {
        const res = await api('/providers', 'POST', body);
        if (res.ok) {
            customAlert('Success', 'Provider configuration updated!');
            // Reset fields
            document.getElementById('prov-openai').value = '';
            document.getElementById('prov-deepseek').value = '';
            document.getElementById('prov-anthropic').value = '';
            loadProviders(); // Refresh placeholders
        } else {
            customAlert('Error', 'Failed to save configuration.');
        }
    } catch (e) {
        console.error(e);
        customAlert('Error', 'Connection failed.');
    }
}

// --- User Management (Migrated) ---

async function loadUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '<tr><td>Loading...</td></tr>';

    try {
        const res = await api('/users'); // Uses api helper
        const users = await res.json();

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.username}</td>
                <td><span class="status-badge">${u.role}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3">Error loading users</td></tr>';
    }
}

async function createUser(e) {
    e.preventDefault();
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('initialPass').value;

    try {
        const res = await api('/users', 'POST', { username, password });
        const data = await res.json();

        if (res && res.ok) {
            customAlert('Success', 'User created successfully!');
            closeModal('createUserModal');
            e.target.reset();
            loadUsers();
        } else {
            customAlert('Error', data.error || 'Failed');
        }
    } catch (e) {
        customAlert('Error', 'Connection error');
    }
}

async function changePassword(e) {
    e.preventDefault();
    const pass = document.getElementById('newPass').value;
    const res = await api('/change-password', 'POST', { new_password: pass });
    const data = await res.json();

    customAlert(data.status ? 'Success' : 'Error', data.status || data.error);
    if (data.status) document.getElementById('newPass').value = '';
}

async function logout() {
    await api('/logout', 'POST');
    window.location.href = '/admin/';
}

// Global scope
window.modal = modal;
window.closeModal = closeModal;
window.openKeyModal = openKeyModal;
window.generateKey = generateKey;
window.deleteKey = deleteKey;
window.openIpModal = openIpModal;
window.addIpSubmit = addIpSubmit;
window.removeIP = removeIP;
window.loadKeys = loadKeys;
window.loadWhitelist = loadWhitelist;
window.loadUsers = loadUsers;
window.createUser = createUser;
window.changePassword = changePassword;
window.loadProviders = loadProviders;
window.saveProviders = saveProviders;
window.logout = logout;
window.customAlert = customAlert;
