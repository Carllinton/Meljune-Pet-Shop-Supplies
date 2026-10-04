import { NavLink, useNavigate } from "react-router-dom";
import { getUser, logout } from "../services/auth";

function Sidebar() {
    const navigate = useNavigate();
    const user = getUser();

    const isAdmin = user?.role === "admin";

    const menuItems = [
        {
            name: "Dashboard",
            path: "/dashboard",
            icon: "▦",
            roles: ["admin", "cashier"],
        },
        {
            name: "Products",
            path: "/products",
            icon: "▣",
            roles: ["admin", "cashier"],
        },
        {
            name: "Categories",
            path: "/categories",
            icon: "◈",
            roles: ["admin", "cashier"],
        },
        {
            name: "Suppliers",
            path: "/suppliers",
            icon: "♙",
            roles: ["admin", "cashier"],
        },
        {
            name: "Inventory",
            path: "/inventory",
            icon: "▤",
            roles: ["admin", "cashier"],
        },
        {
            name: "POS",
            path: "/pos",
            icon: "▥",
            roles: ["admin", "cashier"],
        },
        {
            name: "Credit",
            path: "/credit",
            icon: "₱",
            roles: ["admin", "cashier"],
        },
        {
            name: "Reports",
            path: "/reports",
            icon: "▥",
            roles: ["admin", "cashier"],
        },
        {
            name: "Settings",
            path: "/settings",
            icon: "⚙",
            roles: ["admin"],
        },
    ];

    const visibleItems = menuItems.filter((item) =>
        item.roles.includes(user?.role)
    );

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    // Get initials for avatar
    const displayName = user?.full_name || user?.username || "User";

    const initials = displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");

    return (
        <aside className="sidebar">

            {/* =================================================
                LOGO
                ================================================= */}

            <div className="sidebar-header">

                <div className="logo">

                    <div className="logo-icon">
                        🐾
                    </div>

                    <div className="logo-text">
                        <div className="logo-name">
                            Meljune's
                        </div>

                        <span className="logo-sub">
                            Pet Supplies
                        </span>
                    </div>

                </div>

            </div>


            {/* =================================================
                NAVIGATION
                ================================================= */}

            <nav className="sidebar-nav">

                <div className="nav-section-label">
                    MENU
                </div>

                {visibleItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            isActive
                                ? "nav-item active"
                                : "nav-item"
                        }
                    >
                        <span className="nav-icon">
                            {item.icon}
                        </span>

                        <span>
                            {item.name}
                        </span>
                    </NavLink>
                ))}

            </nav>


            {/* =================================================
                USER FOOTER
                ================================================= */}

            <div className="sidebar-footer">

                <div className="admin-avatar">
                    {initials}
                </div>

                <div className="admin-details">

                    <span className="admin-name">
                        {displayName}
                    </span>

                    <span className="admin-role">
                        {isAdmin ? "Administrator" : "Cashier / Staff"}
                    </span>

                </div>

                <button
                    type="button"
                    className="logout-btn"
                    onClick={handleLogout}
                    title="Logout"
                    aria-label="Logout"
                >
                    ↪
                </button>

            </div>

        </aside>
    );
}

export default Sidebar;