import {useEffect, useState, useRef, useCallback} from "react";
import Header from "../components/Header";
import AudioPlayer from "../components/AudioPlayer";
import NavBar from "../components/NavBar"
import {Link, useParams} from "react-router-dom";

const PAGE_SIZE = 20;

export default function UserProfile(){
    const {userId} = useParams();

    const [currentUsername, setCurrentUsername] = useState("");
    const [posts, setPosts] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [activePostId, setActivePostId] = useState(null);

    const loadMoreRef = useRef(null);
    const lastScrollYRef = useRef(window.scrollY);

    const feedPostsRef = useRef(null);
    const isSnappingRef = useRef(false);

    useEffect(() => {
        const fetchUserPosts = async () => {
            try {
                const res = await fetch(`/api/user_profile/${userId}`, {
                    method: "GET",
                    credentials: "include",
                });

                if (!res.ok) {
                    throw new Error(`Failed to fetch user posts: HTTP ${res.status}`);
                }

                const data = await res.json();

                setCurrentUsername(data.user.username);
                setPosts(data.posts);
                setHasMorePosts(data.posts.length >= PAGE_SIZE);

            } catch (err) {
                console.error("Failed to fetch user posts: ", err);
            }
        };

        setPosts([]);
        setCurrentUsername("");
        setHasMorePosts(true);
        setActivePostId(null);

        fetchUserPosts();
    }, [userId]);

    const fetchMorePosts = useCallback(async () => {
        if (isLoadingMore || !hasMorePosts || posts.length === 0) return;

        setIsLoadingMore(true);

        try {
            const oldestPost = posts[posts.length - 1];

            const res = await fetch(
                `/api/user_profile/${userId}?before=${encodeURIComponent(oldestPost.created_at)}`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );

            if (!res.ok) {
                throw new Error(`Failed to fetch more user posts: HTTP ${res.status}`);
            }

            const data = await res.json();

            if (data.posts.length === 0) {
                setHasMorePosts(false);
                return;
            }

            setPosts((prev) => {
                const existingIds = new Set(prev.map((post) => post.id));
                const newPosts = data.posts.filter((post) => !existingIds.has(post.id));
                return [...prev, ...newPosts];
            });

            if (data.posts.length < PAGE_SIZE){
                setHasMorePosts(false);
            }

        } catch (err) {
            console.error("Failed to fetch more user posts: ", err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMorePosts, posts, userId]);

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
        <div className="UserProfile">
            <Header/>

            <div>
                <h1>{currentUsername || "loading. . ."}</h1>
            </div>

            <div
                className="feed-posts"
                ref={feedPostsRef}
                onWheel={(e) => {
                    e.preventDefault();

                    if (isSnappingRef.current) return;

                    const direction = e.deltaY > 0 ? 1 : -1;
                    const postCards = Array.from(
                        feedPostsRef.current.querySelectorAll(".feed-post")
                    );

                    const currentIndex = postCards.findIndex((card) => {
                        const rect = card.getBoundingClientRect();

                        return (
                            rect.top <= window.innerHeight / 2 &&
                            rect.bottom >= window.innerHeight / 2
                        );
                    });

                    const nextCard = postCards[currentIndex + direction];

                    if (nextCard) {
                        isSnappingRef.current = true;

                        nextCard.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        });

                        setTimeout(() => {
                            isSnappingRef.current = false;
                        }, 450);
                    }
                }}
            >
                {posts.length > 0 ? (
                    posts.map((post) => (
                        <div className="feed-post" key={post.id}>
                            <div className="feed-post-card">
                                <AudioPlayer
                                    post={post}
                                    isActive={activePostId === post.id}
                                    onPlay={() => setActivePostId(post.id)}
                                    onOutOfFocus={() => {
                                        if (activePostId === post.id) {
                                            const currentIndex = posts.findIndex((p) => p.id === post.id);

                                            const currentScrollY = window.scrollY;
                                            const scrollingDown = currentScrollY > lastScrollYRef.current;
                                            lastScrollYRef.current = currentScrollY;

                                            const nextIndex = scrollingDown
                                                ? currentIndex + 1
                                                : currentIndex - 1;

                                            const nextPost = posts[nextIndex];

                                            if (nextPost) {
                                                setActivePostId(nextPost.id);
                                            } else {
                                                setActivePostId(null);
                                            }
                                        }
                                    }}
                                />
                            </div>
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