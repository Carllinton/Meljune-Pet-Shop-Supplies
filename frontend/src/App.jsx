
import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";

import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import Inventory from "./pages/Inventory";
import AuditTrail from "./pages/AuditTrail";
import POS from "./pages/POS";
import Credit from "./pages/Credit";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* PUBLIC */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* PROTECTED APPLICATION */}
                <Route element={<ProtectedRoute />}>
                    <Route
                        path="/*"
                        element={
                            <div className="app-layout">
                                <Sidebar />

                                <main className="main-content">
                                    <Routes>
                                        <Route
                                            path="/"
                                            element={
                                                <Navigate
                                                    to="/dashboard"
                                                    replace
                                                />
                                            }
                                        />

                                        <Route
                                            path="/dashboard"
                                            element={<Dashboard />}
                                        />

                                        {/* Redirect old Products URL */}
                                        <Route
                                            path="/products"
                                            element={
                                                <Navigate
                                                    to="/inventory"
                                                    replace
                                                />
                                            }
                                        />

                                        <Route
                                            path="/inventory"
                                            element={<Inventory />}
                                        />

                                        <Route
                                            path="/categories"
                                            element={<Categories />}
                                        />

                                        <Route
                                            path="/suppliers"
                                            element={<Suppliers />}
                                        />

                                        <Route
                                            path="/pos"
                                            element={<POS />}
                                        />

                                        <Route
                                            path="/credit"
                                            element={<Credit />}
                                        />

                                        <Route
                                            path="/reports"
                                            element={<Reports />}
                                        />

                                        {/* ADMIN ONLY */}
                                        <Route
                                            element={
                                                <RoleRoute
                                                    allowedRoles={["admin"]}
                                                />
                                            }
                                        >
                                            <Route
                                                path="/audit-trail"
                                                element={<AuditTrail />}
                                            />

                                            <Route
                                                path="/settings"
                                                element={<Settings />}
                                            />
                                        </Route>

                                        {/* Unknown protected routes */}
                                        <Route
                                            path="*"
                                            element={
                                                <Navigate
                                                    to="/dashboard"
                                                    replace
                                                />
                                            }
                                        />
                                    </Routes>
                                </main>
                            </div>
                        }
                    />
                </Route>

                {/* FALLBACK */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
