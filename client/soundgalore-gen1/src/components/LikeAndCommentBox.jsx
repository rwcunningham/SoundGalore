import { useEffect, useRef, useState } from "react";
import CommentBody from "../components/CommentBody";
import UserBadge from "../components/UserBadge";

export default function LikeAndCommentBox({ post }) {
    const [postLiked, setPostLiked] = useState(false);
    const [postLikeCount, setPostLikeCount] = useState(0);
    const [comments, setComments] = useState([]);
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [commentsModalOpen, setCommentsModalOpen] = useState(false);
    const [error, setError] = useState("");

    const commentsPanelRef = useRef(null);
    const isSubmittingCommentRef = useRef(false);
    const lastTouchSubmitRef = useRef(0);

    const sortedComments = [...comments].sort(
        (a, b) => (b.like_count ?? 0) - (a.like_count ?? 0)
    );

    const previewComments = sortedComments.slice(0, 2);

    useEffect(() => {
        const fetchCommentsAndLikes = async () => {
            try {
                const res = await fetch(`/api/posts/${post.id}/comments`, {
                    method: "GET",
                    credentials: "include",
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }

                const data = await res.json();

                setComments(data.comments || []);
                setPostLiked(data.post_liked_by_current_user);
                setPostLikeCount(data.post_like_count);
            } catch (err) {
                setError("Could not load comments.");
                console.error("Failed to load comments: ", err);
            }
        };

        if (post?.id) {
            fetchCommentsAndLikes();
        }
    }, [post?.id]);

    useEffect(() => {
        if (!commentsModalOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setCommentsModalOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [commentsModalOpen]);

    const stopScrollFromReachingFeed = (e) => {
        e.stopPropagation();
    };

    const handleBackdropPointerDown = (e) => {
        if (e.target === e.currentTarget) {
            setCommentsModalOpen(false);
        }
    };

    const handleBackdropWheel = (e) => {
        if (e.target === e.currentTarget) {
            setCommentsModalOpen(false);
        }
    };

    const handleBackdropTouchMove = (e) => {
        if (e.target === e.currentTarget) {
            setCommentsModalOpen(false);
        }
    };

    const handlePostLike = async () => {
        try {
            const res = await fetch(`/api/posts/${post.id}/like`, {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            setPostLiked(data.liked);
            setPostLikeCount(data.like_count);
        } catch (err) {
            setError("Could not like post.");
            console.error("Failed to like post: ", err);
        }
    };

    const handleCommentSubmit = async (e) => {
        e?.preventDefault();
        e?.stopPropagation();

        if (isSubmittingCommentRef.current) return;

        const trimmedComment = commentText.trim();

        if (!trimmedComment) return;

        isSubmittingCommentRef.current = true;
        setError("");

        try {
            const res = await fetch(`/api/posts/${post.id}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ body: trimmedComment }),
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const newComment = await res.json();

            setComments((prev) => [newComment, ...prev]);
            setCommentText("");
            setShowCommentBox(false);
            setCommentsModalOpen(true);
        } catch (err) {
            setError("Could not post comment.");
            console.error("Failed to post comment: ", err);
        } finally {
            setTimeout(() => {
                isSubmittingCommentRef.current = false;
            }, 700);
        }
    };

    const handleCommentLike = async (commentId) => {
        try {
            const res = await fetch(`/api/comments/${commentId}/like`, {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            setComments((prev) =>
                prev.map((comment) =>
                    comment.id === commentId
                        ? {
                              ...comment,
                              liked_by_current_user: data.liked,
                              like_count: data.like_count,
                          }
                        : comment
                )
            );
        } catch (err) {
            setError("Could not like comment.");
            console.error("Failed to like comment: ", err);
        }
    };

    const renderComment = (comment) => (
        <div className="comment" key={comment.id}>
            <UserBadge
                user={{
                    id: comment.user_id,
                    username: comment.username,
                    display_name: comment.display_name,
                    profile_image_url: comment.profile_image_url,
                }}
                size="small"
            />

            <CommentBody comment={comment} />

            <button type="button" onClick={() => handleCommentLike(comment.id)}>
                {comment.liked_by_current_user ? "♥" : "♡"} {comment.like_count}
            </button>
        </div>
    );

    return (
        <div className="LikeAndCommentBox">
            <div className="like-comment-actions">
                <button type="button" onClick={handlePostLike}>
                    {postLiked ? "♥" : "♡"} {postLikeCount}
                </button>

                <button
                    type="button"
                    onClick={() => setShowCommentBox((prev) => !prev)}
                >
                    Comment
                </button>
            </div>

            {showCommentBox && (
                <form
                    className="comment-form"
                    onSubmit={handleCommentSubmit}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                    />

                    <button
                        type="button"
                        onPointerDown={(e) => {
                            if (e.pointerType !== "touch") return;

                            e.preventDefault();
                            e.stopPropagation();

                            lastTouchSubmitRef.current = Date.now();
                            handleCommentSubmit(e);
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            if (Date.now() - lastTouchSubmitRef.current < 700) return;

                            handleCommentSubmit(e);
                        }}
                    >
                        Post comment
                    </button>
                </form>
            )}

            {error && <p className="comment-error">{error}</p>}

            <div className="comments-preview">
                {previewComments.map(renderComment)}
            </div>

            {comments.length > 0 && (
                <button
                    type="button"
                    className="see-more-comments-button"
                    onClick={() => setCommentsModalOpen(true)}
                >
                    See comments {comments.length}
                </button>
            )}

            {commentsModalOpen && (
                <div
                    className="comments-modal-backdrop"
                    onPointerDown={handleBackdropPointerDown}
                    onWheel={handleBackdropWheel}
                    onTouchMove={handleBackdropTouchMove}
                >
                    <section
                        ref={commentsPanelRef}
                        className="comments-modal-panel"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onWheel={stopScrollFromReachingFeed}
                        onTouchMove={stopScrollFromReachingFeed}
                    >
                        <div className="comments-modal-header">
                            <h2>Comments</h2>

                            <button
                                type="button"
                                className="comments-modal-close"
                                onClick={() => setCommentsModalOpen(false)}
                            >
                                Close
                            </button>
                        </div>

                        <div className="comments-modal-list">
                            {sortedComments.map(renderComment)}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}