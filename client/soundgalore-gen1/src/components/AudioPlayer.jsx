import React, {useState, useEffect, useRef} from "react";


export default function AudioPlayer()
{
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState("/audio/sample.mp3");

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
        }, []);

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
        <div className="AudioPlayer">
            
            

            <audio ref={audioRef} src={audioUrl} preload="metadata"/>
            <br/><button onClick={togglePlayPause}> {isPlaying ? "Pause" : "Play"} </button>  {/* need to add className with some tailwind CSS, for another day...*/}
            <input type="range" min="0" max={duration} value={currentTime} step="0.1" onChange={handleSeek}/> {/*need to add className and tailwind stuff */}
            <p>
            {formatTime(currentTime)} / {formatTime(duration)}
            </p>
        </div>
        )
};
