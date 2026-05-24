import {useEffect, useState, useRef, useCallback} from "react";
import Header from "../components/Header";
import AudioPlayer from "../components/AudioPlayer";
import LikeAndCommentBox from "../components/LikeAndCommentBox";

const PAGE_SIZE = 20;

export default function UserFeed(){
    const [currentUsername, setCurrentUsername] = useState("");
    const [posts, setPosts] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [activePostId, setActivePostId] = useState(null);
    const lastScrollYRef = useRef(window.scrollY);

    const feedPostsRef = useRef(null);
    //const touchStartYRef = useRef(null);
    const isSnappingRef = useRef(false);

    const loadMoreRef = useRef(null);

    const headerWrapRef = useRef(null);

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
            <div ref={headerWrapRef}>
                <Header />
                <div>
                    <h1>Your Soundgalore Feed</h1>
                </div>
            </div>
            <div
                className="feed-posts"
                ref={feedPostsRef}
                onWheel={(e) => {
                    e.preventDefault();

                    if (isSnappingRef.current) return;

                    const direction = e.deltaY > 0 ? 1 : -1;
                    const postCards = Array.from(feedPostsRef.current.querySelectorAll(".feed-post"));

                    const currentIndex = postCards.findIndex((card) => {
                        const rect = card.getBoundingClientRect();
                        return rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2;
                    });

                    const nextCard = postCards[currentIndex + direction];

                    if (nextCard) {
                        isSnappingRef.current = true;

                        const feedRect = feedPostsRef.current.getBoundingClientRect();
                        const cardRect = nextCard.getBoundingClientRect();
                        const headerHeight = headerWrapRef.current?.getBoundingClientRect().height ?? 0;

                        const visibleFeedHeight = feedPostsRef.current.clientHeight - headerHeight;

                        const targetTop =
                            feedPostsRef.current.scrollTop +
                            cardRect.top -
                            feedRect.top -
                            (feedPostsRef.current.clientHeight - nextCard.clientHeight) / 2;

                        feedPostsRef.current.scrollTo({
                            top: targetTop,
                            behavior: "smooth",
                        });

                        setTimeout(() => {
                            isSnappingRef.current = false;
                        }, 650);
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
                                <LikeAndCommentBox post={post}/>
                            </div>
                        </div>
))
                ) : (
                    <p>No posts to show yet.</p>
                )}
    

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
        </div>
    );
}