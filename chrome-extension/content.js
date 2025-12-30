// Content script - runs on every page
// Handles the chat overlay, form filling, and button interactions

let chatOverlay = null;
let API_URL = 'http://localhost:8004';
let sessionId = null;
let detectedFields = [];
let detectedButtons = [];
let currentFieldIndex = 0;

// PDF session support
let pdfSessionId = null;
let pdfFields = [];
let pdfCurrentField = 0;

// Current question options (for radio groups)
let currentQuestionOptions = [];
let currentFieldType = 'text';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'startFilling') {
    API_URL = message.apiUrl || API_URL;
    scanAndStartFilling();
  } else if (message.action === 'openChat') {
    API_URL = message.apiUrl || API_URL;
    openChatOverlay();
  } else if (message.action === 'pdfSession') {
    API_URL = message.apiUrl || API_URL;
    pdfSessionId = message.sessionId;
    openChatOverlay();
    startPdfQuestionFlow();
  }
});

// Scan page and start the filling process
async function scanAndStartFilling() {
  detectedFields = scanFormFields();
  detectedButtons = scanPageButtons();
  
  if (detectedFields.length === 0 && detectedButtons.length === 0) {
    showNotification('No form fields or buttons found on this page', 'warning');
    return;
  }
  
  openChatOverlay();
  
  // Show loading message
  addMessage('assistant', '🔍 Analyzing this page...');
  
  // Create a session with field info and get summary
  const sessionData = await createSession();
  
  // Clear the loading message and show results
  const messagesContainer = document.getElementById('bb-messages');
  if (messagesContainer && messagesContainer.lastChild) {
    messagesContainer.lastChild.remove();
  }
  
  // Summary is already shown by createSession if available
  
  // Show field/button count
  let msg = '';
  if (detectedFields.length > 0) {
    msg += `Found ${detectedFields.length} form fields`;
  }
  if (detectedButtons.length > 0) {
    msg += msg ? ` and ${detectedButtons.length} clickable buttons` : `Found ${detectedButtons.length} clickable buttons`;
  }
  msg += '. Let me help you fill them out!';
  
  addMessage('assistant', msg);
  
  // Show available buttons
  if (detectedButtons.length > 0) {
    showButtonOptions();
  }
  
  if (detectedFields.length > 0) {
    setTimeout(() => {
      askNextQuestion();
    }, 500);
  }
}

// Scan for clickable buttons on the page
function scanPageButtons() {
  const buttons = [];
  const buttonElements = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.button, [role="button"], .btn, .button');
  
  buttonElements.forEach((btn, index) => {
    // Skip hidden buttons
    if (btn.offsetParent === null || btn.disabled) return;
    
    // Get button text
    let text = btn.textContent?.trim() || btn.value?.trim() || btn.getAttribute('aria-label') || '';
    text = text.replace(/\s+/g, ' ').substring(0, 50);
    
    if (!text) return;
    
    // Skip our own extension buttons
    if (btn.closest('#bb-chat-overlay')) return;
    
    buttons.push({
      id: btn.id || `btn_${index}`,
      text: text,
      type: btn.tagName.toLowerCase(),
      selector: getUniqueSelector(btn),
      isSubmit: btn.type === 'submit' || text.toLowerCase().includes('submit'),
      isNext: /next|continue|proceed|forward/i.test(text),
      isPrev: /back|previous|prev/i.test(text),
      isCancel: /cancel|close|dismiss/i.test(text)
    });
  });
  
  return buttons;
}

// Show button options in chat
function showButtonOptions() {
  const importantButtons = detectedButtons.filter(b => b.isSubmit || b.isNext || b.isPrev);
  
  if (importantButtons.length > 0) {
    let html = '<div class="bb-button-options"><p>📍 Quick actions available:</p>';
    importantButtons.slice(0, 5).forEach(btn => {
      const icon = btn.isNext ? '➡️' : btn.isPrev ? '⬅️' : btn.isSubmit ? '✅' : '🔘';
      html += `<button class="bb-action-btn" data-selector="${btn.selector}">${icon} ${btn.text}</button>`;
    });
    html += '</div>';
    
    addMessageHTML('assistant', html);
    
    // Add click handlers
    setTimeout(() => {
      document.querySelectorAll('.bb-action-btn').forEach(actionBtn => {
        actionBtn.addEventListener('click', () => {
          const selector = actionBtn.getAttribute('data-selector');
          clickButton(selector);
        });
      });
    }, 100);
  }
}

