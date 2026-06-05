import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";

export default function Header( {showNav = true}) {
    const navigate = useNavigate();
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);

        try {
            const res = await fetch("/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok && res.status !== 401) {
                throw new Error(`Logout failed: HTTP ${res.status}`);
            }

            setIsNavOpen(false);
            navigate("/login", { replace: true });
        } catch (err) {
            console.error("Failed to log out:", err);
            alert(err.message);
            setIsLoggingOut(false);
        }
    };

    return (
        <>
            <header className="Header">
                <div className="header-logo-container">
                    <img
                        src="/images/SoundGalore-logo.png"
                        alt="SoundGalore logo"
                        className="soundgalore-logo"
                    />
                </div>

                <a
                    className="App-link"
                    href="https://rwcunningham.github.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {' '} SoundGalore
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

                        <button
                            type="button"
                            className="logout-button"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                        >
                            {isLoggingOut ? "Logging off..." : "Log Off"}
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