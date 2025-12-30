# 📋 Bureaucracy Breaker - Complete Form Assistant

Transform PDF and website forms into conversational experiences with AI-powered assistance!

## 🌟 Features

### PDF Forms
- ✅ Upload and scan PDF forms with fillable fields
- 🤖 AI-powered conversational questions
- 📝 Automatic form filling
- ⬇️ Download completed PDF forms

### Website Forms
- 🔍 Scan and detect forms on any webpage
- 💬 Interactive question-answer flow
- ✨ Auto-fill detected website forms
- 🎯 Support for text inputs, textareas, selects, checkboxes, and radio buttons

### Additional Features
- 📸 Image/signature upload support
- 📊 Progress tracking
- 🎨 Modern, intuitive UI
- 🌓 Dark mode support

## 📁 Project Structure

```
bureaucracy-breaker/
├── manifest.json          # Chrome extension manifest
├── popup.html            # Extension popup UI
├── popup.css             # Popup styling
├── popup.js              # Main extension logic
├── content.js            # Content script for webpage interaction
├── background.js         # Background service worker
├── app.py               # Flask backend server
├── requirements.txt      # Python dependencies
├── .env.example         # Environment variables template
└── README.md            # This file
```

## 🚀 Installation

### Prerequisites

- **Python 3.8+**
- **Google Chrome** or **Chromium-based browser**
- **OpenRouter API Key** (optional, for AI-powered questions)

### Step 1: Backend Setup

1. **Clone or download the project**

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables:**
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your OpenRouter API key (optional)
# Get a key from: https://openrouter.ai/
```

4. **Start the backend server:**
```bash
python app.py
```

The server will start on `http://localhost:8004`

### Step 2: Chrome Extension Setup

1. **Open Chrome and navigate to:**
```
chrome://extensions/
```

2. **Enable "Developer mode"** (toggle in top-right corner)

3. **Click "Load unpacked"**

4. **Select the project folder** containing `manifest.json`

5. **The extension icon should appear** in your Chrome toolbar

## 📖 Usage

### Using PDF Forms

1. **Click the extension icon** in your Chrome toolbar
2. **Select "PDF Form"** mode
3. **Upload your PDF form** by clicking or dragging
4. **Answer the AI-generated questions** conversationally
5. **Download your filled PDF** when complete

### Using Website Forms

1. **Navigate to a webpage** with a form (e.g., contact form, registration form)
2. **Click the extension icon**
3. **Select "Website Form"** mode
4. **Click "Scan Form on This Page"** to detect the form
5. **Answer the questions** about each field
6. **Click "Fill Website Form"** to auto-populate the webpage
7. **Review and submit** the form on the webpage

### Example Websites to Test

- Google Forms
- Contact forms on business websites
- Registration forms
- Survey forms
- Application forms

## 🔧 Configuration

### Backend Configuration

Edit `app.py` to customize:

- **Port:** Change `port=8004` in the last line
- **Max file size:** Modify `MAX_FILE_SIZE` variable
- **AI Model:** Change `DEFAULT_MODEL` in `AIConverter` class

### Extension Configuration

Edit `manifest.json` to customize:

- **Permissions:** Add/remove required permissions
- **Host permissions:** Modify allowed domains
- **Extension name/description:** Update metadata

## 🛠️ Technical Details

### Backend API Endpoints

#### Health Check
```
GET /health
```

#### PDF Form Endpoints
```
POST /upload-pdf          # Upload PDF form
POST /start-session       # Start form filling session
POST /next-question       # Get next question
POST /generate-pdf        # Download completed PDF
POST /upload-image        # Upload signature/image
```

#### Website Form Endpoints
```
POST /analyze-website-form   # Analyze detected form
POST /fill-website-form      # Get field values for filling
```

### Extension Components

#### Content Script (`content.js`)
- Runs on every webpage
- Detects forms and extracts field information
- Fills form fields with provided values
- Handles various input types

#### Background Worker (`background.js`)
- Handles extension lifecycle events
- Manages API health checks
- Coordinates between popup and content scripts

#### Popup (`popup.html/js/css`)
- Main user interface
- Mode selection (PDF vs Website)
- Chat interface for questions
- Progress tracking and controls

## 🎯 Supported Form Fields

### PDF Forms
- Text fields
- Checkboxes
- Radio buttons
- Dropdown selects
- Signature fields (image upload)

### Website Forms
- `<input type="text">`
- `<input type="email">`
- `<input type="tel">`
- `<input type="number">`
- `<input type="date">`
- `<textarea>`
- `<select>` dropdowns
- `<input type="checkbox">`
- `<input type="radio">`

## 🐛 Troubleshooting

### Backend Issues

**"API Offline" error:**
- Ensure the Flask server is running on port 8004
- Check console for error messages
- Verify Python dependencies are installed

**"No fillable fields found":**
- Ensure the PDF has actual form fields (not just text)
- Try a different PDF form

### Extension Issues

**"No forms detected":**
- Make sure you're on a page with an HTML form
- Try refreshing the page
- Check browser console for errors

**Extension won't load:**
- Verify manifest.json is valid
- Check that all required files are present
- Try reloading the extension from chrome://extensions/

**Form won't auto-fill:**
- Ensure you clicked "Fill Website Form" button
- Check that field names match
- Some forms may use JavaScript that prevents auto-fill

## 🔒 Privacy & Security

- All processing happens locally on your machine
- Form data is stored temporarily in memory only
- No data is sent to external servers except OpenRouter for AI questions (optional)
- Session data is cleared after completion

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- Support for more form field types
- Better field detection algorithms
- Multi-language support
- Form validation
- Data persistence options
- Export to other formats

## 📝 License

This project is provided as-is for educational and personal use.

## 🙏 Acknowledgments

- Built with Flask, Chrome Extension APIs
- AI powered by OpenRouter
- PDF processing with PyPDF2

## 📧 Support

For issues or questions:
1. Check the troubleshooting section
2. Review browser console logs
3. Check backend server logs
4. Open an issue with detailed information

## 🎉 Happy Form Filling!

Transform tedious form-filling into a conversational experience! 🚀
