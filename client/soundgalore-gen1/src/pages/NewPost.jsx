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

    
    const handleImageSelect = (file) => setImageFile(file);
    const handleAudioSelect = (file) => setAudioFile(file);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imageFile || !audioFile){
            console.error('Please select both an image and audio file.');
            return;
        }

        
        try{
            // upload the image
            const imgForm = new FormData();
            imgForm.append('file', imageFile);
            imgForm.append('media_type', 'image');

            const imgRes = await fetch('/api/upload_media', {
                method: 'POST', 
                body: imgForm, 
                credentials: 'include'
            });
            if (!imgRes.ok) throw new Error(`Image upload failed: HTTP ${imgRes.status}`);
            const {media_id: image_media_id} = await imgRes.json();
        //upload the audio

        const audForm = new FormData();
        audForm.append('file', audioFile);
        audForm.append('media_type','audio');

        const audRes = await fetch('/api/upload_media',{
            method: 'POST',
            body: audForm,
            credentials: 'include',
        });

        if (!audRes.ok) throw new Error(`Audio upload failed: HTTP ${audRes.status}`);
        const {media_id: audio_media_id} = await audRes.json();

        // Now create the post with both pieces of media
        
        const postRes = await fetch('/api/posts', {
            method:'POST',
            credentials:'include',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
                description,
                image_media_id,
                audio_media_id,
            })
        });
        if (!postRes.ok) throw new Error(`Create post failed: HTTP ${postRes.status}`);
        const created = await postRes.json();
        console.log('Post created:', created);

        // Clear local state
        setImageFile(null);
        setAudioFile(null);
        setDescription('');
    } catch (err){
        console.error(err);
      }
    };

    
    return (
        <>
            <main className="NewPost">
                <Header/>
                <p className="newpost-description">Please Select an image and an audio file for your post</p>
                <ImagePicker onSelect={handleImageSelect}/>
                <AudioPicker onSelect={handleAudioSelect}/>
                <p className="newpost-description">Description of what you're sharing:</p>
            <form onSubmit={handleSubmit}>
                <input type="text" className="newpost-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Say something about this post..."/>
                <br/>
                <button className="submit-newpost-button" type="submit">Submit...</button>
            </form>
            </main>
        </>
    );
}
