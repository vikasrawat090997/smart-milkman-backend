const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'smart_dhudhiya'
  });

  console.log('Connected to MySQL. Creating daily_ledger_edit_history table...');
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`daily_ledger_edit_history\` (
        \`id\` varchar(36) NOT NULL,
        \`ledger_id\` varchar(36) NOT NULL,
        \`old_quantity\` decimal(10,2) NOT NULL,
        \`new_quantity\` decimal(10,2) NOT NULL,
        \`old_rate\` decimal(10,2) NOT NULL,
        \`new_rate\` decimal(10,2) NOT NULL,
        \`edited_by\` varchar(36) NOT NULL,
        \`edited_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        KEY \`FK_ledger_id\` (\`ledger_id\`),
        CONSTRAINT \`FK_ledger_id\` FOREIGN KEY (\`ledger_id\`) REFERENCES \`daily_ledger\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table created successfully!');
  } catch (err) {
    console.log('Table already exists or error occurred:', err.message);
  }
  await connection.end();
}

main().catch(console.error);
