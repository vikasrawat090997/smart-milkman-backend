const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/Vikas_DEV/smart-dhudhiya/backend/.env' });

async function main() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DATABASE_URL || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'smart_dhudhiya'
    });
    console.log('Connected to MySQL DB:', process.env.DATABASE_URL);

    const [rates] = await connection.query('SELECT * FROM rates_history');
    console.log('All Rates History:');
    console.log(rates);

    await connection.end();
  } catch (err) {
    console.error('Error connecting or querying:', err);
  }
}

main();
