const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('FleetOS server is running');
});

module.exports = app;
