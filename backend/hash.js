const bcrypt = require('bcrypt');
// const password = 'faculty123'; // your actual plain password
// bcrypt.hash(password, 10).then(hash => console.log('Hashed password:', hash));
const password = 'admin123'; // your actual plain password
bcrypt.hash(password, 10).then(hash => console.log('Hashed password:', hash));
