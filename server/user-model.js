const fs = require('fs');
const path = require('path');

const users = JSON.parse(fs.readFileSync('data/users.json', 'utf8'));

module.exports = users;