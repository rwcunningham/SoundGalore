import React, {useState, useRef} from 'react';
// import {useNavigate} from "react-router-dom";

export default function AudioUploader(){
    // const [currentTime, setCurrentTime] = useState(Date.now());
    const [audioFile, setAudioFile] = useState(null);
    const audioInputRef = useRef(null);
    // const navigate = useNavigate;

    const triggerPicker = () => {
        if (!audioInputRef.current) return;
        audioInputRef.current?.click();}; // if there is a file there, then trigger a click() to open the file picker
    

    const handleSubmit = async (e) => {
        e.preventDefault();
       
        try{
            if (!audioFile) return;
            const form = new FormData();
            form.append("file", audioFile);
            form.append("media_type", "audio")
            // post request to the api/upload_media endpoint
            const res = await fetch('/api/upload_media', {method:'POST', body:form, credentials:'include'});
            if (!res.ok){
                console.error(`HTTP ${res.status}`);
            }
        }
        catch (err){
            console.error(err);
            //throw an error
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit}>
                <button type="button" onClick={triggerPicker}>Browse...</button>
                {/*if you send a "click" event to an input element, the Browser/OS should automatically open the file picker*/} 
                {/*accept= allows you to pattern match the MIME for the file*/} 
                <input type="file" name='audio-input' accept='audio/*' ref={audioInputRef} onChange={(e)=>setAudioFile(e.target?.files[0] ) ?? null}  hidden />  
                <button type="submit" disabled={!audioFile}>Submit</button>
            </form>
        </>
    );

}
