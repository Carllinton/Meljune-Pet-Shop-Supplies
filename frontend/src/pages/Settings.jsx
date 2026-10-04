import { useEffect, useState } from "react";
import api from "../services/api";
import { getUser } from "../services/auth";

function Settings() {
    const user = getUser();
    const adminId = user?.id;

    const [profile, setProfile] = useState({
        full_name: "",
        email: "",
        username: "",
    });

    const [password, setPassword] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const response = await api.get(`/admins/${adminId}`);

            if (response.data.success) {
                setProfile(response.data.data);
            }
        } catch (error) {
            console.error("Failed to load profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (text, type) => {
        setMessage(text);
        setMessageType(type);

        setTimeout(() => {
            setMessage("");
            setMessageType("");
        }, 3000);
    };

    const handleProfileChange = (e) => {
        setProfile({
            ...profile,
            [e.target.name]: e.target.value,
        });
    };

    const handlePasswordChange = (e) => {
        setPassword({
            ...password,
            [e.target.name]: e.target.value,
        });
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await api.put(`/admins/${adminId}`, {
                full_name: profile.full_name,
                email: profile.email,
            });

            if (response.data.success) {
                showMessage("Profile updated!", "success");
            } else {
                showMessage(
                    response.data.message || "Failed to update profile.",
                    "error"
                );
            }
        } catch (error) {
            console.error("Profile update error:", error);

            showMessage(
                error.response?.data?.message ||
                    "Failed to update profile.",
                "error"
            );
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (password.new_password.length < 6) {
            showMessage(
                "New password must be at least 6 characters.",
                "error"
            );
            return;
        }

        if (password.new_password !== password.confirm_password) {
            showMessage("Passwords do not match.", "error");
            return;
        }

        try {
            const response = await api.put(`/admins/${adminId}/password`, {
                current_password: password.current_password,
                new_password: password.new_password,
            });

            if (response.data.success) {
                showMessage(
                    "Password changed successfully!",
                    "success"
                );

                setPassword({
                    current_password: "",
                    new_password: "",
                    confirm_password: "",
                });
            } else {
                showMessage(
                    response.data.message ||
                        "Failed to change password.",
                    "error"
                );
            }
        } catch (error) {
            console.error("Password change error:", error);

            showMessage(
                error.response?.data?.message ||
                    "Failed to change password.",
                "error"
            );
        }
    };

    if (loading) {
        return (
            <div className="page-content">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Settings</h1>
                        <p>Manage your account and preferences</p>
                    </div>
                </div>

                <div className="card">
                    <div className="card-body">
                        Loading settings...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Settings</h1>
                    <p>Manage your account and preferences</p>
                </div>
            </div>

            {message && (
                <div
                    className={
                        messageType === "success"
                            ? "alert alert-success"
                            : "alert alert-danger"
                    }
                >
                    {message}
                </div>
            )}

            <div
                className="grid-2"
                style={{ maxWidth: "900px" }}
            >
                {/* Profile */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">
                            Profile
                        </span>
                    </div>

                    <form onSubmit={handleProfileSubmit}>
                        <div className="card-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        className="form-control"
                                        value={profile.full_name}
                                        onChange={handleProfileChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="form-control"
                                        value={profile.email}
                                        onChange={handleProfileChange}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={profile.username}
                                        disabled
                                        style={{ opacity: 0.6 }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div
                            className="card-footer"
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                            >
                                Save Profile
                            </button>
                        </div>
                    </form>
                </div>

                {/* Change Password */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">
                            Change Password
                        </span>
                    </div>

                    <form onSubmit={handlePasswordSubmit}>
                        <div className="card-body">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        name="current_password"
                                        className="form-control"
                                        value={
                                            password.current_password
                                        }
                                        onChange={
                                            handlePasswordChange
                                        }
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        name="new_password"
                                        className="form-control"
                                        value={
                                            password.new_password
                                        }
                                        onChange={
                                            handlePasswordChange
                                        }
                                        minLength="6"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        name="confirm_password"
                                        className="form-control"
                                        value={
                                            password.confirm_password
                                        }
                                        onChange={
                                            handlePasswordChange
                                        }
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div
                            className="card-footer"
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                            }}
                        >
                            <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                            >
                                Change Password
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Settings;