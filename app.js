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

async function createKey() {
    const name = prompt("Enter name for new API Key (e.g. 'Glass Desk Production')");
    if (!name) return;

    const res = await api('/keys', 'POST', { name });
    const data = await res.json();

    if (res.ok) {
        alert(`Key Created!\n\nToken: ${data.key}\n\nSAVE THIS NOW. It will not be shown again.`);
        loadKeys();
    } else {
        alert('Error: ' + data.error);
    }
}

async function deleteKey(keyId) {
    if (!confirm('Are you sure you want to delete this key? Access will be revoked immediately.')) return;
    await api('/keys', 'DELETE', { key: keyId });
    loadKeys();
}

async function loadWhitelist() {
    const tbody = document.querySelector('#whitelistTable tbody');
    tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    const res = await api('/whitelist');
    if (!res) return;
    const list = await res.json(); // Returns Object {ip: label}

    tbody.innerHTML = Object.keys(list).length ? '' : '<tr><td colspan="3">No IPs whitelisted (Open Access?)</td></tr>';

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

function promptAddIP() {
    const ip = prompt("Enter IP Address to whitelist:");
    if (!ip) return;
    const label = prompt("Enter a label (e.g. 'Office VPN'):") || "User Added";

    addIP(ip, label);
}

async function addIP(ip, label) {
    await api('/whitelist', 'POST', { ip, label });
    loadWhitelist();
}

async function removeIP(ip) {
    if (!confirm(`Revoke access for ${ip}?`)) return;
    await api('/whitelist', 'DELETE', { ip });
    loadWhitelist();
}

// --- Config ---
async function loadConfig() {
    // We can show this in Stats or a Config tab.
    // For now, let's just log it or show in stats.
    const res = await api('/config');
    if (res) {
        const data = await res.json();
        // Update UI if we had a field for it
        // Config loaded

        // Maybe update stats card?
    }
}

// Global scope for HTML onclick
window.createKey = createKey;
window.deleteKey = deleteKey;
window.promptAddIP = promptAddIP;
window.removeIP = removeIP;
window.loadKeys = loadKeys;
window.loadWhitelist = loadWhitelist;
