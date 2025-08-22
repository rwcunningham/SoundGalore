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


    return (
    <div className="MyFollowees">
        <ul className="followees-list">
        <h1>People I Follow:</h1>
        {followees.map(f => (
            <li key={f.followee_id} className="followee-row">
            <span className="followee-name">{f.followee_name}</span>
            <span className="followee-date">
                {new Date(f.created_at).toLocaleString()}
            </span>
            </li>
        ))}
        </ul>
        <Link to="/user_feed">Back to My Feed</Link>
    </div>
);
}