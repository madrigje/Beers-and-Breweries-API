const express = require('express');
const app = express();
app.enable('trust proxy');

app.use('/', require('./index'));
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});