// Show radio options for multiple choice questions
function showRadioOptions(options) {
  let html = '<div class="bb-radio-options">';
  options.forEach((opt) => {
    // Handle both object format {label, value} and string format
    const label = typeof opt === 'object' ? (opt.label || opt.value || opt) : opt;
    const value = typeof opt === 'object' ? (opt.value || opt.label || opt) : opt;
    html += `<button class="bb-radio-btn" data-value="${value}"><span class="bb-radio-circle"></span>${label}</button>`;
  });
  html += '</div>';
  
  addMessageHTML('assistant', html);
  
  // Add click handlers
  setTimeout(() => {
    document.querySelectorAll('.bb-radio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.getAttribute('data-value');
        // Add user message
        addMessage('user', value);
        // Process the answer
        if (pdfSessionId) {
          processPdfAnswer(value);
        } else {
          processAnswer(value);
        }
      });
    });
  }, 100);
}

// Show checkbox options (Yes/No)
function showCheckboxOptions() {
  let html = '<div class="bb-checkbox-options">';
  html += '<button class="bb-checkbox-btn bb-yes" data-value="Yes"><span class="bb-check-icon">✓</span>Yes</button>';
  html += '<button class="bb-checkbox-btn bb-no" data-value="No"><span class="bb-check-icon">✗</span>No</button>';
  html += '</div>';
  
  addMessageHTML('assistant', html);
  
  // Add click handlers
  setTimeout(() => {
    document.querySelectorAll('.bb-checkbox-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.getAttribute('data-value');
        // Add user message
        addMessage('user', value);
        // Process the answer
        if (pdfSessionId) {
          processPdfAnswer(value);
        } else {
          processAnswer(value);
        }
      });
    });
  }, 100);
}

// Click a button on the page
function clickButton(selector) {
  try {
    const element = document.querySelector(selector);
    if (element) {
      // Highlight before clicking
      element.style.transition = 'all 0.3s';
      element.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.8)';
      element.style.transform = 'scale(1.05)';
      
      setTimeout(() => {
        element.style.boxShadow = '';
        element.style.transform = '';
        
        // Click the button
        element.click();
        
        const btnText = element.textContent?.trim() || element.value || 'button';
        addMessage('assistant', `✓ Clicked "${btnText}"`);
        showNotification(`Clicked: ${btnText}`, 'success');
        
        // Rescan after navigation might happen
        setTimeout(() => {
          detectedButtons = scanPageButtons();
          if (detectedButtons.length > 0) {
            showButtonOptions();
          }
        }, 1000);
      }, 300);
    } else {
      addMessage('assistant', '❌ Could not find that button. The page may have changed.');
    }
  } catch (error) {
    console.error('Failed to click button:', error);
    addMessage('assistant', '❌ Error clicking button.');
  }
}

// Process commands including button clicks
function processCommand(input) {
  const lowerInput = input.toLowerCase().trim();
  
  // Check for click commands
  if (lowerInput.startsWith('click ') || lowerInput.startsWith('press ') || lowerInput.startsWith('tap ')) {
    const buttonName = input.substring(input.indexOf(' ') + 1).trim();
    return handleClickCommand(buttonName);
  }
  
  // Check for next/submit shortcuts
  if (lowerInput === 'next' || lowerInput === 'continue') {
    const nextBtn = detectedButtons.find(b => b.isNext);
    if (nextBtn) {
      clickButton(nextBtn.selector);
      return true;
    }
  }
  
  if (lowerInput === 'submit' || lowerInput === 'done') {
    const submitBtn = detectedButtons.find(b => b.isSubmit);
    if (submitBtn) {
      clickButton(submitBtn.selector);
      return true;
    }
  }
  
  if (lowerInput === 'back' || lowerInput === 'previous') {
    const prevBtn = detectedButtons.find(b => b.isPrev);
    if (prevBtn) {
      clickButton(prevBtn.selector);
      return true;
    }
  }
  
  // List buttons command
  if (lowerInput === 'buttons' || lowerInput === 'show buttons' || lowerInput === 'list buttons') {
    detectedButtons = scanPageButtons();
    if (detectedButtons.length > 0) {
      let msg = '🔘 Available buttons on this page:\n';
      detectedButtons.slice(0, 10).forEach((btn, i) => {
        msg += `${i + 1}. "${btn.text}"\n`;
      });
      msg += '\nSay "click [button name]" to click one.';
      addMessage('assistant', msg);
    } else {
      addMessage('assistant', 'No clickable buttons found on this page.');
    }
    return true;
  }
  
  // Rescan command
  if (lowerInput === 'scan' || lowerInput === 'rescan') {
    detectedFields = scanFormFields();
    detectedButtons = scanPageButtons();
    addMessage('assistant', `Rescanned! Found ${detectedFields.length} fields and ${detectedButtons.length} buttons.`);
    if (detectedButtons.length > 0) {
      showButtonOptions();
    }
    return true;
  }
  
  return false;
}

