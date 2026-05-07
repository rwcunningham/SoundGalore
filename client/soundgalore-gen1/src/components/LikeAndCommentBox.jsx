import {useEffect, useState} from "react";

export default function LikeAndCommentBox({post}){
    const [postLiked, setPostLiked] = useState(false);
    const [postLikeCount, setPostLikeCount] = useState(0);
    const [comments, setComments] = useState([]);
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [expandedComments, setExpandedComments] = useState(false);
    const [error, setError] = useState("");

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

                setComments(data.comments);
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
        e.preventDefault();

        if (!commentText.trim()) return;

        try {
            const res = await fetch(`/api/posts/${post.id}/comments`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                credentials: "include",
                body: JSON.stringify({body: commentText}),
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const newComment = await res.json();

            setComments((prev) => [newComment, ...prev]);
            setCommentText("");
            setShowCommentBox(false);
        } catch (err) {
            setError("Could not post comment.");
            console.error("Failed to post comment: ", err);
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

    const visibleComments = expandedComments ? comments : comments.slice(0, 2);

    return(
        <div className="LikeAndCommentBox">
            <div className="like-comment-actions">
                <button type="button" onClick={handlePostLike}>
                    {postLiked ? "♥" : "♡"} {postLikeCount}
                </button>

                <button type="button" onClick={() => setShowCommentBox((prev) => !prev)}>
                    Comment
                </button>
            </div>

            {showCommentBox && (
                <form onSubmit={handleCommentSubmit}>
                    <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Write a comment..."
                    />

                    <button type="submit">
                        Post comment
                    </button>
                </form>
            )}

            {error && <p className="comment-error">{error}</p>}

            <div className="comments-list">
                {visibleComments.map((comment) => (
                    <div className="comment" key={comment.id}>
                        <p>
                            <strong>{comment.username}</strong>: {comment.body}
                        </p>

                        <button type="button" onClick={() => handleCommentLike(comment.id)}>
                            {comment.liked_by_current_user ? "♥" : "♡"} {comment.like_count}
                        </button>
                    </div>
                ))}
            </div>

            {comments.length > 2 && (
                <button type="button" onClick={() => setExpandedComments((prev) => !prev)}>
                    {expandedComments ? "Show fewer comments" : "Expand comments"}
                </button>
            )}
        </div>
    );
}