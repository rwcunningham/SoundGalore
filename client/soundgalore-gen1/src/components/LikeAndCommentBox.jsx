import {useEffect, useRef, useState} from "react";
import CommentBody from "../components/CommentBody";

export default function LikeAndCommentBox({post}){
    const [postLiked, setPostLiked] = useState(false);
    const [postLikeCount, setPostLikeCount] = useState(0);
    const [comments, setComments] = useState([]);
    const [showCommentBox, setShowCommentBox] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [expandedComments, setExpandedComments] = useState(false);
    const [error, setError] = useState("");

    const sortedComments = [...comments].sort(
        (a, b) => (b.like_count ?? 0) - (a.like_count ?? 0)
    );

    const visibleComments = expandedComments
    ? sortedComments
    : sortedComments.slice(0, 2);

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

            <div className={expandedComments ? "comments-list expanded" : "comments-list collapsed"}>
                {visibleComments.map((comment) => {

                    return (
                        <div className="comment" key={comment.id}>
                            <CommentBody comment={comment} />

                            <button type="button" onClick={() => handleCommentLike(comment.id)}>
                                {comment.liked_by_current_user ? "♥" : "♡"} {comment.like_count}
                            </button>
                        </div>
                    );
                })}
            </div>

            {comments.length > 0 && (
                <button type="button" onClick={() => setExpandedComments((prev) => !prev)}>
                    {expandedComments ? "Show fewer comments" : "See more comments"}
                </button>
            )}
        </div>
    );
}