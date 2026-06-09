import React, {useState, useEffect, useRef, useCallback} from "react";

export default function AudioPlayer({post, isActive, onPlay}) {
    const audioRef = useRef(null);
    const imageRef = useRef(null);
    const playRequestIdRef = useRef(0);

    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const audioUrl = post?.audio_url || post?.audio?.url || "/audio/sample.mp3";
    const imageUrl = post?.image_url || post?.image?.url || "/images/IMG_2527.jpeg";

    const resetAudio = useCallback(() => {
        const audioElem = audioRef.current;
        if (!audioElem) return;

        playRequestIdRef.current += 1;

        audioElem.pause();

        try {
            audioElem.currentTime = 0;
        } catch (err) {
            console.warn("Could not reset audio time:", err);
        }

        setIsPlaying(false);
        setCurrentTime(0);
    }, []);

    const playAudio = useCallback(async () => {
        const audioElem = audioRef.current;
        if (!audioElem) return;

        const requestId = playRequestIdRef.current + 1;
        playRequestIdRef.current = requestId;

        try {
            await audioElem.play();

            if (playRequestIdRef.current === requestId) {
                setIsPlaying(true);
            }
        } catch (err) {
            if (playRequestIdRef.current === requestId) {
                console.warn("Audio play was interrupted:", err);
                setIsPlaying(false);
            }
        }
    }, []);

    useEffect(() => {
        const audioElem = audioRef.current;
        if (!audioElem) return;

        const handleLoadedMetadata = () => {
            setDuration(Number.isFinite(audioElem.duration) ? audioElem.duration : 0);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audioElem.currentTime || 0);
        };

        const handlePlay = () => {
            setIsPlaying(true);
        };

        const handlePause = () => {
            setIsPlaying(false);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);

            try {
                audioElem.currentTime = 0;
            } catch (err) {
                console.warn("Could not rewind ended audio:", err);
            }
        };

        const handleError = () => {
            console.warn("Audio element error:", audioElem.error);
            setIsPlaying(false);
        };

        audioElem.addEventListener("loadedmetadata", handleLoadedMetadata);
        audioElem.addEventListener("timeupdate", handleTimeUpdate);
        audioElem.addEventListener("play", handlePlay);
        audioElem.addEventListener("pause", handlePause);
        audioElem.addEventListener("ended", handleEnded);
        audioElem.addEventListener("error", handleError);

        return () => {
            audioElem.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audioElem.removeEventListener("timeupdate", handleTimeUpdate);
            audioElem.removeEventListener("play", handlePlay);
            audioElem.removeEventListener("pause", handlePause);
            audioElem.removeEventListener("ended", handleEnded);
            audioElem.removeEventListener("error", handleError);
        };
    }, [audioUrl]);

    useEffect(() => {
        const audioElem = audioRef.current;
        if (!audioElem) return;

        playRequestIdRef.current += 1;

        audioElem.pause();
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);

        try {
            audioElem.currentTime = 0;
            audioElem.load();
        } catch (err) {
            console.warn("Could not load audio:", err);
        }
    }, [audioUrl]);

    useEffect(() => {
        if (isActive) {
            playAudio();
        } else {
            resetAudio();
        }
    }, [isActive, playAudio, resetAudio]);

    useEffect(() => {
        return () => {
            const audioElem = audioRef.current;

            playRequestIdRef.current += 1;

            if (audioElem) {
                audioElem.pause();
                audioElem.removeAttribute("src");

                try {
                    audioElem.load();
                } catch (err) {
                    console.warn("Could not unload audio:", err);
                }
            }
        };
    }, []);

    const formatTime = (timeSecs) => {
        if (!Number.isFinite(timeSecs)) return "00:00";

        const minutes = Math.floor(timeSecs / 60);
        const seconds = Math.floor(timeSecs % 60);

        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    const togglePlayPause = async () => {
        const audioElem = audioRef.current;
        if (!audioElem) return;

        if (isPlaying) {
            playRequestIdRef.current += 1;
            audioElem.pause();
            setIsPlaying(false);
            return;
        }

        onPlay?.();
        await playAudio();
    };

    const handleSeek = (event) => {
        const audioElem = audioRef.current;
        if (!audioElem) return;

        const newTime = Number(event.target.value);

        audioElem.currentTime = newTime;
        setCurrentTime(newTime);
    };

    return (
        <div className="AudioPlayer">
            <div className="post-info">
                <p className="post-user">
                    Posted by {post?.username || post?.user?.username || post?.author?.username || "Unknown user"}
                </p>

                <h2 className="post-title">
                    {post?.title || "Untitled post"}
                </h2>

                <p className="post-description">
                    {post?.description || post?.text || ""}
                </p>
            </div>

            <div className="square-container">
                <img
                    ref={imageRef}
                    src={imageUrl}
                    alt={post?.title || "Post image"}
                    style={{maxWidth: "100%", height: "auto"}}
                />
            </div>

            <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                playsInline
            />

            <button
                className="play-pause-button"
                type="button"
                onClick={togglePlayPause}
            >
                {isPlaying ? "\u23F8" : "\u25B6"}
            </button>

            <input
                type="range"
                min="0"
                max={duration || 0}
                value={Math.min(currentTime, duration || 0)}
                step="0.1"
                onChange={handleSeek}
            />

            <div className="current-time">
                <p>
                    {formatTime(currentTime)} / {formatTime(duration)}
                </p>
            </div>
        </div>
    );
}