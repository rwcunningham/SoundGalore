import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import "../styles/pages/SearchUser.css";

export default function SearchUser() {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState([]);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();

        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
            setUsers([]);
            return;
        }

        setError("");
        setIsLoading(true);

        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmedQuery)}`, {
                method: "GET",
                credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not search users.");
            }

            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFollow = async (targetUserId) => {
        setError("");

        try {
            const res = await fetch("/api/follows", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ followee_id: targetUserId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not follow user.");
            }

            setUsers((prevUsers) =>
                prevUsers.map((user) =>
                    user.id === targetUserId
                        ? { ...user, is_following: true }
                        : user
                )
            );
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <main className="SearchUser">
            <Header />

            <section className="search-user-card">
                <h1>Search Users</h1>

                <form className="search-user-form" onSubmit={handleSearch}>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search username"
                    />

                    <button type="submit">
                        Search
                    </button>
                </form>

                {error && <p className="search-user-error">{error}</p>}

                {isLoading && <p>Searching...</p>}

                {!isLoading && users.length === 0 && query.trim() && (
                    <p>No users found.</p>
                )}

                <ul className="search-user-results">
                    {users.map((user) => (
                        <li className="search-user-row" key={user.id}>
                            <Link
                                className="search-user-name"
                                to={`/profile/${user.id}`}
                            >
                                {user.username}
                            </Link>

                            <button
                                type="button"
                                disabled={user.is_following}
                                onClick={() => handleFollow(user.id)}
                            >
                                {user.is_following ? "Following" : "Follow"}
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}