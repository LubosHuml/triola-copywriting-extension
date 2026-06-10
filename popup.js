// popup.js - Logika hlavniho okna pro Triola Copywriting AI Chrome Extension

// ===== STATE =====
let generatedHtml = '';
let settings = {
  apiUrl: 'https://triola-copywriter.onrender.com',
  modelKey: 'claude-sonnet-4-6',
  toneKey: 'empaticky',
  lengthKey: 'stredni',
  defaultFormat: 'kratky_popis_html',
  defaultKeywords: ''
};

// ===== DOM ELEMENTS =====
const productCodeInput = document.getElementById('productCode');
const formatTypeSelect = document.getElementById('formatType');
const toneKeySelect = document.getElementById('toneKey');
const keywordsInput = document.getElementById('keywords');
const generateBtn = document.getElementById('generateBtn');
const statusMsg = document.getElementById('statusMsg');
const outputSection = document.getElementById('outputSection');
const htmlOutput = document.getElementById('htmlOutput');
const previewOutput = document.getElementById('previewOutput');
const copyBtn = document.getElementById('copyBtn');
const insertBtn = document.getElementById('insertBtn');
const detectCodeBtn = document.getElementById('detectCode');
const openSettingsBtn = document.getElementById('openSettings');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  applySettings();
  await tryDetectProductCode();
});

/**
 * Load settings from Chrome storage
 */
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      apiUrl: 'https://triola-copywriter.onrender.com',
      modelKey: 'claude-sonnet-4-6',
      toneKey: 'empaticky',
      lengthKey: 'stredni',
      defaultFormat: 'kratky_popis_html',
      defaultKeywords: ''
    }, (stored) => {
      settings = stored;
      resolve();
    });
  });
}

/**
 * Apply loaded settings to UI
 */
function applySettings() {
  if (settings.toneKey) toneKeySelect.value = settings.toneKey;
  if (settings.defaultFormat) formatTypeSelect.value = settings.defaultFormat;
  if (settings.defaultKeywords) keywordsInput.value = settings.defaultKeywords;
}

/**
 * Try to auto-detect product code from active tab
 */
async function tryDetectProductCode() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

    // Check if we can inject scripts on this tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectProductCodeOnPage
    });

    const code = result[0]?.result;
    if (code && code.trim()) {
      productCodeInput.value = code.trim();
      showStatus('Kod produktu automaticky detekovan: ' + code.trim(), 'info');
      setTimeout(() => hideStatus(), 3000);
    }
  } catch (err) {
    // Silent fail - detection is optional
    console.log('Auto-detect failed:', err.message);
  }
}

/**
 * Detects product code on page (injected function)
 */
function detectProductCodeOnPage() {
  const dataSelectors = ['[data-product-code]','[data-sku]','[data-item-code]'];
  for (const sel of dataSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const val = el.getAttribute('data-product-code') || el.getAttribute('data-sku') || el.getAttribute('data-item-code');
      if (val && val.trim().length > 1) return val.trim();
    }
  }
  const inputSelectors = ['input[name="code"]','input[name="sku"]','input[name="product_code"]','#productCode','#sku','input[id*="code"]'];
  for (const sel of inputSelectors) {
    const el = document.querySelector(sel);
    if (el && el.value && el.value.trim().length > 1) return el.value.trim();
  }
  const h1 = document.querySelector('h1');
  if (h1) {
    const match = h1.textContent.match(/\b(\d{4,6}(?:[\/-]\d{2,4})?)\b/);
    if (match) return match[1];
  }
  const urlMatch = window.location.href.match(/[?&](?:code|sku|product_?code)=([^&]+)/);
  if (urlMatch) return decodeURIComponent(urlMatch[1]);
  return '';
}

// ===== GENERATE =====

generateBtn.addEventListener('click', generateDescription);

