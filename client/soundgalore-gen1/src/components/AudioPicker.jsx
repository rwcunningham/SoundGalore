import React, { useRef } from 'react';

function getAudioDuration(file) {
    return new Promise((resolve, reject) => {
        const audio = document.createElement('audio');
        const url = URL.createObjectURL(file);

        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(audio.duration);
        };

        audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not read audio metadata."));
        };

        audio.src = url;
    });
}

export default function AudioPicker({ onSelect, maxDurationSeconds = 180, onWarning }) {
    const audioInputRef = useRef(null);

    const triggerPicker = () => {
        audioInputRef.current?.click();
    };

    const handleChange = async (e) => {
        const file = e.target.files?.[0] || null;

        if (!file) {
            onSelect?.(null);
            return;
        }

        try {
            const duration = await getAudioDuration(file);

            if (duration > maxDurationSeconds) {
                onWarning?.(`Audio clips must be ${Math.floor(maxDurationSeconds / 60)} minutes or shorter.`);
                onSelect?.(null);
                e.target.value = "";
                return;
            }

            onSelect?.(file);
        } catch (err) {
            console.error(err);
            onWarning?.("Could not check the audio length.");
            onSelect?.(null);
        }
    };

    return (
        <div>
            <button type="button" onClick={triggerPicker}>
                Browse Audio...
            </button>

            <input
                type="file"
                name="audio-input"
                accept="audio/*"
                ref={audioInputRef}
                onChange={handleChange}
                hidden
            />
        </div>
    );
}