// Handle click command
function handleClickCommand(buttonName) {
  const lowerName = buttonName.toLowerCase();
  
  // Find matching button
  const matchedButton = detectedButtons.find(btn => {
    const btnText = btn.text.toLowerCase();
    return btnText.includes(lowerName) || lowerName.includes(btnText);
  });
  
  if (matchedButton) {
    clickButton(matchedButton.selector);
    return true;
  }
  
  // Try to find by partial match
  const partialMatch = detectedButtons.find(btn => {
    const words = lowerName.split(' ');
    return words.some(word => btn.text.toLowerCase().includes(word));
  });
  
  if (partialMatch) {
    clickButton(partialMatch.selector);
    return true;
  }
  
  addMessage('assistant', `❌ Could not find a button matching "${buttonName}". Say "buttons" to see available buttons.`);
  return true;
}

// Create session with the backend and get summary
async function createSession() {
  try {
    const pageTitle = document.title;
    const pageUrl = window.location.href;
    const pageText = getPageText();
    const fieldDescriptions = detectedFields.map(f => 
      `${f.label || f.name || f.placeholder || 'Unknown'} (${f.type})`
    ).join(', ');
    
    const response = await fetch(`${API_URL}/extension/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_title: pageTitle,
        page_url: pageUrl,
        page_text: pageText,
        fields: detectedFields,
        field_descriptions: fieldDescriptions
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      sessionId = data.session_id;
      
      // Show summary if available
      if (data.summary) {
        addMessage('assistant', `📄 **Page Summary:**\n${data.summary}`);
      }
      
      return data;
    }
  } catch (error) {
    console.error('Failed to create session:', error);
    sessionId = 'local_' + Date.now();
  }
  return null;
}

// Get visible text from the page for context
function getPageText() {
  try {
    // Get main content areas
    const mainContent = document.querySelector('main, article, .content, #content, .main, #main');
    if (mainContent) {
      return mainContent.innerText.substring(0, 3000);
    }
    
    // Fallback to body text
    const bodyText = document.body.innerText;
    return bodyText.substring(0, 3000);
  } catch (e) {
    return '';
  }
}

// Ask next question for form filling
async function askNextQuestion() {
  if (currentFieldIndex >= detectedFields.length) {
    addMessage('assistant', '✅ All fields have been filled! Review the form and submit when ready.');
    highlightField(null);
    
    // Show submit button if available
    const submitBtn = detectedButtons.find(b => b.isSubmit || b.isNext);
    if (submitBtn) {
      addMessageHTML('assistant', `<div class="bb-button-options"><button class="bb-action-btn bb-submit-btn" data-selector="${submitBtn.selector}">✅ ${submitBtn.text}</button></div>`);
      setTimeout(() => {
        document.querySelector('.bb-submit-btn')?.addEventListener('click', () => {
          clickButton(submitBtn.selector);
        });
      }, 100);
    }
    return;
  }
  
  const field = detectedFields[currentFieldIndex];
  highlightField(field.selector);
  
  try {
    const response = await fetch(`${API_URL}/extension/get-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        field: field,
        field_index: currentFieldIndex,
        total_fields: detectedFields.length
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      addMessage('assistant', data.question);
    } else if (response.status === 503) {
      addMessage('assistant', '⏳ AI service is busy. Retrying...');
      // Retry after a short delay
      setTimeout(() => askNextQuestion(), 2000);
    } else if (response.status === 429) {
      addMessage('assistant', '⏳ Rate limit reached. Please wait a moment...');
      setTimeout(() => askNextQuestion(), 5000);
    } else {
      addMessage('assistant', '❌ Failed to generate question. Please try again.');
    }
  } catch (error) {
    console.error('Question generation error:', error);
    addMessage('assistant', '❌ Connection error. Make sure the backend is running.');
  }
}

// Start PDF question flow
async function startPdfQuestionFlow() {
  pdfFields = await getPdfFields();
  pdfCurrentField = 0;
  if (pdfFields.length === 0) {
    addMessage('assistant', 'No fields detected in PDF.');
    return;
  }
  addMessage('assistant', `Let's fill your PDF form. ${pdfFields.length} fields detected.`);
  setTimeout(() => askNextPdfQuestion(), 500);
}

