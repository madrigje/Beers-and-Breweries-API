const express = require('express');
const bodyParser = require('body-parser');
const json2html = require('node-json2html');
const router = express.Router();
const ds = require('./datastore');

let transform = {
    '<>': 'ul', 'html': [
        { '<>': 'li', 'title': 'id', 'html': '${id}' },
        { '<>': 'li', 'title': 'name', 'html': '${name}' },
        { '<>': 'li', 'title': 'style', 'html': '${style}' },
        { '<>': 'li', 'title': 'abv', 'html': '${abv}' },
        { '<>': 'li', 'title': 'self', 'html': '${self}' }
    ]
};

const datastore = ds.datastore;

const BREWERY = "brewery";
const BEER = "beer";

router.use(bodyParser.json());

/* ------------- Begin Boat Model Functions ------------- */

function post_beer(name, style, abv) {
    var key = datastore.key(BEER);
    const q = datastore.createQuery(BEER);
    var brewery = [];
    const new_beer = { "name": name, "style": style, "abv": abv, "brewery": brewery };

    return datastore.runQuery(q).then((entities) => {
        const includingID = entities[0].map(ds.fromDatastore)
        var i;
        var verify = 1;
        for (i = 0; i < includingID.length; i++) {
            if (name === includingID[i].name) {
                return verify;
            }
        }
        return datastore.save({ "key": key, "data": new_beer }).then(() => {
            return key;
        });
    });
}

function get_beers(req) {
    var q = datastore.createQuery(BEER).limit(5)
    var results = {};
    if (Object.keys(req.query).includes("cursor")) {
        q = q.start(req.query.cursor);
    }

    return datastore.runQuery(q).then((entities) => {
        results.beers = entities[0].map(ds.fromDatastore);
        if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
            var end = encodeURIComponent(entities[1].endCursor);
            results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + end;
        }
        results.total_count = entities[0].length;
        return results;
    });
}

function get_beer(id) {
    const key = datastore.key([BEER, parseInt(id, 10)]);
    const q = datastore.createQuery(BEER);

    return datastore.runQuery(q).then((entities) => {
        const includingID = entities[0].map(ds.fromDatastore)
        var i;
        var verify = 1;
        for (i = 0; i < includingID.length; i++) {
            if (id == includingID[i].id) {
                return includingID[i];
            }
            if (verify === 0) {
                return verify;
            }
        }

        return verify;
    });
}

// TODO: Must be able to transfer current beers
function edit_beer(id, name, style, abv) {
    const key = datastore.key([BEER, parseInt(id, 10)]);
    const q = datastore.createQuery(BEER);

    return datastore.runQuery(q).then((entities) => {
        const includingID = entities[0].map(ds.fromDatastore)
        var i;
        var verify = 1;
        for (i = 0; i < includingID.length; i++) {
            var k;
            for (k = 0; k < includingID.length; k++) {
                if (id === includingID[k].id) {
                    verify = 0;
                }
            }

            if (verify !== 0) {
                //Beer already exists
                return 1;
            }

            var j;
            for (j = 0; j < includingID.length; j++) {
                if (name === includingID[j].name) {
                    verify = 2;
                    if (id === includingID[j].id) {
                        verify = 0;
                        return datastore.get(key)
                            .then((beer) => {
                                if (name === 0) {
                                    name = beer[0].name;
                                }
                                if (style === 0) {
                                    style = beer[0].style
                                }
                                if (abv === 0) {
                                    abv = beer[0].abv
                                }
                                brewery = beer[0].brewery;
                                const new_beer = { "name": name, "style": style, "abv": abv, "brewery": brewery };
                                return datastore.save({ "key": key, "data": new_beer }).
                                    then(() => {
                                        return new_beer;
                                    })
                            });
                    }
                }
                if (verify === 2) {
                    return verify;
                }
            }
            if (id == includingID[i].id) {
                verify = 0;
                return datastore.get(key)
                    .then((beer) => {
                        if (name === 0) {
                            name = beer[0].name;
                        }
                        if (style === 0) {
                            style = beer[0].style
                        }
                        if (abv === 0) {
                            abv = beer[0].abv
                        }
                        brewery = beer[0].brewery;
                        const new_beer = { "name": name, "style": style, "abv": abv, "brewery": brewery };
                        return datastore.save({ "key": key, "data": new_beer }).
                            then(() => {
                                return new_beer;
                            })
                    });
            }
        }
        return verify;
    });
}

