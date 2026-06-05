import {Link} from 'react-router-dom'
import {useEffect, useState} from 'react'

export default function MyFollowers(){

    const [followers, setFollowers] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(()=>{
        const ac = new AbortController();
        (async () => {
            try{
                setLoading(true);
                setError(null);

                const res = await fetch("/api/my_followers",{
                    "method":"GET",
                    "credentials":"include",
                    "signal":ac.signal
                });

                if (!res.ok){
                    throw new Error(`HTTP ${res.status}`) 
                }

                const data = await res.json();
                setFollowers(data);
            }
            catch(err){
                if(err.name !== "AbortError") setError(err.message);
            } finally{
                setLoading(false);
            }
        })();
        return () => ac.abort();
    }, []);

    if (loading) return <p>Loading. . .</p>
    if (error) return <p>Error: {error}</p>


    const handleUnfollow = async (targetUserId) => {
        setError(null);

        try {
            const res = await fetch(`/api/follows/${targetUserId}`, {
                method: "DELETE",
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not unfollow user.");
            }

            setFollowers((prevFollowers) =>
                prevFollowers.map((f) =>
                    f.follower_id === targetUserId
                        ? { ...f, is_following: false }
                        : f
                )
            );
        } catch (err) {
            setError(err.message);
        }
    };

    return (
    <div className="MyFollowers">
        <ul className="followers-list">
        <h1>My Followers:</h1>
        {followers.map(f => (
            <li key={f.follower_id} className="follower-row">
                <Link to={`/profile/${f.follower_id}`} className="follower-user-link">
                    <img
                        className="follow-user-image"
                        src={f.follower_profile_image_url || "/images/default-profile.png"}
                        alt={`${f.follower_name}'s profile`}
                    />

                    <span className="follower-name">
                        {f.follower_display_name || f.follower_name}
                    </span>
                </Link>

                <span className="follower-date">
                    {new Date(f.created_at).toLocaleString()}
                </span>

                {f.is_following && (
                    <button
                        type="button"
                        className="unfollow-button"
                        onClick={() => handleUnfollow(f.follower_id)}
                    >
                        Unfollow
                    </button>
                )}
            </li>
        ))}
        </ul>
        <Link to="/UserFeed">Back to My Feed</Link>
    </div>
);
}