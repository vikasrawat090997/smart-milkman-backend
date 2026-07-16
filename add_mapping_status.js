const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'smart_dhudhiya'
  });

  console.log('Connected to MySQL. Adding status columns to milkman_customers...');
  try {
    await connection.query('ALTER TABLE \`milkman_customers\` ADD COLUMN \`is_active\` tinyint NOT NULL DEFAULT 1;');
    console.log('is_active column added successfully!');
  } catch (err) {
    console.log('is_active column already exists or error:', err.message);
  }

  try {
    await connection.query('ALTER TABLE \`milkman_customers\` ADD COLUMN \`deactivated_at\` timestamp NULL DEFAULT NULL;');
    console.log('deactivated_at column added successfully!');
  } catch (err) {
    console.log('deactivated_at column already exists or error:', err.message);
  }
  await connection.end();
}

main().catch(console.error);
