import {useNavigate} from "react-router-dom";
import React, {useState, useRef} from "react";
import Header from "../components/Header";

export default function Login(){
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({username:"", password:""});
    const [error, setError] = useState("");


    const handleChange = (e) =>
    {
        const {name, value} = e.target;
        setCredentials((prev)=>({...prev, [name]:value}));
    }

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        //const {username, password} = credentials;
        try{
            const res = await fetch('/auth/login', {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                credentials:"include",
                body: JSON.stringify(credentials)});
        

            if (!res.ok){
                const error = await res.json();
                throw new Error(error || "Unknown error");
            }

            // const {token} = await res.json();
            navigate("/UserFeed");
        }
        catch (err){
            setError(err.message);
        }




    }

    return(
    <>
        <main className="login-page">
            <Header/>
            <section className="login-card">
                <form onSubmit={handleSubmit}>
                    <div className="field">
                        <label htmlFor="username">
                            Username:
                            <input type="text" autocomplete="username" id="username" name="username" onChange={handleChange} value={credentials.username} required/>
                        </label>
                    </div>
                        <br/>
                    <div className="field">
                        <label htmlFor="password">
                            Password:
                            <input type="password" id="password" name="password" onChange={handleChange} value={credentials.password} required/>
                        </label>
                    </div>
                    <br/>
                    <button type="submit">Sign In</button>
                </form>   
            </section>
        </main>
    </>
    )
}