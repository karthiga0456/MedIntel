import React, { useState } from 'react';
import { MagnifyingGlass, FileText, UploadSimple, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { api } from '../services/api';

export default function KnowledgeBase() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    
    try {
      const data = await api.rag.query(query);
      setResult(data.answer || data.response || "No answer returned from backend.");
    } catch (error) {
      setResult("Error querying the knowledge base.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    let file = null;
    
    if (e.type === 'drop') {
      file = e.dataTransfer.files[0];
    } else if (e.target.files) {
      file = e.target.files[0];
    }
    
    if (!file) return;

    setUploadedFile({ name: file.name, status: 'processing' });
    
    try {
      await api.rag.uploadDocument(file);
      setUploadedFile({ name: file.name, status: 'done' });
      setQuery(`Summarize the findings from the uploaded document: ${file.name}`);
    } catch (error) {
      setUploadedFile({ name: file.name, status: 'error' });
      setResult("Error uploading document. Please try again.");
    }
  };

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Healthcare RAG System</h2>
        <p className="subtitle">Query medical guidelines via Vector DB (FAISS) and perform Document OCR (Tesseract).</p>
      </header>
      
      <div className="glass-panel">
        
        {/* OCR File Upload Stub */}
        <label className="upload-zone" onDrop={handleFileUpload} onDragOver={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <UploadSimple weight="bold" />
          <h3 style={{ marginBottom: '8px' }}>Upload Document for OCR</h3>
          <p className="subtitle" style={{ marginBottom: 0 }}>Drag & drop PDFs or Images to extract text</p>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFileUpload} />
        </label>

        {uploadedFile && (
          <div className="file-item">
            <FileText size={24} color="var(--accent-cyan)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{uploadedFile.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {uploadedFile.status === 'processing' ? 'Extracting text and generating vectors...' : 
                 uploadedFile.status === 'error' ? 'Extraction failed.' :
                 'Extraction complete. Ready for RAG.'}
              </div>
            </div>
            {uploadedFile.status === 'done' ? <CheckCircle size={24} color="var(--accent-green)" /> : 
             uploadedFile.status === 'error' ? <WarningCircle size={24} color="var(--danger-red)" /> :
             <div className="typing-dot" style={{ background: 'var(--accent-cyan)' }}></div>}
          </div>
        )}

        <div className="form-group" style={{ marginTop: '24px' }}>
          <label>Search Knowledge Base</label>
          <div className="search-bar-wrapper">
            <MagnifyingGlass className="search-icon" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input" 
              placeholder="e.g., What are the treatment guidelines for Dengue?" 
            />
            <button className="btn-primary" onClick={handleSearch}>Search</button>
          </div>
        </div>
        
        <div className={`response-box ${result ? 'has-data' : ''} mt-4`}>
          {loading ? (
            <div className="empty-state">
              <i className="ph ph-spinner ph-spin"></i>
              <span>Querying FAISS Vector Database...</span>
            </div>
          ) : result ? (
            <pre>{result}</pre>
          ) : (
            <div className="empty-state">
              <MagnifyingGlass />
              <span>Results will appear here...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
