const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'd:/Vikas_DEV/smart-dhudhiya/backend/.env' });

async function main() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'smart_dhudhiya'
    });
    console.log('Connected to MySQL DB');

    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS parent_milkman_id VARCHAR(36) NULL;
    `);
    console.log('Added parent_milkman_id column successfully');

    await connection.end();
  } catch (err) {
    console.error('Migration error:', err);
  }
}

main();