// Get PDF fields from backend
async function getPdfFields() {
  if (!pdfSessionId) return [];
  try {
    const response = await fetch(`${API_URL}/next-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: pdfSessionId })
    });
    if (response.ok) {
      const data = await response.json();
      return data.fields || [];
    }
  } catch (err) {
    console.error('Error getting PDF fields:', err);
  }
  return [];
}

// Ask next PDF question
async function askNextPdfQuestion() {
  if (pdfCurrentField >= pdfFields.length) {
    addMessage('assistant', '✅ All PDF fields filled! You can download your filled PDF.');
    currentQuestionOptions = [];
    currentFieldType = 'text';
    return;
  }
  const field = pdfFields[pdfCurrentField];
  try {
    const response = await fetch(`${API_URL}/next-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: pdfSessionId, field_name: field })
    });
    if (response.ok) {
      const data = await response.json();
      
      // Check if completed
      if (data.completed) {
        addMessage('assistant', '✅ All PDF fields filled! You can download your filled PDF.');
        currentQuestionOptions = [];
        currentFieldType = 'text';
        return;
      }
      
      // Get question text - AI generated only
      const questionText = data.question?.text || data.question;
      if (!questionText) {
        addMessage('assistant', '❌ Failed to generate question. Please try again.');
        return;
      }
      addMessage('assistant', questionText);
      
      // Store field type and options for input handling
      currentFieldType = data.question?.field_type || 'text';
      currentQuestionOptions = data.question?.options || [];
      
      console.log('[DEBUG] Extension - field_type:', currentFieldType, 'options:', currentQuestionOptions);
      
      // Show options if available
      if (currentFieldType === 'radio_group' && currentQuestionOptions.length > 0) {
        showRadioOptions(currentQuestionOptions);
      } else if (currentFieldType === 'checkbox') {
        showCheckboxOptions();
      }
    } else if (response.status === 503) {
      addMessage('assistant', '⏳ AI service is busy. Retrying...');
      setTimeout(() => askNextPdfQuestion(), 2000);
    } else if (response.status === 429) {
      addMessage('assistant', '⏳ Rate limit reached. Please wait a moment...');
      setTimeout(() => askNextPdfQuestion(), 5000);
    } else {
      addMessage('assistant', '❌ Failed to generate question. Please try again.');
      currentQuestionOptions = [];
      currentFieldType = 'text';
    }
  } catch (err) {
    console.error('PDF question error:', err);
    addMessage('assistant', '❌ Connection error. Make sure the backend is running.');
    currentQuestionOptions = [];
    currentFieldType = 'text';
  }
}

// Process user answer
async function processAnswer(answer) {
  // First check if it's a command
  if (processCommand(answer)) {
    return;
  }
  
  if (currentFieldIndex >= detectedFields.length) {
    await chatWithAI(answer);
    return;
  }
  
  const field = detectedFields[currentFieldIndex];
  
  // Check for skip
  if (answer.toLowerCase() === 'skip') {
    addMessage('assistant', 'Skipping this field.');
    currentFieldIndex++;
    askNextQuestion();
    return;
  }
  
  // Fill the field
  fillField(field.selector, answer);
  addMessage('assistant', `✓ Filled "${field.label || field.name || 'field'}" with: ${answer}`);
  
  currentFieldIndex++;
  
  setTimeout(() => {
    askNextQuestion();
  }, 300);
}

