const router = module.exports = require('express').Router();

router.use('/boats', require('./boats'));
router.use('/loads', require('./loads'));
router.use('/login', require('./login'));
router.use('/owners', require('./owners'));