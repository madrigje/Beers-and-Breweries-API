const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const json2html = require('node-json2html');
const path = require(`path`);

const app = express();
app.set('view engine', 'pug');
app.engine('pug', require('pug').__express);
app.use(bodyParser.urlencoded({ extended: true }));

const CLIENT_ID = 'INSERT HERE';
const CLIENT_SECRET = 'INSERT HERE';

/* ------------- Begin Login Model Functions ------------- */

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/index.html'));
});

/* ------------- End Login Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

app.post('/', function (req, res) {
    const email = req.body.email;
    const password = req.body.password;

    var signup = {
        method: 'POST',
        url: 'https://madrigje.auth0.com/dbconnections/signup',
        headers: { 'content-type': 'application/json' },
        body:
        {
            client_id: CLIENT_ID,
            email: email,
            password: password,
            connection: "Username-Password-Authentication"
        },
        json: true
    };
    request(signup, (error, response, body) => {
        if (error) {
            res.status(500).send(error);
        } else {
            var options = {
                method: 'POST',
                url: 'https://madrigje.auth0.com/oauth/token',
                headers: { 'content-type': 'application/json' },
                body:
                {
                    grant_type: 'password',
                    username: email,
                    password: password,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET
                },
                json: true
            };
            request(options, (error, response, body) => {
                if (error) {
                    res.status(500).send(error);
                } else {
                    res.render('index', {
                        title: 'User Info',
                        jwt: response.body.id_token
                    })
                }
            });
        }
    });
});

/* ------------- End Controller Functions ------------- */

module.exports = app;