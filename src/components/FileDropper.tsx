import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileDropperProps {
    onFileSelect: (files: File[]) => void;
    acceptedFormats: string;
    label: string;
}

const FileDropper: React.FC<FileDropperProps> = ({ onFileSelect, acceptedFormats, label }) => {
    const [isDragging, setIsDragging] = React.useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                onFileSelect(Array.from(e.dataTransfer.files));
                e.dataTransfer.clearData();
            }
        },
        [onFileSelect]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                onFileSelect(Array.from(e.target.files));
            }
        },
        [onFileSelect]
    );

    return (
        <div
            className={`card ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
                border: '2px dashed var(--color-border)',
                borderColor: isDragging ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: isDragging ? '#eff6ff' : 'var(--color-surface)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <input
                type="file"
                id="file-upload"
                multiple
                accept={acceptedFormats}
                onChange={handleInputChange}
                style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: '#f1f5f9', marginBottom: '1rem' }}>
                    <Upload size={32} color="var(--color-primary)" />
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{label}</h3>
                <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
                    クリックしてファイルを選択 または ドラッグ＆ドロップ
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.5rem' }}>
                    {acceptedFormats.replace(/,/g, ', ')}
                </p>
            </label>
        </div>
    );
};

export default FileDropper;
