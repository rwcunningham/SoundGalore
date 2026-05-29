import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";

export default function Header( {showNav = true}) {
    const navigate = useNavigate();
    const [isNavOpen, setIsNavOpen] = useState(false);

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
        <>
            <header className="Header">
                <a
                    className="App-link"
                    href="https://rwcunningham.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    SoundGalore
                </a>

                {showNav && (
                    <>
                        <button
                            className="hamburger-button"
                            onClick={() => setIsNavOpen(prev => !prev)}
                            aria-label="Toggle navigation menu"
                        >
                            ☰
                        </button>

                        <button onClick={handleLogout}>
                            Log Off
                        </button>
                    </>
                )}
            </header>

            {showNav && (
                <div className={`nav-slide-down ${isNavOpen ? "open" : ""}`}>
                    <NavBar />
                </div>
            )}
        </>
    );
}