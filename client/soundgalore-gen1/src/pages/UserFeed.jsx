import Header from "../components/Header";
import AudioPlayer from "../components/AudioPlayer";
import {Link} from "react-router-dom";

export default function UserFeed(){
    return(
        <div className="UserFeed">
            <Header/>
            <p>
                <Link to="/NewPost">Upload a new post here</Link>
            </p>
            <AudioPlayer/>
            
        </div>
    );
}