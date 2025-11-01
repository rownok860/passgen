// Background script for update checks
const VERSION_JSON_URL = 'https://raw.githubusercontent.com/rownok860/passgen/main/version.json';
const GITHUB_REPO_URL = 'https://github.com/rownok860/passgen';

// Check for updates when extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
    console.log('PassGen extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        setDefaultSettings();
    }
    
    // Check for updates on install/update
    checkForUpdatesInBackground();
    
    // Create alarm for periodic update checks (every 24 hours)
    chrome.alarms.create('updateCheck', { periodInMinutes: 1440 });
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateCheck') {
        checkForUpdatesInBackground();
    }
});

// Set default settings
async function setDefaultSettings() {
    const defaultSettings = {
        passwordLength: 12,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        autoCopy: true,
        recentPasswords: [],
        lastUpdateCheck: Date.now(),
        updateAvailable: false
    };
    
    try {
        await chrome.storage.local.set(defaultSettings);
        console.log('Default settings initialized');
    } catch (error) {
        console.error('Error setting default settings:', error);
    }
}

// Check for updates in background
async function checkForUpdatesInBackground() {
    try {
        console.log('Checking for updates in background...');
        
        const response = await fetch(VERSION_JSON_URL + '?t=' + Date.now());
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const versionData = await response.json();
        const currentVersion = chrome.runtime.getManifest().version;
        
        console.log('Background check - Current:', currentVersion, 'Latest:', versionData.version);
        
        if (compareVersions(versionData.version, currentVersion) > 0) {
            // New version available
            await chrome.storage.local.set({
                updateAvailable: true,
                latestVersion: versionData.version,
                downloadUrl: versionData.download_url || GITHUB_REPO_URL + '/releases/latest',
                releaseNotes: versionData.release_notes,
                lastUpdateCheck: Date.now()
            });
            
            console.log('Update available:', versionData.version);
        } else {
            // No update available
            await chrome.storage.local.set({
                updateAvailable: false,
                lastUpdateCheck: Date.now()
            });
            console.log('No updates available');
        }
    } catch (error) {
        console.error('Background update check failed:', error);
        await chrome.storage.local.set({
            lastUpdateCheck: Date.now(),
            lastUpdateError: error.message
        });
    }
}

// Version comparison helper
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