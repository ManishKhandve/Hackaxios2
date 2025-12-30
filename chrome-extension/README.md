# Bureaucracy Breaker - Chrome Extension

AI-powered form filler that works on any website.

## Features

- 🔍 **Scan Forms**: Automatically detects form fields on any webpage
- 💬 **Chat Interface**: Fill forms through natural conversation
- ✨ **AI-Powered**: Smart questions based on field context
- 🎯 **Field Highlighting**: Shows which field you're filling
- ⚡ **Auto-Fill**: Fills fields as you answer

## Installation

### Step 1: Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder

### Step 2: Start the Backend

Make sure the Bureaucracy Breaker backend is running:

```bash
cd Hackxios
python app.py
```

The backend should be running at `http://localhost:8004`

## Usage

1. **Navigate** to any webpage with a form
2. **Click** the extension icon in Chrome toolbar
3. **Check** the connection status (green = connected)
4. Click **"Scan Page for Forms"** to detect fields
5. Click **"Start AI-Assisted Filling"** to begin
6. **Answer** the questions in the chat overlay
7. Watch as fields get filled automatically!

## Commands

In the chat overlay, you can:
- Type answers to fill form fields
- Say **"skip"** to skip a field
- Ask questions about the form
- Chat naturally with the AI

## Configuration

- **Backend URL**: Change in the extension popup if using a different server
- Settings are saved automatically

## Troubleshooting

### Extension shows "Backend offline"
- Make sure `python app.py` is running
- Check that the URL is `http://localhost:8004`

### Fields not detected
- Some dynamic forms may not be detected immediately
- Try clicking "Scan Page" after the page fully loads

### Fields not filling
- Some sites block automated input
- The extension triggers input/change events for React compatibility

## Files

```
chrome-extension/
├── manifest.json      # Extension configuration
├── popup.html         # Extension popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup logic
├── content.js         # Page interaction & chat overlay
├── content.css        # Chat overlay styles
├── background.js      # Service worker
└── icons/             # Extension icons
```
