import { useState } from 'react';
import { Image, FileText, Film, Layers } from 'lucide-react';
import ImageTool from './components/ImageTool';
import MediaTool from './components/MediaTool';
import PdfTool from './components/PdfTool';
import HistoryTool from './components/HistoryTool';
import { History } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'pdf' | 'history'>('image');

  return (
    <div className="app-container">
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Layers size={32} color="var(--color-primary)" />
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(to right, var(--color-primary), #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            FileConverter
          </h1>
        </div>
        <p style={{ color: 'var(--color-text-light)', fontSize: '1rem' }}>
          安全・高速なブラウザ完結型ファイル変換ツール
        </p>
      </header>

      <nav style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          className={`tab-btn ${activeTab === 'image' ? 'active' : ''}`}
          onClick={() => setActiveTab('image')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem', borderRadius: '2rem',
            backgroundColor: activeTab === 'image' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: activeTab === 'image' ? 'white' : 'var(--color-text)',
            fontWeight: '600',
            boxShadow: activeTab === 'image' ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '0.95rem'
          }}
        >
          <Image size={18} /> 画像変換
        </button>
        <button
          className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveTab('video')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem', borderRadius: '2rem',
            backgroundColor: activeTab === 'video' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: activeTab === 'video' ? 'white' : 'var(--color-text)',
            fontWeight: '600',
            boxShadow: activeTab === 'video' ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '0.95rem'
          }}
        >
          <Film size={18} /> 動画・音声
        </button>
        <button
          className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
          onClick={() => setActiveTab('pdf')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem', borderRadius: '2rem',
            backgroundColor: activeTab === 'pdf' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: activeTab === 'pdf' ? 'white' : 'var(--color-text)',
            fontWeight: '600',
            boxShadow: activeTab === 'pdf' ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '0.95rem'
          }}
        >
          <FileText size={18} /> PDF結合
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.75rem 1.25rem', borderRadius: '2rem',
            backgroundColor: activeTab === 'history' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: activeTab === 'history' ? 'white' : 'var(--color-text)',
            fontWeight: '600',
            boxShadow: activeTab === 'history' ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontSize: '0.95rem'
          }}
        >
          <History size={18} /> 履歴
        </button>
      </nav>

      <main>
        {activeTab === 'image' && <ImageTool />}
        {activeTab === 'video' && <MediaTool />}
        {activeTab === 'pdf' && <PdfTool />}
        {activeTab === 'history' && <HistoryTool />}
      </main>
    </div>
  );
}

export default App;
