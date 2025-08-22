import {useEffect, useState} from "react";
import Header from "../components/Header";
import AudioPlayer from "../components/AudioPlayer";
import {Link} from "react-router-dom";

export default function UserFeed(){
    const [currentUsername, setCurrentUsername] = useState("");

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("api/get_current_user",{
                    "method":"GET",
                    "credentials":"include",
                });

                if (res.ok){
                    const data = await res.json();
                    setCurrentUsername(data.current_user_username);
                }
            } catch(err){
                console.error("Failed to fetch current user: ", err);
            }
        };
        
    fetchUser();
    }, []);

    return(
        <div className="UserFeed">
            <Header/>
            <div>
                <p>Welcome {currentUsername || "loading. . ."}!</p>
                <br/>
                <Link to="/newpost">Upload a new post here</Link>
                <br/>
                <Link to="/my_followees">Who You Follow</Link>
                <br/>
                <Link to='/my_followers'>Your Followers</Link>
                <br/>
            </div>
            <AudioPlayer/>
        </div>
    );
}