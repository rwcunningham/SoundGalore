import React, { useRef } from "react";

function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getAudioDuration(file) {
    return new Promise((resolve, reject) => {
        const audio = document.createElement("audio");
        const url = URL.createObjectURL(file);

        audio.preload = "metadata";

        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(url);

            if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
                resolve(null);
                return;
            }

            resolve(audio.duration);
        };

        audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not read audio metadata."));
        };

        audio.src = url;
    });
}

export default function AudioPicker({
    onSelect,
    maxDurationSeconds = 180,
    onWarning,
}) {
    const audioInputRef = useRef(null);
    const isMobile = isMobileDevice();

    const triggerPicker = () => {
        audioInputRef.current?.click();
    };

    const handleChange = async (e) => {
        const file = e.target.files?.[0] || null;

        if (!file) {
            onSelect?.(null);
            return;
        }

        if (!file.type.startsWith("audio/")) {
            onWarning?.("Please select an audio file.");
            onSelect?.(null);
            e.target.value = "";
            return;
        }

        try {
            const duration = await getAudioDuration(file);

            if (duration !== null && duration > maxDurationSeconds) {
                onWarning?.(
                    `Audio clips must be ${Math.floor(maxDurationSeconds / 60)} minutes or shorter.`
                );
                onSelect?.(null);
                e.target.value = "";
                return;
            }

            if (duration === null) {
                onWarning?.(
                    "Could not verify the audio length on this device. Please make sure the clip is 3 minutes or shorter."
                );
            }

            onSelect?.(file);
            e.target.value = "";
        } catch (err) {
            console.error(err);
            onWarning?.("Could not check the audio length. Please try another file.");
            onSelect?.(null);
            e.target.value = "";
        }
    };

    return (
        <div>
            <button type="button" onClick={triggerPicker}>
                {isMobile ? "Choose Audio..." : "Browse Audio..."}
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