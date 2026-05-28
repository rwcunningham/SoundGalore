import { useEffect, useRef, useState } from "react";

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
}

function getSupportedMimeType() {
    const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
    ];

    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function getExtension(mimeType) {
    if (mimeType.includes("mp4")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    return "webm";
}

export default function AudioRecorder({ onSelect, maxDurationSeconds = 180, onWarning }) {
    const recorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const startedAtRef = useRef(null);
    const accumulatedSecondsRef = useRef(0);

    const [isRecording, setIsRecording] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            streamRef.current?.getTracks().forEach((track) => track.stop());
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const saveCurrentRecordingAsSelectedAudio = (mimeType) => {
        if (!chunksRef.current.length) return;

        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        const extension = getExtension(blob.type);
        const file = new File([blob], `recorded-audio.${extension}`, { type: blob.type });

        if (previewUrl) URL.revokeObjectURL(previewUrl);

        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onSelect?.(file);
    };

    const stopRecording = () => {
        clearInterval(timerRef.current);

        if (startedAtRef.current) {
            const currentRunSeconds = (Date.now() - startedAtRef.current) / 1000;
            accumulatedSecondsRef.current += currentRunSeconds;
            setElapsedSeconds(accumulatedSecondsRef.current);
        }

        startedAtRef.current = null;

        if (recorderRef.current?.state === "recording") {
            recorderRef.current.stop();
        }

        setIsRecording(false);
    };

    const startRecording = async () => {
        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
            onWarning?.("Audio recording is not supported in this browser.");
            return;
        }

        const mimeType = getSupportedMimeType();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const recorder = new MediaRecorder(
            stream,
            mimeType ? { mimeType } : undefined
        );

        recorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
            if (event.data?.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
            saveCurrentRecordingAsSelectedAudio(mimeType);
        };

        recorder.start();

        startedAtRef.current = Date.now();

        timerRef.current = setInterval(() => {
            const currentRunSeconds = (Date.now() - startedAtRef.current) / 1000;
            const totalSeconds = accumulatedSecondsRef.current + currentRunSeconds;

            if (totalSeconds >= maxDurationSeconds) {
                stopRecording();
                onWarning?.(`Audio clips must be ${Math.floor(maxDurationSeconds / 60)} minutes or shorter.`);
                return;
            }

            setElapsedSeconds(totalSeconds);
        }, 250);

        setIsRecording(true);
    };

    const handleRecordClick = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    };

    const handleDelete = () => {
        if (isRecording) stopRecording();

        chunksRef.current = [];
        accumulatedSecondsRef.current = 0;
        setElapsedSeconds(0);
        onSelect?.(null);

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl("");
    };

    return (
        <section className="audio-recorder">
            <div className="newpost-section-header">Record Audio</div>

            <div className="newpost-button-row">
                <button type="button" onClick={handleRecordClick}>
                    {isRecording ? "Stop Recording" : previewUrl ? "Record More" : "Record"}
                </button>

                <button type="button" onClick={handleDelete}>
                    Delete
                </button>
            </div>

            <p className="audio-recorder-time">
                {isRecording ? "Recording: " : "Recorded: "}
                {formatTime(elapsedSeconds)}
            </p>

            {previewUrl && (
                <audio controls src={previewUrl} className="audio-recorder-scrubber" />
            )}
        </section>
    );
}