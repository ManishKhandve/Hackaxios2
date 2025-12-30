// Popup script for Bureaucracy Breaker Chrome Extension

let API_URL = 'http://localhost:8004';

// Load saved settings
document.addEventListener('DOMContentLoaded', async () => {
  const saved = await chrome.storage.local.get(['apiUrl']);
  if (saved.apiUrl) {
    API_URL = saved.apiUrl;
    document.getElementById('api-url').value = saved.apiUrl;
  }
  
  checkConnection();
  checkAIStatus();
});

// Save settings
document.getElementById('save-settings').addEventListener('click', async () => {
  API_URL = document.getElementById('api-url').value;
  await chrome.storage.local.set({ apiUrl: API_URL });
  checkConnection();
  checkAIStatus();
});

// Check API connection
async function checkConnection() {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  
  statusDot.className = 'status-indicator';
  statusText.textContent = 'Checking connection...';
  
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      statusDot.classList.add('connected');
      statusText.textContent = `Connected - ${data.ai_service || 'AI Ready'}`;
    } else {
      throw new Error('API not responding');
    }
  } catch (error) {
    statusDot.classList.add('disconnected');
    statusText.textContent = 'Backend offline - Start the server';
  }
}

// Check AI API Key Status
async function checkAIStatus() {
  const aiStatusSection = document.getElementById('ai-status-section');
  const aiStatusDot = document.getElementById('ai-status-dot');
  const aiStatusText = document.getElementById('ai-status-text');
  const aiStatusDetails = document.getElementById('ai-status-details');
  
  if (!aiStatusSection) return;
  
  aiStatusSection.style.display = 'flex';
  aiStatusDot.className = 'status-indicator';
  aiStatusText.textContent = 'Checking AI...';
  aiStatusDetails.textContent = '';
  
  try {
    const response = await fetch(`${API_URL}/check-api-key`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.valid) {
        aiStatusDot.classList.add('connected');
        aiStatusText.textContent = 'AI Ready';
        aiStatusDetails.textContent = data.model || 'Mistral 7B';
        aiStatusDetails.className = 'ai-status-details success';
      } else {
        aiStatusDot.classList.add('disconnected');
        
        // Handle different error types
        if (data.error === 'Rate limited') {
          aiStatusText.textContent = 'Rate Limited';
          aiStatusDetails.textContent = 'Too many requests. Wait a moment.';
          aiStatusDetails.className = 'ai-status-details warning';
        } else if (data.error === 'No credits') {
          aiStatusText.textContent = 'No Credits';
          aiStatusDetails.textContent = 'Add credits at openrouter.ai';
          aiStatusDetails.className = 'ai-status-details error';
        } else if (data.error === 'Invalid API key') {
          aiStatusText.textContent = 'Invalid Key';
          aiStatusDetails.textContent = 'Check your API key';
          aiStatusDetails.className = 'ai-status-details error';
        } else {
          aiStatusText.textContent = 'AI Error';
          aiStatusDetails.textContent = data.message || 'Unknown error';
          aiStatusDetails.className = 'ai-status-details error';
        }
      }
    } else {
      throw new Error('Failed to check AI status');
    }
  } catch (error) {
    aiStatusDot.classList.add('disconnected');
    aiStatusText.textContent = 'AI Unavailable';
    aiStatusDetails.textContent = 'Backend not responding';
    aiStatusDetails.className = 'ai-status-details error';
  }
}

// Refresh AI Status button
document.getElementById('refresh-ai-status')?.addEventListener('click', () => {
  checkAIStatus();
});

// Scan page for forms
document.getElementById('scan-form').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: scanForForms
  }, (results) => {
    if (results && results[0] && results[0].result) {
      displayFields(results[0].result);
    }
  });
});

// Display detected fields
function displayFields(fields) {
  const formInfo = document.getElementById('form-info');
  const fieldList = document.getElementById('field-list');
  
  if (fields.length === 0) {
    fieldList.innerHTML = '<p style="color: #64748b; font-size: 12px;">No form fields detected on this page.</p>';
    formInfo.style.display = 'block';
    document.getElementById('start-filling').style.display = 'none';
    return;
  }
  
  fieldList.innerHTML = fields.map(field => `
    <div class="field-item" data-field-id="${field.id}">
      <span class="field-type">${field.type}</span>
      <span class="field-name">${field.label || field.name || field.placeholder || 'Unnamed field'}</span>
    </div>
  `).join('');
  
  formInfo.style.display = 'block';
  document.getElementById('start-filling').style.display = 'block';
  
  // Store fields for filling
  chrome.storage.local.set({ detectedFields: fields });
}

