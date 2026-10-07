import { useEffect, useState } from "react";
import api from "../services/api";
import { getUser } from "../services/auth";
import AdminUserManagement from "../components/AdminUserManagement";

const EMPTY_PASSWORD = {
    current_password: "",
    new_password: "",
    confirm_password: "",
};

function Settings() {
    const user = getUser();
    const adminId = user?.id;
    const [profile, setProfile] = useState({
        full_name: "",
        email: "",
        username: "",
    });
    const [password, setPassword] = useState(EMPTY_PASSWORD);
    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState("");
    const [message, setMessage] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const loadProfile = async () => {
            try {
                const response = await api.get(`/admins/${adminId}`);
                if (!response.data?.success) {
                    throw new Error(response.data?.message || "Failed to load profile.");
                }
                if (!cancelled) setProfile(response.data.data);
            } catch (error) {
                console.error("Failed to load profile:", error);
                if (!cancelled) {
                    setProfileError(
                        error.response?.data?.message ||
                            "Could not load your account details. Please refresh to try again."
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadProfile();
        return () => {
            cancelled = true;
        };
    }, [adminId]);

    const handleProfileChange = (event) => {
        const { name, value } = event.target;
        setProfile((current) => ({ ...current, [name]: value }));
    };

    const handlePasswordChange = (event) => {
        const { name, value } = event.target;
        setPassword((current) => ({ ...current, [name]: value }));
    };

    const handleProfileSubmit = async (event) => {
        event.preventDefault();
        setSavingProfile(true);
        setMessage(null);

        try {
            const response = await api.put(`/admins/${adminId}`, {
                full_name: profile.full_name.trim(),
                email: profile.email.trim(),
            });

            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to update profile.");
            }

            setProfile(response.data.data);
            setMessage({ type: "success", text: "Profile updated successfully." });
        } catch (error) {
            console.error("Profile update error:", error);
            setMessage({
                type: "error",
                text:
                    error.response?.data?.message ||
                    error.message ||
                    "Failed to update profile.",
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        setMessage(null);

        if (password.new_password.length < 6) {
            setMessage({
                type: "error",
                text: "New password must be at least 6 characters.",
            });
            return;
        }

        if (password.new_password !== password.confirm_password) {
            setMessage({ type: "error", text: "Passwords do not match." });
            return;
        }

        try {
            setSavingPassword(true);
            const response = await api.put(`/admins/${adminId}/password`, {
                current_password: password.current_password,
                new_password: password.new_password,
            });

            if (!response.data?.success) {
                throw new Error(response.data?.message || "Failed to change password.");
            }

            setPassword(EMPTY_PASSWORD);
            setMessage({ type: "success", text: "Password changed successfully." });
        } catch (error) {
            console.error("Password change error:", error);
            setMessage({
                type: "error",
                text:
                    error.response?.data?.message ||
                    error.message ||
                    "Failed to change password.",
            });
        } finally {
            setSavingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="page-content">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Settings</h1>
                        <p>Manage your account and user access</p>
                    </div>
                </div>
                <div className="card">
                    <div className="card-body">Loading settings…</div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content settings-page">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Settings</h1>
                    <p>Manage your profile, security, and user access</p>
                </div>
            </div>

            {message && (
                <div
                    className={message.type === "success" ? "alert alert-success" : "alert alert-danger"}
                    role="status"
                >
                    {message.text}
                </div>
            )}

            <div className="settings-account-grid">
                <section className="card">
                    <div className="card-header">
                        <div>
                            <span className="card-title">Profile</span>
                            <p className="text-muted text-sm">
                                Update your name and contact email.
                            </p>
                        </div>
                    </div>
                    {profileError ? (
                        <div className="card-body">
                            <div className="alert alert-danger" role="alert">
                                {profileError}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleProfileSubmit}>
                            <div className="card-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label htmlFor="profile-full-name">Full name</label>
                                        <input
                                            id="profile-full-name"
                                            type="text"
                                            name="full_name"
                                            className="form-control"
                                            value={profile.full_name || ""}
                                            onChange={handleProfileChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="profile-email">Email</label>
                                        <input
                                            id="profile-email"
                                            type="email"
                                            name="email"
                                            className="form-control"
                                            value={profile.email || ""}
                                            onChange={handleProfileChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="profile-username">Username</label>
                                        <input
                                            id="profile-username"
                                            type="text"
                                            className="form-control"
                                            value={profile.username || ""}
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer settings-form-footer">
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm"
                                    disabled={savingProfile}
                                >
                                    {savingProfile ? "Saving…" : "Save profile"}
                                </button>
                            </div>
                        </form>
                    )}
                </section>

                <section className="card">
                    <div className="card-header">
                        <div>
                            <span className="card-title">Change Password</span>
                            <p className="text-muted text-sm">
                                Use a password that is at least 6 characters.
                            </p>
                        </div>
                    </div>
                    <form onSubmit={handlePasswordSubmit}>
                        <div className="card-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="current-password">Current password</label>
                                    <input
                                        id="current-password"
                                        type="password"
                                        name="current_password"
                                        className="form-control"
                                        value={password.current_password}
                                        onChange={handlePasswordChange}
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="new-password">New password</label>
                                    <input
                                        id="new-password"
                                        type="password"
                                        name="new_password"
                                        className="form-control"
                                        value={password.new_password}
                                        onChange={handlePasswordChange}
                                        minLength="6"
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="confirm-password">Confirm new password</label>
                                    <input
                                        id="confirm-password"
                                        type="password"
                                        name="confirm_password"
                                        className="form-control"
                                        value={password.confirm_password}
                                        onChange={handlePasswordChange}
                                        minLength="6"
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="card-footer settings-form-footer">
                            <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                disabled={savingPassword}
                            >
                                {savingPassword ? "Updating…" : "Update password"}
                            </button>
                        </div>
                    </form>
                </section>
            </div>

            {user?.role === "admin" && <AdminUserManagement />}
        </div>
    );
}

export default Settings;
