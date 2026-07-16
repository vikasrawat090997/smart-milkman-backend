const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_dhudhiya'
  });

  try {
    const [users] = await connection.query("SELECT * FROM users WHERE mobile_number = '9876543210'");
    console.log('\n--- USERS FOR 9876543210 ---');
    console.log(users);
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

main();
