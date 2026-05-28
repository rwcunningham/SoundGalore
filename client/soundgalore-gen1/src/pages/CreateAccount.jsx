import { useNavigate, Link } from "react-router-dom";
import React, { useState } from "react";
import Header from "../components/Header";
import "../styles/pages/Login.css";

export default function CreateAccount() {
    const navigate = useNavigate();

    const [account, setAccount] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAccount((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (account.password !== account.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    username: account.username,
                    email: account.email,
                    password: account.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not create account.");
            }

            navigate("/login");
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <main className="login-page">
            <Header />

            <section className="login-card">
                <form onSubmit={handleSubmit}>
                    {error && <p className="login-error">{error}</p>}

                    <div className="field">
                        <label htmlFor="username">
                            Username:
                            <input
                                type="text"
                                id="username"
                                name="username"
                                autoComplete="username"
                                value={account.username}
                                onChange={handleChange}
                                required
                            />
                        </label>
                    </div>

                    <br />

                    <div className="field">
                        <label htmlFor="email">
                            Email:
                            <input
                                type="email"
                                id="email"
                                name="email"
                                autoComplete="email"
                                value={account.email}
                                onChange={handleChange}
                                required
                            />
                        </label>
                    </div>

                    <br />

                    <div className="field">
                        <label htmlFor="password">
                            Password:
                            <input
                                type="password"
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                value={account.password}
                                onChange={handleChange}
                                required
                            />
                        </label>
                    </div>

                    <br />

                    <div className="field">
                        <label htmlFor="confirmPassword">
                            Confirm password:
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                autoComplete="new-password"
                                value={account.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </label>
                    </div>

                    <br />

                    <button type="submit">Create Account</button>

                    <p>
                        Already have an account?{" "}
                        <Link to="/login">Sign in</Link>
                    </p>
                </form>
            </section>
        </main>
    );
}