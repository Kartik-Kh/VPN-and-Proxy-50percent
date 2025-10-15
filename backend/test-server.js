require('dotenv/config');
const express = require('express');

const app = express();
const port = process.env.PORT || 5000;

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(port, () => {
  console.log(`✅ Test server running on port ${port}`);
});
