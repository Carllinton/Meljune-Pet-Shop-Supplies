const db = require("../config/database");

const getDashboard = async (req, res) => {
try {
const [[productStats]] = await db.query(`
SELECT
COUNT(*) AS total_products,
COALESCE(SUM(quantity), 0) AS total_stock,
COUNT(DISTINCT category_id) AS total_categories,

            COALESCE(
                SUM(
                    CASE
                        WHEN quantity = 0 THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS out_of_stock,

            COALESCE(
                SUM(
                    CASE
                        WHEN quantity > 0
                        AND quantity <= low_stock_threshold
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS low_stock,

            COALESCE(
                SUM(
                    CASE
                        WHEN expiration_date IS NOT NULL
                        AND expiration_date < CURDATE()
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS expired,

            COALESCE(
                SUM(
                    CASE
                        WHEN expiration_date IS NOT NULL
                        AND expiration_date BETWEEN
                            CURDATE()
                            AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                        THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS expiring_soon,

            COALESCE(
                SUM(quantity * price),
                0
            ) AS total_value

        FROM products
        WHERE status = 'active'
    `);

    const [categories] = await db.query(`
        SELECT
            c.name,
            c.color,
            COUNT(p.id) AS product_count,
            COALESCE(SUM(p.quantity), 0) AS total_qty
        FROM categories c
        LEFT JOIN products p
            ON p.category_id = c.id
            AND p.status = 'active'
        GROUP BY c.id
        ORDER BY product_count DESC
        LIMIT 8
    `);

    const [lowStock] = await db.query(`
        SELECT
            p.name,
            p.quantity,
            p.low_stock_threshold,
            c.name AS category,
            p.id
        FROM products p
        JOIN categories c
            ON c.id = p.category_id
        WHERE p.status = 'active'
          AND p.quantity <= p.low_stock_threshold
        ORDER BY p.quantity ASC
        LIMIT 8
    `);

    const [recentTransactions] = await db.query(`
        SELECT
            st.*,
            p.name AS product_name,
            a.full_name AS admin_name
        FROM stock_transactions st
        JOIN products p
            ON p.id = st.product_id
        JOIN admins a
            ON a.id = st.admin_id
        ORDER BY st.created_at DESC
        LIMIT 8
    `);

    /*
     * Monthly stock movement
     *
     * The previous query used:
     *
     * DATE_FORMAT(created_at, '%b %Y')
     *
     * while grouping by YEAR(created_at), MONTH(created_at).
     *
     * MySQL ONLY_FULL_GROUP_BY rejects that because
     * DATE_FORMAT(created_at) is not directly in GROUP BY.
     *
     * Using MIN(created_at) gives us one representative
     * date from each grouped month, which we then format.
     */
    const [monthly] = await db.query(`
        SELECT
            DATE_FORMAT(
                MIN(created_at),
                '%b %Y'
            ) AS month,

            SUM(
                CASE
                    WHEN transaction_type = 'stock_in'
                    THEN quantity
                    ELSE 0
                END
            ) AS stock_in,

            SUM(
                CASE
                    WHEN transaction_type = 'stock_out'
                    THEN quantity
                    ELSE 0
                END
            ) AS stock_out

        FROM stock_transactions

        WHERE created_at >= DATE_SUB(
            CURDATE(),
            INTERVAL 6 MONTH
        )

        GROUP BY
            YEAR(created_at),
            MONTH(created_at)

        ORDER BY
            YEAR(created_at),
            MONTH(created_at)
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
            categories: categories,
            low_stock: lowStock,
            recent_transactions: recentTransactions,
            monthly: monthly,
            customers: customerStats,
            sales: salesStats,
            suppliers: supplierStats
        }
    });

} catch (error) {
    console.error("Error fetching dashboard data:", error);

    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("SQL State:", error.sqlState);
    console.error("SQL Message:", error.sqlMessage);

    res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard data"
    });
}

};

module.exports = {
getDashboard
};
