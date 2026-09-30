const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./config/database");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const customerRoutes = require("./routes/customerRoutes");
const saleRoutes = require("./routes/saleRoutes");
const saleItemRoutes = require("./routes/saleItemRoutes");
const creditTransactionRoutes = require("./routes/creditTransactionRoutes");
const stockTransactionRoutes = require("./routes/stockTransactionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");




const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "POS Backend API is running!"
    });
});

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/sale-items", saleItemRoutes);
app.use("/api/credit-transactions", creditTransactionRoutes);
app.use("/api/stock-transactions", stockTransactionRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/dashboard", dashboardRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Meljune Pet Supplies Server running on http://localhost:${PORT}`);
});