// Start AI-assisted filling
document.getElementById('start-filling').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Send message to content script to start the chat overlay
  chrome.tabs.sendMessage(tab.id, { action: 'startFilling', apiUrl: API_URL });
  
  // Close popup
  window.close();
});

// Open chat assistant overlay
document.getElementById('open-chat').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { action: 'openChat', apiUrl: API_URL });
  
  window.close();
});

// PDF Upload and Summary
const pdfInput = document.getElementById('pdf-upload');
const pdfSummary = document.getElementById('pdf-summary');
let uploadedPdfId = null;

pdfInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  pdfSummary.style.display = 'block';
  pdfSummary.textContent = 'Uploading and analyzing PDF...';
  pdfSummary.className = '';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_URL}/upload-pdf`, {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      pdfSummary.textContent = `✓ Found ${data.total_fields} fields to fill`;
      pdfSummary.className = 'success';
      uploadedPdfId = data.session_id || null;
      document.getElementById('download-pdf').style.display = 'block';
    } else {
      const errorData = await response.json().catch(() => ({}));
      
      // Check for rate limit error
      if (response.status === 429 || (errorData.error && errorData.error.includes('rate'))) {
        pdfSummary.textContent = '⚠️ AI rate limited. Please wait and try again.';
        pdfSummary.className = 'warning';
      } else {
        pdfSummary.textContent = errorData.error || 'Failed to analyze PDF.';
        pdfSummary.className = 'error';
      }
    }
  } catch (err) {
    pdfSummary.textContent = 'Error uploading PDF. Check connection.';
    pdfSummary.className = 'error';
  }
});

// Download Filled PDF
const downloadBtn = document.getElementById('download-pdf');
downloadBtn.addEventListener('click', async () => {
  if (!uploadedPdfId) return;
  downloadBtn.textContent = 'Preparing PDF...';
  downloadBtn.disabled = true;
  
  try {
    const response = await fetch(`${API_URL}/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: uploadedPdfId })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'filled_form.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      downloadBtn.textContent = '⬇️ Download Filled PDF';
    } else {
      downloadBtn.textContent = '✗ Download Failed';
    }
  } catch (err) {
    downloadBtn.textContent = '✗ Error Downloading';
  }
  
  downloadBtn.disabled = false;
});

// Signature/Image Upload
const imageInput = document.getElementById('image-upload');
imageInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !uploadedPdfId) return;
  pdfSummary.textContent = 'Uploading image...';
  const formData = new FormData();
  formData.append('image', file);
  formData.append('session_id', uploadedPdfId);
  try {
    const response = await fetch(`${API_URL}/upload-image`, {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      pdfSummary.textContent = '✓ Image uploaded!';
      pdfSummary.className = 'success';
    } else {
      pdfSummary.textContent = 'Image upload failed.';
      pdfSummary.className = 'error';
    }
  } catch (err) {
    pdfSummary.textContent = 'Error uploading image.';
    pdfSummary.className = 'error';
  }
});

// Function to be injected into the page to scan for forms
function scanForForms() {
  const fields = [];
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach((input, index) => {
    // Skip hidden, submit, button types
    if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') {
      return;
    }
    
    // Get label
    let label = '';
    if (input.id) {
      const labelEl = document.querySelector(`label[for="${input.id}"]`);
      if (labelEl) label = labelEl.textContent.trim();
    }
    if (!label && input.closest('label')) {
      label = input.closest('label').textContent.trim();
    }
    
    // Get aria-label or title
    if (!label) {
      label = input.getAttribute('aria-label') || input.getAttribute('title') || '';
    }
    
    fields.push({
      id: input.id || `field_${index}`,
      name: input.name || '',
      type: input.type || input.tagName.toLowerCase(),
      label: label,
      placeholder: input.placeholder || '',
      value: input.value || '',
      tagName: input.tagName.toLowerCase(),
      selector: getUniqueSelector(input)
    });
  });
  
  return fields;
  
  function getUniqueSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.name) return `[name="${el.name}"]`;
    
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        selector = `#${el.id}`;
        path.unshift(selector);
        break;
      }
      let sibling = el;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.tagName === el.tagName) nth++;
      }
      if (nth > 1) selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      el = el.parentNode;
    }
    return path.join(' > ');
  }
}
