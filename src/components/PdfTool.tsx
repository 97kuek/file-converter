import React, { useState } from 'react';
import FileDropper from './FileDropper';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { X, RefreshCw, RotateCw } from 'lucide-react';
import { downloadBlob } from '../utils/imageConversion';
import { saveHistory } from '../utils/history';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

interface FileItem {
    id: string;
    file: File;
    rotation: number;
}

const PdfTool: React.FC = () => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [mode, setMode] = useState<'merge' | 'toImage'>('merge');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = (newFiles: File[]) => {
        const newItems: FileItem[] = newFiles.map(f => ({
            id: Math.random().toString(36).substr(2, 9),
            file: f,
            rotation: 0
        }));
        setFiles(prev => [...prev, ...newItems]);
    };

    const removeItem = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            const newFiles = [...files];
            [newFiles[index], newFiles[index - 1]] = [newFiles[index - 1], newFiles[index]];
            setFiles(newFiles);
        } else if (direction === 'down' && index < files.length - 1) {
            const newFiles = [...files];
            [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
            setFiles(newFiles);
        }
    };

    const rotateItem = (id: string) => {
        setFiles(prev => prev.map(f => {
            if (f.id === id) {
                return { ...f, rotation: (f.rotation + 90) % 360 };
            }
            return f;
        }));
    };

    const handleMerge = async () => {
        setIsProcessing(true);
        try {
            const mergedPdf = await PDFDocument.create();
            for (const item of files) {
                const arrayBuffer = await item.file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => {
                    const existingRotation = page.getRotation().angle;
                    page.setRotation(degrees(existingRotation + item.rotation));
                    mergedPdf.addPage(page);
                });
            }
            const pdfBytes = await mergedPdf.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            downloadBlob(blob, 'merged.pdf');

            saveHistory({
                id: Date.now().toString(),
                fileName: 'Merged PDF (' + files.length + ' files)',
                fileType: 'application/pdf',
                resultType: 'application/pdf',
                timestamp: Date.now(),
                size: blob.size
            });
        } catch (e) {
            console.error(e);
            alert('PDFの結合に失敗しました');
        }
        setIsProcessing(false);
    };

    const handleConvertToImage = async () => {
        setIsProcessing(true);
        try {
            for (const item of files) {
                const arrayBuffer = await item.file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    // Apply rotation
                    const viewport = page.getViewport({ scale: 2.0, rotation: page.rotate + item.rotation });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (context) {
                        await page.render({ canvasContext: context, viewport: viewport, canvas }).promise;
                        await new Promise<void>((resolve) => {
                            canvas.toBlob(blob => {
                                if (blob) {
                                    const pageNum = i.toString().padStart(3, '0');
                                    downloadBlob(blob, item.file.name.replace('.pdf', `_page${pageNum}.png`));

                                    // Optionally save history for each page? Or just once per file?
                                    // Let's save once per file to avoid spam.
                                    if (i === 1) { // Save only once per file
                                        saveHistory({
                                            id: item.id,
                                            fileName: item.file.name,
                                            fileType: 'application/pdf',
                                            resultType: 'image/png',
                                            timestamp: Date.now(),
                                            size: blob.size * pdf.numPages // rough estimate
                                        });
                                    }
                                }
                                resolve();
                            }, 'image/png');
                        });
                    }
                }
            }
        } catch (e) {
            console.error(e);
            alert('画像への変換に失敗しました');
        }
        setIsProcessing(false);
    };

    return (
        <div className="tool-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>PDFツール</h2>
                    <p className="description" style={{ color: 'var(--color-text-light)' }}>PDFの結合・画像変換・ページ回転</p>
                </div>
                {files.length > 0 && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '0.5rem', padding: '0.25rem' }}>
                            <button
                                onClick={() => setMode('merge')}
                                style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', backgroundColor: mode === 'merge' ? 'white' : 'transparent', fontWeight: '500', boxShadow: mode === 'merge' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                            >PDF結合</button>
                            <button
                                onClick={() => setMode('toImage')}
                                style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', backgroundColor: mode === 'toImage' ? 'white' : 'transparent', fontWeight: '500', boxShadow: mode === 'toImage' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                            >画像変換</button>
                        </div>

                        <button className="btn" onClick={mode === 'merge' ? handleMerge : handleConvertToImage} disabled={isProcessing}>
                            {isProcessing ? <><RefreshCw className="spin" size={18} /> 処理中...</> : (mode === 'merge' ? '結合・保存' : '画像へ変換')}
                        </button>
                    </div>
                )}
            </div>

            {files.length === 0 ? (
                <FileDropper
                    onFileSelect={handleFileSelect}
                    acceptedFormats="application/pdf"
                    label="PDFをここにドロップ"
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {files.map((item, index) => (
                        <div key={item.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', overflow: 'hidden' }}>
                                    PDF
                                </div>
                                <div>
                                    <p style={{ fontWeight: '500' }}>{item.file.name}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>{(item.file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {mode === 'merge' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '0.5rem' }}>
                                        <button onClick={() => moveItem(index, 'up')} disabled={index === 0} style={{ padding: '2px', cursor: 'pointer', opacity: index === 0 ? 0.3 : 1 }}>▲</button>
                                        <button onClick={() => moveItem(index, 'down')} disabled={index === files.length - 1} style={{ padding: '2px', cursor: 'pointer', opacity: index === files.length - 1 ? 0.3 : 1 }}>▼</button>
                                    </div>
                                )}

                                <button onClick={() => rotateItem(item.id)} className="icon-btn" title="90度回転" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0' }}>
                                    <RotateCw size={18} />
                                    {item.rotation > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{item.rotation}°</span>}
                                </button>

                                <button onClick={() => removeItem(item.id)} style={{ padding: '0.5rem', color: '#ef4444', marginLeft: '0.5rem' }} title="Remove">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <FileDropper
                            onFileSelect={handleFileSelect}
                            acceptedFormats="application/pdf"
                            label="PDFを追加"
                        />
                    </div>
                </div>
            )}
            <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .icon-btn:hover { background-color: #f1f5f9; }
      `}</style>
        </div>
    );
};

export default PdfTool;
