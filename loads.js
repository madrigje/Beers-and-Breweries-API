const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const BOAT = "boat";
const LOAD = "load";

router.use(bodyParser.json());

/* ------------- Begin Boat Model Functions ------------- */

function post_load(weight, content, delivery_date) {
    var key = datastore.key(LOAD);
    var carrier = [];
    const new_load = { "weight": weight, "carrier": carrier, "content": content, "delivery_date": delivery_date };
    const entity = { "key": key, "data": new_load };
    return datastore.save(entity).then(() => { return key });
}

function get_loads(req) {
    var q = datastore.createQuery(LOAD).limit(3).filter('weight', '>', 0);
    var results = {};
    if (Object.keys(req.query).includes("cursor")) {
        q = q.start(req.query.cursor);
    }

    return datastore.runQuery(q).then((entities) => {
        results.loads = entities[0].map(ds.fromDatastore);
        if (entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS) {
            var end = encodeURIComponent(entities[1].endCursor);
            results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + end;
        }
        return results;
    });
}

function get_load(id) {
    const q = datastore.createQuery(LOAD);

    return datastore.runQuery(q).then((entities) => {
        const includingID = entities[0].map(ds.fromDatastore)
        var i;
        var verify = 1;
        for (i = 0; i < includingID.length; i++) {
            // If the passed in load is equal to one in the LOAD entities, it exists. 
            if (id == includingID[i].id) {
                const boat = includingID[i];
                return boat;
            }
        }
        return verify;
    });
}

function delete_load(load_id) {
    const key = datastore.key([LOAD, parseInt(load_id, 10)]);
    const s = datastore.createQuery(LOAD);

    return datastore.runQuery(s).then((entities) => {
        const includingID = entities[0].map(ds.fromDatastore)
        var i;
        var verify = 1;

        for (i = 0; i < includingID.length; i++) {
            if (load_id == includingID[i].id) {
                if (includingID[i].carrier.length === 0) {
                    datastore.delete(key);
                    return 0;
                }
                var boat_id = includingID[i].carrier[0].id;
                const boat_key = datastore.key([BOAT, parseInt(boat_id, 10)]);
                return datastore.get(boat_key)
                    .then((boat) => {
                        datastore.delete(key);
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
                    })
            }
        }
        return verify;
    });
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/', function (req, res) {
    get_loads(req)
        .then((loads) => {
            var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/';
            loads.loads.map(ds.addSelfLoad, self);
            res.status(200).json(loads);
        });
});

router.get('/:id', function (req, res) {
    get_load(req.params.id)
        .then(verify => {
            if (verify === 1) {
                return res.status(404).send(
                    '{ "Error": "No load with this load_id exists" }');
            }
            var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + req.params.id;
            var carrier = verify.carrier
            if (carrier === undefined) {
                carrier = null;
            }
            var obj = { id: req.params.id, weight: verify.weight, carrier: carrier, content: verify.content, delivery_date: verify.delivery_date, self: self };
            res.status(200).json(obj);
        });
});

router.post('/', function (req, res) {
    if (req.body.weight === undefined || req.body.content === undefined || req.body.delivery_date === undefined) {
        return res.status(400).send(
            '{ "Error": "The request object is missing the required number" }');
    } else {

        post_load(req.body.weight, req.body.content, req.body.delivery_date)
            .then(key => {
                var self = req.protocol + '://' + req.get("host") + req.baseUrl + '/' + key.id;
                var carrier = [];
                var obj = { id: key.id, weight: req.body.weight, carrier: carrier, content: req.body.content, delivery_date: req.body.delivery_date, self: self };
                res.status(201).json(obj);
            });
    }
});

router.delete('/:id', function (req, res) {
    delete_load(req.params.id).then((verify) => {
        if (verify === 1) {
            res.status(404).send(
                '{ "Error":  "No load with this load_id exists" }');
        }
        res.status(204).end()
    })
});

/* ------------- End Controller Functions ------------- */

module.exports = router;