async function generateDescription() {
  const productCode = productCodeInput.value.trim();
  const formatType = formatTypeSelect.value;
  const toneKey = toneKeySelect.value;
  const keywords = keywordsInput.value.trim();

  // Validation
  if (!productCode) {
    showStatus('Prosim zadejte kod produktu (fazona).', 'error');
    productCodeInput.focus();
    return;
  }

  // Extract base product code (before /)
  const baseCode = productCode.split('/')[0].trim();
  const colorCode = productCode.includes('/') ? productCode.split('/')[1].trim() : '';

  // Prepare payload
  const payload = {
    product_code: baseCode,
    format_type: formatType,
    model_key: settings.modelKey || 'claude-sonnet-4-6',
    tone_key: toneKey,
    length_key: settings.lengthKey || 'stredni',
    keywords: keywords,
    custom_instructions: colorCode ? 'Barva/varianta: ' + colorCode : '',
    use_simulation: false
  };

  // Start loading
  setLoading(true);
  hideStatus();
  outputSection.classList.remove('visible');

  try {
    const apiUrl = (settings.apiUrl || 'https://triola-copywriter.onrender.com').replace(/\/$/, '');
    const response = await fetch(apiUrl + '/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || 'HTTP ' + response.status + ': ' + response.statusText);
    }

    const data = await response.json();

    // Extract generated HTML from response
    let html = '';
    if (data.result) html = data.result;
    else if (data.html) html = data.html;
    else if (data.generated_text) html = data.generated_text;
    else if (data.content) html = data.content;
    else if (typeof data === 'string') html = data;
    else html = JSON.stringify(data, null, 2);

    if (!html) {
      throw new Error('API nevratio zadny obsah.');
    }

    generatedHtml = html;
    displayOutput(html);
    showStatus('Popis uspesne vygenerovan! ✓', 'success');
    setTimeout(() => hideStatus(), 3000);

  } catch (err) {
    console.error('Generation error:', err);

    let errorMsg = err.message;
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      errorMsg = 'Nelze se pripojit k API serveru. Zkontrolujte URL v nastaveni a internetove pripojeni.';
    } else if (err.message.includes('Failed to fetch')) {
      errorMsg = 'Chyba pripojeni. Je API server spusten? (' + (settings.apiUrl || 'Render.com') + ')';
    }

    showStatus('Chyba generovani: ' + errorMsg, 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Display generated HTML in output section
 */
function displayOutput(html) {
  // Show HTML code
  htmlOutput.textContent = html;

  // Show rendered preview
  previewOutput.innerHTML = html;

  // Show output section
  outputSection.classList.add('visible');

  // Switch to HTML tab by default
  switchTab('html');
}

// ===== TAB SWITCHING =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const activeBtn = document.querySelector('[data-tab="' + tabName + '"]');
  const activeContent = document.getElementById('tab-' + tabName);

  if (activeBtn) activeBtn.classList.add('active');
  if (activeContent) activeContent.classList.add('active');
}

// ===== COPY TO CLIPBOARD =====
copyBtn.addEventListener('click', async () => {
  if (!generatedHtml) {
    showStatus('Neni nic ke kopirovani.', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(generatedHtml);
    copyBtn.textContent = '✓ Skopirovano!';
    copyBtn.classList.add('copied');
    setTimeout(() => {
      copyBtn.textContent = '\uD83D\uDCCB Kopirovat HTML';
      copyBtn.classList.remove('copied');
    }, 2000);
  } catch (err) {
    // Fallback for older Chrome versions
    const textArea = document.createElement('textarea');
    textArea.value = generatedHtml;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    copyBtn.textContent = '✓ Skopirovano!';
    setTimeout(() => { copyBtn.textContent = '\uD83D\uDCCB Kopirovat HTML'; }, 2000);
  }
});

// ===== INSERT INTO ADMIN =====
insertBtn.addEventListener('click', async () => {
  if (!generatedHtml) {
    showStatus('Neni nic k vlozeni.', 'error');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      showStatus('Nelze ziskat aktivni zalozku.', 'error');
      return;
    }

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showStatus('Vlozeni neni mozne na teto strance. Prejdete do administrace e-shopu.', 'error');
      return;
    }

    insertBtn.textContent = 'Vkladam...';
    insertBtn.disabled = true;

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectHtmlIntoEditor,
      args: [generatedHtml]
    });

    const success = result[0]?.result;

    if (success) {
      insertBtn.textContent = '✓ Vlozeno!';
      showStatus('HTML bylo uspesne vlozeno do editoru na strance.', 'success');
      setTimeout(() => hideStatus(), 4000);
    } else {
      showStatus('Nepodařilo se najit editor na strance. Zkuste kopirovat a vlozit rucne.', 'error');
      insertBtn.textContent = '\uD83D\uDCCB Vlozit do adminu';
    }
  } catch (err) {
    showStatus('Chyba vlozeni: ' + err.message, 'error');
    insertBtn.textContent = '\uD83D\uDCCB Vlozit do adminu';
  } finally {
    insertBtn.disabled = false;
    setTimeout(() => {
      if (insertBtn.textContent === '✓ Vlozeno!') {
        insertBtn.textContent = '\uD83D\uDCCB Vlozit do adminu';
      }
    }, 3000);
  }
});

