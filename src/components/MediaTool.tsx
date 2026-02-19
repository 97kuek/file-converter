import React, { useState, useEffect } from 'react';
import FileDropper from './FileDropper';
import { ffmpeg, loadFFmpeg } from '../utils/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { saveHistory } from '../utils/history';
import { Download, X, RefreshCw, Check, Scissors } from 'lucide-react';
import { downloadBlob } from '../utils/imageConversion';

interface FileItem {
    id: string;
    file: File;
    status: 'pending' | 'converting' | 'done' | 'error';
    resultBlob?: Blob;
    error?: string;
    outputName?: string;
    targetFormat?: string; // e.g., 'gif', 'mp3', 'wav', 'mp4'
    trimStart?: string; // HH:MM:SS or SS
    trimEnd?: string;   // HH:MM:SS or SS
}

type ConversionMode = 'gif' | 'videoToAudio' | 'audioConvert' | 'trim';

const MediaTool: React.FC = () => {
    const [isReady, setIsReady] = useState(false);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [mode, setMode] = useState<ConversionMode>('gif');

    // GIF Settings
    const [duration, setDuration] = useState<number>(5);
    const [fps, setFps] = useState<number>(10);

    // Audio Settings
    const [audioFormat, setAudioFormat] = useState<string>('mp3');

    const [message, setMessage] = useState('Loading FFmpeg core...');

    useEffect(() => {
        loadFFmpeg().then(() => {
            setIsReady(true);
            setMessage('');
        }).catch(() => {
            setMessage('FFmpegの読み込みに失敗しました。接続環境や設定を確認してください。');
        });
    }, []);

    const handleFileSelect = (newFiles: File[]) => {
        const newItems: FileItem[] = newFiles.map(f => ({
            id: Math.random().toString(36).substr(2, 9),
            file: f,
            status: 'pending',
            targetFormat: mode === 'gif' ? 'gif' : mode === 'videoToAudio' ? 'mp3' : mode === 'audioConvert' ? audioFormat : 'mp4'
        }));
        setFiles(prev => [...prev, ...newItems]);
    };

    const removeItem = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const updateTrimTimes = (id: string, start: string, end: string) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, trimStart: start, trimEnd: end } : f));
    };

    const convertMedia = async (item: FileItem): Promise<Blob> => {
        const file = item.file;
        const inputName = 'input.' + file.name.split('.').pop();
        await ffmpeg.writeFile(inputName, await fetchFile(file));

        if (mode === 'gif') {
            await ffmpeg.exec(['-i', inputName, '-t', duration.toString(), '-vf', `fps=${fps},scale=480:-1:flags=lanczos`, '-f', 'gif', 'output.gif']);
            const data = await ffmpeg.readFile('output.gif');
            return new Blob([data as any], { type: 'image/gif' });
        } else if (mode === 'videoToAudio') {
            await ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'libmp3lame', 'output.mp3']);
            const data = await ffmpeg.readFile('output.mp3');
            return new Blob([data as any], { type: 'audio/mpeg' });
        } else if (mode === 'audioConvert') {
            if (audioFormat === 'mp3') {
                await ffmpeg.exec(['-i', inputName, 'output.mp3']);
                const data = await ffmpeg.readFile('output.mp3');
                return new Blob([data as any], { type: 'audio/mpeg' });
            } else {
                await ffmpeg.exec(['-i', inputName, 'output.wav']);
                const data = await ffmpeg.readFile('output.wav');
                return new Blob([data as any], { type: 'audio/wav' });
            }
        } else if (mode === 'trim') {
            const args = ['-i', inputName];
            if (item.trimStart) args.push('-ss', item.trimStart);
            if (item.trimEnd) args.push('-to', item.trimEnd);

            // Re-encoding for safety (checking compatibility), or copy if possible but copy might fail if keyframes are missed.
            // Let's re-encode to be safe and ensure accuracy, though slower.
            // Or try stream copy '-c', 'copy' which is fast but inaccurate cut.
            // Trimming usually requires re-encoding for exact cuts.
            // Let's use preset fast to speed up.
            args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'copy', 'output.mp4');

            await ffmpeg.exec(args);
            const data = await ffmpeg.readFile('output.mp4');
            return new Blob([data as any], { type: 'video/mp4' });
        }

        throw new Error('Unsupported format');
    };

    const handleConvert = async () => {
        if (!isReady) return;
        setIsProcessing(true);
        const newFiles = [...files];

        for (let i = 0; i < newFiles.length; i++) {
            const item = newFiles[i];
            if (item.status === 'done' || item.status === 'converting') continue;

            newFiles[i].status = 'converting';
            setFiles([...newFiles]);

            try {
                const blob = await convertMedia(item);

                const targetFmt = mode === 'gif' ? 'gif' :
                    mode === 'videoToAudio' ? 'mp3' :
                        mode === 'audioConvert' ? audioFormat : 'mp4';

                newFiles[i].status = 'done';
                newFiles[i].resultBlob = blob;
                newFiles[i].outputName = item.file.name.replace(/\.[^/.]+$/, "") + (mode === 'trim' ? '_trimmed' : '') + "." + targetFmt;

                // Save to history
                saveHistory({
                    id: item.id,
                    fileName: item.file.name,
                    fileType: item.file.type,
                    resultType: targetFmt,
                    timestamp: Date.now(),
                    size: blob.size
                });
            } catch (e) {
                newFiles[i].status = 'error';
                newFiles[i].error = 'Failed';
                console.error('Conversion failed', e);
            }
            setFiles([...newFiles]);
        }
        setIsProcessing(false);
    };

    const handleDownload = (item: FileItem) => {
        if (item.resultBlob && item.outputName) {
            downloadBlob(item.resultBlob, item.outputName);
        }
    };

    if (!isReady) {
        return <div className="card" style={{ textAlign: 'center' }}>
            <RefreshCw className="spin" size={32} style={{ marginBottom: '1rem', color: 'var(--color-primary)' }} />
            <p>{message}</p>
        </div>;
    }

    return (
        <div className="tool-container">
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>メディア変換</h2>
                        <p className="description" style={{ color: 'var(--color-text-light)' }}>動画のGIF変換、音声抽出、フォーマット変換、トリミング</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>モード:</span>
                        <select value={mode} onChange={(e) => { setMode(e.target.value as ConversionMode); setFiles([]); }} style={{ padding: '0.25rem', borderRadius: '0.25rem' }}>
                            <option value="gif">動画 to GIF</option>
                            <option value="videoToAudio">動画から音声抽出 (MP3)</option>
                            <option value="audioConvert">音声ファイル変換</option>
                            <option value="trim">動画トリミング</option>
                        </select>
                    </div>

                    <div style={{ width: '1px', height: '20px', backgroundColor: '#cbd5e1', margin: '0 0.5rem' }} />

                    {mode === 'gif' && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8rem' }}>秒数:</label>
                            <input type="number" min="1" max="20" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} style={{ width: '50px', padding: '0.25rem' }} />
                            <label style={{ fontSize: '0.8rem' }}>FPS:</label>
                            <input type="number" min="1" max="30" value={fps} onChange={(e) => setFps(parseInt(e.target.value))} style={{ width: '50px', padding: '0.25rem' }} />
                        </div>
                    )}
                    {mode === 'audioConvert' && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.8rem' }}>変換先:</label>
                            <select value={audioFormat} onChange={(e) => setAudioFormat(e.target.value)} style={{ padding: '0.25rem', borderRadius: '0.25rem' }}>
                                <option value="mp3">MP3</option>
                                <option value="wav">WAV</option>
                            </select>
                        </div>
                    )}
                    {mode === 'trim' && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>hh:mm:ss形式で指定</span>
                        </div>
                    )}

                    {files.length > 0 && (
                        <button className="btn" onClick={handleConvert} disabled={isProcessing} style={{ marginLeft: 'auto' }}>
                            {isProcessing ? <><RefreshCw className="spin" size={18} /> 変換中...</> : (mode === 'trim' ? 'カット・保存' : '全て変換')}
                        </button>
                    )}
                </div>
            </div>

            {files.length === 0 ? (
                <FileDropper
                    onFileSelect={handleFileSelect}
                    acceptedFormats={mode === 'audioConvert' ? "audio/*" : "video/*"}
                    label={mode === 'audioConvert' ? "音声ファイルをドロップ" : "動画ファイルをドロップ"}
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {files.map(item => (
                        <div key={item.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', overflow: 'hidden' }}>
                                        {item.file.name.split('.').pop()?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: '500' }}>{item.file.name}</p>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>{(item.file.size / 1024 / 1024).toFixed(1)} MB</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {item.status === 'done' ? (
                                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem' }}>
                                            <Check size={16} /> 完了
                                        </span>
                                    ) : item.status === 'error' ? (
                                        <span style={{ color: '#ef4444', fontSize: '0.9rem' }}>エラー</span>
                                    ) : item.status === 'converting' ? (
                                        <span style={{ color: '#3b82f6', fontSize: '0.9rem' }}>変換中...</span>
                                    ) : (
                                        <span style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>待機中</span>
                                    )}

                                    {item.status === 'done' && (
                                        <button onClick={() => handleDownload(item)} style={{ padding: '0.5rem', color: 'var(--color-primary)' }} title="Download">
                                            <Download size={20} />
                                        </button>
                                    )}

                                    <button onClick={() => removeItem(item.id)} style={{ padding: '0.5rem', color: '#ef4444' }} title="Remove">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {mode === 'trim' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                                    <Scissors size={18} color="var(--color-text-light)" />
                                    <span style={{ fontSize: '0.9rem' }}>開始:</span>
                                    <input
                                        type="text"
                                        placeholder="00:00:00"
                                        value={item.trimStart || ''}
                                        onChange={(e) => updateTrimTimes(item.id, e.target.value, item.trimEnd || '')}
                                        style={{ width: '80px', padding: '0.25rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }}
                                    />
                                    <span style={{ fontSize: '0.9rem' }}>終了:</span>
                                    <input
                                        type="text"
                                        placeholder="00:00:05"
                                        value={item.trimEnd || ''}
                                        onChange={(e) => updateTrimTimes(item.id, item.trimStart || '', e.target.value)}
                                        style={{ width: '80px', padding: '0.25rem', borderRadius: '0.25rem', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};

export default MediaTool;
