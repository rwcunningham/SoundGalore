import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function NavBar() {
    const [currentUser, setCurrentUser] = useState({});

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("/api/get_current_user", {
                    method: "GET",
                    credentials: "include",
                });

                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data);
                }
            } catch (err) {
                console.error("Failed to fetch current user:", err);
            }
        };

        fetchUser();
    }, []);

    return (
        <div className="navbar-menu">
            <p>
                Welcome {currentUser.current_user_username || "loading..."}!
            </p>

            <Link className="nav-link" to="/newpost">
                <img src="/images/NewPost.png" alt="New Post" />
                <span>Upload a New Post</span>
            </Link>

            <Link className="nav-link" to="/my_followees">
                <img src="/images/PeopleIFollow.png" alt="Who You Follow" />
                <span>Who You Follow</span>
            </Link>

            <Link className="nav-link" to="/my_followers">
                <img
                    src="/images/PeopleWhoFollowMe.png"
                    alt="Your Followers"
                />
                <span>Your Followers</span>
            </Link>

            <Link
                className="nav-link"
                to={`/profile/${currentUser.current_user_id}`}
            >
                <img src="/images/MyProfile.png" alt="My Profile" />
                <span>
                    My Profile ({currentUser.current_user_username})
                </span>
            </Link>

            <Link className="nav-link" to="/userfeed">
                <img src="/images/UserFeed.png" alt="Feed" />
                <span>Back to Feed</span>
            </Link>

            <Link className="nav-link" to="/search-user">
                <img src="/images/SearchUsers.png" alt="Search Users" />
                <span>Search Users</span>
            </Link>
            <Link className="nav-link" to="/edit_profile">
            <img src="/images/EditProfile.png" alt="Edit Profile" />
                <span>Edit Profile</span>
            </Link>
        </div>
    );
}