import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { 
  Upload, Send, FileText, CheckCircle, MessageCircle, 
  Sparkles, Download, RefreshCw, Menu, X, File, Eye, Activity, AlertCircle, Wifi, WifiOff
} from 'lucide-react';

const API_BASE = 'http://localhost:8004';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [apiHealth, setApiHealth] = useState({ status: 'checking', latency: null, lastCheck: null });
  const [showHealthDetails, setShowHealthDetails] = useState(false);
  
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // API Health Check
  useEffect(() => {
    const checkApiHealth = async () => {
      const startTime = Date.now();
      try {
        const response = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
        const latency = Date.now() - startTime;
        setApiHealth({
          status: response.data.status === 'healthy' ? 'healthy' : 'degraded',
          latency,
          lastCheck: new Date(),
          details: response.data
        });
      } catch (error) {
        setApiHealth({
          status: 'offline',
          latency: null,
          lastCheck: new Date(),
          error: error.message
        });
      }
    };

    // Initial check
    checkApiHealth();

    // Check every 30 seconds
    const interval = setInterval(checkApiHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const addMessage = (content, type = 'bot', extra = {}) => {
    const msg = { id: Date.now(), content, type, timestamp: new Date(), ...extra };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.pdf')) {
      addMessage('Please upload a valid PDF file.', 'error');
      return;
    }

    setIsLoading(true);
    setUploadedFileName(file.name);
    addMessage(`Uploading ${file.name}...`, 'system');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await axios.post(`${API_BASE}/upload-pdf`, formData);
      const { session_id, total_fields, summary } = uploadRes.data;

      if (total_fields === 0) {
        addMessage('This PDF has no fillable form fields. Please upload a PDF with form fields (text boxes, checkboxes, etc.).', 'error');
        return;
      }

      // Show document summary first
      if (summary) {
        addMessage(`📄 **Document Summary:** ${summary}`, 'bot', { isMarkdown: true });
      }
      
      addMessage(`Found ${total_fields} fields in your form. I'll help you fill them out!`, 'bot');
      addMessage(`💡 **Tip:** You can ask me questions anytime by just typing. Say "continue" or "next" to resume filling the form.`, 'system');

      const startRes = await axios.post(`${API_BASE}/start-session`, { session_id });
      
      setCurrentSession(session_id);
      setSessions(prev => [...prev, { id: session_id, name: file.name, date: new Date() }]);

      if (startRes.data.question) {
        setCurrentQuestion(startRes.data.question);
        const q = startRes.data.question;
        const progress = q.current && q.total ? `(${q.current}/${q.total}) ` : '';
        addMessage(progress + (q.text || q.question), 'bot', { 
          explanation: q.explanation,
          fieldType: q.field_type
        });
      } else if (startRes.data.message) {
        addMessage(startRes.data.message, 'bot');
      }
    } catch (err) {
      // Handle rate limiting and API errors
      if (err.response?.status === 429) {
        addMessage('⏳ Rate limit reached while analyzing PDF. Please wait a moment and try again.', 'error');
      } else if (err.response?.status === 402) {
        addMessage('💳 API credits exhausted. The service needs to add credits to continue.', 'error');
      } else if (err.response?.data?.error) {
        addMessage(err.response.data.error, 'error');
      } else {
        addMessage('Failed to process PDF. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user input looks like a question/chat vs a form answer
  const looksLikeChat = (text) => {
    const chatPatterns = [
      /^(what|how|why|when|where|who|can you|could you|please|help|explain|tell me)/i,
      /\?$/,
      /^(hi|hello|hey|thanks|thank you|ok|okay)/i
    ];
    return chatPatterns.some(pattern => pattern.test(text.trim()));
  };

  const handleSendMessage = async (answer = null) => {
    const userAnswer = answer || inputValue.trim();
    if (!userAnswer || !currentSession || isLoading) return;

    setInputValue('');
    addMessage(userAnswer, 'user');
    setIsLoading(true);

    try {
      // Check if this looks like a chat message or question
      const isChat = looksLikeChat(userAnswer) && !['yes', 'no', 'skip'].includes(userAnswer.toLowerCase());
      
      if (isChat) {
        // Send to chat endpoint instead
        const chatRes = await axios.post(`${API_BASE}/chat`, {
          session_id: currentSession,
          message: userAnswer
        });
        
        addMessage(chatRes.data.response, 'bot');
        
        // If it was a command to continue, get next question
        if (chatRes.data.is_form_command) {
          const res = await axios.post(`${API_BASE}/next-question`, {
            session_id: currentSession,
            answer: null
          });
          
          if (res.data.question) {
            setCurrentQuestion(res.data.question);
            const q = res.data.question;
            const progress = q.current && q.total ? `(${q.current}/${q.total}) ` : '';
            addMessage(progress + (q.text || q.question), 'bot', { 
              explanation: q.explanation,
              fieldType: q.field_type
            });
          }
        }
      } else {
        // Normal form answer flow
        const res = await axios.post(`${API_BASE}/next-question`, {
          session_id: currentSession,
          answer: userAnswer
        });

        if (res.data.error) {
          addMessage(res.data.error, 'error');
        } else if (res.data.completed) {
          setIsCompleted(true);
          setCurrentQuestion(null);
          addMessage("🎉 All done! Your form is ready. Click the download button to get your completed PDF.", 'success');
        } else if (res.data.question) {
          setCurrentQuestion(res.data.question);
          const q = res.data.question;
          const progress = q.current && q.total ? `(${q.current}/${q.total}) ` : '';
          addMessage(progress + (q.text || q.question), 'bot', { 
            explanation: q.explanation,
            fieldType: q.field_type
          });
        }
      }
    } catch (err) {
      // Handle rate limiting and API errors
      if (err.response?.status === 429) {
        addMessage('⏳ Rate limit reached. Please wait a moment and try again.', 'error');
      } else if (err.response?.status === 402) {
        addMessage('💳 API credits exhausted. The service needs to add credits to continue.', 'error');
      } else if (err.response?.data?.error) {
        addMessage(err.response.data.error, 'error');
      } else {
        addMessage('Something went wrong. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewPDF = async () => {
    if (!currentSession) return;
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/generate-pdf`, 
        { session_id: currentSession },
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPdfBlob(blob);
      setShowPreview(true);
    } catch (err) {
      addMessage('Failed to generate PDF preview. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfBlob) return;
    
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `completed_${uploadedFileName || 'form.pdf'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    addMessage('PDF downloaded successfully!', 'success');
    closePreview();
  };

  const closePreview = () => {
    setShowPreview(false);
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const startNewSession = () => {
    setCurrentSession(null);
    setMessages([]);
    setCurrentQuestion(null);
    setIsCompleted(false);
    setUploadedFileName('');
    setInputValue('');
    setSelectedImage(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addMessage('Please upload a valid image file (PNG, JPG, JPEG, GIF)', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addMessage('Image file is too large. Please upload an image smaller than 5MB.', 'error');
      return;
    }

    setIsLoading(true);
    addMessage(`Uploading ${file.name}...`, 'system');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('session_id', currentSession);
      formData.append('field_name', currentQuestion?.field_name);

      const res = await axios.post(`${API_BASE}/upload-image?session_id=${currentSession}&field_name=${currentQuestion?.field_name}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSelectedImage(file);
      addMessage(`✅ Image uploaded: ${file.name}`, 'success');
      
      // Automatically advance to next question
      await handleSendMessage('IMAGE_UPLOADED');
      
    } catch (err) {
      if (err.response?.status === 429) {
        addMessage('⏳ Rate limit reached. Please wait a moment and try again.', 'error');
      } else if (err.response?.status === 402) {
        addMessage('💳 API credits exhausted. The service needs to add credits to continue.', 'error');
      } else if (err.response?.data?.error) {
        addMessage(err.response.data.error, 'error');
      } else {
        addMessage('Failed to upload image. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Check question type for different input displays
  const isCheckboxQuestion = currentQuestion?.field_type === 'checkbox';
  const isChoiceQuestion = currentQuestion?.field_type === 'choice';
  const isRadioGroupQuestion = currentQuestion?.field_type === 'radio_group';
  const isImageQuestion = currentQuestion?.field_type === 'image';
  const choiceOptions = currentQuestion?.options || [];
  // For radio groups, extract labels from options - handle both object and string formats
  const radioOptions = isRadioGroupQuestion && choiceOptions.length > 0 
    ? choiceOptions.map(opt => typeof opt === 'object' ? (opt.label || opt.value) : opt) 
    : [];
  
  // Debug logging for options
  if (currentQuestion?.options) {
    console.log('[DEBUG] Current question options:', currentQuestion.options);
    console.log('[DEBUG] Field type:', currentQuestion.field_type);
    console.log('[DEBUG] Radio options:', radioOptions);
  }

  return (
    <div className="app-container">
      {/* Mobile menu toggle */}
      <button className="mobile-menu-btn glass-button" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar glass-panel ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img src="/logo.svg" alt="Logo" className="logo-icon" />
            <span>Bureaucracy Breaker</span>
          </div>
        </div>

        <button className="new-chat-btn glass-button" onClick={startNewSession}>
          <RefreshCw size={18} />
          <span>New Form</span>
        </button>

        <div className="sessions-list">
          <h3>Recent Sessions</h3>
          {sessions.length === 0 ? (
            <p className="no-sessions">No sessions yet</p>
          ) : (
            sessions.map(session => (
              <div 
                key={session.id} 
                className={`session-item ${currentSession === session.id ? 'active' : ''}`}
                onClick={() => setCurrentSession(session.id)}
              >
                <FileText size={16} />
                <span>{session.name}</span>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          {/* API Health Indicator */}
          <div 
            className={`api-health-indicator ${apiHealth.status}`}
            onClick={() => setShowHealthDetails(!showHealthDetails)}
            title="Click for details"
          >
            <div className="health-status">
              {apiHealth.status === 'healthy' && <Wifi size={14} className="health-icon" />}
              {apiHealth.status === 'degraded' && <Activity size={14} className="health-icon pulse" />}
              {apiHealth.status === 'offline' && <WifiOff size={14} className="health-icon" />}
              {apiHealth.status === 'checking' && <Activity size={14} className="health-icon spin" />}
              <span className="health-text">
                {apiHealth.status === 'healthy' && 'API Online'}
                {apiHealth.status === 'degraded' && 'API Slow'}
                {apiHealth.status === 'offline' && 'API Offline'}
                {apiHealth.status === 'checking' && 'Checking...'}
              </span>
              {apiHealth.latency && (
                <span className="health-latency">{apiHealth.latency}ms</span>
              )}
            </div>
            
            {showHealthDetails && (
              <div className="health-details">
                <div className="health-detail-row">
                  <span>Status:</span>
                  <span className="health-value">{apiHealth.status}</span>
                </div>
                {apiHealth.latency && (
                  <div className="health-detail-row">
                    <span>Latency:</span>
                    <span className="health-value">{apiHealth.latency}ms</span>
                  </div>
                )}
                {apiHealth.lastCheck && (
                  <div className="health-detail-row">
                    <span>Last Check:</span>
                    <span className="health-value">{apiHealth.lastCheck.toLocaleTimeString()}</span>
                  </div>
                )}
                {apiHealth.details?.ai_service && (
                  <div className="health-detail-row">
                    <span>AI Service:</span>
                    <span className="health-value">{apiHealth.details.ai_service}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="footer-tagline">Transform forms into conversations</p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-area">
        <div className="chat-header glass-panel">
          <div className="header-content">
            <MessageCircle size={24} />
            <div>
              <h1>Form Assistant</h1>
              <p>{currentSession ? `Session: ${currentSession.slice(0, 8)}...` : 'Upload a PDF to start'}</p>
            </div>
          </div>
          {isCompleted && (
            <button className="download-btn glass-button" onClick={handlePreviewPDF} disabled={isLoading}>
              <Eye size={18} />
              <span>Preview PDF</span>
            </button>
          )}
        </div>

        <div className="messages-container" ref={chatContainerRef}>
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-content glass-panel animate-fade-in">
                <img src="/logo.svg" alt="Logo" className="welcome-icon" />
                <h2>Welcome to Bureaucracy Breaker</h2>
                <p>Upload a government PDF form and I'll help you fill it out through a simple conversation. I'll summarize the document first, then guide you through each field. You can also ask me questions anytime!</p>
                <label className="upload-area glass-button">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileUpload} 
                    ref={fileInputRef}
                    hidden 
                  />
                  <Upload size={24} />
                  <span>Upload PDF Form</span>
                </label>
                <p className="welcome-tip">💬 Chat with me anytime during the process!</p>
              </div>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, idx) => (
                <div 
                  key={msg.id} 
                  className={`message ${msg.type} animate-fade-in`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="message-bubble glass-panel">
                    <p>{msg.content}</p>
                    {msg.explanation && (
                      <span className="explanation">{msg.explanation}</span>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message bot animate-fade-in">
                  <div className="message-bubble glass-panel typing">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="input-area glass-panel">
          {!currentSession && messages.length > 0 ? (
            <label className="upload-inline glass-button">
              <input type="file" accept=".pdf" onChange={handleFileUpload} hidden />
              <Upload size={18} />
              <span>Upload another PDF</span>
            </label>
          ) : currentSession && !isCompleted ? (
            <div className="input-wrapper">
              {isRadioGroupQuestion && radioOptions.length > 0 ? (
                <div className="radio-options">
                  {radioOptions.map((option, idx) => (
                    <button 
                      key={idx}
                      className="radio-btn glass-button"
                      onClick={() => handleSendMessage(option)}
                      disabled={isLoading}
                    >
                      <span className="radio-circle"></span>
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              ) : isChoiceQuestion && choiceOptions.length > 0 ? (
                <div className="choice-options">
                  {choiceOptions.map((option, idx) => (
                    <button 
                      key={idx}
                      className="choice-btn glass-button"
                      onClick={() => handleSendMessage(option)}
                      disabled={isLoading}
                    >
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              ) : isCheckboxQuestion ? (
                <div className="checkbox-options">
                  <button 
                    className="option-btn yes glass-button"
                    onClick={() => handleSendMessage('Yes')}
                    disabled={isLoading}
                  >
                    <CheckCircle size={18} />
                    <span>Yes</span>
                  </button>
                  <button 
                    className="option-btn no glass-button"
                    onClick={() => handleSendMessage('No')}
                    disabled={isLoading}
                  >
                    <X size={18} />
                    <span>No</span>
                  </button>
                </div>
              ) : isImageQuestion ? (
                <div className="image-upload-area">
                  <label className="image-upload-btn glass-button">
                    <input 
                      type="file" 
                      accept="image/png,image/jpeg,image/jpg,image/gif"
                      onChange={handleImageUpload}
                      ref={imageInputRef}
                      hidden 
                      disabled={isLoading}
                    />
                    <Upload size={20} />
                    <span>{selectedImage ? `Selected: ${selectedImage.name}` : 'Upload Image'}</span>
                  </label>
                  <button 
                    className="skip-btn glass-button"
                    onClick={() => handleSendMessage('SKIP')}
                    disabled={isLoading}
                  >
                    Skip this field
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type an answer or ask a question..."
                    disabled={isLoading}
                    className="chat-input"
                  />
                  <button 
                    className="send-btn glass-button" 
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isLoading}
                  >
                    <Send size={20} />
                  </button>
                </>
              )}
            </div>
          ) : isCompleted ? (
            <div className="completed-actions">
              <button className="glass-button" onClick={handlePreviewPDF} disabled={isLoading}>
                <Eye size={18} />
                <span>Preview & Download PDF</span>
              </button>
              <button className="glass-button secondary" onClick={startNewSession}>
                <RefreshCw size={18} />
                <span>Start New Form</span>
              </button>
            </div>
          ) : (
            <label className="upload-inline glass-button">
              <input type="file" accept=".pdf" onChange={handleFileUpload} hidden />
              <Upload size={18} />
              <span>Upload a PDF to begin</span>
            </label>
          )}
        </div>
      </main>

      {/* PDF Preview Modal */}
      {showPreview && (
        <div className="preview-overlay" onClick={closePreview}>
          <div className="preview-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>PDF Preview</h3>
              <button className="close-btn" onClick={closePreview}>
                <X size={20} />
              </button>
            </div>
            <div className="preview-content">
              {previewUrl && (
                <iframe 
                  src={previewUrl} 
                  title="PDF Preview"
                  className="pdf-iframe"
                />
              )}
            </div>
            <div className="preview-actions">
              <button className="glass-button secondary" onClick={closePreview}>
                Cancel
              </button>
              <button className="glass-button primary" onClick={handleDownloadPDF}>
                <Download size={18} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
