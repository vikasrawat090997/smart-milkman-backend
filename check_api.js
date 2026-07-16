async function main() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobileNumber: '9876543210',
        passwordPin: '1234'
      })
    });
    if (!loginRes.ok) {
      console.error('Login failed:', await loginRes.text());
      return;
    }
    const { accessToken } = await loginRes.json();
    console.log('Login successful! AccessToken retrieved.');

    // 2. Fetch users
    const usersRes = await fetch('http://localhost:3001/api/users', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (!usersRes.ok) {
      console.error('Fetch users failed:', await usersRes.text());
      return;
    }
    const users = await usersRes.json();
    const vikas = users.find(u => u.name.includes('Vikas'));
    console.log('Vikas Kumar User Data from API:');
    console.log(JSON.stringify(vikas, null, 2));

  } catch (err) {
    console.error('API Test Error:', err.message);
  }
}

main();
