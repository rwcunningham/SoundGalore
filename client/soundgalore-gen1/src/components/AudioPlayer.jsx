import React, {useState, useEffect, useRef} from "react";


export default function AudioPlayer({post, isActive, onPlay, onOutOfFocus})
{
    const audioRef = useRef(null);
    const imageRef = useRef(null);
    const playerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioUrl = post?.audio_url || "/audio/sample.mp3";
    const imageUrl = post?.image_url || "/images/IMG_2527.jpeg";

    const resetAudio = () => {
        const audioElem = audioRef.current;
        if (!audioElem) return;

        audioElem.pause();
        audioElem.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
    }

    // event handlers and other "side effects" go in here:
    useEffect( () => { 
        const audioElem = audioRef.current; //get the current time from our "audioRef" component in the HTX

        if (!audioElem) return; //error check, if our HTX doesn't have an audioelement

        const handleLoadedMetadata = () =>   // making a callback for eventlistener for when metadata loads (set duration to 0)
            setDuration(audioElem.duration || 0); 
        const handleTimeUpdate = () =>        // callback for eventlistener for when 
            setCurrentTime(audioElem.currentTime);
        const handleEnded = () =>             // 
            setIsPlaying(false);
        
        
        audioElem.addEventListener("loadedmetadata", handleLoadedMetadata);
        audioElem.addEventListener("timeupdate", handleTimeUpdate);
        audioElem.addEventListener("ended", handleEnded);

        return () => {
            audioElem.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audioElem.removeEventListener("timeupdate", handleTimeUpdate);
            audioElem.removeEventListener("ended",handleEnded);
        }
        }, [audioUrl]);

    useEffect(() => {
        const audioElem = audioRef.current;
        if (!audioElem) return;

        if (isActive) {
            audioElem.play()
                .then(() => {
                    setIsPlaying(true);
                })
                .catch((err) => {
                    console.warn("Audio play was interrupted:", err);
                    setIsPlaying(false);
                });
        } else {
            resetAudio();
        }
    }, [isActive]);

    useEffect(() => {
        if (!playerRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting && isActive) {
                    onOutOfFocus();
                }
            },
            {
                threshold: 0.25,
            }
        );

        observer.observe(playerRef.current);

        return () => observer.disconnect();
    }, [isActive, onOutOfFocus]);

    // helper for formatting time on the screen
    const formatTime = (timeSecs) => {
        if(!Number.isFinite(timeSecs)) return "00:00";
        const minutes = Math.floor(timeSecs/60);
        const seconds = Math.floor(timeSecs % 60);
        return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    // handler for play/pause
    const togglePlayPause = () => {
        const audioElem = audioRef.current;
        if (!audioElem) return;

        if (!isPlaying) {
            onPlay();
        }

        isPlaying ? audioElem.pause() : audioElem.play(); //pause if playing, play if paused
        setIsPlaying(!isPlaying); //flip the state of the play button
    }

    // handler for "scrubbing" or "seeking"
    const handleSeek = (event) => {
        //when we drag the input slider, we alter the "value" which is otherwise set to "currentTime"
        const newTime = Number(event.target.value); //events have targets and targets have values, the value still must be converted to a number
        
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }
        return (
        <div ref={playerRef} className="AudioPlayer">
            <div className="post-info">
                <p className="post-user">
                    Posted by {post?.username || post?.user?.username || "Unknown user"}
                </p>

                <h2 className="post-title">
                    {post?.title || "Untitled post"}
                </h2>

                <p className="post-description">
                    {post?.description || post?.text || ""}
                </p>
            </div>
            <div className="square-container">
                <img ref={imageRef} src={imageUrl} preload="metadata" style={{ maxWidth: '100%', height: 'auto' }}/>
            </div>
            <audio ref={audioRef} src={audioUrl} preload="metadata"/>
            <button className="play-pause-button" onClick={togglePlayPause}> {isPlaying ? "\u23F8" : "\u25B6"} </button>  {/* need to add className with some tailwind CSS, for another day...*/}
            <input type="range" min="0" max={duration} value={currentTime} step="0.1" onChange={handleSeek}/> {/*need to add className and tailwind stuff */}
            <div className="current-time">
                <p>
                {formatTime(currentTime)} / {formatTime(duration)}
                </p>
            </div>
        </div>
        )
};