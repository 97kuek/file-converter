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
    pagesToKeep?: number[]; // indices of pages to keep (0-indexed)
    totalPages?: number;
    compressionLevel?: 'low' | 'medium' | 'high'; // Not fully implemented in pdf-lib but used for logic placeholder
}

const PdfTool: React.FC = () => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [mode, setMode] = useState<'merge' | 'toImage' | 'split' | 'compress'>('merge');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileSelect = async (newFiles: File[]) => {
        const newItems: FileItem[] = [];
        for (const f of newFiles) {
            let totalPages = 0;
            if (f.type === 'application/pdf') {
                try {
                    const arrayBuffer = await f.arrayBuffer();
                    const pdf = await PDFDocument.load(arrayBuffer);
                    totalPages = pdf.getPageCount();
                } catch (e) {
                    console.error('Failed to load PDF info', e);
                }
            }

            newItems.push({
                id: Math.random().toString(36).substr(2, 9),
                file: f,
                rotation: 0,
                totalPages: totalPages,
                pagesToKeep: Array.from({ length: totalPages }, (_, i) => i) // initially keep all
            });
        }
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

    const togglePage = (fileId: string, pageIndex: number) => {
        setFiles(prev => prev.map(f => {
            if (f.id === fileId && f.pagesToKeep) {
                const newPages = f.pagesToKeep.includes(pageIndex)
                    ? f.pagesToKeep.filter(p => p !== pageIndex)
                    : [...f.pagesToKeep, pageIndex].sort((a, b) => a - b);
                return { ...f, pagesToKeep: newPages };
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
                const pages = item.pagesToKeep || pdf.getPageIndices();

                const copiedPages = await mergedPdf.copyPages(pdf, pages);
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

    const handleSplitDelete = async () => {
        setIsProcessing(true);
        try {
            for (const item of files) {
                const arrayBuffer = await item.file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const newPdf = await PDFDocument.create();

                // Only pages in pagesToKeep
                const pagesToUse = item.pagesToKeep || [];
                if (pagesToUse.length === 0) continue;

                const copiedPages = await newPdf.copyPages(pdf, pagesToUse);
                copiedPages.forEach(p => newPdf.addPage(p));

                const pdfBytes = await newPdf.save();
                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                downloadBlob(blob, item.file.name.replace('.pdf', '_edited.pdf'));

                saveHistory({
                    id: Date.now().toString(),
                    fileName: item.file.name,
                    fileType: 'application/pdf',
                    resultType: 'application/pdf',
                    timestamp: Date.now(),
                    size: blob.size
                });
            }
        } catch (e) {
            console.error(e);
            alert('PDFの編集に失敗しました');
        }
        setIsProcessing(false);
    };

    const handleCompress = async () => {
        setIsProcessing(true);
        try {
            for (const item of files) {
                const arrayBuffer = await item.file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);

                // pdf-lib's save() optimizes by removing unused objects by default.
                // We can also try to remove some metadata.
                pdf.setTitle('');
                pdf.setAuthor('');
                pdf.setSubject('');
                pdf.setKeywords([]);
                pdf.setProducer('');
                pdf.setCreator('');

                // Re-save with useObjectStreams usually default true but explicit doesn't hurt, 
                // actually pdf-lib doesn't expose strict 'compression' options like Ghostscript.
                // But saving a loaded doc often reduces size if there were incremental updates.
                const pdfBytes = await pdf.save({ useObjectStreams: true });

                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                downloadBlob(blob, item.file.name.replace('.pdf', '_compressed.pdf'));

                saveHistory({
                    id: Date.now().toString(),
                    fileName: item.file.name,
                    fileType: 'application/pdf',
                    resultType: 'application/pdf',
                    timestamp: Date.now(),
                    size: blob.size
                });
            }
        } catch (e) {
            console.error(e);
            alert('PDFの圧縮に失敗しました');
        }
        setIsProcessing(false);
    };

    const handleConvertToImage = async () => {
        setIsProcessing(true);
        try {
            for (const item of files) {
                const arrayBuffer = await item.file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                // Only convert selected pages if in split mode logic? 
                // For simplicity, let's convert selected pages if pagesToKeep exists, otherwise all
                const pagesToUse = item.pagesToKeep || Array.from({ length: pdf.numPages }, (_, i) => i);

                for (const pageIdx of pagesToUse) {
                    const pageNum = pageIdx + 1; // 1-based
                    const page = await pdf.getPage(pageNum);
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
                                    const pNumStr = pageNum.toString().padStart(3, '0');
                                    downloadBlob(blob, item.file.name.replace('.pdf', `_page${pNumStr}.png`));

                                    if (pageIdx === pagesToUse[0]) {
                                        saveHistory({
                                            id: item.id,
                                            fileName: item.file.name,
                                            fileType: 'application/pdf',
                                            resultType: 'image/png',
                                            timestamp: Date.now(),
                                            size: blob.size * pagesToUse.length
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
                    <p className="description" style={{ color: 'var(--color-text-light)' }}>PDF結合・画像変換・ページ削除・圧縮</p>
                </div>
                {files.length > 0 && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ display: 'flex', backgroundColor: '#e2e8f0', borderRadius: '0.5rem', padding: '0.25rem' }}>
                            <button
                                onClick={() => setMode('merge')}
                                style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', backgroundColor: mode === 'merge' ? 'white' : 'transparent', fontWeight: '500', boxShadow: mode === 'merge' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                            >PDF結合</button>
                            <button
                                onClick={() => setMode('split')}
                                style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', backgroundColor: mode === 'split' ? 'white' : 'transparent', fontWeight: '500', boxShadow: mode === 'split' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                            >ページ編集</button>
                            <button
                                onClick={() => setMode('compress')}
                                style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', backgroundColor: mode === 'compress' ? 'white' : 'transparent', fontWeight: '500', boxShadow: mode === 'compress' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                            >圧縮(軽量化)</button>
                            <button
                                onClick={() => setMode('toImage')}
                                style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', backgroundColor: mode === 'toImage' ? 'white' : 'transparent', fontWeight: '500', boxShadow: mode === 'toImage' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}
                            >画像変換</button>
                        </div>

                        <button className="btn" onClick={mode === 'merge' ? handleMerge : mode === 'split' ? handleSplitDelete : mode === 'compress' ? handleCompress : handleConvertToImage} disabled={isProcessing}>
                            {isProcessing ? <><RefreshCw className="spin" size={18} /> 処理中...</> :
                                (mode === 'merge' ? '結合・保存' : mode === 'split' ? '編集・保存' : mode === 'compress' ? '圧縮・保存' : '画像へ変換')}
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
                        <div key={item.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', overflow: 'hidden' }}>
                                        PDF
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: '500' }}>{item.file.name}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                                            {(item.file.size / 1024).toFixed(1)} KB / {item.totalPages} pages
                                        </p>
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

                            {/* Page Selection for Split/Delete */}
                            {(mode === 'split' || mode === 'merge') && item.totalPages && item.totalPages > 0 && (
                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                    <p style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--color-text-light)' }}>
                                        {mode === 'split' ? '保存するページを選択（選択解除で削除）:' : '結合するページを選択:'}
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {Array.from({ length: item.totalPages }).map((_, i) => {
                                            const isSelected = item.pagesToKeep?.includes(i);
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => togglePage(item.id, i)}
                                                    style={{
                                                        width: '30px', height: '30px',
                                                        borderRadius: '0.25rem',
                                                        border: isSelected ? '1px solid var(--color-primary)' : '1px solid #cbd5e1',
                                                        backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
                                                        color: isSelected ? 'white' : 'var(--color-text)',
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {i + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {mode === 'compress' && (
                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                                        メタデータを削除し、オブジェクトストリームを使用してファイルサイズを最適化します。
                                    </p>
                                </div>
                            )}
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
