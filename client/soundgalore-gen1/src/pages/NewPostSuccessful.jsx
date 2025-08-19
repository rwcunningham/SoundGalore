import {useState, useRef} from 'react'
import {Link} from 'react-router-dom'

export default function NewPostSuccessful(){
    
    return(
        <main className="NewPostSuccessful">
            <h1>Post Uploaded Succesfully</h1>
            <Link to='/userfeed'>Go Back to Your Feed</Link>
        </main>

    );

} 