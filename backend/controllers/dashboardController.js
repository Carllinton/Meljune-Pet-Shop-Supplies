const db = require("../config/database");

const getDashboard = async (req, res) => {
    try {
        const [[productStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_products,
                COALESCE(SUM(quantity), 0) AS total_stock,
                SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS low_stock_products
            FROM products
            WHERE status = 'active'
        `);

        const [[customerStats]] = await db.query(`
            SELECT COUNT(*) AS total_customers
            FROM customers
            WHERE status = 'active'
        `);

        const [[salesStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_sales,
                COALESCE(SUM(total), 0) AS total_revenue
            FROM sales
        `);

        const [[supplierStats]] = await db.query(`
            SELECT COUNT(*) AS total_suppliers
            FROM suppliers
        `);

        res.json({
            success: true,
            data: {
                products: productStats,
                customers: customerStats,
                sales: salesStats,
                suppliers: supplierStats
            }
        });

    } catch (error) {
        console.error("Error fetching dashboard data:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard data"
        });
    }
};

module.exports = {
    getDashboard
};