export interface ImageConversionOptions {
    width?: number;
    height?: number;
    rotation?: number;
    flipH?: boolean;
    flipV?: boolean;
    scale?: number;
}

export const convertImage = (file: File, format: string, quality: number = 0.9, options: ImageConversionOptions = {}): Promise<Blob> => {
    return new Promise((resolve, reject) => {
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
            ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
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
        img.src = URL.createObjectURL(file);
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
