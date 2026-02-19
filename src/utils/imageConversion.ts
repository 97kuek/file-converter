import heic2any from 'heic2any';

export interface ImageConversionOptions {
    width?: number;
    height?: number;
    rotation?: number;
    flipH?: boolean;
    flipV?: boolean;
    scale?: number;
    crop?: { x: number; y: number; width: number; height: number };
}

export const convertImage = (file: File, format: string, quality: number = 0.9, options: ImageConversionOptions = {}): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
        let sourceFile = file;

        // Handle HEIC/HEIF
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
            try {
                const result = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.9
                });
                // heic2any can return Blob or Blob[]
                const blob = Array.isArray(result) ? result[0] : result;
                sourceFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
            } catch (e) {
                console.error('HEIC conversion failed:', e);
                // Continue and try standard loading, or reject? 
                // Let's try standard loading as fallback or reject.
                // Usually browser can't handle HEIC so we should probably reject if heic2any fails.
                reject(new Error('HEIC conversion failed'));
                return;
            }
        }

        const img = new Image();
        img.onload = () => {
            let targetWidth = img.width;
            let targetHeight = img.height;

            if (options.width && options.height) {
                targetWidth = options.width;
                targetHeight = options.height;
            } else if (options.width) {
                targetHeight = (img.height / img.width) * options.width;
                targetWidth = options.width;
            } else if (options.height) {
                targetWidth = (img.width / img.height) * options.height;
                targetHeight = options.height;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context failed'));
                return;
            }

            const rotation = options.rotation || 0;
            const isVertical = rotation === 90 || rotation === 270;

            canvas.width = isVertical ? targetHeight : targetWidth;
            canvas.height = isVertical ? targetWidth : targetHeight;

            // Handle Rotation and Flip
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);

            if (options.crop) {
                // Draw only the cropped area
                // When cropping, we might need to adjust logic if rotation/flip is involved.
                // For simplicity, let's assume crop happens *before* rotation/flip if passed together, 
                // OR we just draw the cropped part of the source image.
                // Actually, typically crop is applied to the source.
                // But here we are setting canvas size based on targetWidth/Height which might differ from crop size.

                // If crop is present, we should draw the cropped region from source `img` to the canvas.
                ctx.drawImage(
                    img,
                    options.crop.x, options.crop.y, options.crop.width, options.crop.height,
                    -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight
                );
            } else {
                ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
            }
            ctx.restore();

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Conversion failed'));
                }
                URL.revokeObjectURL(img.src);
            }, format, quality);
        };
        img.onerror = (e) => {
            reject(e);
            URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(sourceFile);
    });
};

export const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
