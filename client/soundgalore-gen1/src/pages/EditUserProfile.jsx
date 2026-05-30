import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ImagePicker from "../components/ImagePicker";

export default function EditUserProfile() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        displayName: "",
        email: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        profileImage: null,
    });

    const [profileImagePreview, setProfileImagePreview] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [userId, setUserID] = useState("");

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const res = await fetch("/api/get_current_user", {
                    method: "GET",
                    credentials: "include",
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Could not load profile.");
                }

                setForm((prev) => ({
                    ...prev,
                    displayName: data.current_user_display_name || "",
                    email: data.current_user_email || "",
                }));

                setProfileImagePreview(data.current_user_profile_image_url || "");
                setUserID(data.current_user_id);
            } catch (err) {
                setError(err.message);
            }
        };

        fetchCurrentUser();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleProfileImageSelect = (file) => {
        setForm((prev) => ({ ...prev, profileImage: file }));

        if (file) {
            setProfileImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (form.newPassword !== form.confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        try {
            const formData = new FormData();

            formData.append("display_name", form.displayName);
            formData.append("email", form.email);
            formData.append("current_password", form.currentPassword);
            formData.append("new_password", form.newPassword);

            if (form.profileImage) {
                formData.append("profileImage", form.profileImage);
            }

            const res = await fetch("/api/users/me", {
                method: "PATCH",
                credentials: "include",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Could not update profile.");
            }

            setSuccess("Profile updated.");
            setForm((prev) => ({
                ...prev,
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
                profileImage: null,
            }));
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <main className="EditUserProfile">
            <Header />

            <section className="edit-profile-card">
                <h1>Edit Profile</h1>

                <form onSubmit={handleSubmit}>
                    {error && <p className="login-error">{error}</p>}
                    {success && <p className="profile-success">{success}</p>}

                    <div className="field">
                        <label htmlFor="displayName">
                            Display name:
                            <input
                                type="text"
                                id="displayName"
                                name="displayName"
                                value={form.displayName}
                                onChange={handleChange}
                            />
                        </label>
                    </div>

                    <div className="field">
                        <label htmlFor="email">
                            Email:
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </label>
                    </div>

                    <div className="field">
                        <label>Profile picture:</label>

                        {profileImagePreview && (
                            <img
                                className="edit-profile-preview"
                                src={profileImagePreview}
                                alt="Profile preview"
                            />
                        )}

                        <ImagePicker
                            maxWidth={400}
                            maxHeight={400}
                            onSelect={handleProfileImageSelect}
                        />
                    </div>

                    <hr />

                    <p className="edit-profile-note">
                        Leave password fields blank if you do not want to change your password.
                    </p>

                    <div className="field">
                        <label htmlFor="currentPassword">
                            Current password:
                            <input
                                type="password"
                                id="currentPassword"
                                name="currentPassword"
                                autoComplete="current-password"
                                value={form.currentPassword}
                                onChange={handleChange}
                            />
                        </label>
                    </div>

                    <div className="field">
                        <label htmlFor="newPassword">
                            New password:
                            <input
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                autoComplete="new-password"
                                value={form.newPassword}
                                onChange={handleChange}
                            />
                        </label>
                    </div>

                    <div className="field">
                        <label htmlFor="confirmPassword">
                            Confirm new password:
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                autoComplete="new-password"
                                value={form.confirmPassword}
                                onChange={handleChange}
                            />
                        </label>
                    </div>

                    <button type="submit">Save Changes</button>
                    <button
                        type="button"
                        disabled={!userId}
                        onClick={() => navigate(`/profile/${userId}`)}
                    >
                        Back to Profile
                    </button>
                </form>
            </section>
        </main>
    );
}