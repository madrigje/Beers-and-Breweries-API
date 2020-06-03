const express = require('express');
const bodyParser = require('body-parser');
const json2html = require('node-json2html');
const router = express.Router();
const ds = require('./datastore');

let transform = {
    '<>': 'ul', 'html': [
        { '<>': 'li', 'title': 'id', 'html': '${id}' },
        { '<>': 'li', 'title': 'name', 'html': '${name}' },
        { '<>': 'li', 'title': 'type', 'html': '${type}' },
        { '<>': 'li', 'title': 'length', 'html': '${length}' },
        { '<>': 'li', 'title': 'self', 'html': '${self}' }
    ]
};

const datastore = ds.datastore;

const BOAT = "boat";
const LOAD = "load";

router.use(bodyParser.json());

/* ------------- Begin Boat Model Functions ------------- */

// UPDATED
function post_boat(name, type, length) {
    var key = datastore.key(BOAT);
    const q = datastore.createQuery(BOAT);
    var loads = [];
    const new_boat = { "name": name, "type": type, "length": length, "loads": loads };

    return datastore.runQuery(q).then((entities) => {
        const includingID = entities[0].map(ds.fromDatastore)
        var i;
        var verify = 1;
        for (i = 0; i < includingID.length; i++) {
            if (name === includingID[i].name) {
                return verify;
            }
        }
        return datastore.save({ "key": key, "data": new_boat }).then(() => {
            return key;
        });
    });
}

// NO CHANGES YET
function get_boats(req) {
    var q = datastore.createQuery(BOAT).limit(3);
    var results = {};
    if (Object.keys(req.query).includes("cursor")) {
        q = q.start(req.query.cursor);
    }

    return datastore.runQuery(q).then((entities) => {
        results.boats = entities[0].map(ds.fromDatastore);
        if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
            var end = encodeURIComponent(entities[1].endCursor);
            results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + end;
        }
        return results;
    });
}

// NO CHANGES
function get_boat(id) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    const q = datastore.createQuery(BOAT);

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

