const db = require("../config/database");

const getDashboard = async (req, res) => {
    try {

        // =========================================
        // PRODUCT STATISTICS
        // =========================================

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
                                AND DATE_ADD(
                                    CURDATE(),
                                    INTERVAL 30 DAY
                                )
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


        // =========================================
        // CATEGORY STATISTICS
        // =========================================

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

            GROUP BY
                c.id,
                c.name,
                c.color

            ORDER BY product_count DESC

            LIMIT 8
        `);


        // =========================================
        // LOW STOCK PRODUCTS
        // =========================================

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


        // =========================================
        // RECENT STOCK TRANSACTIONS
        // =========================================

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


        // =========================================
        // MONTHLY STOCK MOVEMENT
        // =========================================

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


        // =========================================
        // CUSTOMER STATISTICS
        // =========================================

        const [[customerStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_customers

            FROM customers

            WHERE status = 'active'
        `);


        // =========================================
        // SALES SUMMARY
        // =========================================

        const [[salesSummary]] = await db.query(`
            SELECT

                COUNT(*) AS total_sales,

                COALESCE(
                    SUM(total),
                    0
                ) AS total_revenue,

                COALESCE(
                    AVG(total),
                    0
                ) AS average_sale

            FROM sales
        `);


        // =========================================
        // TODAY'S SALES
        // =========================================

        const [[todaySales]] = await db.query(`
            SELECT

                COUNT(*) AS sales_count,

                COALESCE(
                    SUM(total),
                    0
                ) AS revenue

            FROM sales

            WHERE DATE(created_at) = CURDATE()
        `);


        // =========================================
        // YEARLY SALES
        // =========================================

        const [yearlySales] = await db.query(`
            SELECT

                YEAR(created_at) AS period,

                COUNT(*) AS sales_count,

                COALESCE(
                    SUM(total),
                    0
                ) AS revenue

            FROM sales

            GROUP BY
                YEAR(created_at)

            ORDER BY
                YEAR(created_at)
        `);


        // =========================================
        // MONTHLY SALES
        // =========================================

        const [monthlySales] = await db.query(`
            SELECT

                DATE_FORMAT(
                    MIN(created_at),
                    '%Y-%m'
                ) AS period_key,

                DATE_FORMAT(
                    MIN(created_at),
                    '%b %Y'
                ) AS period,

                COUNT(*) AS sales_count,

                COALESCE(
                    SUM(total),
                    0
                ) AS revenue

            FROM sales

            GROUP BY
                YEAR(created_at),
                MONTH(created_at)

            ORDER BY
                YEAR(created_at),
                MONTH(created_at)
        `);


        // =========================================
        // WEEKLY SALES
        // =========================================

        const [weeklySales] = await db.query(`
            SELECT

                YEAR(MIN(created_at)) AS year,

                WEEK(
                    MIN(created_at),
                    1
                ) AS week,

                CONCAT(
                    'Week ',
                    WEEK(MIN(created_at), 1),
                    ' ',
                    YEAR(MIN(created_at))
                ) AS period,

                COUNT(*) AS sales_count,

                COALESCE(
                    SUM(total),
                    0
                ) AS revenue

            FROM sales

            GROUP BY
                YEAR(created_at),
                WEEK(created_at, 1)

            ORDER BY
                YEAR(created_at),
                WEEK(created_at, 1)
        `);


        // =========================================
        // DAILY SALES
        // =========================================

        const [dailySales] = await db.query(`
            SELECT

                DATE(MIN(created_at)) AS period_key,

                DATE_FORMAT(
                    MIN(created_at),
                    '%b %d, %Y'
                ) AS period,

                COUNT(*) AS sales_count,

                COALESCE(
                    SUM(total),
                    0
                ) AS revenue

            FROM sales

            GROUP BY
                DATE(created_at)

            ORDER BY
                DATE(created_at)
        `);


        // =========================================
        // TOP SELLING PRODUCTS
        // =========================================
        // sale_items does NOT have a subtotal column.
        // Revenue is calculated using quantity * unit_price.

        const [topProducts] = await db.query(`
            SELECT
                p.id,
                p.name,

                SUM(
                    si.quantity
                ) AS quantity_sold,

                COALESCE(
                    SUM(
                        si.quantity * si.unit_price
                    ),
                    0
                ) AS revenue

            FROM sale_items si

            INNER JOIN products p
                ON p.id = si.product_id

            GROUP BY
                p.id,
                p.name

            ORDER BY
                quantity_sold DESC,
                revenue DESC

            LIMIT 5
        `);


        // =========================================
        // SUPPLIER STATISTICS
        // =========================================

        const [[supplierStats]] = await db.query(`
            SELECT
                COUNT(*) AS total_suppliers

            FROM suppliers
        `);


        // =========================================
        // RESPONSE
        // =========================================

        res.json({
            success: true,

            data: {

                // PRODUCT DATA
                products: productStats,

                // CATEGORY DATA
                categories: categories,

                // LOW STOCK
                low_stock: lowStock,

                // RECENT INVENTORY TRANSACTIONS
                recent_transactions:
                    recentTransactions,

                // STOCK MOVEMENT
                monthly: monthly,

                // CUSTOMERS
                customers: customerStats,

                // =====================================
                // SALES ANALYTICS
                // =====================================

                sales: {

                    // Overall sales
                    total_sales:
                        salesSummary.total_sales,

                    total_revenue:
                        salesSummary.total_revenue,

                    average_sale:
                        salesSummary.average_sale,

                    // Today's sales
                    today_sales:
                        todaySales.sales_count,

                    today_revenue:
                        todaySales.revenue,

                    // Sales by period
                    yearly:
                        yearlySales,

                    monthly:
                        monthlySales,

                    weekly:
                        weeklySales,

                    daily:
                        dailySales,

                    // Top selling products
                    top_products:
                        topProducts
                },

                // SUPPLIERS
                suppliers: supplierStats
            }
        });

    } catch (error) {

        console.error(
            "Error fetching dashboard data:",
            error
        );

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Code:",
            error.code
        );

        console.error(
            "SQL State:",
            error.sqlState
        );

        console.error(
            "SQL Message:",
            error.sqlMessage
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch dashboard data"
        });
    }
};


module.exports = {
    getDashboard
};