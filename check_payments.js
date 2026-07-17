const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'smart_dhudhiya'
  });

  console.log('Users and parent relationships:');
  const [users] = await connection.query('SELECT id, name, role, parent_milkman_id FROM users;');
  console.log(JSON.stringify(users, null, 2));

  await connection.end();
}

main().catch(console.error);
