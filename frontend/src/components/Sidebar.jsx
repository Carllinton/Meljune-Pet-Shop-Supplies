import { NavLink } from "react-router-dom";

function Sidebar() {
    const menuItems = [
        { name: "Dashboard", path: "/dashboard" },
        { name: "Products", path: "/products" },
        { name: "Categories", path: "/categories" },
        { name: "Suppliers", path: "/suppliers" },
        { name: "Inventory", path: "/inventory" },
        { name: "POS", path: "/pos" },
        { name: "Credit", path: "/credit" },
        { name: "Reports", path: "/reports" },
        { name: "Settings", path: "/settings" },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h2>Meljune</h2>
                <span>Pet Supplies</span>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            isActive ? "nav-link active" : "nav-link"
                        }
                    >
                        {item.name}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;