// ADDED AND UPDATED
function edit_boat(id, name, type, length) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    const q = datastore.createQuery(BOAT);

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
                //Boat already exists
                return 1;
            }

            var j;
            for (j = 0; j < includingID.length; j++) {
                if (name === includingID[j].name) {
                    verify = 2;
                    if (id === includingID[j].id) {
                        verify = 0;
                        return datastore.get(key)
                            .then((boat) => {
                                if (name === 0) {
                                    name = boat[0].name;
                                }
                                if (type === 0) {
                                    type = boat[0].type
                                }
                                if (length === 0) {
                                    length = boat[0].length
                                }
                                const new_boat = { "name": name, "type": type, "length": length };
                                return datastore.save({ "key": key, "data": new_boat }).
                                    then(() => {
                                        return new_boat;
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
                    .then((boat) => {
                        if (name === 0) {
                            name = boat[0].name;
                        }
                        if (type === 0) {
                            type = boat[0].type
                        }
                        if (length === 0) {
                            length = boat[0].length
                        }
                        const new_boat = { "name": name, "type": type, "length": length };
                        return datastore.save({ "key": key, "data": new_boat }).
                            then(() => {
                                return new_boat;
                            })
                    });
            }
        }
        return verify;
    });
}

function put_load_in_boat(boat_id, load_id, req) {
    // Verify starts at 404 error
    var verify = 1;
    const b = datastore.createQuery(BOAT);
    const s = datastore.createQuery(LOAD);
    var boatName;

    return datastore.runQuery(b).then((entities) => {


        const boatIncludingID = entities[0].map(ds.fromDatastore)
        var i;
        for (i = 0; i < boatIncludingID.length; i++) {
            if (boat_id == boatIncludingID[i].id) {
                verify = 3;
                boatName = boatIncludingID[i].name;
            }
        }


        return datastore.runQuery(s).then((entities) => {
            const includingID = entities[0].map(ds.fromDatastore)
            var i;

            if (verify === 1) {
                //boat does not exist; return 1
                verify = 1;
                return verify;
            }
            // Reset this back to one. Already confirmed boat exists
            verify = 1;
            //Verify that the load exists
            for (i = 0; i < includingID.length; i++) {
                if (load_id == includingID[i].id) {
                    verify = 3;
                }
            }

            // Well, we now know that the slip doesnt exist
            if (verify === 1) { return verify; }

            // Find out if this load is on another boat.
            for (i = 0; i < includingID.length; i++) {
                if (includingID[i].id === load_id) {
                    if (includingID[i].carrier[0] === undefined) {
                        break;
                    } else {
                        return 0;
                    }
                }
            }


            var results = {};
            var self;
            for (i = 0; i < includingID.length; i++) {
                if (load_id == includingID[i].id) {
                    self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + boat_id;
                    results.self = self;
                    results.name = boatName;
                }
            }

            var loadResults = {};
            var selfLoads = req.protocol + '://' + req.get("host") + '/loads/' + load_id;
            loadResults.self = selfLoads;

            for (i = 0; i < includingID.length; i++) {
                if (load_id == includingID[i].id) {
                    self = req.protocol + '://' + req.get("host") + '/boats' + '/' + boat_id;
                    results.self = self;
                    results.name = boatName;
                    loadResults.content = includingID[i].content;
                    loadResults.weight = includingID[i].weight;
                    loadResults.delivery_date = includingID[i].delivery_date;
                }
            }

            const load_key = datastore.key([LOAD, parseInt(load_id, 10)]);
            const boat_key = datastore.key([BOAT, parseInt(boat_id, 10)]);
            return datastore.get(load_key)
                .then((load) => {
                    if (typeof (load[0].carrier) === 'undefined') {
                        load[0].carrier = [];
                    }
                    results.id = boat_id;
                    load[0].carrier.push(results);
                    return datastore.save({ "key": load_key, "data": load[0] })
                        .then(() => {
                            return datastore.get(boat_key)
                                .then((boat) => {
                                    if (typeof (boat[0].loads) === 'undefined') {
                                        boat[0].loads = [];
                                    }
                                    loadResults.id = load_id;
                                    boat[0].loads.push(loadResults);
                                    return datastore.save({ "key": boat_key, "data": boat[0] });
                                })
                        })
                })
        });
    });
}

function delete_load_off_boat(boat_id, load_id, req) {
    // Verify starts at 404 error
    var verify = 1;
    const b = datastore.createQuery(BOAT);
    const s = datastore.createQuery(LOAD);

    return datastore.runQuery(b).then((entities) => {

        const boatIncludingID = entities[0].map(ds.fromDatastore)
        var i;
        //Verify boat is valid.
        for (i = 0; i < boatIncludingID.length; i++) {
            if (boat_id == boatIncludingID[i].id) {
                verify = 3;
            }
        }

        if (verify === 1) {
            //boat does not exist; return 1
            verify = 1;
            return verify;
        }

        verify = 1;

        for (i = 0; i < boatIncludingID.length; i++) {
            if (boat_id === boatIncludingID[i].id) {
                //verify that load is on boat
                for (var j = 0; j < boatIncludingID[i].loads.length; j++) {
                    if (boatIncludingID[i].loads[j].id === load_id) {
                        verify = 3
                    }
                }
            }
        }

        if (verify === 1) {
            //load is not on the boat; return 1
            verify = 1;
            return verify;
        }

        const boat_key = datastore.key([BOAT, parseInt(boat_id, 10)]);
        const load_key = datastore.key([LOAD, parseInt(load_id, 10)]);

        return datastore.get(boat_key)
            .then((boat) => {
                var spliceValue;
                var length = boat[0].loads.length;
                for (var i = 0; i < length; i++) {
                    if (boat[0].loads[i].id === load_id) {
                        spliceValue = i;
                    }
                }
                var spliceValue2 = + 1;
                boat[0].loads.splice(spliceValue, spliceValue2);

                return datastore.save({ "key": boat_key, "data": boat[0] })
                    .then(() => {
                        return datastore.get(load_key)
                            .then((load) => {
                                load[0].carrier.splice(0, 1);
                                return datastore.save({ "key": load_key, "data": load[0] })

                            })

                    })
            })
    })

}

// NO CHANGES
function delete_boat(id) {
    const boat_key = datastore.key([BOAT, parseInt(id, 10)]);
    const q = datastore.createQuery(BOAT);
    const s = datastore.createQuery(LOAD);

    var arrayOfLoads = [];

    return datastore.runQuery(q).then((entities) => {
        const includingID = entities[0].map(ds.fromDatastore)
        var i;
        var verify = 1;
        for (i = 0; i < includingID.length; i++) {
            if (id == includingID[i].id) {
                return datastore.get(boat_key)
                    .then((boat) => {
                        console.log()
                        var length = boat[0].loads.length;
                        for (var i = 0; i < length; i++) {
                            arrayOfLoads.push(boat[0].loads[i].id);
                        }
                        datastore.delete(boat_key);

                        return datastore.runQuery(s).then((entities) => {
                            for (var i = 0; i < arrayOfLoads.length; i++) {
                                var count = arrayOfLoads[i];
                                ds.getKey(count)
                                    .then((load) => {
                                        datastore.save(load);
                                    })
                            }
                        })
                    })
            }
        }

        return verify;
    });
}

function get_boat_loads(boat_id) {
    const key = datastore.key([BOAT, parseInt(boat_id, 10)]);
    return datastore.get(key)
        .then((boat) => {
            return boat[0].loads;
        })
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

// NO CHANGES YET
router.get('/', function (req, res) {
    get_boats(req)
        .then((boats) => {
            var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/';
            boats.boats.map(ds.addSelf, self);
            res.status(200).json(boats);
        });
});

router.get('/:boat_id/loads', function (req, res) {
    get_boat_loads(req.params.boat_id)
        .then((loads) => {
            res.status(200).json(loads);
        });
});

// UPDATED
router.get('/:id', function (req, res) {
    get_boat(req.params.id)
        .then((verify) => {
            if (verify === 1) {
                return res.status(404).send(
                    '{ "Error": "No boat with this boat_id exists" }');
            }
            const accepts = req.accepts(['application/json', 'text/html']);
            if (!accepts) {
                res.status(406).send('{ "Error": "The server can only send JSON or HTML back to you." }');
            } else if (accepts === 'application/json') {
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
                var obj = { id: verify.id, name: verify.name, type: verify.type, length: verify.length, loads: verify.loads, self: self };
                res.status(200).json(obj);
            } else if (accepts === 'text/html') {
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
                var obj = { id: verify.id, name: verify.name, type: verify.type, length: verify.length, self: self };
                const html = json2html.transform([obj], transform);
                res.status(200).send(html);
            }
        });
});

// UPDATED
router.post('/', function (req, res) {

    if (Object.keys(req.body).length > 3) {
        return res.status(400).send('{ "Error": "Name, type and length are the only allowed attributes." }');
    }
    if ((req.get('content-type') !== 'application/json')) {
        return res.status(415).send(
            '{ "Error": "I’m sorry, we only accept JSON here." }');
    }

    if ((req.get('accept') !== 'application/json')) {
        return res.status(406).send(
            '{ "Error": "The server can only send JSON back to you." }');
    }
    if (req.body.name === undefined || req.body.type === undefined || req.body.length === undefined) {
        return res.status(400).send(
            '{ "Error": "The request object is missing at least one of the required attributes." }');
    }

    var valName = ds.validateName(req.body.name);
    var valType = ds.validateType(req.body.type);
    var valLength = ds.validateLength(req.body.length);

    if (!valName || !valType || !valLength) {
        return res.status(400).send(
            '{ "Error": "One or more of the requested attributes are invalid." }');
    } else {

        post_boat(req.body.name, req.body.type, req.body.length)
            .then((key) => {
                if (key === 1) {
                    return res.status(403).send('{ "Error": "Name requested already exists for another boat." }');
                }
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + key.id;
                var loads = [];
                var obj = { id: key.id, name: req.body.name, type: req.body.type, length: req.body.length, loads: loads, self: self };
                res.location(self);
                res.status(201).json(obj);
            });
    }
});

// ADDED AND UPDATED
router.patch('/:id', function (req, res) {

    var valName = true;
    var valType = true;
    var valLength = true;

    var id = req.body.id;
    var name = req.body.name;
    var type = req.body.type;
    var length = req.body.length;

    if (name === undefined) {
        name = 0;
    }
    if (type === undefined) {
        type = 0;
    }
    if (length === undefined) {
        length = 0;
    }
    if (id !== undefined) {
        return res.status(400).send(
            '{ "Error": "ID cannot be manipulated." }');
    }
    if (Object.keys(req.body).length > 3) {
        return res.status(400).send('{ "Error": "Name requested already exists for another boat" }');
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
        if (req.body.type === undefined) {
            if (req.body.length === undefined) {
                return res.status(400).send(
                    '{ "Error": "Request object must contain at least one of the three boat attributes."}');
            } else {
                valLength = ds.validateLength(req.body.length);
            }
        } else {
            valType = ds.validateType(req.body.type);
            if (req.body.length !== undefined) {
                valLength = ds.validateLength(req.body.length);
            }
        }
    } else if (req.body.type === undefined) {
        if (req.body.length === undefined) {
            valName = ds.validateName(req.body.name);
        } else {
            valName = ds.validateName(req.body.name);
            valLength = ds.validateLength(req.body.length);
        }
    } else if (req.body.length === undefined) {
        valName = ds.validateName(req.body.name);
        valType = ds.validateType(req.body.type);
    } else {
        valName = ds.validateName(req.body.name);
        valType = ds.validateType(req.body.type);
        valLength = ds.validateLength(req.body.length);
    }


    if (!valName || !valType || !valLength) {
        return res.status(400).send(
            '{ "Error": "One or more of the requested attributes are invalid." }');
    }


    edit_boat(req.params.id, name, type, length)
        .then(verify => {
            if (verify === 1) {
                return res.status(404).send(
                    '{ "Error": "No boat with this boat_id exists"}');
            }
            if (verify === 2) {
                return res.status(403).send(
                    '{ "Error": "Name requested already exists for another boat." }');
            }
            var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
            var obj = { id: req.params.id, name: verify.name, type: verify.type, length: verify.length, self: self };
            res.status(201).json(obj);
        });
});

// ADDED AND UPDATED
router.put('/:id', function (req, res) {

    var id = req.body.id;
    var name = req.body.name;
    var type = req.body.type;
    var length = req.body.length;

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

    if (name === undefined || type === undefined || length === undefined) {
        return res.status(400).send(
            '{ "Error": "The request object is missing at least one of the required attributes" }');
    }

    if (Object.keys(req.body).length > 3) {
        return res.status(400).send('{ "Error": "Name, type and length are the only allowed attributes." }');
    }

    var valName = ds.validateName(req.body.name);
    var valType = ds.validateType(req.body.type);
    var valLength = ds.validateLength(req.body.length);

    if (!valName || !valType || !valLength) {
        return res.status(400).send(
            '{ "Error": "One or more of the requested attributes are invalid." }');
    } else {
        edit_boat(req.params.id, req.body.name, req.body.type, req.body.length)
            .then(verify => {
                if (verify === 1) {
                    return res.status(404).send(
                        '{ "Error": "No boat with this boat_id exists"}');
                }
                if (verify === 2) {
                    return res.status(403).send(
                        '{ "Error": "Name requested already exists for another boat." }');
                }
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
                res.location(self);
                res.status(303).send(
                    '{ "Success": "Make a GET request to the location specified in the Location header of the response." }');
            });
    }
});

router.put('/:boat_id/loads/:load_id', function (req, res) {
    put_load_in_boat(req.params.boat_id, req.params.load_id, req).then(verify => {
        if (verify === 0) {
            res.status(403).send(
                '{ "Error": "Failure to load boat. This load is already on another boat." }');
        }
        if (verify === 1) {
            res.status(404).send(
                '{ "Error": "The specified boat and/or load do not exist" }');
        }
        if (verify === 2) {
            res.status(403).send(
                '{ "Error": "Failure to load boat. This load is already on another boat." }');
        }
        res.status(204).end();
    });
});

router.delete('/:boat_id/loads/:load_id', function (req, res) {
    delete_load_off_boat(req.params.boat_id, req.params.load_id).then(verify => {
        if (verify === 1) {
            res.status(404).send(
                '{ "Error": "No load with this load_id is at the boat with this boat_id or boat with boat_id does not exist"}');
        }
        res.status(204).end();
    });
});

// NO CHANGES
router.delete('/:id', function (req, res) {
    delete_boat(req.params.id).then((verify) => {
        if (verify === 1) {
            res.status(404).send(
                '{ "Error": "No boat with this boat_id exists" }');
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

router.get('/:boat_id/loads/:load_id', function (req, res) {
    res.set('Accept', 'DELETE, PUT');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});

router.post('/:boat_id/loads/:load_id', function (req, res) {
    res.set('Accept', 'DELETE, PUT');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});

router.patch('/:boat_id/loads/:load_id', function (req, res) {
    res.set('Accept', 'DELETE, PUT');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});

router.get('/:boat_id/loads/:load_id', function (req, res) {
    res.set('Accept', 'DELETE, PUT');
    res.status(405).send('{ "Error": "That HTTP verb is not allowed with this URL." }');
});
/* ------------- IMPROPER HTTP VERBS ------------- */

/* ------------- End Controller Functions ------------- */

module.exports = router;