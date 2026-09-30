const db = require("../config/database");

const getSaleItems = async (req, res) => {
    try {
        const [saleItems] = await db.query(`
            SELECT
                si.id,
                si.sale_id,
                si.product_id,
                p.product_code,
                p.name AS product_name,
                si.quantity,
                si.unit_price,
                si.subtotal
            FROM sale_items si
            INNER JOIN products p
                ON si.product_id = p.id
            ORDER BY si.id DESC
        `);

        res.json({
            success: true,
            data: saleItems
        });

    } catch (error) {
        console.error("Error fetching sale items:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch sale items"
        });
    }
};

const getSaleItemsBySaleId = async (req, res) => {
    try {
        const { saleId } = req.params;

        const [saleItems] = await db.query(`
            SELECT
                si.id,
                si.sale_id,
                si.product_id,
                p.product_code,
                p.name AS product_name,
                si.quantity,
                si.unit_price,
                si.subtotal
            FROM sale_items si
            INNER JOIN products p
                ON si.product_id = p.id
            WHERE si.sale_id = ?
            ORDER BY si.id ASC
        `, [saleId]);

        res.json({
            success: true,
            data: saleItems
        });

    } catch (error) {
        console.error("Error fetching sale items:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch sale items"
        });
    }
};

module.exports = {
    getSaleItems,
    getSaleItemsBySaleId
};