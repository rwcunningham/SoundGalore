import React, {useState, useRef} from 'react';
// import {useNavigate} from "react-router-dom";

export default function ImageUploader(){
    // const [currentTime, setCurrentTime] = useState(Date.now());
    const [imgFile, setImgFile] = useState(null);
    const photoInputRef = useRef(null);
    // const navigate = useNavigate;

    const triggerPicker = () => {
        if (!photoInputRef.current) return;
        photoInputRef.current?.click();}; // if there is a file there, then trigger a click() to open the file picker
    

    const handleSubmit = async (e) => {
        e.preventDefault();
       
        try{
            if (!imgFile) return;
            const form = new FormData();
            form.append("file", imgFile);
            form.append("media_type", "image")
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
                <input type="file" name='photo-input' accept='image/*' ref={photoInputRef} onChange={(e)=>setImgFile(e.target?.files[0] ) ?? null}  hidden />  
                <button type="submit" disabled={!imgFile}>Submit</button>
            </form>
        </>
    );

}
