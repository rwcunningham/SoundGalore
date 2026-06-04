import React, { useRef } from 'react';

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not load image."));
        };

        img.src = url;
    });
}

async function resizeImageWithBars(file, maxWidth, maxHeight) {
    const img = await loadImageFromFile(file);

    const canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = maxHeight;

    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, maxWidth, maxHeight);

    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);

    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const x = (maxWidth - drawWidth) / 2;
    const y = (maxHeight - drawHeight) / 2;

    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error("Could not convert image."));
                    return;
                }

                const resizedFile = new File(
                    [blob],
                    file.name.replace(/\.[^.]+$/, '.jpg') || 'selected-image.jpg',
                    { type: 'image/jpeg' }
                );

                resolve(resizedFile);
            },
            'image/jpeg',
            0.85
        );
    });
}

export default function ImagePicker({ onSelect, maxWidth = 800, maxHeight = 800 }) {
    const browseInputRef = useRef(null);

    const handleChange = async (e) => {
        const file = e.target.files?.[0] || null;

        if (!file) {
            onSelect?.(null);
            return;
        }

        try {
            const resizedFile = await resizeImageWithBars(file, maxWidth, maxHeight);
            onSelect?.(resizedFile);
        } catch (err) {
            console.error(err);
            onSelect?.(null);
        } finally {
            e.target.value = "";
        }
    };

    return (
        <div>
            <button type="button" onClick={() => browseInputRef.current?.click()}>
                Browse Image...
            </button>

            <input
                type="file"
                name="photo-input"
                accept="image/*"
                ref={browseInputRef}
                onChange={handleChange}
                hidden
            /> 

        </div>
    );
}