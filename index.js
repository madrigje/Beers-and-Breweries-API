const router = module.exports = require('express').Router();

router.use('/breweries', require('./breweries'));
router.use('/beers', require('./beers'));
router.use('/login', require('./login'));
router.use('/owners', require('./owners'));