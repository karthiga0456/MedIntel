import React, { useState } from 'react';
import { MagnifyingGlass, FileText, UploadSimple, WarningCircle, CheckCircle, Spinner, Robot } from '@phosphor-icons/react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';

// Simple markdown renderer (matches Assistant.jsx style)
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:12px;">$1</code>')
    .replace(/^### (.*?)$/gm, '<h4 style="color:var(--accent-cyan);font-size:15px;font-weight:700;margin:14px 0 8px 0;">$1</h4>')
    .replace(/^## (.*?)$/gm, '<h3 style="color:#e2e8f0;font-size:16px;font-weight:700;margin:14px 0 8px 0;">$1</h3>')
    .replace(/^- (.*?)$/gm, '<div style="display:flex;gap:8px;margin:4px 0;"><span style="color:var(--accent-cyan);margin-top:1px;flex-shrink:0;">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.*?)$/gm, '<div style="display:flex;gap:8px;margin:4px 0;"><span style="color:var(--accent-cyan);flex-shrink:0;font-weight:600;">→</span><span>$1</span></div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function KnowledgeBase() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.warning('Please enter a query to search.', 'Input Required');
      return;
    }
    setLoading(true);
    setResult(null);
    
    try {
      const data = await api.rag.query(query);
      const answer = data.answer || data.response;
      if (!answer) {
        setResult('⚠️ **No answer returned.** The backend processed your query but returned an empty response. Please try rephrasing your question or upload a relevant medical document first.');
      } else {
        setResult(answer);
      }
    } catch (error) {
      // Only use offline fallbacks when the server is genuinely unreachable (network error)
      const isNetworkError = error.message === 'Failed to fetch' || error.message.includes('NetworkError') || error.message.includes('net::ERR');
      if (isNetworkError) {
        // Minimal offline hint – do NOT fake medical data
        setResult(`⚠️ **Offline Mode** — Could not reach the MedIntel backend.\n\nPlease check your internet connection or ensure the backend server is running.\n\nFor urgent clinical guidance, consult your Primary Health Centre (PHC) or call **112**.`);
        toast.warning('Backend unreachable. Showing offline message.', 'Connection Error');
      } else {
        // Real API error — surface it clearly
        setResult(`❌ **Query Failed:** ${error.message}\n\nPlease try again or upload a medical document first before querying.`);
        toast.error(error.message, 'RAG Query Error');
      }
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
    toast.info(`Uploading ${file.name} for OCR processing...`, 'Upload Started');
    
    try {
      const res = await api.rag.uploadDocument(file);
      setUploadedFile({ name: file.name, status: 'done' });
      setQuery(`Summarize the findings from the uploaded document: ${file.name}`);
      const previewText = res.extracted_preview || 'Document text extracted successfully.';
      setResult(`📄 **Document Ingested Successfully!**\n\n**Filename:** \`${file.name}\`\n**Indexed Chunks:** ${res.chunks_indexed || 1}\n\n**Extracted Text Preview:**\n> ${previewText}\n\nClick **Search** or type a custom query below to analyze clinical findings.`);
      toast.success('Document uploaded and indexed successfully.', 'Processing Complete');
    } catch (error) {
      setUploadedFile({ name: file.name, status: 'error' });
      setResult(`❌ **Document Upload Failed:** ${error.message}\n\nPlease verify that the uploaded file is a valid PDF, Image, or Text document.`);
      toast.error(error.message || 'File upload failed', 'Upload Error');
    }
  };

  return (
    <div className="module-view">
      <header className="module-header">
        <h2>Medical Records & RAG</h2>
        <p className="subtitle">Query medical guidelines via FAISS Vector Database and extract text with OCR.</p>
      </header>
      
      <div className="glass-panel" style={{ padding: '24px' }}>
        
        {/* Upload Zone */}
        <label 
          onDrop={handleFileUpload} 
          onDragOver={(e) => e.preventDefault()} 
          style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '40px', border: '2px dashed var(--panel-border)', borderRadius: '16px',
            background: 'var(--panel-bg)', cursor: 'pointer', transition: 'all 0.2s',
            marginBottom: '24px'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-cyan)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
        >
          <div style={{ padding: '16px', background: 'var(--accent-cyan-transparent)', borderRadius: '50%', marginBottom: '16px', color: 'var(--accent-cyan)' }}>
            <UploadSimple size={32} weight="duotone" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Upload Medical Document</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Drag & drop PDFs or Images to extract text</p>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFileUpload} />
        </label>

        {uploadedFile && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', 
            background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', 
            borderRadius: '12px', marginBottom: '24px' 
          }}>
            <FileText size={28} color="var(--accent-cyan)" weight="duotone" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>{uploadedFile.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {uploadedFile.status === 'processing' ? 'Extracting text and generating vectors...' : 
                 uploadedFile.status === 'error' ? 'Extraction failed.' :
                 'Extraction complete. Ready for search.'}
              </div>
            </div>
            {uploadedFile.status === 'done' ? <CheckCircle size={24} color="var(--accent-green)" weight="fill" /> : 
             uploadedFile.status === 'error' ? <WarningCircle size={24} color="var(--danger-red)" weight="fill" /> :
             <Spinner size={24} color="var(--accent-cyan)" className="spin" />}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Search Knowledge Base
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="input-icon-wrapper" style={{ flex: 1 }}>
              <MagnifyingGlass size={18} />
              <input 
                type="search" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. What are the treatment guidelines for Dengue?" 
                style={{ fontSize: '15px', padding: '12px 14px 12px 42px' }}
              />
            </div>
            <button className="btn-primary" onClick={handleSearch} disabled={loading} style={{ padding: '0 24px', whiteSpace: 'nowrap' }}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
        
        {/* Results Area */}
        <div style={{ 
          background: 'var(--panel-bg)', border: '1px solid var(--panel-border)', 
          borderRadius: '12px', padding: '24px', minHeight: '180px',
          display: 'flex', flexDirection: 'column'
        }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="skeleton skeleton-title" style={{ width: '40%' }} />
              <div className="skeleton skeleton-text" style={{ width: '90%' }} />
              <div className="skeleton skeleton-text" style={{ width: '80%' }} />
              <div className="skeleton skeleton-text" style={{ width: '85%' }} />
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            </div>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--panel-border)' }}>
                <Robot size={18} weight="fill" color="var(--accent-cyan)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>RAG Response</span>
              </div>
              <div
                style={{ fontSize: '14px', lineHeight: '1.75', color: 'var(--text-primary)' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
              />
            </div>
          ) : (
            <div className="empty-state" style={{ margin: 'auto', background: 'transparent', border: 'none', padding: 0 }}>
              <MagnifyingGlass size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', margin: '0 0 4px', color: 'var(--text-secondary)' }}>No results yet</h3>
              <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)' }}>Search the knowledge base to see guidelines and extracted documents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
