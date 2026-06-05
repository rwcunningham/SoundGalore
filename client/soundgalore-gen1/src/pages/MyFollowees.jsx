import {Link} from 'react-router-dom'
import {useEffect, useState} from 'react'

export default function MyFollowees(){

    const [followees, setFollowees] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(()=>{
        const ac = new AbortController();
        (async () => {
            try{
                setLoading(true);
                setError(null);

                const res = await fetch("/api/my_followees",{
                    "method":"GET",
                    "credentials":"include",
                    "signal":ac.signal
                });

                if (!res.ok){
                    throw new Error(`HTTP ${res.status}`) 
                }

                const data = await res.json();
                setFollowees(data);
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

            setFollowees((prevFollowees) =>
                prevFollowees.filter((f) => f.followee_id !== targetUserId)
            );
        } catch (err) {
            setError(err.message);
        }
    };

    return (
    <div className="MyFollowees">
        <ul className="followees-list">
        <h1>People I Follow:</h1>
        {followees.map(f => (
            <li key={f.followee_id} className="followee-row">
                <Link to={`/profile/${f.followee_id}`} className="followee-user-link">
                    <img
                        className="follow-user-image"
                        src={f.followee_profile_image_url || "/images/default-profile.png"}
                        alt={`${f.followee_name}'s profile`}
                    />

                    <span className="followee-name">
                        {f.followee_display_name || f.followee_name}
                    </span>
                </Link>

                <span className="followee-date">
                    {new Date(f.created_at).toLocaleString()}
                </span>

                <button
                    type="button"
                    className="unfollow-button"
                    onClick={() => handleUnfollow(f.followee_id)}
                >
                    Unfollow
                </button>
            </li>
        ))}
        </ul>
        <Link to="/UserFeed">Back to My Feed</Link>
    </div>
);
}