const express = require('express');
const bodyParser = require('body-parser');
const json2html = require('node-json2html');
const router = express.Router();
const ds = require('./datastore');

// ACTION: Should add beer capabilites OR just remove this. 
let transform = {
    '<>': 'ul', 'html': [
        { '<>': 'li', 'title': 'id', 'html': '${id}' },
        { '<>': 'li', 'title': 'name', 'html': '${name}' },
        { '<>': 'li', 'title': 'city', 'html': '${city}' },
        { '<>': 'li', 'title': 'state', 'html': '${state}' },
        { '<>': 'li', 'title': 'self', 'html': '${self}' }
    ]
};

const datastore = ds.datastore;

const BREWERY = "brewery";
const BEER = "beer";

router.use(bodyParser.json());

/* ------------- Begin Brewery Model Functions ------------- */

// UPDATED
function post_brewery(name, city, state) {
    var key = datastore.key(BREWERY);
    const q = datastore.createQuery(BREWERY);
    var beers = [];
    const new_brewery = { "name": name, "city": city, "state": state, "beers": beers };

    return datastore.runQuery(q).then((entities) => {
        const includingID = entities[0].map(ds.fromDatastore)
        var i;
        var verify = 1;
        for (i = 0; i < includingID.length; i++) {
            if (name === includingID[i].name) {
                return verify;
            }
        }
        return datastore.save({ "key": key, "data": new_brewery }).then(() => {
            return key;
        });
    });
}

// NO CHANGES YET
function get_breweries(req) {
    var q = datastore.createQuery(BREWERY).limit(5);
    var results = {};
    if (Object.keys(req.query).includes("cursor")) {
        q = q.start(req.query.cursor);
    }

    return datastore.runQuery(q).then((entities) => {
        results.breweries = entities[0].map(ds.fromDatastore);
        if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
            var end = encodeURIComponent(entities[1].endCursor);
            results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + end;
        }
        results.total_count = entities[0].length;
        return results;
    });
}

