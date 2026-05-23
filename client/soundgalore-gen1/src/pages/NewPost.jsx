// I think this is 99% there, but we need a couple things:
// 1.) we need to put a temporary link (until there's a navbar) to NewPost on the "my feed" page
// 2.) we need to have this also navigate to the post
// 3.) we need to do some CSS to this page
import {useState, useEffect} from 'react';
import {useNavigate} from "react-router-dom";
import AudioPicker from '../components/AudioPicker';
import ImagePicker from '../components/ImagePicker';
import {Link} from "react-router-dom";
import Header from '../components/Header';

export default function NewPost(){
    const[imageFile, setImageFile] = useState(null);
    const[audioFile, setAudioFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState("");
    const [title, setTitle] = useState('');
    const[description, setDescription] = useState('');
    const navigate = useNavigate();

    
    const handleImageSelect = (file) => setImageFile(file);
    const handleAudioSelect = (file) => setAudioFile(file);
    useEffect(() => {
            if (!imageFile) {
                setImagePreviewUrl("");
                return;
            }

            const previewUrl = URL.createObjectURL(imageFile);
            setImagePreviewUrl(previewUrl);

            return () => URL.revokeObjectURL(previewUrl);
        }, [imageFile]);




    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!imageFile || !audioFile){
            console.error('Please select both an image and audio file.');
            return;
        }

        if (!title.trim()) {
            console.error('Please enter a title.');
            return;
        }


        try{
            // upload the title, image, audio and description at once
            const form = new FormData();
            form.append('title', title);
            form.append('audioFile', audioFile, audioFile.name);
            form.append('imageFile', imageFile, imageFile.name);
            form.append('description', description);

            const mediaRes = await fetch('/api/upload_media', {
                method: 'POST', 
                body: form, 
                credentials: 'include'
            });

            if (!mediaRes.ok) throw new Error(`Image or Audio upload failed: HTTP ${mediaRes.status}`);

            const { new_post_id } = await mediaRes.json();
             // Clear local state 
            setImageFile(null); 
            setAudioFile(null);
            setTitle('');
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

                <div className="newpost-selected-files">
                    <p>
                        Selected image: {imageFile ? imageFile.name : "No image selected"}
                    </p>

                    {imagePreviewUrl && (
                        <img
                            className="newpost-image-preview"
                            src={imagePreviewUrl}
                            alt={imageFile ? `Preview of ${imageFile.name}` : "Selected image preview"}
                        />
                    )}

                    <p>
                        Selected audio: {audioFile ? audioFile.name : "No audio selected"}
                    </p>
                </div>
                
            <form onSubmit={handleSubmit}>
                <p className="newpost-title">Post title:</p>
                <input
                        id="title"
                        className="newpost-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Give your post a title..."
                        maxLength={200}
                        required
                    />
                <p className="newpost-description">Post Description</p>
                <textarea id="description" className="newpost-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Say something about this post..." rows={4} maxLength={500}/>
                <br/>
                
                <button className="submit-newpost-button" type="submit">Submit...</button>
            </form>
            <Link to="/UserFeed">Back to My Feed</Link>
            </main>
            
        </>
    );
}
