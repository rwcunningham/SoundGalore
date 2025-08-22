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


    return (
    <div className="MyFollowers">
        <ul className="followers-list">
        <h1>My Followers:</h1>
        {followers.map(f => (
            <li key={f.follower_id} className="follower-row">
            <span className="follower-name">{f.follower_name}</span>
            <span className="follower-date">
                {new Date(f.created_at).toLocaleString()}
            </span>
            </li>
        ))}
        </ul>
        <Link to="/user_feed">Back to My Feed</Link>
    </div>
);
}