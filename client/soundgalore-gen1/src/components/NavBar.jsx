import {useEffect, useState} from "react";
import {Link} from "react-router-dom";
export default function NavBar(){
    const [currentUser, setCurrentUser] = useState("");
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("/api/get_current_user", {
                    method: "GET",
                    credentials: "include",
                });

                if (res.ok){
                    const data = await res.json();
                    setCurrentUser(data);
                }
            } catch(err){
                console.error("Failed to fetch current user: ", err);
            }
        };
        fetchUser();
    }, []);

    return(
        <div>
            <p>Welcome {currentUser.current_user_username || "loading. . ."}!</p>
            <br/>
            <Link to="/newpost">Upload a new post here</Link>
            <br/>
            <Link to="/my_followees">Who You Follow</Link>
            <br/>
            <Link to="/my_followers">Your Followers</Link>
            <br/>
            <Link to={`/profile/${currentUser.current_user_id}`} className="follower-name">
                My Profile! ({currentUser.current_user_username})
            </Link>
            <br/>
        </div>
    )
}