// Process PDF answer
async function processPdfAnswer(answer) {
  // First check if it's a command
  if (processCommand(answer)) {
    return;
  }
  
  if (pdfCurrentField >= pdfFields.length) {
    await chatWithAI(answer);
    return;
  }
  const field = pdfFields[pdfCurrentField];
  try {
    const response = await fetch(`${API_URL}/next-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: pdfSessionId, field_name: field, answer: answer })
    });
    if (response.ok) {
      addMessage('assistant', `✓ Filled "${field}" with: ${answer}`);
      pdfCurrentField++;
      setTimeout(() => askNextPdfQuestion(), 300);
    } else {
      addMessage('assistant', 'Error saving answer.');
    }
  } catch (err) {
    addMessage('assistant', 'Error saving answer.');
  }
}

// Chat with AI
async function chatWithAI(message) {
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        message: message
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      addMessage('assistant', data.response);
    } else {
      addMessage('assistant', 'Sorry, I couldn\'t process that. Please try again.');
    }
  } catch (error) {
    addMessage('assistant', 'Connection error. Make sure the backend is running.');
  }
}

// Fill a form field
function fillField(selector, value) {
  try {
    const element = document.querySelector(selector);
    if (element) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      element.style.transition = 'background-color 0.3s';
      element.style.backgroundColor = '#d4edda';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 1000);
    }
  } catch (error) {
    console.error('Failed to fill field:', error);
  }
}

// Highlight current field
function highlightField(selector) {
  document.querySelectorAll('.bb-highlight').forEach(el => {
    el.classList.remove('bb-highlight');
  });
  
  if (selector) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        element.classList.add('bb-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (error) {
      console.error('Failed to highlight field:', error);
    }
  }
}

// Get unique selector for an element
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

// Scan form fields on the page
function scanFormFields() {
  const fields = [];
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach((input, index) => {
    if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'reset') {
      return;
    }
    
    let label = '';
    if (input.id) {
      const labelEl = document.querySelector(`label[for="${input.id}"]`);
      if (labelEl) label = labelEl.textContent.trim();
    }
    if (!label && input.closest('label')) {
      label = input.closest('label').textContent.trim();
    }
    if (!label) {
      label = input.getAttribute('aria-label') || input.getAttribute('title') || '';
    }
    
    fields.push({
      id: input.id || `field_${index}`,
      name: input.name || '',
      type: input.type || input.tagName.toLowerCase(),
      label: label,
      placeholder: input.placeholder || '',
      selector: getUniqueSelector(input)
    });
  });
  
  return fields;
}

// Create and open chat overlay
function openChatOverlay() {
  if (chatOverlay) {
    chatOverlay.style.display = 'flex';
    return;
  }
  
  const logoUrl = chrome.runtime.getURL('icons/logo.svg');
  
  chatOverlay = document.createElement('div');
  chatOverlay.id = 'bb-chat-overlay';
  chatOverlay.innerHTML = `
    <div class="bb-chat-container">
      <div class="bb-chat-header">
        <div class="bb-chat-title">
          <img src="${logoUrl}" alt="Logo" class="bb-logo">
          <span>Bureaucracy Breaker</span>
        </div>
        <div class="bb-chat-actions">
          <button class="bb-minimize" title="Minimize">−</button>
          <button class="bb-close" title="Close">×</button>
        </div>
      </div>
      <div class="bb-chat-messages" id="bb-messages">
        <div class="bb-message bb-assistant">
          <div class="bb-message-content">
            Hi! I'm here to help you fill out forms and navigate this page. 
            <br><br>
            <b>Commands:</b><br>
            • "click [button name]" - Click a button<br>
            • "next" / "submit" / "back" - Quick navigation<br>
            • "buttons" - List available buttons<br>
            • "scan" - Rescan the page
          </div>
        </div>
      </div>
      <div class="bb-chat-input-area">
        <input type="text" id="bb-input" placeholder="Type your answer or command...">
        <button id="bb-send">Send</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(chatOverlay);
  
  // Event listeners
  chatOverlay.querySelector('.bb-close').addEventListener('click', () => {
    chatOverlay.style.display = 'none';
  });
  
  chatOverlay.querySelector('.bb-minimize').addEventListener('click', () => {
    chatOverlay.querySelector('.bb-chat-container').classList.toggle('bb-minimized');
  });
  
  const input = chatOverlay.querySelector('#bb-input');
  const sendBtn = chatOverlay.querySelector('#bb-send');
  
  sendBtn.addEventListener('click', () => sendMessage());
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  function sendMessage() {
    const message = input.value.trim();
    if (!message) return;
    
    addMessage('user', message);
    input.value = '';
    if (pdfSessionId) {
      processPdfAnswer(message);
    } else {
      processAnswer(message);
    }
  }
}

// Add message to chat
function addMessage(type, content) {
  const messagesContainer = document.getElementById('bb-messages');
  if (!messagesContainer) return;
  
  // Convert markdown-style bold to HTML
  let formattedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `bb-message bb-${type}`;
  messageDiv.innerHTML = `<div class="bb-message-content">${formattedContent}</div>`;
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add HTML message to chat
function addMessageHTML(type, html) {
  const messagesContainer = document.getElementById('bb-messages');
  if (!messagesContainer) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `bb-message bb-${type}`;
  messageDiv.innerHTML = `<div class="bb-message-content">${html}</div>`;
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `bb-notification bb-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('bb-fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
