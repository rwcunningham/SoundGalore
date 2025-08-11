import React, {useState, useRef} from 'react';
import {useNavigate} from "react-router-dom";
import Post from 'models';

export default function NewPost(){
    const handleSubmit = async (e) => {
        e.preventDefault();

    }

    return (
        <>
            <main>
                <h1>Please Select an image and an audio file for your post</h1>
                <Header/>
                <ImageUploader onUpload={handleImageUpload}/>
                <AudioUploader onUpload={handleAudioUpload}/>
                <h1>Description of what you're sharing:</h1>
                <input type="text" />
                <button type="submit" onSubmit="handleSubmit"/>
            </main>
        </>
    );
}
