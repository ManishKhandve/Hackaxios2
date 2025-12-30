# Quick Setup Guide

## First Time Setup

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Configure API Key (Optional)
Edit `app.py` and set your OpenRouter API key:
```python
OPENROUTER_API_KEY = "your-key-here"
```

Or set as environment variable:
```bash
set OPENROUTER_API_KEY=your-key-here
```

## Running the Application

### Option 1: Use Batch Files (Windows)
```bash
# Terminal 1
start_backend.bat

# Terminal 2  
start_frontend.bat
```

### Option 2: Manual Start
```bash
# Terminal 1 - Backend
python app.py

# Terminal 2 - Frontend
cd frontend
npm start
```

## Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8004
- API Health: http://localhost:8004/health

## Troubleshooting

### Port Already in Use
- Backend: Change port in `app.py` (line ~1988)
- Frontend: Set PORT environment variable: `set PORT=3001`

### Missing Dependencies
```bash
pip install -r requirements.txt --upgrade
cd frontend && npm install
```

### API Key Issues
- Get free API key from: https://openrouter.ai/
- Set in `app.py` or environment variable

## Development

### Backend Changes
- Server auto-reloads on code changes
- Logs appear in terminal

### Frontend Changes
- React hot-reloads automatically
- Check browser console for errors

## Production Notes

1. **Security:**
   - Use environment variables for API keys
   - Configure CORS properly
   - Use HTTPS
   - Add authentication

2. **Performance:**
   - Use Redis for session storage
   - Enable caching
   - Add rate limiting
   - Deploy on cloud (AWS, GCP, Azure)

3. **Monitoring:**
   - Use `/health` endpoint
   - Add logging service
   - Set up error tracking
