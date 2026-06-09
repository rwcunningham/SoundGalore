import {useEffect, useState, useRef, useCallback} from "react";
import Header from "../components/Header";
import AudioPlayer from "../components/AudioPlayer";
import LikeAndCommentBox from "../components/LikeAndCommentBox";
import { Link, useParams } from "react-router-dom";

const PAGE_SIZE = 20;

export default function UserProfile(){
    const {userId} = useParams();

    const [profileUser, setProfileUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [activePostId, setActivePostId] = useState(null);

    const [error, setError] = useState("");

    const loadMoreRef = useRef(null);
    const feedPostsRef = useRef(null);
    const isSnappingRef = useRef(false);
    const scrollEndTimerRef = useRef(null);

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

                setProfileUser(data.user);
                setPosts(data.posts);
                setHasMorePosts(data.posts.length >= PAGE_SIZE);

                if (data.posts.length > 0) {
                    setActivePostId(data.posts[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch user posts: ", err);
            }
        };

        setPosts([]);
        setProfileUser(null);
        setHasMorePosts(true);
        setActivePostId(null);

        fetchUserPosts();

        return () => {
            if (scrollEndTimerRef.current) {
                clearTimeout(scrollEndTimerRef.current);
            }
        };
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
        if (!loadMoreRef.current || !feedPostsRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                if (entry.isIntersecting) {
                    fetchMorePosts();
                }
            },
            {
                root: feedPostsRef.current,
                rootMargin: "400px",
                threshold: 0,
            }
        );

        observer.observe(loadMoreRef.current);

        return () => observer.disconnect();
    }, [fetchMorePosts]);

    const getCenteredPostId = () => {
        if (!feedPostsRef.current) return null;

        const postCards = Array.from(
            feedPostsRef.current.querySelectorAll(".feed-post[data-post-id]")
        );

        const feedRect = feedPostsRef.current.getBoundingClientRect();
        const feedCenterY = feedRect.top + feedRect.height / 2;

        let closestPostId = null;
        let closestDistance = Infinity;

        postCards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            const cardCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(cardCenterY - feedCenterY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestPostId = card.getAttribute("data-post-id");
            }
        });

        return closestPostId;
    };

    const activateCenteredPost = () => {
        const centeredPostId = getCenteredPostId();

        if (centeredPostId) {
            setActivePostId(centeredPostId);
        }
    };

    const snapToNextPost = (direction) => {
        if (!feedPostsRef.current || isSnappingRef.current) return;

        const postCards = Array.from(
            feedPostsRef.current.querySelectorAll(".feed-post[data-post-id]")
        );

        const feedRect = feedPostsRef.current.getBoundingClientRect();
        const feedCenterY = feedRect.top + feedRect.height / 2;

        let currentIndex = -1;
        let closestDistance = Infinity;

        postCards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            const cardCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(cardCenterY - feedCenterY);

            if (distance < closestDistance) {
                closestDistance = distance;
                currentIndex = index;
            }
        });

        if (currentIndex === -1) return;

        const nextCard = postCards[currentIndex + direction];

        if (!nextCard) return;

        isSnappingRef.current = true;

        const cardRect = nextCard.getBoundingClientRect();

        const targetTop =
            feedPostsRef.current.scrollTop +
            cardRect.top -
            feedRect.top -
            (feedPostsRef.current.clientHeight - nextCard.clientHeight) / 2;

        const nextPostId = nextCard.getAttribute("data-post-id");

        if (nextPostId) {
            setActivePostId(nextPostId);
        }

        feedPostsRef.current.scrollTo({
            top: targetTop,
            behavior: "smooth",
        });

        setTimeout(() => {
            activateCenteredPost();
            isSnappingRef.current = false;
        }, 500);
    };

    const handleProfileScroll = () => {
        if (isSnappingRef.current) return;

        if (scrollEndTimerRef.current) {
            clearTimeout(scrollEndTimerRef.current);
        }

        scrollEndTimerRef.current = setTimeout(() => {
            activateCenteredPost();
        }, 150);
    };

    const handleFollow = async (targetUserId) => {
        setError("");

        try {
            const res = await fetch("/api/follows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ followee_id: targetUserId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not follow user.");
            }

            setProfileUser((prev) =>
                prev ? { ...prev, is_following: true } : prev
            );
        } catch (err) {
            setError(err.message);
        }
    };

    const handleUnfollow = async (targetUserId) => {
        setError("");

        try {
            const res = await fetch(`/api/follows/${targetUserId}`, {
                method: "DELETE",
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not unfollow user.");
            }

            setProfileUser((prev) =>
                prev ? { ...prev, is_following: false } : prev
            );
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDeletePost = async (postId) => {
        const confirmed = window.confirm("Delete this post?");

        if (!confirmed) return;

        try {
            const res = await fetch(`/api/posts/${postId}`, {
                method: "DELETE",
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not delete post.");
            }

            setPosts((prev) => prev.filter((post) => post.id !== postId));

            if (activePostId === postId) {
                setActivePostId(null);
            }
        } catch (err) {
            console.error("Failed to delete post:", err);
            setError(err.message);
        }
    };

    return(
        <div className="UserProfile">
            <Header/>

            <div
                className="feed-posts"
                ref={feedPostsRef}
                onScroll={handleProfileScroll}
                onWheel={(e) => {
                    e.preventDefault();

                    const direction = e.deltaY > 0 ? 1 : -1;
                    snapToNextPost(direction);
                }}
            >
                {profileUser && (
                    <div className="feed-post">
                        <div className="profile-card">
                            <img
                                className="profile-card-image"
                                src={
                                    profileUser.profile_image_url ||
                                    "/images/default-profile.png"
                                }
                                alt={profileUser.username}
                            />

                            <h2>
                                {profileUser.display_name || profileUser.username}
                            </h2>

                            <p>@{profileUser.username}</p>

                            {error && <p className="profile-error">{error}</p>}

                            {profileUser.is_current_user ? (
                                <Link className="profile-card-button" to="/my_comments">
                                    My comments
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        profileUser.is_following
                                            ? handleUnfollow(profileUser.id)
                                            : handleFollow(profileUser.id)
                                    }
                                >
                                    {profileUser.is_following ? "Unfollow" : "Follow"}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {posts.length > 0 ? (
                    posts.map((post) => (
                        <div
                            className="feed-post"
                            key={post.id}
                            data-post-id={post.id}
                        >
                            <div className="feed-post-card">
                                {profileUser?.is_current_user && (
                                    <button
                                        className="delete-post-button"
                                        type="button"
                                        onPointerDown={(e) => {
                                            e.stopPropagation();
                                        }}
                                        onTouchStart={(e) => {
                                            e.stopPropagation();
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeletePost(post.id);
                                        }}
                                    >
                                        Delete post
                                    </button>
                                )}

                                <AudioPlayer
                                    post={post}
                                    isActive={activePostId === post.id}
                                    onPlay={() => setActivePostId(post.id)}
                                />

                                <LikeAndCommentBox post={post}/>
                            </div>
                        </div>
                    ))
                ) : (
                    <p>No posts to show yet.</p>
                )}

                {posts.length > 0 && hasMorePosts && (
                    <div className="load-more-posts" ref={loadMoreRef}>
                        <button onClick={fetchMorePosts} disabled={isLoadingMore}>
                            {isLoadingMore ? "Loading..." : "Load more posts"}
                        </button>
                    </div>
                )}

                {posts.length > 0 && !hasMorePosts && (
                    <p className="no-more-posts">No more posts to show.</p>
                )}
            </div>
        </div>
    );
}