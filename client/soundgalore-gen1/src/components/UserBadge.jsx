import { Link } from "react-router-dom";

export default function UserBadge({ user, size = "normal" }) {
    if (!user) return null;

    const displayName = user.display_name || user.username;
    const profileImageUrl = user.profile_image_url || "/images/default-profile.png";

    return (
        <Link className={`user-badge user-badge-${size}`} to={`/profile/${user.id}`}>
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
    );
}