// Background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Bureaucracy Breaker extension installed');
  
  // Set default API URL
  chrome.storage.local.set({ apiUrl: 'http://localhost:8004' });
});

// Handle messages between popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getApiUrl') {
    chrome.storage.local.get(['apiUrl'], (result) => {
      sendResponse({ apiUrl: result.apiUrl || 'http://localhost:8004' });
    });
    return true; // Keep channel open for async response
  }
});
