// I think this is 99% there, but we need a couple things:
// 1.) we need to put a temporary link (until there's a navbar) to NewPost on the "my feed" page
// 2.) we need to have this also navigate to the post
// 3.) we need to do some CSS to this page
import {useState, useRef} from 'react';
import {useNavigate} from "react-router-dom";
import AudioPicker from '../components/AudioPicker';
import ImagePicker from '../components/ImagePicker';
import Header from '../components/Header';

export default function NewPost(){
    const[imageFile, setImageFile] = useState(null);
    const[audioFile, setAudioFile] = useState(null);
    const[description, setDescription] = useState('');
    const navigate = useNavigate();

    
    const handleImageSelect = (file) => setImageFile(file);
    const handleAudioSelect = (file) => setAudioFile(file);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imageFile || !audioFile){
            console.error('Please select both an image and audio file.');
            return;
        }

        try{
            // upload the image and audio and description at once
            const form = new FormData();
            form.append('audioFile', audioFile, audioFile.name);
            form.append('imageFile', imageFile, imageFile.name);
            form.append('description', description);

            const mediaRes = await fetch('/api/upload_media', {
                method: 'POST', 
                body: form, 
                description: description,
                credentials: 'include'
            });

            if (!mediaRes.ok) throw new Error(`Image or Audio upload failed: HTTP ${mediaRes.status}`);

            const { new_post_id } = await mediaRes.json();
             // Clear local state 
            setImageFile(null); 
            setAudioFile(null);
            setDescription('');
            navigate(`/new_post_successful`, { replace: true, state: {postId: new_post_id } });
            return;
        } catch (err){
            console.error(err);
        }
    };

    
    return (
        <>
            <main className="NewPost">
                <Header/>
                <p className="newpost-description">Please Select an image and an audio file for your post</p>
                <div style={{ display: "flex", gap: "10px" }}>
                    <ImagePicker onSelect={handleImageSelect}/>
                    <AudioPicker onSelect={handleAudioSelect}/>
                </div>
                <p className="newpost-description">Description of what you're sharing:</p>
            <form onSubmit={handleSubmit}>
                <textarea id="description" className="newpost-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Say something about this post..." rows={4} maxLength={500}/>
                <br/>
                <button className="submit-newpost-button" type="submit">Submit...</button>
            </form>
            </main>
        </>
    );
}
