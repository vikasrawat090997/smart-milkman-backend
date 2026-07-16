const bcrypt = require('bcrypt');

async function check() {
  const pin1 = '$2a$12$LIZVF8RzyX.YZ4tmbN8Rv.DRcH.6YwTOzNNe6Ulp332lbi9q/kY6S'; // Milkman
  const pin2 = '$2b$10$yTW7NO5Ap6AemTwqUEYrjeIYPXk4KvrxTmmmYo8H5jMyqbFIgzcFG'; // Customer

  const match1 = await bcrypt.compare('1234', pin1);
  const match2 = await bcrypt.compare('1234', pin2);

  console.log('Milkman pin is 1234:', match1);
  console.log('Customer pin is 1234:', match2);
}

check();
