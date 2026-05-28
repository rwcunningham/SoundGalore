import { useEffect, useRef, useState } from "react";

export default function CameraCapture({ onSelect, maxWidth = 800, maxHeight = 800, onWarning }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    const openCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
        });

        streamRef.current = stream;
        setIsCameraOpen(true);
    } catch (err) {
        console.error(err);
        onWarning?.("Could not access the camera.");
    }
};

useEffect(() => {
    if (!isCameraOpen || !videoRef.current || !streamRef.current) return;

    videoRef.current.srcObject = streamRef.current;

    videoRef.current.play().catch((err) => {
        console.error("Video play failed:", err);
    });
}, [isCameraOpen]);


    const closeCamera = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsCameraOpen(false);
        setIsVideoReady(false);
    };

    const takePhoto = () => {
        const video = videoRef.current;

        if (!video || !isVideoReady || video.videoWidth === 0 || video.videoHeight === 0) {
            onWarning?.("Camera is still loading. Try again in a second.");
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = maxWidth;
        canvas.height = maxHeight;

        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, maxWidth, maxHeight);

        const scale = Math.min(
            maxWidth / video.videoWidth,
            maxHeight / video.videoHeight
        );

        const drawWidth = video.videoWidth * scale;
        const drawHeight = video.videoHeight * scale;

        const x = (maxWidth - drawWidth) / 2;
        const y = (maxHeight - drawHeight) / 2;

        ctx.drawImage(video, x, y, drawWidth, drawHeight);

        canvas.toBlob((blob) => {
            if (!blob) {
                onWarning?.("Could not save photo.");
                return;
            }

            const file = new File([blob], "camera-photo.jpg", {
                type: "image/jpeg",
            });

            onSelect?.(file);
            closeCamera();
        }, "image/jpeg", 0.85);
    };

    return (
        <section className="camera-capture">
            {!isCameraOpen ? (
                <button type="button" onClick={openCamera}>
                    Open Camera
                </button>
            ) : (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="camera-preview"
                        onLoadedMetadata={() => setIsVideoReady(true)}
                    />

                    <div className="newpost-button-row">
                        <button
                            type="button"
                            onClick={takePhoto}
                            disabled={!isVideoReady}
                        >
                            Take Photo
                        </button>

                        <button type="button" onClick={closeCamera}>
                            Cancel
                        </button>
                    </div>
                </>
            )}
        </section>
    );
}