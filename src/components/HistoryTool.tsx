import React, { useEffect, useState } from 'react';
import { getHistory, clearHistory, type HistoryItem } from '../utils/history';
import { Trash2, Clock, FileType } from 'lucide-react';

const HistoryTool: React.FC = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    const loadHistory = () => {
        setHistory(getHistory());
    };

    useEffect(() => {
        loadHistory();
        window.addEventListener('historyUpdated', loadHistory);
        return () => window.removeEventListener('historyUpdated', loadHistory);
    }, []);

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('ja-JP');
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="tool-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>変換履歴</h2>
                    <p className="description" style={{ color: 'var(--color-text-light)' }}>最近の変換履歴 (最大50件)</p>
                </div>
                {history.length > 0 && (
                    <button onClick={clearHistory} className="btn" style={{ backgroundColor: '#ef4444' }}>
                        <Trash2 size={18} /> 履歴を削除
                    </button>
                )}
            </div>

            {history.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-light)' }}>
                    <Clock size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>履歴はありません</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {history.map((item, index) => (
                        <div key={index} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileType size={20} color="var(--color-text-light)" />
                                </div>
                                <div>
                                    <p style={{ fontWeight: '500' }}>{item.fileName}</p>
                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                                        <span>{item.resultType}</span>
                                        <span>•</span>
                                        <span>{formatSize(item.size)}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                                {formatTime(item.timestamp)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryTool;
