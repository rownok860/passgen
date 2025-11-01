// DOM Elements
const passwordField = document.getElementById('password-field');
const copyBtn = document.getElementById('copy-btn');
const regenerateBtn = document.getElementById('regenerate-btn');
const generateBtn = document.getElementById('generate-btn');
const lengthSlider = document.getElementById('length-slider');
const lengthValue = document.getElementById('length-value');
const uppercaseToggle = document.getElementById('uppercase-toggle');
const lowercaseToggle = document.getElementById('lowercase-toggle');
const numbersToggle = document.getElementById('numbers-toggle');
const symbolsToggle = document.getElementById('symbols-toggle');
const autocopyToggle = document.getElementById('autocopy-toggle');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const updateBtn = document.getElementById('update-btn');
const updateBadge = document.getElementById('update-badge');
const githubBtn = document.getElementById('github-btn');
const toast = document.getElementById('toast');
const passwordList = document.getElementById('password-list');

// Constants - UPDATED WITH YOUR GITHUB
const VERSION_JSON_URL = 'https://raw.githubusercontent.com/rownok860/passgen/main/version.json';
const GITHUB_REPO_URL = 'https://github.com/rownok860/passgen';
const MAX_RECENT_PASSWORDS = 5;

// Initialize extension
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadRecentPasswords();
    await checkStoredUpdateInfo();
    generatePassword();
    
    setupEventListeners();
});

async function loadSettings() {
    try {
        const result = await chrome.storage.local.get([
            'passwordLength',
            'includeUppercase',
            'includeLowercase',
            'includeNumbers',
            'includeSymbols',
            'autoCopy'
        ]);
        
        lengthSlider.value = result.passwordLength || 12;
        lengthValue.textContent = lengthSlider.value;
        
        uppercaseToggle.checked = result.includeUppercase !== false;
        lowercaseToggle.checked = result.includeLowercase !== false;
        numbersToggle.checked = result.includeNumbers !== false;
        symbolsToggle.checked = result.includeSymbols !== false;
        autocopyToggle.checked = result.autoCopy !== false;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    try {
        await chrome.storage.local.set({
            passwordLength: parseInt(lengthSlider.value),
            includeUppercase: uppercaseToggle.checked,
            includeLowercase: lowercaseToggle.checked,
            includeNumbers: numbersToggle.checked,
            includeSymbols: symbolsToggle.checked,
            autoCopy: autocopyToggle.checked
        });
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

async function loadRecentPasswords() {
    try {
        const result = await chrome.storage.local.get('recentPasswords');
        const recentPasswords = result.recentPasswords || [];
        renderRecentPasswords(recentPasswords);
    } catch (error) {
        console.error('Error loading recent passwords:', error);
    }
}

function renderRecentPasswords(passwords) {
    passwordList.innerHTML = '';
    
    if (passwords.length === 0) {
        passwordList.innerHTML = '<div class="empty-state">No recent passwords</div>';
        return;
    }
    
    passwords.forEach((item, index) => {
        const passwordItem = document.createElement('div');
        passwordItem.className = 'password-item';
        passwordItem.innerHTML = `
            <span class="password-text">${maskPassword(item.password)}</span>
            <div class="password-actions-small">
                <button class="icon-btn copy-recent-btn" data-password="${item.password}" title="Copy password">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                </button>
                <button class="icon-btn delete-recent-btn" data-index="${index}" title="Delete password">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        `;
        passwordList.appendChild(passwordItem);
    });
    
    document.querySelectorAll('.copy-recent-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const password = e.target.closest('.copy-recent-btn').dataset.password;
            copyRecentPassword(password);
        });
    });
    
    document.querySelectorAll('.delete-recent-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.closest('.delete-recent-btn').dataset.index);
            deleteRecentPassword(index);
        });
    });
}

function maskPassword(password) {
    if (password.length <= 8) {
        return password;
    }
    return password.substring(0, 6) + '...';
}

async function addToRecentPasswords(password) {
    try {
        const result = await chrome.storage.local.get('recentPasswords');
        let recentPasswords = result.recentPasswords || [];
        
        recentPasswords = recentPasswords.filter(item => item.password !== password);
        
        recentPasswords.unshift({
            password: password,
            timestamp: Date.now()
        });
        
        recentPasswords = recentPasswords.slice(0, MAX_RECENT_PASSWORDS);
        
        await chrome.storage.local.set({ recentPasswords });
        renderRecentPasswords(recentPasswords);
    } catch (error) {
        console.error('Error saving recent password:', error);
    }
}

async function copyRecentPassword(password) {
    try {
        await navigator.clipboard.writeText(password);
        showToast('Password copied to clipboard!');
    } catch (error) {
        console.error('Error copying recent password:', error);
        showToast('Failed to copy password');
    }
}

