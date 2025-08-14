import React, {useState, useRef} from 'react';
// import {useNavigate} from "react-router-dom";

export default function AudioPicker({onSelect}){
    const audioInputRef = useRef(null);
    // const navigate = useNavigate;

    const triggerPicker = () => {
        // if (!audioInputRef.current) return;
        audioInputRef.current?.click();
    }; // if there is a file there, then trigger a click() to open the file picker
    
    const handleChange = (e) => {
        const file = e.target.files?.[0] || null;
        onSelect?.(file);

    }

    return (
        <>
            <div>
                <button type="button" onClick={triggerPicker}>Browse Audio... </button>
                {/*if you send a "click" event to an input element of type "file", the Browser/OS should automatically open the file picker*/} 
                {/*accept= allows you to pattern match the MIME for the file*/} 
                <input type="file" name='audio-input' accept='audio/*' ref={audioInputRef} onChange={handleChange}  hidden />  
            </div>
        </>
    );
}
