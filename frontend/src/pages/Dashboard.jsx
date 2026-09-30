import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Dashboard() {
    const navigate = useNavigate();
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        api.get("/dashboard")
            .then((response) => {
                if (!cancelled && response.data.success) {
                    setDashboard(response.data.data);
                }
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Error fetching dashboard:", err);
                setError("Failed to load dashboard data.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return <div className="page-container">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="page-container">{error}</div>;
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Welcome to Meljune Pet Supplies POS</p>
                </div>
            </div>

            <div className="dashboard-cards">

                <div className="dashboard-card">
                    <div className="card-icon">📦</div>

                    <div>
                        <p>Total Products</p>
                        <h2>{dashboard.products.total_products}</h2>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">📊</div>

                    <div>
                        <p>Total Stock</p>
                        <h2>{dashboard.products.total_stock}</h2>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">⚠️</div>

                    <div>
                        <p>Low Stock</p>
                        <h2>{dashboard.products.low_stock_products}</h2>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">👥</div>

                    <div>
                        <p>Customers</p>
                        <h2>{dashboard.customers.total_customers}</h2>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">🧾</div>

                    <div>
                        <p>Total Sales</p>
                        <h2>{dashboard.sales.total_sales}</h2>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">💰</div>

                    <div>
                        <p>Total Revenue</p>
                        <h2>
                            ₱{Number(dashboard.sales.total_revenue).toLocaleString(
                                "en-PH",
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                }
                            )}
                        </h2>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="card-icon">🚚</div>

                    <div>
                        <p>Suppliers</p>
                        <h2>{dashboard.suppliers.total_suppliers}</h2>
                    </div>
                </div>

            </div>

            <div className="dashboard-section">
                <h2>Quick Actions</h2>

                <div className="quick-actions">
                    <button
                        onClick={() => navigate("/pos")}
                    >
                        🛒 New Sale
                    </button>

                    <button
                        onClick={() => navigate("/products")}
                    >
                        📦 Manage Products
                    </button>

                    <button
                        onClick={() => navigate("/customers")}
                    >
                        👥 Customers
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;