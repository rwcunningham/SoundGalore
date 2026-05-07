import {useEffect, useState, useRef, useCallback} from "react";
import Header from "../components/Header";
import AudioPlayer from "../components/AudioPlayer";
import {Link} from "react-router-dom";
import LikeAndCommentBox from "../components/LikeAndCommentBox";

const PAGE_SIZE = 20;

export default function UserFeed(){
    const [currentUsername, setCurrentUsername] = useState("");
    const [posts, setPosts] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [activePostId, setActivePostId] = useState(null);

    const loadMoreRef = useRef(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("/api/get_current_user", {
                    method: "GET",
                    credentials: "include",
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

                setPosts(data);

                if (data.length < PAGE_SIZE) {
                    setHasMorePosts(false);
                }

            } catch (err) {
                console.error("Failed to fetch feed: ", err);
            }
        };

        fetchUser();
        fetchFeed();
    }, []);

    const fetchMorePosts = useCallback(async () => {
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

            if (data.length === 0) {
                setHasMorePosts(false);
                return;
            }

            setPosts((prev) => {
                const existingIds = new Set(prev.map((post) => post.id));
                const newPosts = data.filter((post) => !existingIds.has(post.id));
                return [...prev, ...newPosts];
            });

            if (data.length < PAGE_SIZE) {
                setHasMorePosts(false);
            }

        } catch (err) {
            console.error("Failed to fetch more posts: ", err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMorePosts, posts]);

    useEffect(() => {
        if (!loadMoreRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                if (entry.isIntersecting) {
                    fetchMorePosts();
                }
            },
            {
                root: null,
                rootMargin: "400px",
                threshold: 0,
            }
        );

        observer.observe(loadMoreRef.current);

        return () => observer.disconnect();
    }, [fetchMorePosts]);

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
                <Link to="/my_followers">Your Followers</Link>
                <br/>
            </div>

            <div className="feed-posts">
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <div className="feed-post" key={post.id}>
                            <AudioPlayer
                                post={post}
                                isActive={activePostId === post.id}
                                onPlay={() => setActivePostId(post.id)}
                                onOutOfFocus={() => {
                                    if (activePostId === post.id) {
                                        setActivePostId(null);
                                    }
                                }}
                            />
                            <LikeAndCommentBox post={post}/>
                        </div>
))
                ) : (
                    <p>No posts to show yet.</p>
                )}
            </div>

            {posts.length > 0 && hasMorePosts && (
                <div ref={loadMoreRef}>
                    <button onClick={fetchMorePosts} disabled={isLoadingMore}>
                        {isLoadingMore ? "Loading..." : "Load more posts"}
                    </button>
                </div>
            )}

            {posts.length > 0 && !hasMorePosts && (
                <p>No more posts to show.</p>
            )}
        </div>
    );
}