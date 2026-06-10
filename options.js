// options.js - Logika stranky nastaveni pro Triola Copywriting AI

const DEFAULT_SETTINGS = {
  apiUrl: 'https://triola-copywriter.onrender.com',
  modelKey: 'claude-sonnet-4-6',
  toneKey: 'empaticky',
  lengthKey: 'stredni',
  defaultFormat: 'kratky_popis_html',
  defaultKeywords: ''
};

// DOM elements
const apiUrlInput = document.getElementById('apiUrl');
const modelKeySelect = document.getElementById('modelKey');
const toneKeySelect = document.getElementById('toneKey');
const lengthKeySelect = document.getElementById('lengthKey');
const defaultFormatSelect = document.getElementById('defaultFormat');
const defaultKeywordsInput = document.getElementById('defaultKeywords');
const saveBtn = document.getElementById('saveSettings');
const resetBtn = document.getElementById('resetSettings');
const statusMsg = document.getElementById('status-message');
const testConnectionBtn = document.getElementById('testConnection');
const connectionIndicator = document.getElementById('connection-indicator');
const connectionStatusText = document.getElementById('connection-status-text');

/**
 * Loads saved settings and populates the form
 */
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    apiUrlInput.value = settings.apiUrl || DEFAULT_SETTINGS.apiUrl;
    modelKeySelect.value = settings.modelKey || DEFAULT_SETTINGS.modelKey;
    toneKeySelect.value = settings.toneKey || DEFAULT_SETTINGS.toneKey;
    lengthKeySelect.value = settings.lengthKey || DEFAULT_SETTINGS.lengthKey;
    defaultFormatSelect.value = settings.defaultFormat || DEFAULT_SETTINGS.defaultFormat;
    defaultKeywordsInput.value = settings.defaultKeywords || DEFAULT_SETTINGS.defaultKeywords;
  });
}

/**
 * Saves current form values to Chrome storage
 */
function saveSettings() {
  const url = apiUrlInput.value.trim();

  // Validate URL
  if (!url) {
    showStatus('Prosim zadejte URL adresu API serveru.', 'error');
    apiUrlInput.focus();
    return;
  }

  try {
    new URL(url);
  } catch {
    showStatus('Zadana URL adresa neni platna. Priklad: https://triola-copywriter.onrender.com', 'error');
    apiUrlInput.focus();
    return;
  }

  const settings = {
    apiUrl: url.replace(/\/$/, ''), // Remove trailing slash
    modelKey: modelKeySelect.value,
    toneKey: toneKeySelect.value,
    lengthKey: lengthKeySelect.value,
    defaultFormat: defaultFormatSelect.value,
    defaultKeywords: defaultKeywordsInput.value.trim()
  };

  chrome.storage.sync.set(settings, () => {
    if (chrome.runtime.lastError) {
      showStatus('Chyba pri ukladani: ' + chrome.runtime.lastError.message, 'error');
    } else {
      showStatus('Nastaveni bylo uspesne ulozeno! ✓', 'success');
      setTimeout(() => hideStatus(), 3000);
    }
  });
}

/**
 * Resets all settings to defaults
 */
function resetSettings() {
  if (confirm('Opravdu chcete obnovit vychozi nastaveni? Vase zmeny budou ztraceny.')) {
    chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
      loadSettings();
      showStatus('Nastaveni bylo obnoveno na vychozi hodnoty.', 'success');
      setTimeout(() => hideStatus(), 3000);
    });
  }
}

/**
 * Tests the API connection
 */
async function testConnection() {
  const url = apiUrlInput.value.trim().replace(/\/$/, '');

  if (!url) {
    showStatus('Prosim nejprve zadejte URL adresu API serveru.', 'error');
    return;
  }

  // Update UI to testing state
  connectionIndicator.className = 'connection-indicator testing';
  connectionStatusText.textContent = 'Testuji pripojeni...';
  testConnectionBtn.disabled = true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url + '/health', {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors'
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      connectionIndicator.className = 'connection-indicator connected';
      connectionStatusText.textContent = 'Pripojeni uspesne (HTTP ' + response.status + ')';
      showStatus('API server je dostupny a funkcni! ✓', 'success');
      setTimeout(() => hideStatus(), 3000);
    } else {
      connectionIndicator.className = 'connection-indicator error';
      connectionStatusText.textContent = 'Server odpoveda s chybou HTTP ' + response.status;
      showStatus('Server odpoveda, ale vraci chybu: HTTP ' + response.status, 'error');
    }
  } catch (error) {
    connectionIndicator.className = 'connection-indicator error';
    if (error.name === 'AbortError') {
      connectionStatusText.textContent = 'Vyprseni casoveho limitu (10s)';
      showStatus('Vyprseni casoveho limitu. Zkontrolujte URL a dostupnost serveru.', 'error');
    } else {
      connectionStatusText.textContent = 'Chyba: ' + error.message;
      showStatus('Nelze se pripojit: ' + error.message, 'error');
    }
  } finally {
    testConnectionBtn.disabled = false;
  }
}

/**
 * Shows a status message
 */
function showStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.className = 'status-message ' + type;
}

/**
 * Hides the status message
 */
function hideStatus() {
  statusMsg.className = 'status-message';
  statusMsg.textContent = '';
}

// Event listeners
saveBtn.addEventListener('click', saveSettings);
resetBtn.addEventListener('click', resetSettings);
testConnectionBtn.addEventListener('click', testConnection);

// Allow saving with Enter key in URL field
apiUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveSettings();
});

// Load settings when page loads
document.addEventListener('DOMContentLoaded', loadSettings);
loadSettings(); // Also call directly in case DOMContentLoaded already fired
