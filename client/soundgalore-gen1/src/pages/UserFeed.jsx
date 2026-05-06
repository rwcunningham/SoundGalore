import {useEffect, useState} from "react";
import Header from "../components/Header";
import AudioPlayer from "../components/AudioPlayer";
import {Link} from "react-router-dom";

export default function UserFeed(){
    const [currentUsername, setCurrentUsername] = useState("");
    const [posts, setPosts] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);


    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("/api/get_current_user",{
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

        const fetchFeed = async () => {
            try {
                const res = await fetch("/api/feed", {
                    method: "GET",
                    credentials: "include",
                });

                if (!res.ok) {
                    throw new Error(`Failed to fetch feed: HTTP ${res.status}`);
                }

                const data = await res.json();
                console.log("FEED DATA:", data);
                console.log("NUMBER OF POSTS:", data.length);

                setPosts(data);

                // if fewer than 20 posts came back,
                // there are probably no more posts to load
                if (data.length < 20) {
                    setHasMorePosts(false);
                }

            } catch (err) {
                console.error("Failed to fetch feed: ", err);
            }
        };
        
    fetchUser();
    fetchFeed();
    }, []);

    const fetchMorePosts = async () => {
        if (isLoadingMore || !hasMorePosts || posts.length === 0) return;

        setIsLoadingMore(true);

        try {
            const oldestPost = posts[posts.length - 1];

            const res = await fetch(
                `/api/feed?before=${encodeURIComponent(oldestPost.created_at)}`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );

            if (!res.ok) {
                throw new Error(`Failed to fetch more posts: HTTP ${res.status}`);
            }

            const data = await res.json();

            setPosts((prev) => [...prev, ...data]);

            if (data.length < 20) {
                setHasMorePosts(false);
            }
        } catch (err) {
            console.error("Failed to fetch more posts: ", err);
        } finally {
            setIsLoadingMore(false);
        }
    };


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

            <div className="feed-posts">
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <AudioPlayer key={post.id} post={post} />
                    ))
                ) : (
                    <p>No posts to show yet.</p>
                )}
            </div>

            {posts.length > 0 && hasMorePosts && (
                <button onClick={fetchMorePosts} disabled={isLoadingMore}>
                    {isLoadingMore ? "Loading..." : "Load more posts"}
                </button>
            )}

            {posts.length > 0 && !hasMorePosts && (
                <p>No more posts to show.</p>
            )}
        </div>
    );
}