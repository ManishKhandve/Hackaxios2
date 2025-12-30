# 🚀 Quick Start Guide

Get up and running with Bureaucracy Breaker in 5 minutes!

## Step 1: Install Backend (2 minutes)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Optional: Set up API key for AI questions
cp .env.example .env
# Edit .env and add your OpenRouter API key

# Start the server
python app.py
```

You should see:
```
🚀 Bureaucracy Breaker Backend Starting
🌐 Server: http://localhost:8004
✅ API Connected
```

## Step 2: Install Extension (1 minute)

1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select this project folder
5. Done! ✅

## Step 3: Test Website Forms (2 minutes)

1. **Open the test form:**
   - Open `test-form.html` in Chrome
   - Or visit any website with a form

2. **Use the extension:**
   - Click the extension icon in toolbar
   - Select "Website Form"
   - Click "Scan Form on This Page"
   - Answer the questions
   - Click "Fill Website Form"
   - Review and submit!

## Step 4: Test PDF Forms (Optional)

1. Click extension icon
2. Select "PDF Form"
3. Upload a PDF with fillable fields
4. Answer questions
5. Download completed PDF

## 🎉 That's It!

You're ready to breeze through forms with conversational AI!

## 💡 Tips

- **No API Key?** The extension works without it, just uses simpler questions
- **No Icons?** Comment out the "icons" section in manifest.json (line 20-24)
- **Form Not Detected?** Make sure the page has actual `<form>` elements
- **Need Help?** Check the main README.md for detailed troubleshooting

## 🔗 Test Sites

Try these sites with forms:
- Google Forms
- Contact forms on company websites
- Registration/signup forms
- Survey forms

## ⚠️ Common Issues

**"API Offline"**
```bash
# Make sure Python server is running:
python app.py
```

**Extension Won't Load**
```bash
# Check that you have all required files:
ls -la
# Should see: manifest.json, popup.html, popup.js, content.js, etc.
```

**Form Not Filling**
- Some websites prevent auto-fill with JavaScript
- Try the test-form.html first to verify it works
- Check browser console for errors (F12)

## 🎯 Next Steps

- Add your OpenRouter API key for better questions
- Try it on your favorite websites
- Customize the extension for your needs
- Check out the full README.md for advanced features

Happy form filling! 🎊
