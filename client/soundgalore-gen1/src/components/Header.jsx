import { useNavigate } from "react-router-dom";

export default function Header() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            const res = await fetch("/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok) {
                throw new Error(`Logout failed: HTTP ${res.status}`);
            }

            navigate("/login");
        } catch (err) {
            console.error("Failed to log out:", err);
        }
    };

    return (
        <header className="Header">
            <a
                className="App-link"
                href="https://rwcunningham.github.io/"
                target="_blank"
                rel="noopener noreferrer"
            >
                SoundGalore
            </a>

            <button onClick={handleLogout}>
                Log Off
            </button>
        </header>
    );
}