async function deleteRecentPassword(index) {
    try {
        const result = await chrome.storage.local.get('recentPasswords');
        let recentPasswords = result.recentPasswords || [];
        
        recentPasswords.splice(index, 1);
        await chrome.storage.local.set({ recentPasswords });
        renderRecentPasswords(recentPasswords);
        showToast('Password deleted');
    } catch (error) {
        console.error('Error deleting recent password:', error);
    }
}

async function clearRecentPasswords() {
    try {
        await chrome.storage.local.set({ recentPasswords: [] });
        renderRecentPasswords([]);
        showToast('All passwords cleared');
    } catch (error) {
        console.error('Error clearing recent passwords:', error);
    }
}

function generatePassword() {
    const length = parseInt(lengthSlider.value);
    const includeUppercase = uppercaseToggle.checked;
    const includeLowercase = lowercaseToggle.checked;
    const includeNumbers = numbersToggle.checked;
    const includeSymbols = symbolsToggle.checked;
    
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let characters = '';
    if (includeUppercase) characters += uppercase;
    if (includeLowercase) characters += lowercase;
    if (includeNumbers) characters += numbers;
    if (includeSymbols) characters += symbols;
    
    if (characters.length === 0) {
        showToast('Select at least one character type');
        return;
    }
    
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters[randomIndex];
    }
    
    passwordField.value = password;
    
    if (autocopyToggle.checked) {
        navigator.clipboard.writeText(password)
            .then(() => showToast('Password copied to clipboard!'))
            .catch(err => console.error('Failed to copy:', err));
    }
    
    addToRecentPasswords(password);
    saveSettings();
}

async function checkForUpdates() {
    try {
        showToast('Checking for updates...');
        
        const response = await fetch(VERSION_JSON_URL + '?t=' + Date.now());
        if (!response.ok) throw new Error('Failed to fetch version info');
        
        const versionData = await response.json();
        const currentVersion = chrome.runtime.getManifest().version;
        
        if (compareVersions(versionData.version, currentVersion) > 0) {
            showUpdateAvailable(versionData);
        } else {
            showToast('You have the latest version!');
        }
    } catch (error) {
        console.error('Failed to check for updates:', error);
        showToast('Failed to check for updates');
    }
}

function showUpdateAvailable(versionData) {
    updateBadge.style.display = 'block';
    updateBadge.textContent = `v${versionData.version} available`;
    
    // Make both the button and badge clickable
    updateBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        Update Now
    `;
    updateBtn.classList.add('update-available');
    
    const updateUrl = versionData.download_url || GITHUB_REPO_URL + '/releases/latest';
    
    updateBtn.onclick = () => {
        chrome.tabs.create({ url: updateUrl });
    };
    
    updateBadge.onclick = () => {
        chrome.tabs.create({ url: updateUrl });
    };
    
    chrome.storage.local.set({
        updateAvailable: true,
        latestVersion: versionData.version,
        downloadUrl: updateUrl
    });
    
    showToast(`New version ${versionData.version} available! Click to update.`);
}

function compareVersions(v1, v2) {
    const v1Parts = v1.replace(/^v/, '').split('.').map(Number);
    const v2Parts = v2.replace(/^v/, '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;
        
        if (v1Part > v2Part) return 1;
        if (v1Part < v2Part) return -1;
    }
    
    return 0;
}

async function checkStoredUpdateInfo() {
    try {
        const result = await chrome.storage.local.get(['updateAvailable', 'latestVersion', 'downloadUrl']);
        if (result.updateAvailable && result.latestVersion) {
            showUpdateAvailable({
                version: result.latestVersion,
                download_url: result.downloadUrl || GITHUB_REPO_URL + '/releases/latest'
            });
        }
    } catch (error) {
        console.error('Error checking stored update info:', error);
    }
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

function setupEventListeners() {
    lengthSlider.addEventListener('input', () => {
        lengthValue.textContent = lengthSlider.value;
        saveSettings();
    });
    
    [uppercaseToggle, lowercaseToggle, numbersToggle, symbolsToggle, autocopyToggle].forEach(toggle => {
        toggle.addEventListener('change', saveSettings);
    });
    
    copyBtn.addEventListener('click', () => {
        const password = passwordField.value;
        navigator.clipboard.writeText(password)
            .then(() => {
                showToast('Copied to clipboard!');
                addToRecentPasswords(password);
            })
            .catch(err => showToast('Failed to copy password'));
    });
    
    generateBtn.addEventListener('click', generatePassword);
    regenerateBtn.addEventListener('click', generatePassword);
    clearHistoryBtn.addEventListener('click', clearRecentPasswords);
    updateBtn.addEventListener('click', checkForUpdates);
    
    githubBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: GITHUB_REPO_URL });
    });
}