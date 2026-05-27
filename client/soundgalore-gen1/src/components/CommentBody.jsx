import {useEffect, useRef, useState} from "react";

export default function CommentBody({comment}) {
    const textRef = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLongComment, setIsLongComment] = useState(false);

    useEffect(() => {
        const el = textRef.current;
        if (!el) return;

        setIsLongComment(el.scrollHeight > el.clientHeight);
    }, [comment.body]);

    return (
        <>
            <p
                ref={textRef}
                className={isExpanded ? "comment-body expanded" : "comment-body collapsed"}
            >
                <strong>{comment.username}</strong>: {comment.body}
            </p>

            {isLongComment && (
                <button
                    type="button"
                    className="comment-see-more"
                    onClick={() => setIsExpanded((prev) => !prev)}
                >
                    {isExpanded ? "See less" : "See more"}
                </button>
            )}
        </>
    );
}