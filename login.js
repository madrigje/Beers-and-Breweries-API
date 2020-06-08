const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
var jwt_decode = require('jwt-decode');
const path = require(`path`);
const ds = require('./datastore');
const datastore = ds.datastore;
const USER = "user";

const app = express();
app.enable('trust proxy');
app.set('view engine', 'pug');
app.engine('pug', require('pug').__express);
app.use(bodyParser.urlencoded({ extended: true }));

const CLIENT_ID = 'kg0suZe84HlWta8jacu0xPbcfyXoP6qp';
const CLIENT_SECRET = '1oTglLRa1WXPsPCXyl2h2oUGevENC9vgpYKOE_h43-gLHF22kJOZjuyFYb3rZV5g';

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
                    var token = response.body.id_token;
                    var decoded;
                    if (response.body.id_token) {
                        var token = response.body.id_token;
                        decoded = jwt_decode(token);
                        var verify = 1;

                        var key = datastore.key(USER);
                        const q = datastore.createQuery(USER);

                        datastore.runQuery(q).then((entities) => {
                            const includingID = entities[0].map(ds.fromDatastore)
                            var i;
                            for(i=0; i < includingID.length; i++) {
                                if (decoded.sub == includingID[i].unique_id) {
                                    verify = 0;
                                }
                            }
                            if(verify === 1) {
                                const new_user = { "unique_id": decoded.sub };
                                datastore.save({ "key": key, "data": new_user });
                            } 
                        });
                    }
                    if(!decoded) {
                        res.render('index', {
                            title: 'User Info',
                            jwt: response.body.id_token,
                            sub: 'Invalid Login'
                        })
                    } else {
                        res.render('index', {
                            title: 'User Info',
                            jwt: response.body.id_token,
                            sub: decoded.sub
                        })
                    }
                }
            });
        }
    });
});

/* ------------- End Controller Functions ------------- */

module.exports = app;