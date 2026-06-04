import { Link } from "react-router-dom";

export default function UserBadge({
    user,
    size = "normal",
    showUnfollowButton = false,
    onUnfollow,
}) {
    if (!user) return null;

    const displayName = user.display_name || user.username;
    const profileImageUrl = user.profile_image_url || "/images/default-profile.png";

    const handleUnfollowClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (onUnfollow) {
            onUnfollow(user.id);
        }
    };

    return (
        <div className={`user-badge-row user-badge-${size}`}>
            <Link className="user-badge" to={`/profile/${user.id}`}>
                <img
                    className="user-badge-image"
                    src={profileImageUrl}
                    alt={`${displayName}'s profile`}
                />

                <div className="user-badge-text">
                    <strong>{displayName}</strong>
                    <span>@{user.username}</span>
                </div>
            </Link>

            {showUnfollowButton && (
                <button
                    type="button"
                    className="unfollow-button"
                    onClick={handleUnfollowClick}
                >
                    Unfollow
                </button>
            )}
        </div>
    );
}