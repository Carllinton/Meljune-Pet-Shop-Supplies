import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getUser, logout } from "../services/auth";
import categoriesIcon from "../assets/icons/categories.png";
import creditsIcon from "../assets/icons/credits.png";
import dashboardIcon from "../assets/icons/dashboard.png";
import inventoryIcon from "../assets/icons/inventory.png";
import posIcon from "../assets/icons/POS.png";
import productsIcon from "../assets/icons/products.png";
import reportIcon from "../assets/icons/report.png";
import settingsIcon from "../assets/icons/settings.png";
import suppliersIcon from "../assets/icons/suppliers.png";

function Sidebar() {
    const navigate = useNavigate();
    const user = getUser();
    const [isDark, setIsDark] = useState(
        () => document.documentElement.dataset.theme === "dark"
    );

    const isAdmin = user?.role === "admin";

    const menuItems = [
        {
            name: "Dashboard",
            path: "/dashboard",
            icon: dashboardIcon,
            roles: ["admin", "cashier"],
        },
        {
            name: "Products",
            path: "/products",
            icon: productsIcon,
            roles: ["admin", "cashier"],
        },
        {
            name: "Categories",
            path: "/categories",
            icon: categoriesIcon,
            roles: ["admin", "cashier"],
        },
        {
            name: "Suppliers",
            path: "/suppliers",
            icon: suppliersIcon,
            roles: ["admin", "cashier"],
        },
        {
            name: "Inventory",
            path: "/inventory",
            icon: inventoryIcon,
            roles: ["admin", "cashier"],
        },
        {
            name: "POS",
            path: "/pos",
            icon: posIcon,
            roles: ["admin", "cashier"],
        },
        {
            name: "Credit",
            path: "/credit",
            icon: creditsIcon,
            roles: ["admin", "cashier"],
        },
        {
            name: "Reports",
            path: "/reports",
            icon: reportIcon,
            roles: ["admin", "cashier"],
        },
        {
            name: "Settings",
            path: "/settings",
            icon: settingsIcon,
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

    const toggleTheme = () => {
        const nextTheme = isDark ? "light" : "dark";
        document.documentElement.dataset.theme = nextTheme;
        localStorage.setItem("pawsstock_theme", nextTheme);
        setIsDark(nextTheme === "dark");
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

                    <div className="logo-text">
                        <div className="logo-name">
                            Meljune's
                        </div>

                        <span className="logo-sub">
                            Pet Supplies
                        </span>
                    </div>

                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
                        aria-pressed={isDark}
                        title={`Switch to ${isDark ? "light" : "dark"} mode`}
                    >
                        <span aria-hidden="true">{isDark ? "☀" : "☾"}</span>
                    </button>

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
                        <img
                            src={item.icon}
                            alt=""
                            aria-hidden="true"
                        />
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
                    aria-label="Logout"
                >
                    <img
                        src="/assets/icons/logout.png"
                        alt="Logout"
                        className="logout-icon"
                    />
                </button>

            </div>

        </aside>
    );
}

export default Sidebar;