function delete_beer(beer_id) {
    const key = datastore.key([BEER, parseInt(beer_id, 10)]);
    const s = datastore.createQuery(BEER);

    return datastore.runQuery(s).then((entities) => {
        const includingID = entities[0].map(ds.fromDatastore)
        var i;
        var verify = 1;

        for (i = 0; i < includingID.length; i++) {
            if (beer_id == includingID[i].id) {
                if (includingID[i].brewery.length === 0) {
                    datastore.delete(key);
                    return 0;
                }
                var brew_id = includingID[i].brewery[0].id;
                const brew_key = datastore.key([BREWERY, parseInt(brew_id, 10)]);
                return datastore.get(brew_key)
                    .then((brew) => {
                        datastore.delete(key);
                        var spliceValue;
                        var length = brew[0].beers.length;
                        for (var i = 0; i < length; i++) {
                            if (brew[0].beers[i].id === beer_id) {
                                spliceValue = i;
                            }
                        }
                        var spliceValue2 = + 1;
                        brew[0].beers.splice(spliceValue, spliceValue2);
                        return datastore.save({ "key": brew_key, "data": brew[0] })
                    })
            }
        }
        return verify;
    });
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/', function (req, res) {
    get_beers(req)
        .then((beers) => {
            var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/';
            beers.beers.map(ds.addSelfBeer, self);
            res.status(200).json(beers);
        });
});

router.get('/:id', function (req, res) {
    get_beer(req.params.id)
        .then((verify) => {
            if (verify === 1) {
                return res.status(404).send(
                    '{ "Error": "No beer with this beer_id exists." }');
            }
            const accepts = req.accepts(['application/json', 'text/html']);
            if (!accepts) {
                res.status(406).send('{ "Error": "The server can only send JSON or HTML back to you." }');
            } else if (accepts === 'application/json') {
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
                var obj = { id: verify.id, name: verify.name, style: verify.style, abv: verify.abv, brewery: verify.brewery, self: self };
                res.status(200).json(obj);
            } else if (accepts === 'text/html') {
                // ACTION: Must add brewery here if I want to keep this.
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
                var obj = { id: verify.id, name: verify.name, style: verify.style, abv: verify.abv, self: self };
                const html = json2html.transform([obj], transform);
                res.status(200).send(html);
            }
        });
});

router.post('/', function (req, res) {

    if (Object.keys(req.body).length > 3) {
        return res.status(400).send('{ "Error": "Name, style, and abv are the only allowed attributes." }');
    }
    if ((req.get('content-type') !== 'application/json')) {
        return res.status(415).send(
            '{ "Error": "I’m sorry, we only accept JSON here." }');
    }

    if ((req.get('accept') !== 'application/json')) {
        return res.status(406).send(
            '{ "Error": "The server can only send JSON back to you." }');
    }
    if (req.body.name === undefined || req.body.style === undefined || req.body.abv === undefined) {
        return res.status(400).send(
            '{ "Error": "The request object is missing at least one of the required attributes." }');
    }

    // ACTION: Create proper validation functions. 
    var valName = ds.validateName(req.body.name);
    var valStyle = ds.validateName(req.body.style);
    var valABV = true;

    if (!valName || !valStyle || !valABV) {
        return res.status(400).send(
            '{ "Error": "One or more of the requested attributes are invalid." }');
    } else {

        post_beer(req.body.name, req.body.style, req.body.abv)
            .then((key) => {
                if (key === 1) {
                    return res.status(403).send('{ "Error": "Name requested already exists for another beer." }');
                }
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + key.id;
                var brewery = [];
                var obj = { id: key.id, name: req.body.name, style: req.body.style, abv: req.body.abv, brewery: brewery, self: self };
                res.location(self);
                res.status(201).json(obj);
            });
    }
});

