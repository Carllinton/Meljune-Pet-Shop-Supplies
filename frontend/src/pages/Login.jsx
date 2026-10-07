import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import api from "../services/api";
import { saveAuth } from "../services/auth";

function Login() {
    const navigate = useNavigate();
    const location = useLocation();

    const [form, setForm] = useState({
        username: "",
        password: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        if (!form.username.trim() || !form.password) {
            setError("Please enter your username and password.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post("/auth/login", {
                username: form.username.trim(),
                password: form.password,
            });

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message || "Login failed."
                );
            }

            const { token, user } = response.data;

            saveAuth(token, user);

            // If the user was redirected to login from another page,
            // return them there. Otherwise go to Dashboard.
            const destination =
                location.state?.from?.pathname || "/dashboard";

            navigate(destination, {
                replace: true,
            });

        } catch (error) {
            console.error("Login error:", error);

            setError(
                error.response?.data?.message ||
                "Unable to log in. Please check your username and password."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">

                <div className="login-brand">
                    <h1>Meljune</h1>
                    <p>Pet Supplies</p>
                </div>

                <div className="login-heading">
                    <h2>Welcome back</h2>
                    <span>Sign in to continue to PawsStock</span>
                </div>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <div className="login-field">
                        <label htmlFor="username">
                            Username
                        </label>

                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={form.username}
                            onChange={handleChange}
                            placeholder="Enter your username"
                            autoComplete="username"
                            disabled={loading}
                            autoFocus
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="password">
                            Password
                        </label>

                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>

                </form>

                <div className="login-footer">
                    <span>Meljune Pet Supplies</span>
                    <span>•</span>
                    <span>PawsStock POS</span>
                </div>

            </div>
        </div>
    );
}

export default Login;