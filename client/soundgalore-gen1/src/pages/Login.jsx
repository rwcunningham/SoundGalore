import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import Header from "../components/Header";
import "../styles/pages/Login.css";
import { Link } from "react-router-dom";

export default function Login() {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ username: "", password: "" });
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials((prev) => ({ ...prev, [name]: value }));
    };

    const handleInputFocus = (e) => {
        setTimeout(() => {
            e.target.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
            });
        }, 250);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Important for iPhone Safari:
        // close keyboard / leave input focus before changing pages
        document.activeElement?.blur();

        try {
            const res = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(credentials),
            });

            if (res.status === 401) {
                throw new Error("Sorry, your username or password was incorrect. Please try again.");
            }

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Unknown error");
            }

            navigate("/UserFeed");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <main className="login-page">
            <Header showNav={false} />

            <p>
                Need an account? <Link to="/create-account">Create one</Link>
            </p>

            <section className="login-card">
                <form onSubmit={handleSubmit}>
                    {error && (
                        <p className="login-error">
                            {error}
                        </p>
                    )}

                    <div className="field">
                        <label htmlFor="username">
                            Username:
                            <input
                                type="text"
                                autoComplete="username"
                                id="username"
                                name="username"
                                onChange={handleChange}
                                onFocus={handleInputFocus}
                                value={credentials.username}
                                required
                            />
                        </label>
                    </div>

                    <div className="field">
                        <label htmlFor="password">
                            Password:
                            <input
                                type="password"
                                autoComplete="current-password"
                                id="password"
                                name="password"
                                onChange={handleChange}
                                onFocus={handleInputFocus}
                                value={credentials.password}
                                required
                            />
                        </label>
                    </div>

                    <button type="submit">Sign In</button>
                </form>
            </section>
        </main>
    );
}