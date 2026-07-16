const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'smart_dhudhiya'
  });

  console.log('Connected to MySQL. Adding deactivated_at column to users...');
  try {
    await connection.query('ALTER TABLE \`users\` ADD COLUMN \`deactivated_at\` timestamp NULL DEFAULT NULL;');
    console.log('Column added successfully!');
  } catch (err) {
    console.log('Column already exists or error occurred:', err.message);
  }
  await connection.end();
}

main().catch(console.error);
