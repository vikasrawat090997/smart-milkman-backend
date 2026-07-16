const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'smart_dhudhiya'
  });

  console.log('Connected to MySQL. Dropping old table...');
  await connection.query('DROP TABLE IF EXISTS bill_locks;');

  console.log('Creating new bill_locks table with user_id column...');
  const createTableSql = `
    CREATE TABLE \`bill_locks\` (
      \`id\` varchar(36) NOT NULL,
      \`start_date\` date NOT NULL,
      \`end_date\` date NOT NULL,
      \`milkman_id\` varchar(36) DEFAULT NULL,
      \`user_id\` varchar(36) DEFAULT NULL,
      \`is_locked\` tinyint NOT NULL DEFAULT '0',
      \`locked_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      KEY \`FK_milkman_id_lock\` (\`milkman_id\`),
      KEY \`FK_user_id_lock\` (\`user_id\`),
      CONSTRAINT \`FK_milkman_id_lock\` FOREIGN KEY (\`milkman_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_user_id_lock\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;
  await connection.query(createTableSql);

  console.log('Table structure successfully created with user_id column!');
  await connection.end();
}

main().catch(console.error);
