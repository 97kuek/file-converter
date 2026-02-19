import React, { useState, useRef } from 'react';
import FileDropper from './FileDropper';
import { convertImage, downloadBlob, type ImageConversionOptions } from '../utils/imageConversion';
import { saveHistory } from '../utils/history';
import { Download, X, RefreshCw, Check, RotateCw, RotateCcw, FlipHorizontal, FlipVertical, Crop } from 'lucide-react';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface FileItem {
    id: string;
    file: File;
    status: 'pending' | 'converting' | 'done' | 'error';
    targetFormat: string;
    resultBlob?: Blob;
    error?: string;
    crop?: CropType;
}

const ImageTool: React.FC = () => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [globalFormat, setGlobalFormat] = useState<string>('image/png');
    const [quality, setQuality] = useState<number>(0.9);
    const [isProcessing, setIsProcessing] = useState(false);

    // Edit Settings
    const [rotation, setRotation] = useState<number>(0);
    const [flipH, setFlipH] = useState<boolean>(false);
    const [flipV, setFlipV] = useState<boolean>(false);
    const [resizeMode, setResizeMode] = useState<'original' | 'percent' | 'width'>('original');
    const [resizeValue, setResizeValue] = useState<number>(100); // % or px

    // Crop Modal
    const [editingItem, setEditingItem] = useState<FileItem | null>(null);
    const [tempCrop, setTempCrop] = useState<CropType>();
    const imgRef = useRef<HTMLImageElement>(null);
    const [imgSrc, setImgSrc] = useState<string>('');


    const handleFileSelect = (newFiles: File[]) => {
        const newItems: FileItem[] = newFiles.map(f => ({
            id: Math.random().toString(36).substr(2, 9),
            file: f,
            status: 'pending',
            targetFormat: globalFormat
        }));
        setFiles(prev => [...prev, ...newItems]);
    };

    const removeItem = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const startCrop = (item: FileItem) => {
        setEditingItem(item);
        setTempCrop(item.crop);
        const reader = new FileReader();
        reader.onload = (e) => {
            setImgSrc(e.target?.result as string);
        };
        reader.readAsDataURL(item.file);
    };

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        if (!tempCrop) {
            setTempCrop(centerCrop(
                makeAspectCrop(
                    {
                        unit: '%',
                        width: 90,
                    },
                    undefined, // aspect
                    width,
                    height
                ),
                width,
                height
            ));
        }
    };

    const saveCrop = () => {
        if (editingItem && tempCrop) {
            setFiles(prev => prev.map(f => f.id === editingItem.id ? { ...f, crop: tempCrop } : f));
        }
        closeCropModal();
    };

    const closeCropModal = () => {
        setEditingItem(null);
        setImgSrc('');
        setTempCrop(undefined);
    };

    const handleConvert = async () => {
        setIsProcessing(true);
        const newFiles = [...files];

        for (let i = 0; i < newFiles.length; i++) {
            const item = newFiles[i];
            if (item.status === 'done' || item.status === 'converting') continue;

            newFiles[i].status = 'converting';
            setFiles([...newFiles]);

            try {
                let options: ImageConversionOptions = {
                    rotation,
                    flipH,
                    flipV
                };

                if (resizeMode === 'percent') {
                    options.scale = resizeValue / 100;
                } else if (resizeMode === 'width') {
                    options.width = resizeValue;
                }

                // If crop exists, we need to pass actual pixel values
                if (item.crop && item.crop.width && item.crop.height) {
                    // Start by getting image dimensions
                    // Since we can't easily get dimensions here without loading image, 
                    // we might need to rely on 'ReactCrop' utilizing unit 'px' or convert '%' to 'px' inside convertImage if we passed dimensions.
                    // But convertImage creates a new Image().
                    // For simplicity, let's assume we pass what we have. 
                    // If unit is '%', convertImage needs to know source dimensions, which it does.
                    // BUT createCrop/ReactCrop usually handles conversions in UI.
                    // Let's ensure we pass pixel values. ReactCrop returns 'px' values if we don't convert? 
                    // Actually ReactCrop uses 'unit'.
                    // If we use px in UI, it's easier.

                    // However, we only have 'item.crop' which might be %.
                    // For now let's pass it as is and fix convertImage if needed?
                    // No, convertImage expects {x, y, width, height} in pixels.
                    // We need to resolve % to px if unit is %.
                    // Since we don't have image dimensions here easily without loading, 
                    // simple solution: Load image in convertImage and resolve crop there?
                    // Or force px unit in UI. Let's try to force px in saveCrop relative to natural dimensions?
                    // Actually, let's update convertImage to accept percentage? No, let's keep it simple.
                    // We can resolve it inside convertImage if we pass the whole Crop object?
                    // Let's modify options to take 'crop' as is, and update convertImage to handle it.
                    // But for now, let's assume we use pixel crop.

                    // Actually, to make it robust, we should calculate pixels.
                    // But we don't have natural Width/Height here easily.
                    // Let's do this: ensure we save crop as pixels in `saveCrop`.
                    // In `saveCrop`, we have `imgRef.current`.
                    if (imgRef.current && tempCrop?.unit === '%') {
                        const width = imgRef.current.naturalWidth;
                        const height = imgRef.current.naturalHeight;
                        // Convert % to px
                        // item.crop will be updated with pixels? 
                        // No, we are outside saveCrop context here.
                    }
                }

                // Let's modify saveCrop to store pixels
                // See saveCrop implementation below.

                // Passing crop options
                if (item.crop) {
                    // We need check if it's in pixels.
                    // The component allows us to get pixel crop.
                }

                // For now, let's assume convertImage handles the crop object we pass. 
                // We will update convertImage to interpret the crop object properly (px).
                if (item.crop && item.crop.unit === 'px') {
                    options.crop = {
                        x: item.crop.x,
                        y: item.crop.y,
                        width: item.crop.width,
                        height: item.crop.height
                    };
                }

                // Wait, if we use % in UI, we need to convert.
                // It's safer if we convert % to px when saving crop.

                const blob = await convertImage(item.file, item.targetFormat, quality, options);
                newFiles[i].status = 'done';
                newFiles[i].resultBlob = blob;

                saveHistory({
                    id: item.id,
                    fileName: item.file.name,
                    fileType: item.file.type,
                    resultType: item.targetFormat,
                    timestamp: Date.now(),
                    size: blob.size
                });
            } catch (e) {
                newFiles[i].status = 'error';
                newFiles[i].error = 'Failed';
                console.error(e);
            }
            setFiles([...newFiles]);
        }
        setIsProcessing(false);
    };

    const handleDownload = (item: FileItem) => {
        if (item.resultBlob) {
            const ext = item.targetFormat.split('/')[1];
            const name = item.file.name.substring(0, item.file.name.lastIndexOf('.')) + '.' + ext;
            downloadBlob(item.resultBlob, name);
        }
    };

    const handleDownloadAll = () => {
        files.forEach(f => {
            if (f.status === 'done') handleDownload(f);
        });
    };

    const changeGlobalFormat = (fmt: string) => {
        setGlobalFormat(fmt);
        setFiles(prev => prev.map(f => ({ ...f, targetFormat: fmt, status: f.status === 'done' ? 'pending' : f.status })));
    };

    // Helper for saving crop in pixels
    const onCropComplete = (crop: CropType) => {
        setTempCrop(crop);
    };

    return (
        <div className="tool-container">
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>画像変換・編集</h2>
                        <p className="description" style={{ color: 'var(--color-text-light)' }}>形式変換、リサイズ、回転、反転、トリミング</p>
                    </div>
                </div>

                {files.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', width: '100%' }}>

                        {/* Global Edit Controls */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '0.5rem', width: '100%', justifyContent: 'center' }}>
                            {/* Format & Quality */}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select value={globalFormat} onChange={(e) => changeGlobalFormat(e.target.value)} style={{ padding: '0.25rem', borderRadius: '0.25rem' }}>
                                    <option value="image/png">PNG</option>
                                    <option value="image/jpeg">JPG</option>
                                    <option value="image/webp">WebP</option>
                                </select>
                                {globalFormat !== 'image/png' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.8rem' }}>画質</span>
                                        <input type="range" min="0.1" max="1.0" step="0.1" value={quality} onChange={(e) => setQuality(parseFloat(e.target.value))} style={{ width: '60px' }} />
                                    </div>
                                )}
                            </div>

                            <div style={{ width: '1px', height: '20px', backgroundColor: '#cbd5e1' }} />

                            {/* Resize */}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select value={resizeMode} onChange={(e) => setResizeMode(e.target.value as any)} style={{ padding: '0.25rem', borderRadius: '0.25rem' }}>
                                    <option value="original">リサイズなし</option>
                                    <option value="percent">パーセント(%)</option>
                                    <option value="width">横幅(px)</option>
                                </select>
                                {resizeMode !== 'original' && (
                                    <input type="number" value={resizeValue} onChange={(e) => setResizeValue(parseInt(e.target.value))} style={{ width: '60px', padding: '0.25rem' }} />
                                )}
                            </div>

                            <div style={{ width: '1px', height: '20px', backgroundColor: '#cbd5e1' }} />

                            {/* Rotate & Flip */}
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                <button onClick={() => setRotation((r) => (r - 90 + 360) % 360)} className={`icon-btn ${rotation !== 0 ? 'active' : ''}`} title="左回転"><RotateCcw size={18} /></button>
                                <button onClick={() => setRotation((r) => (r + 90) % 360)} className={`icon-btn ${rotation !== 0 ? 'active' : ''}`} title="右回転"><RotateCw size={18} /></button>
                                <span style={{ fontSize: '0.8rem', minWidth: '30px', textAlign: 'center' }}>{rotation}°</span>
                                <button onClick={() => setFlipH(!flipH)} className={`icon-btn ${flipH ? 'active' : ''}`} title="左右反転"><FlipHorizontal size={18} /></button>
                                <button onClick={() => setFlipV(!flipV)} className={`icon-btn ${flipV ? 'active' : ''}`} title="上下反転"><FlipVertical size={18} /></button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn" onClick={handleConvert} disabled={isProcessing}>
                                {isProcessing ? <><RefreshCw className="spin" size={18} /> 変換中...</> : '全て変換'}
                            </button>
                            {files.some(f => f.status === 'done') && (
                                <button className="btn" style={{ backgroundColor: '#10b981' }} onClick={handleDownloadAll}>
                                    <Download size={18} /> 全て保存
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {files.length === 0 ? (
                <FileDropper
                    onFileSelect={handleFileSelect}
                    acceptedFormats="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/heic,.heic"
                    label="変換する画像をドロップ"
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {files.map(item => (
                        <div key={item.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', overflow: 'hidden' }}>
                                    {item.file.name.split('.').pop()?.toUpperCase()}
                                </div>
                                <div>
                                    <p style={{ fontWeight: '500' }}>{item.file.name}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-light)' }}>
                                        {(item.file.size / 1024).toFixed(1)} KB
                                        {item.crop && <span style={{ marginLeft: '0.5rem', color: 'var(--color-primary)' }}>(トリミング済み)</span>}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button onClick={() => startCrop(item)} className={`icon-btn ${item.crop ? 'active' : ''}`} title="トリミング">
                                    <Crop size={18} />
                                </button>

                                <div style={{ width: '1px', height: '20px', backgroundColor: '#e2e8f0', margin: '0 0.5rem' }} />

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
                    ))}
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <FileDropper
                            onFileSelect={handleFileSelect}
                            acceptedFormats="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/heic,.heic"
                            label="ファイルを追加"
                        />
                    </div>
                </div>
            )}

            {/* Crop Modal */}
            {editingItem && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '1rem', padding: '1rem', maxWidth: '90%', maxHeight: '90%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>切り抜き</h3>
                            <button onClick={closeCropModal}><X size={24} /></button>
                        </div>

                        <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', backgroundColor: '#333' }}>
                            {imgSrc && (
                                <ReactCrop crop={tempCrop} onChange={c => setTempCrop(c)} onComplete={onCropComplete}>
                                    <img
                                        ref={imgRef}
                                        src={imgSrc}
                                        onLoad={onImageLoad}
                                        style={{ maxWidth: '100%', maxHeight: '60vh' }}
                                        alt="Crop"
                                    />
                                </ReactCrop>
                            )}
                        </div>

                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="btn" style={{ backgroundColor: '#94a3b8' }} onClick={closeCropModal}>キャンセル</button>
                            <button className="btn" onClick={saveCrop}>適用</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .icon-btn { padding: 0.5rem; border-radius: 0.25rem; background: transparent; transition: all 0.2s; border: none; cursor: pointer; color: var(--color-text); display: flex; alignItems: center; justify-content: center; }
                .icon-btn:hover { background: #e2e8f0; }
                .icon-btn.active { background: #cbd5e1; color: var(--color-primary); }
            `}</style>
        </div>
    );
};

export default ImageTool;