router.patch('/:id', function (req, res) {

    var valName = true;
    var valStyle = true;
    var valABV = true;

    var id = req.body.id;
    var name = req.body.name;
    var style = req.body.style;
    var abv = req.body.abv;

    if (name === undefined) {
        name = 0;
    }
    if (style === undefined) {
        style = 0;
    }
    if (abv === undefined) {
        abv = 0;
    }
    if (id !== undefined) {
        return res.status(400).send(
            '{ "Error": "ID cannot be manipulated." }');
    }
    // Action: Ensure this error code is correct (PROBABLY NOT)
    if (Object.keys(req.body).length > 3) {
        return res.status(400).send('{ "Error": "Name requested already exists for another beer" }');
    }

    if ((req.get('content-type') !== 'application/json')) {
        return res.status(415).send(
            '{ "Error": "I’m sorry, we only accept JSON here." }');
    }

    if ((req.get('accept') !== 'application/json')) {
        return res.status(406).send(
            '{ "Error": "The server can only send JSON back to you." }');
    }

    if (req.body.name === undefined) {
        if (req.body.style === undefined) {
            if (req.body.abv === undefined) {
                return res.status(400).send(
                    '{ "Error": "Request object must contain at least one of the three beer attributes."}');
            } else {
                //ACTION
                //valABV = ds.validateABV(req.body.abv);
                valABV = true
            }
        } else {
            valStyle = ds.validateName(req.body.style);
            if (req.body.abv !== undefined) {
                //ACTION
                //valABV = ds.validateABV(req.body.abv);
                valABV = true
            }
        }
    } else if (req.body.style === undefined) {
        if (req.body.abv === undefined) {
            valName = ds.validateName(req.body.name);
        } else {
            valName = ds.validateName(req.body.name);
            //ACTION
            //valABV = ds.validateABV(req.body.abv);
            valABV = true
        }
    } else if (req.body.abv === undefined) {
        valName = ds.validateName(req.body.name);
        valStyle = ds.validateName(req.body.style);
    } else {
        valName = ds.validateName(req.body.name);
        valStyle = ds.validateName(req.body.style);
        //ACTION
        //valABV = ds.validateABV(req.body.abv);
        valABV = true
    }


    if (!valName || !valABV || !valStyle) {
        return res.status(400).send(
            '{ "Error": "One or more of the requested attributes are invalid." }');
    }


    edit_beer(req.params.id, name, style, abv)
        .then(verify => {
            if (verify === 1) {
                return res.status(404).send(
                    '{ "Error": "No beer with this beer_id exists"}');
            }
            if (verify === 2) {
                return res.status(403).send(
                    '{ "Error": "Name requested already exists for another beer." }');
            }
            //ACTION: Verify beers is good in this context. 
            var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
            var obj = { id: req.params.id, name: verify.name, style: verify.style, abv: verify.abv, brewery: verify.brewery, self: self };
            res.status(201).json(obj);
        });
});

// ADDED AND UPDATED
router.put('/:id', function (req, res) {

    var id = req.body.id;
    var name = req.body.name;
    var style = req.body.style;
    var abv = req.body.abv;

    if ((req.get('content-type') !== 'application/json')) {
        return res.status(415).send(
            '{ "Error": "I’m sorry, we only accept JSON here." }');
    }

    if ((req.get('accept') !== 'application/json')) {
        return res.status(406).send(
            '{ "Error": "The server can only send JSON back to you." }');
    }

    if (id !== undefined) {
        return res.status(400).send(
            '{ "Error": "ID cannot be manipulated." }');
    }

    if (name === undefined || style === undefined || abv === undefined) {
        return res.status(400).send(
            '{ "Error": "The request object is missing at least one of the required attributes." }');
    }

    if (Object.keys(req.body).length > 3) {
        return res.status(400).send('{ "Error": "Name, style, and abv are the only allowed attributes." }');
    }

    var valName = ds.validateName(req.body.name);
    var valStyle = ds.validateName(req.body.style);
    //ACTION
    //var valABV = ds.validateABV(req.body.abv);
    var valABV = true;

    if (!valName || !valStyle || !valABV) {
        return res.status(400).send(
            '{ "Error": "One or more of the requested attributes are invalid." }');
    } else {
        edit_beer(req.params.id, req.body.name, req.body.style, req.body.abv)
            .then(verify => {
                if (verify === 1) {
                    return res.status(404).send(
                        '{ "Error": "No beer with this beer_id exists"}');
                }
                if (verify === 2) {
                    return res.status(403).send(
                        '{ "Error": "Name requested already exists for another beer." }');
                }
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
                res.location(self);
                res.status(303).send(
                    '{ "Success": "Make a GET request to the location specified in the Location header of the response." }');
            });
    }
});

router.delete('/:id', function (req, res) {
    delete_beer(req.params.id).then((verify) => {
        if (verify === 1) {
            res.status(404).send(
                '{ "Error":  "No beer with this beer_id exists." }');
        }
        res.status(204).end()
    })
});

/* ------------- IMPROPER HTTP VERBS ------------- */
router.put('/', function (req, res) {
    res.set('Accept', 'GET, POST');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});

router.patch('/', function (req, res) {
    res.set('Accept', 'GET, POST');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});

router.delete('/', function (req, res) {
    res.set('Accept', 'GET, POST');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});

router.post('/:id', function (req, res) {
    res.set('Accept', 'GET, PUT, PATCH, DELETE');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});
/* ------------- IMPROPER HTTP VERBS ------------- */

/* ------------- End Controller Functions ------------- */

module.exports = router;