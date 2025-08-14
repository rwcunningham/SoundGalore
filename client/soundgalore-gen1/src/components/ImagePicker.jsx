import React, {useState, useRef} from 'react';
// import {useNavigate} from "react-router-dom";

export default function ImagePicker({onSelect}){
    // const [currentTime, setCurrentTime] = useState(Date.now());
    // const [imgFile, setImgFile] = useState(null);
    const photoInputRef = useRef(null);
    // const navigate = useNavigate;

    const triggerPicker = () => {
        // if (!photoInputRef.current) return;
        photoInputRef.current?.click();}; // if there is a file there, then trigger a click() to open the file picker
    const handleChange = (e) => {
        const file = e.target.files?.[0] || null;
        onSelect?.(file);
    }

    return (
        <>
            <div>
                <button type="button" onClick={triggerPicker}>Browse Image...</button>
                {/*if you send a "click" event to an input element, the Browser/OS should automatically open the file picker*/} 
                {/*accept= allows you to pattern match the MIME for the file*/} 
                <input type="file" name='photo-input' accept='image/*' ref={photoInputRef} onChange={handleChange}  hidden />  
            </div>
        </>
    );

}
