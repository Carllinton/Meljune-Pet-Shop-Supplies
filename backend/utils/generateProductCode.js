const db = require("../config/database");

async function generateProductCode(connection) {
  const [rows] = await connection.execute(
    `SELECT product_code
     FROM products
     WHERE product_code REGEXP '^RALH-[0-9]+$'
     ORDER BY CAST(SUBSTRING(product_code, 6) AS UNSIGNED) DESC
     LIMIT 1
     FOR UPDATE`
  );

  const lastNumber = rows.length
    ? parseInt(rows[0].product_code.substring(5), 10)
    : 0;

  return `RALH-${String(lastNumber + 1).padStart(4, "0")}`;
}

module.exports = generateProductCode;