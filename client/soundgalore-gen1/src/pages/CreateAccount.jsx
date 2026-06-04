import { useNavigate, Link } from "react-router-dom";
import React, { useState } from "react";
import Header from "../components/Header";
import "../styles/pages/Login.css";
import ImagePicker from "../components/ImagePicker";
import CameraCapture from "../components/CameraCapture";

export default function CreateAccount() {
    const navigate = useNavigate();

    const [success, setSuccess] = useState("");

    const [account, setAccount] = useState({
        username: "",
        displayName: "",
        email: "",
        password: "",
        confirmPassword: "",
        profileImage: null,
    });

    const [error, setError] = useState("");
    const [warning, setWarning] = useState("");
    const [profileImagePreview, setProfileImagePreview] = useState("");

    const selectProfileImage = (file) => {
        setWarning("");

        setAccount((prev) => ({
            ...prev,
            profileImage: file,
        }));

        setProfileImagePreview(URL.createObjectURL(file));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAccount((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setWarning("");
        setSuccess("");

        if (account.password !== account.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("username", account.username);
            formData.append("display_name", account.displayName);
            formData.append("email", account.email);
            formData.append("password", account.password);

            if (account.profileImage) {
                formData.append("profileImage", account.profileImage);
            }

            const res = await fetch("/api/users", {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not create account.");
            }

            setSuccess(data.msg || "Account created. Please check your email to verify your account.");

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
                    {warning && <p className="login-error">{warning}</p>}
                    {success && <p className="login-success">{success}</p>}

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
                        <label htmlFor="displayName">
                            Display name:
                            <input
                                type="text"
                                id="displayName"
                                name="displayName"
                                autoComplete="name"
                                value={account.displayName}
                                onChange={handleChange}
                            />
                        </label>
                    </div>

                    <br />

                    <div className="field">
                        <label>Profile picture:</label>

                        {profileImagePreview && (
                            <img
                                src={profileImagePreview}
                                alt="Selected profile preview"
                                className="profile-image-preview"
                            />
                        )}

                        <ImagePicker
                            maxWidth={400}
                            maxHeight={400}
                            onSelect={selectProfileImage}
                        />

                        <CameraCapture
                            maxWidth={400}
                            maxHeight={400}
                            onSelect={selectProfileImage}
                            onWarning={setWarning}
                        />
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