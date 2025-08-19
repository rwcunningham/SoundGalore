import Header from "../components/Header";
import AudioPlayer from "../components/AudioPlayer";
import {Link} from "react-router-dom";

export default function UserFeed(){
    return(
        <div className="UserFeed">
            <Header/>
            <div>
                <Link to="/newpost">Upload a new post here</Link>
            </div>
            <AudioPlayer/>
        </div>
    );
}