/**
 * Injected function - tries to insert HTML into editor on page
 */
function injectHtmlIntoEditor(htmlContent) {
  if (typeof CKEDITOR !== 'undefined') {
    const instances = Object.keys(CKEDITOR.instances);
    for (const name of instances) {
      if (name.includes('description') || name.includes('popis') || name.includes('content') || instances.length === 1) {
        CKEDITOR.instances[name].setData(htmlContent);
        return true;
      }
    }
    if (instances.length > 0) { CKEDITOR.instances[instances[0]].setData(htmlContent); return true; }
  }
  const ckEditorEls = document.querySelectorAll('.ck-editor__editable[role="textbox"]');
  for (const el of ckEditorEls) {
    if (el.ckeditorInstance) { el.ckeditorInstance.setData(htmlContent); return true; }
  }
  if (typeof tinymce !== 'undefined' && tinymce.editors && tinymce.editors.length > 0) {
    tinymce.editors[0].setContent(htmlContent);
    return true;
  }
  const quillEl = document.querySelector('.ql-editor');
  if (quillEl) { quillEl.innerHTML = htmlContent; quillEl.dispatchEvent(new Event('input', { bubbles: true })); return true; }
  const selectors = ['#product_description','#productDescription','#description','textarea[name="description"]',
    '#long_description','textarea[name="long_description"]','#popis','textarea[name="popis"]',
    '#txtDescription','#txtLongDescription','textarea[id*="description"]','textarea[id*="popis"]'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      el.value = htmlContent;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.focus();
      return true;
    }
  }
  const contentEditables = document.querySelectorAll('[contenteditable="true"]');
  for (const el of contentEditables) {
    const r = el.getBoundingClientRect();
    if (r.width > 100 && r.height > 50) { el.innerHTML = htmlContent; el.dispatchEvent(new Event('input', {bubbles:true})); return true; }
  }
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.body && (doc.body.contentEditable === 'true' || doc.designMode === 'on')) {
        doc.body.innerHTML = htmlContent;
        return true;
      }
    } catch (e) {}
  }
  return false;
}

// ===== DETECT CODE BUTTON =====
detectCodeBtn.addEventListener('click', async () => {
  detectCodeBtn.textContent = '...';
  detectCodeBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://')) {
      showStatus('Detekce neni mozna na teto strance.', 'error');
      return;
    }

    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: detectProductCodeOnPage
    });

    const code = result[0]?.result;
    if (code && code.trim()) {
      productCodeInput.value = code.trim();
      showStatus('Detekovan: ' + code.trim(), 'success');
      setTimeout(() => hideStatus(), 2000);
    } else {
      showStatus('Kod produktu nebyl na strance nalezen.', 'info');
      setTimeout(() => hideStatus(), 3000);
    }
  } catch (err) {
    showStatus('Chyba detekce: ' + err.message, 'error');
  } finally {
    detectCodeBtn.textContent = 'Detekovat';
    detectCodeBtn.disabled = false;
  }
});

// ===== OPEN SETTINGS =====
openSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ===== UTILITY FUNCTIONS =====

function setLoading(loading) {
  generateBtn.disabled = loading;
  generateBtn.classList.toggle('loading', loading);
  if (loading) {
    generateBtn.querySelector('.btn-text').textContent = 'Generuji...';
  } else {
    generateBtn.querySelector('.btn-text').textContent = '\u2728 Generovat popis';
  }
}

function showStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.className = 'status-msg ' + type;
}

function hideStatus() {
  statusMsg.className = 'status-msg';
  statusMsg.textContent = '';
}

// Allow Enter key in product code field to trigger generation
productCodeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') generateDescription();
});
