import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";

const PAGE_SIZE = 20;

export default function MyComments() {
    const [profileUser, setProfileUser] = useState(null);
    const [comments, setComments] = useState([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreComments, setHasMoreComments] = useState(true);
    const [error, setError] = useState("");

    const feedCommentsRef = useRef(null);
    const loadMoreRef = useRef(null);
    const isSnappingRef = useRef(false);

    const fetchInitialComments = useCallback(async () => {
        setError("");

        try {
            const res = await fetch("/api/my_comments", {
                method: "GET",
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || `Failed to fetch comments: HTTP ${res.status}`);
            }

            setProfileUser(data.user);
            setComments(data.comments);
            setHasMoreComments(data.comments.length >= PAGE_SIZE);
        } catch (err) {
            console.error("Failed to fetch comments:", err);
            setError(err.message);
        }
    }, []);

    useEffect(() => {
        setProfileUser(null);
        setComments([]);
        setHasMoreComments(true);
        fetchInitialComments();
    }, [fetchInitialComments]);

    const fetchMoreComments = useCallback(async () => {
        if (isLoadingMore || !hasMoreComments || comments.length === 0) return;

        setIsLoadingMore(true);
        setError("");

        try {
            const oldestComment = comments[comments.length - 1];

            const res = await fetch(
                `/api/my_comments?before=${encodeURIComponent(oldestComment.created_at)}`,
                {
                    method: "GET",
                    credentials: "include",
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || `Failed to fetch more comments: HTTP ${res.status}`);
            }

            if (data.comments.length === 0) {
                setHasMoreComments(false);
                return;
            }

            setComments((prev) => {
                const existingIds = new Set(prev.map((comment) => comment.id));
                const newComments = data.comments.filter(
                    (comment) => !existingIds.has(comment.id)
                );

                return [...prev, ...newComments];
            });

            if (data.comments.length < PAGE_SIZE) {
                setHasMoreComments(false);
            }
        } catch (err) {
            console.error("Failed to fetch more comments:", err);
            setError(err.message);
        } finally {
            setIsLoadingMore(false);
        }
    }, [comments, hasMoreComments, isLoadingMore]);

    useEffect(() => {
        if (!loadMoreRef.current || !feedCommentsRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];

                if (entry.isIntersecting) {
                    fetchMoreComments();
                }
            },
            {
                root: feedCommentsRef.current,
                rootMargin: "400px",
                threshold: 0,
            }
        );

        observer.observe(loadMoreRef.current);

        return () => observer.disconnect();
    }, [fetchMoreComments]);

    const snapToNextComment = (direction) => {
        if (!feedCommentsRef.current || isSnappingRef.current) return;

        const commentCards = Array.from(
            feedCommentsRef.current.querySelectorAll(".feed-post")
        );

        const feedRect = feedCommentsRef.current.getBoundingClientRect();
        const feedCenterY = feedRect.top + feedRect.height / 2;

        const currentIndex = commentCards.findIndex((card) => {
            const rect = card.getBoundingClientRect();

            return (
                rect.top <= feedCenterY &&
                rect.bottom >= feedCenterY
            );
        });

        if (currentIndex === -1) return;

        const nextCard = commentCards[currentIndex + direction];

        if (!nextCard) return;

        isSnappingRef.current = true;

        const cardRect = nextCard.getBoundingClientRect();

        const targetTop =
            feedCommentsRef.current.scrollTop +
            cardRect.top -
            feedRect.top -
            (feedCommentsRef.current.clientHeight - nextCard.clientHeight) / 2;

        feedCommentsRef.current.scrollTo({
            top: targetTop,
            behavior: "smooth",
        });

        setTimeout(() => {
            isSnappingRef.current = false;
        }, 500);
    };

    const handleDeleteComment = async (commentId) => {
        const confirmed = window.confirm("Delete this comment?");

        if (!confirmed) return;

        setError("");

        try {
            const res = await fetch(`/api/comments/${commentId}`, {
                method: "DELETE",
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not delete comment.");
            }

            setComments((prev) =>
                prev.filter((comment) => comment.id !== commentId)
            );
        } catch (err) {
            console.error("Failed to delete comment:", err);
            setError(err.message);
        }
    };

    return (
        <div className="MyComments">
            <Header />

            <div
                className="feed-posts"
                ref={feedCommentsRef}
                onWheel={(e) => {
                    e.preventDefault();

                    const direction = e.deltaY > 0 ? 1 : -1;
                    snapToNextComment(direction);
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

                            <Link
                                className="profile-card-button"
                                to={`/user_profile/${profileUser.id}`}
                            >
                                Back to profile
                            </Link>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="feed-post">
                        <div className="comment-feed-card">
                            <p className="comment-error">{error}</p>
                        </div>
                    </div>
                )}

                {comments.length > 0 ? (
                    comments.map((comment) => (
                        <div className="feed-post" key={comment.id}>
                            <div className="comment-feed-card">
                                <button
                                    className="delete-comment-button"
                                    type="button"
                                    onClick={() => handleDeleteComment(comment.id)}
                                >
                                    Delete comment
                                </button>

                                <p className="comment-feed-label">
                                    You commented on:
                                </p>

                                <Link
                                    className="comment-feed-post-link"
                                    to={`/user_profile/${comment.post.author.id}`}
                                >
                                    {comment.post.title}
                                </Link>

                                <p className="comment-feed-post-author">
                                    by @{comment.post.author.username}
                                </p>

                                <p className="comment-feed-body">
                                    {comment.body}
                                </p>

                                <p className="comment-feed-date">
                                    {new Date(comment.created_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    !error && (
                        <div className="feed-post">
                            <div className="comment-feed-card">
                                <p>No comments to show yet.</p>
                            </div>
                        </div>
                    )
                )}

                {comments.length > 0 && hasMoreComments && (
                    <div className="load-more-posts" ref={loadMoreRef}>
                        <button onClick={fetchMoreComments} disabled={isLoadingMore}>
                            {isLoadingMore ? "Loading..." : "Load more comments"}
                        </button>
                    </div>
                )}

                {comments.length > 0 && !hasMoreComments && (
                    <p className="no-more-posts">No more comments to show.</p>
                )}
            </div>
        </div>
    );
}