// NO CHANGES
function get_brewery(id) {
    const key = datastore.key([BREWERY, parseInt(id, 10)]);
    const q = datastore.createQuery(BREWERY);

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
function edit_brewery(id, name, city, state) {
    const key = datastore.key([BREWERY, parseInt(id, 10)]);
    const q = datastore.createQuery(BREWERY);

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
                //Brewery already exists
                return 1;
            }

            var j;
            for (j = 0; j < includingID.length; j++) {
                if (name === includingID[j].name) {
                    verify = 2;
                    if (id === includingID[j].id) {
                        verify = 0;
                        return datastore.get(key)
                            .then((brewery) => {
                                if (name === 0) {
                                    name = brewery[0].name;
                                }
                                if (city === 0) {
                                    city = brewery[0].city
                                }
                                if (state === 0) {
                                    state = brewery[0].state
                                }
                                beers = brewery[0].beers;
                                const new_brewery = { "name": name, "city": city, "state": state, "beers": beers };
                                return datastore.save({ "key": key, "data": new_brewery }).
                                    then(() => {
                                        return new_brewery;
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
                    .then((brewery) => {
                        if (name === 0) {
                            name = brewery[0].name;
                        }
                        if (city === 0) {
                            city = brewery[0].city
                        }
                        if (state === 0) {
                            state = brewery[0].state
                        }
                        beers = brewery[0].beers;
                        const new_brewery = { "name": name, "city": city, "state": state, "beers": beers };
                        return datastore.save({ "key": key, "data": new_brewery }).
                            then(() => {
                                return new_brewery;
                            })
                    });
            }
        }
        return verify;
    });
}

function add_beer_to_brewery(brew_id, beer_id, req) {
    // Verify starts at 404 error
    var verify = 1;
    const b = datastore.createQuery(BREWERY);
    const s = datastore.createQuery(BEER);
    var brewName;

    return datastore.runQuery(b).then((entities) => {


        const brewIncludingID = entities[0].map(ds.fromDatastore)
        var i;
        for (i = 0; i < brewIncludingID.length; i++) {
            if (brew_id == brewIncludingID[i].id) {
                verify = 3;
                brewName = brewIncludingID[i].name;
            }
        }


        return datastore.runQuery(s).then((entities) => {
            const includingID = entities[0].map(ds.fromDatastore)
            var i;

            if (verify === 1) {
                //Brewery does not exist; return 1
                verify = 1;
                return verify;
            }
            // Reset this back to one. Already confirmed brewery exists
            verify = 1;
            //Verify that the beer exists
            for (i = 0; i < includingID.length; i++) {
                if (beer_id == includingID[i].id) {
                    verify = 3;
                }
            }

            // Well, we now know that the beer doesnt exist
            if (verify === 1) { return verify; }

            // Find out if this beer is on another brewery.
            for (i = 0; i < includingID.length; i++) {
                if (includingID[i].id === beer_id) {
                    if (includingID[i].brewery[0] === undefined) {
                        break;
                    } else {
                        return 0;
                    }
                }
            }


            var results = {};
            var self;
            for (i = 0; i < includingID.length; i++) {
                if (beer_id == includingID[i].id) {
                    self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + brew_id;
                    results.self = self;
                    results.name = brewName;
                }
            }

            var beerResults = {};
            var selfBeers = req.protocol + '://' + req.get("host") + '/beers/' + beer_id;
            beerResults.self = selfBeers;
            
            // ACTION: Check for name change here. 
            for (i = 0; i < includingID.length; i++) {
                if (beer_id == includingID[i].id) {
                    self = req.protocol + '://' + req.get("host") + '/breweries/' + brew_id;
                    results.self = self;
                    results.name = brewName;
                    beerResults.beers = includingID[i].beers;
                    beerResults.city = includingID[i].city;
                    beerResults.state = includingID[i].state;
                }
            }

            const beer_key = datastore.key([BEER, parseInt(beer_id, 10)]);
            const brew_key = datastore.key([BREWERY, parseInt(brew_id, 10)]);
            return datastore.get(beer_key)
                .then((beer) => {
                    if (typeof (beer[0].brewery) === 'undefined') {
                        beer[0].brewery = [];
                    }
                    results.id = brew_id;
                    beer[0].brewery.push(results);
                    return datastore.save({ "key": beer_key, "data": beer[0] })
                        .then(() => {
                            return datastore.get(brew_key)
                                .then((brew) => {
                                    if (typeof (brew[0].beers) === 'undefined') {
                                        brew[0].beers = [];
                                    }
                                    beerResults.id = beer_id;
                                    //beerResults.name = 
                                    brew[0].beers.push(beerResults);
                                    return datastore.save({ "key": brew_key, "data": brew[0] });
                                })
                        })
                })
        });
    });
}

function remove_beer_from_brewery(brew_id, beer_id, req) {
    // Verify starts at 404 error
    var verify = 1;
    const b = datastore.createQuery(BREWERY);
    const s = datastore.createQuery(BEER);

    return datastore.runQuery(b).then((entities) => {

        const brewIncludingID = entities[0].map(ds.fromDatastore)
        var i;
        //Verify brewery is valid.
        for (i = 0; i < brewIncludingID.length; i++) {
            if (brew_id == brewIncludingID[i].id) {
                verify = 3;
            }
        }

        if (verify === 1) {
            //brewery does not exist; return 1
            verify = 1;
            return verify;
        }

        verify = 1;

        for (i = 0; i < brewIncludingID.length; i++) {
            if (brew_id === brewIncludingID[i].id) {
                //verify that beer is produced at brewery
                for (var j = 0; j < brewIncludingID[i].beers.length; j++) {
                    if (brewIncludingID[i].beers[j].id === beer_id) {
                        verify = 3
                    }
                }
            }
        }

        if (verify === 1) {
            //beer is not produced at the brewery; return 1
            verify = 1;
            return verify;
        }

        const brew_key = datastore.key([BREWERY, parseInt(brew_id, 10)]);
        const beer_key = datastore.key([BEER, parseInt(beer_id, 10)]);

        return datastore.get(brew_key)
            .then((brew) => {
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
                    .then(() => {
                        return datastore.get(beer_key)
                            .then((beer) => {
                                beer[0].brewery.splice(0, 1);
                                return datastore.save({ "key": beer_key, "data": beer[0] })

                            })

                    })
            })
    })

}

// NO CHANGES
function delete_brewery(id) {
    const brew_key = datastore.key([BREWERY, parseInt(id, 10)]);
    const q = datastore.createQuery(BREWERY);
    const s = datastore.createQuery(BEER);

    var arrayOfBeers = [];

    return datastore.runQuery(q).then((entities) => {
        const includingID = entities[0].map(ds.fromDatastore)
        var i;
        var verify = 1;
        for (i = 0; i < includingID.length; i++) {
            if (id == includingID[i].id) {
                return datastore.get(brew_key)
                    .then((brew) => {
                        var length = brew[0].beers.length;
                        for (var i = 0; i < length; i++) {
                            arrayOfBeers.push(brew[0].beers[i].id);
                        }
                        datastore.delete(brew_key);

                        return datastore.runQuery(s).then((entities) => {
                            for (var i = 0; i < arrayOfBeers.length; i++) {
                                var count = arrayOfBeers[i];
                                ds.getKey(count)
                                    .then((beer) => {
                                        datastore.save(beer);
                                    })
                            }
                        })
                    })
            }
        }

        return verify;
    });
}

function get_brewery_beers(brew_id) {
    const key = datastore.key([BREWERY, parseInt(brew_id, 10)]);
    return datastore.get(key)
        .then((brew) => {
            return brew[0].beers;
        })
}

/* ------------- End Brewery Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

// NO CHANGES YET
router.get('/', function (req, res) {
    // Change breweries here. 
    get_breweries(req)
        .then((breweries) => {
            // ACTION: breweries.breweries might not work here
            var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/';
            breweries.breweries.map(ds.addSelf, self);
            res.status(200).json(breweries);
        });
});

router.get('/:brew_id/beers', function (req, res) {
    get_brewery_beers(req.params.brew_id)
        .then((beers) => {
            res.status(200).json(beers);
        });
});

// UPDATED
router.get('/:id', function (req, res) {
    get_brewery(req.params.id)
        .then((verify) => {
            if (verify === 1) {
                return res.status(404).send(
                    '{ "Error": "No brewery with this brewery_id exists." }');
            }
            const accepts = req.accepts(['application/json', 'text/html']);
            if (!accepts) {
                res.status(406).send('{ "Error": "The server can only send JSON or HTML back to you." }');
            } else if (accepts === 'application/json') {
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
                var obj = { id: verify.id, name: verify.name, city: verify.city, state: verify.state, beers: verify.beers, self: self };
                res.status(200).json(obj);
            } else if (accepts === 'text/html') {
                // ACTION: Must add beers here if I want to keep this.
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
                var obj = { id: verify.id, name: verify.name, city: verify.city, state: verify.state, self: self };
                const html = json2html.transform([obj], transform);
                res.status(200).send(html);
            }
        });
});

// UPDATED
router.post('/', function (req, res) {

    if (Object.keys(req.body).length > 3) {
        return res.status(400).send('{ "Error": "Name, city and state are the only allowed attributes." }');
    }
    if ((req.get('content-type') !== 'application/json')) {
        return res.status(415).send(
            '{ "Error": "I’m sorry, we only accept JSON here." }');
    }

    if ((req.get('accept') !== 'application/json')) {
        return res.status(406).send(
            '{ "Error": "The server can only send JSON back to you." }');
    }
    if (req.body.name === undefined || req.body.city === undefined || req.body.state === undefined) {
        return res.status(400).send(
            '{ "Error": "The request object is missing at least one of the required attributes." }');
    }

    var valName = ds.validateName(req.body.name);
    var valCity = ds.validateCity(req.body.city);
    var valState = ds.validateState(req.body.state);

    if (!valName || !valCity || !valState) {
        return res.status(400).send(
            '{ "Error": "One or more of the requested attributes are invalid." }');
    } else {

        post_brewery(req.body.name, req.body.city, req.body.state)
            .then((key) => {
                if (key === 1) {
                    return res.status(403).send('{ "Error": "Name requested already exists for another brewery." }');
                }
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + key.id;
                var beers = [];
                var obj = { id: key.id, name: req.body.name, city: req.body.city, state: req.body.state, beers: beers, self: self };
                res.location(self);
                res.status(201).json(obj);
            });
    }
});

// ADDED AND UPDATED
router.patch('/:id', function (req, res) {

    var valName = true;
    var valCity = true;
    var valState = true;

    var id = req.body.id;
    var name = req.body.name;
    var city = req.body.city;
    var state = req.body.state;

    if (name === undefined) {
        name = 0;
    }
    if (city === undefined) {
        city = 0;
    }
    if (state === undefined) {
        state = 0;
    }
    if (id !== undefined) {
        return res.status(400).send(
            '{ "Error": "ID cannot be manipulated." }');
    }
    // Action: Ensure this error code is correct (PROBABLY NOT)
    if (Object.keys(req.body).length > 3) {
        return res.status(400).send('{ "Error": "Name requested already exists for another brewery" }');
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
        if (req.body.city === undefined) {
            if (req.body.state === undefined) {
                return res.status(400).send(
                    '{ "Error": "Request object must contain at least one of the three brewery attributes."}');
            } else {
                valState = ds.validateState(req.body.state);
            }
        } else {
            valCity = ds.validateCity(req.body.city);
            if (req.body.state !== undefined) {
                valState = ds.validateState(req.body.state);
            }
        }
    } else if (req.body.city === undefined) {
        if (req.body.state === undefined) {
            valName = ds.validateName(req.body.name);
        } else {
            valName = ds.validateName(req.body.name);
            valState = ds.validateState(req.body.state);
        }
    } else if (req.body.state === undefined) {
        valName = ds.validateName(req.body.name);
        valCity = ds.validateCity(req.body.city);
    } else {
        valName = ds.validateName(req.body.name);
        valCity = ds.validateCity(req.body.city);
        valState = ds.validateState(req.body.state);
    }


    if (!valName || !valState || !valCity) {
        return res.status(400).send(
            '{ "Error": "One or more of the requested attributes are invalid." }');
    }


    edit_brewery(req.params.id, name, city, state)
        .then(verify => {
            if (verify === 1) {
                return res.status(404).send(
                    '{ "Error": "No brewery with this brewery_id exists"}');
            }
            if (verify === 2) {
                return res.status(403).send(
                    '{ "Error": "Name requested already exists for another brewery." }');
            }
            //ACTION: Verify beers is good in this context. 
            var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
            var obj = { id: req.params.id, name: verify.name, city: verify.city, state: verify.state, beers: verify.beers, self: self };
            res.status(201).json(obj);
        });
});

// ADDED AND UPDATED
router.put('/:id', function (req, res) {

    var id = req.body.id;
    var name = req.body.name;
    var city = req.body.city;
    var state = req.body.state;

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

    if (name === undefined || city === undefined || state === undefined) {
        return res.status(400).send(
            '{ "Error": "The request object is missing at least one of the required attributes" }');
    }

    if (Object.keys(req.body).length > 3) {
        return res.status(400).send('{ "Error": "Name, city and state are the only allowed attributes." }');
    }

    var valName = ds.validateName(req.body.name);
    var valCity = ds.validateCity(req.body.city);
    var valState = ds.validateState(req.body.state);

    if (!valName || !valCity || !valState) {
        return res.status(400).send(
            '{ "Error": "One or more of the requested attributes are invalid." }');
    } else {
        edit_brewery(req.params.id, req.body.name, req.body.city, req.body.state)
            .then(verify => {
                if (verify === 1) {
                    return res.status(404).send(
                        '{ "Error": "No brewery with this brewery_id exists"}');
                }
                if (verify === 2) {
                    return res.status(403).send(
                        '{ "Error": "Name requested already exists for another brewery." }');
                }
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
                res.location(self);
                res.status(303).send(
                    '{ "Success": "Make a GET request to the location specified in the Location header of the response." }');
            });
    }
});

router.put('/:brew_id/beers/:beer_id', function (req, res) {
    add_beer_to_brewery(req.params.brew_id, req.params.beer_id, req).then(verify => {
        if (verify === 0) {
            res.status(403).send(
                '{ "Error": "Failure to load brewery. This beer is already produced at another brewery." }');
        }
        if (verify === 1) {
            res.status(404).send(
                '{ "Error": "The specified brewery and/or beer do not exist." }');
        }
        if (verify === 2) {
            res.status(403).send(
                '{ "Error": "Failure to load brewery. This beer is already produced at another brewery." }');
        }
        res.status(204).end();
    });
});

router.delete('/:brew_id/beers/:beer_id', function (req, res) {
    remove_beer_from_brewery(req.params.brew_id, req.params.beer_id).then(verify => {
        if (verify === 1) {
            res.status(404).send(
                '{ "Error": "No beer with this beer_id is produced at the brewery with this brewery_id or brewery with brewery_id does not exist."}');
        }
        res.status(204).end();
    });
});

// NO CHANGES
router.delete('/:id', function (req, res) {
    delete_brewery(req.params.id).then((verify) => {
        if (verify === 1) {
            res.status(404).send(
                '{ "Error": "No brewery with this brewery_id exists" }');
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

router.get('/:brew_id/beers/:beer_id', function (req, res) {
    res.set('Accept', 'DELETE, PUT');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});

router.post('/:brew_id/beers/:beer_id', function (req, res) {
    res.set('Accept', 'DELETE, PUT');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});

router.patch('/:brew_id/beers/:beer_id', function (req, res) {
    res.set('Accept', 'DELETE, PUT');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});

router.get('/:brew_id/beers/:beer_id', function (req, res) {
    res.set('Accept', 'DELETE, PUT');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});
/* ------------- IMPROPER HTTP VERBS ------------- */

/* ------------- End Controller Functions ------------- */

module.exports = router;