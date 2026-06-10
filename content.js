// content.js - Content Script pro Triola Copywriting AI Chrome Extension
// Handles product code detection and HTML injection into e-shop admin

(function() {
  'use strict';

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectProductCode') {
      const code = detectProductCode();
      sendResponse({ success: true, productCode: code });
      return true;
    }

    if (request.action === 'injectHtml') {
      const result = injectHtmlIntoEditor(request.html);
      sendResponse({ success: result });
      return true;
    }

    if (request.action === 'ping') {
      sendResponse({ success: true, ready: true });
      return true;
    }
  });

  /**
   * Detects product code on the current page
   * Supports Shoptet, common ERP systems, and generic patterns
   */
  function detectProductCode() {
    // 1. Try data attributes
    const dataSelectors = [
      '[data-product-code]',
      '[data-sku]',
      '[data-item-code]',
      '[data-code]'
    ];
    for (const sel of dataSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const val = el.getAttribute('data-product-code') ||
                    el.getAttribute('data-sku') ||
                    el.getAttribute('data-item-code') ||
                    el.getAttribute('data-code');
        if (val && val.trim().length > 1) return val.trim();
      }
    }

    // 2. Try common form fields
    const inputSelectors = [
      'input[name="code"]',
      'input[name="sku"]',
      'input[name="product_code"]',
      'input[name="productCode"]',
      'input[id="code"]',
      'input[id="sku"]',
      'input[id="productCode"]',
      'input[id="product-code"]',
      '#productCode',
      '#product-code',
      '#sku',
      // Shoptet specific
      'input[name="itemNumber"]',
      'input[id="itemNumber"]',
      '.product-code input',
      '.js-product-code',
    ];
    for (const sel of inputSelectors) {
      const el = document.querySelector(sel);
      if (el && el.value && el.value.trim().length > 1) {
        return el.value.trim();
      }
    }

    // 3. Try visible text elements
    const textSelectors = [
      '.product-code',
      '.item-code',
      '.sku-value',
      '.kod-produktu',
      '#product-code-display',
      '.product-id',
      'span[itemprop="sku"]',
      '[itemprop="productID"]'
    ];
    for (const sel of textSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent.trim();
        const match = text.match(/([\d]{4,6}(?:[\/-][\d]{2,4})?)/);
        if (match) return match[1];
        if (text.length > 2 && text.length < 30) return text;
      }
    }

    // 4. Try H1 with product code pattern (e.g., "Šaty 22859/88")
    const h1 = document.querySelector('h1');
    if (h1) {
      const match = h1.textContent.match(/\b(\d{4,6}(?:[\/-]\d{2,4})?)\b/);
      if (match) return match[1];
    }

    // 5. Try URL
    const urlPatterns = [
      /[?&](?:code|sku|product_?code|item_?code)=([^&]+)/,
      /\/product\/([\w-]+)/,
      /\/item\/([\w-]+)/,
      /\/([\d]{4,6}(?:[\/-][\d]{2,4})?)/
    ];
    for (const pattern of urlPatterns) {
      const match = window.location.href.match(pattern);
      if (match) return decodeURIComponent(match[1]);
    }

    // 6. Try page title
    const titleMatch = document.title.match(/\b(\d{4,6}(?:[\/-]\d{2,4})?)\b/);
    if (titleMatch) return titleMatch[1];

    return '';
  }

  /**
   * Injects HTML content into available editor on the page
   * Supports CKEditor 4/5, TinyMCE, Quill, and standard textareas
   */
  function injectHtmlIntoEditor(htmlContent) {
    // 1. Try CKEditor 4
    if (typeof CKEDITOR !== 'undefined') {
      const instances = Object.keys(CKEDITOR.instances);
      for (const name of instances) {
        const editor = CKEDITOR.instances[name];
        // Prefer description-related editors
        if (name.includes('description') || name.includes('popis') || name.includes('content') || instances.length === 1) {
          editor.setData(htmlContent);
          return true;
        }
      }
      // If none matched, use first available
      if (instances.length > 0) {
        CKEDITOR.instances[instances[0]].setData(htmlContent);
        return true;
      }
    }

    // 2. Try CKEditor 5
    const ckEditorEls = document.querySelectorAll('.ck-editor__editable[role="textbox"]');
    for (const el of ckEditorEls) {
      if (el.ckeditorInstance) {
        el.ckeditorInstance.setData(htmlContent);
        return true;
      }
      // Try to find via the closest ck-editor container
      const container = el.closest('.ck-editor');
      if (container) {
        // Look for the editor instance via data attribute
        for (const key of Object.keys(container)) {
          if (key.startsWith('ck-editor') || key.includes('editor')) {
            if (container[key] && container[key].setData) {
              container[key].setData(htmlContent);
              return true;
            }
          }
        }
      }
    }

    // 3. Try TinyMCE
    if (typeof tinymce !== 'undefined') {
      const editors = tinymce.editors;
      if (editors && editors.length > 0) {
        // Find description editor
        for (const editor of editors) {
          if (editor.id && (editor.id.includes('description') || editor.id.includes('popis'))) {
            editor.setContent(htmlContent);
            return true;
          }
        }
        editors[0].setContent(htmlContent);
        return true;
      }
    }

    // 4. Try Quill
    const quillEls = document.querySelectorAll('.ql-editor');
    if (quillEls.length > 0) {
      quillEls[0].innerHTML = htmlContent;
      quillEls[0].dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    // 5. Try standard textarea/input selectors (priority order)
    const editorSelectors = [
      // Most specific first
      '#product_description',
      '#productDescription',
      '#long_description',
      '#longDescription',
      '#description',
      'textarea[name="description"]',
      'textarea[name="long_description"]',
      'textarea[id*="description"]',
      'textarea[id*="popis"]',
      '#content',
      'textarea[name="content"]',
      // Shoptet specifics
      '#txtDescription',
      '#txtLongDescription',
      '.js-description-field',
      // Generic
      '.description-editor textarea',
      'textarea.description',
      'textarea.popis'
    ];

    for (const sel of editorSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
          el.value = htmlContent;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.focus();
          return true;
        }
      }
    }

    // 6. Try contenteditable divs
    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    for (const el of contentEditables) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 50) { // Must be a visible, decent-sized editor
        el.innerHTML = htmlContent;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }

    // 7. Try iframes (rich text editors in iframes)
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc && doc.body) {
          if (doc.body.contentEditable === 'true' || doc.designMode === 'on') {
            doc.body.innerHTML = htmlContent;
            return true;
          }
        }
      } catch (e) {
        // Cross-origin iframe, skip
      }
    }

    return false;
  }

  // Notify background that content script is ready
  chrome.runtime.sendMessage({ action: 'contentScriptReady', url: window.location.href }).catch(() => {
    // Extension may not be listening, that's ok
  });

})();
