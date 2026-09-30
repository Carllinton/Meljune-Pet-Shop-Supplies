import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import POS from "./pages/POS";
import StockTransactions from "./pages/StockTransactions";
import Sales from "./pages/Sales";

function App() {
    return (
        <BrowserRouter>
            <div className="app-layout">
                <Sidebar />

                <main className="main-content">
                    <Routes>
                        <Route
                            path="/"
                            element={<Navigate to="/dashboard" />}
                        />

                        <Route
                            path="/dashboard"
                            element={<Dashboard />}
                        />

                        <Route
                            path="/products"
                            element={<Products />}
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
                            path="/customers"
                            element={<Customers />}
                        />

                        <Route
                            path="/pos"
                            element={<POS />}
                        />

                        <Route
                            path="/stock-transactions"
                            element={<StockTransactions />}
                        />

                        <Route
                            path="/sales"
                            element={<Sales />}
                        />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}

export default App;