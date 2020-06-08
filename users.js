const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;
const USER = "user";

router.use(bodyParser.urlencoded({ extended: true }));

/* ------------- Begin Owners Model Functions ------------- */

function get_users(){
	const q = datastore.createQuery(USER);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(ds.fromDatastore);
		});
}

/* ------------- End Owners Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */
router.get('/', function(req, res){
    get_users()
	.then( (boats) => {
        const accepts = req.accepts(['application/json', 'text/html']);

        if(!accepts){
            res.status(406).send('Not Acceptable');
        } else if(accepts === 'application/json'){
            res.status(200).json(boats);
        } else { res.status(500).send('Content type got messed up!'); }
    });
});
/* ------------- End Controller Functions ------------- */

module.exports = router;