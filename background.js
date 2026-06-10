// background.js - Service Worker pro Triola Copywriting AI Chrome Extension
// Handles communication between popup and content scripts

chrome.runtime.onInstalled.addListener(() => {
  // Set default settings on install
  chrome.storage.sync.set({
    apiUrl: 'https://triola-copywriter.onrender.com',
    modelKey: 'claude-sonnet-4-6',
    toneKey: 'empaticky',
    lengthKey: 'stredni'
  });
  console.log('Triola Copywriting AI extension installed');
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['apiUrl', 'modelKey', 'toneKey', 'lengthKey'], (settings) => {
      sendResponse({ success: true, settings });
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'injectContent') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: injectHtmlIntoEditor,
          args: [request.html]
        }).then(() => {
          sendResponse({ success: true });
        }).catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      }
    });
    return true;
  }

  if (request.action === 'detectProductCode') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: detectProductCodeOnPage
        }).then((results) => {
          const code = results[0]?.result || '';
          sendResponse({ success: true, productCode: code });
        }).catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      }
    });
    return true;
  }
});

// Function injected into page to detect product code
function detectProductCodeOnPage() {
  // Try various selectors for Shoptet and common e-shop admin systems
  const selectors = [
    '[data-product-code]',
    '.product-code',
    '.kod-produktu',
    '#product-code',
    '#productCode',
    '[name="product_code"]',
    '.item-code',
    '.sku',
    '#sku',
    '.product-sku',
    // Shoptet specific
    '[data-sku]',
    '.js-product-code',
    // Common admin input fields
    'input[name="code"]',
    'input[name="sku"]',
    'input[id*="code"]',
    'input[id*="sku"]'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      const val = el.value || el.textContent || el.getAttribute('data-product-code') || el.getAttribute('data-sku') || '';
      const trimmed = val.trim();
      if (trimmed && trimmed.length > 2) return trimmed;
    }
  }

  // Try H1 containing pattern like "22859/88" or "22859-88"
  const h1 = document.querySelector('h1');
  if (h1) {
    const match = h1.textContent.match(/\b(\d{4,6}(?:[\/-]\d{2,4})?)\b/);
    if (match) return match[1];
  }

  // Try URL patterns
  const urlMatch = window.location.href.match(/[?&](?:code|sku|product)=([^&]+)/);
  if (urlMatch) return decodeURIComponent(urlMatch[1]);

  // Try page title
  const titleMatch = document.title.match(/\b(\d{4,6}(?:[\/-]\d{2,4})?)\b/);
  if (titleMatch) return titleMatch[1];

  return '';
}

// Function injected into page to insert HTML into editor
function injectHtmlIntoEditor(htmlContent) {
  // Try CKEditor 4
  if (typeof CKEDITOR !== 'undefined') {
    for (const name in CKEDITOR.instances) {
      CKEDITOR.instances[name].setData(htmlContent);
      return true;
    }
  }

  // Try CKEditor 5
  const ckEditors = document.querySelectorAll('.ck-editor__editable');
  if (ckEditors.length > 0) {
    for (const editor of ckEditors) {
      if (editor.ckeditorInstance) {
        editor.ckeditorInstance.setData(htmlContent);
        return true;
      }
    }
  }

  // Try TinyMCE
  if (typeof tinymce !== 'undefined' && tinymce.editors.length > 0) {
    tinymce.editors[0].setContent(htmlContent);
    return true;
  }

  // Try common textareas and iframes by class/ID
  const editorSelectors = [
    '#description',
    '#short_description',
    '#popis',
    '#kratky_popis',
    'textarea[name="description"]',
    'textarea[name="short_description"]',
    'textarea[name="popis"]',
    'textarea[name="content"]',
    '.description-editor',
    '#product_description',
    // Shoptet
    '#productDescription',
    '#shortDescription',
    'textarea.description',
    '#txtDescription',
    '#txtShortDescription'
  ];

  for (const sel of editorSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      // Check if it's an iframe (rich text editor)
      if (el.tagName === 'IFRAME') {
        try {
          el.contentDocument.body.innerHTML = htmlContent;
          return true;
        } catch (e) {}
      } else {
        el.value = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
  }

  // Try to find any rich text editor iframe
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      if (iframe.contentDocument && iframe.contentDocument.body) {
        const body = iframe.contentDocument.body;
        if (body.contentEditable === 'true' || body.getAttribute('contenteditable') === 'true') {
          body.innerHTML = htmlContent;
          return true;
        }
      }
    } catch (e) {}
  }

  return false;
}
