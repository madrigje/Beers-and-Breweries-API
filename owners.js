const express = require('express');
const bodyParser = require('body-parser');
//const json2html = require('node-json2html');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;
const BOAT = "boat";

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://madrigje.auth0.com/.well-known/jwks.json'
    }),

    // Validate the audience and the issuer.
    issuer: 'https://madrigje.auth0.com/',
    algorithms: ['RS256']
});

router.use(bodyParser.urlencoded({ extended: true }));

/* ------------- Begin Owners Model Functions ------------- */

function get_boats(owner){
	const q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(ds.fromDatastore).filter( item => item.owner === owner );
		});
}

/* ------------- End Owners Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */
router.get('/:id/boats', checkJwt, function(req, res){
    get_boats(req.params.id)
	.then( (boats) => {
        const accepts = req.accepts(['application/json', 'text/html']);
        if(boats.owner && boats.owner !== req.user.sub){
            res.status(403).send('Forbidden');
        } else if(!accepts){
            res.status(406).send('Not Acceptable');
        } else if(accepts === 'application/json'){
            res.status(200).json(boats);
        } else if(accepts === 'text/html'){
            // Did not implement html responses so just returning JSON
            res.status(200).json(boats);
        } else { res.status(500).send('Content type got messed up!'); }
    });
});
/* ------------- End Controller Functions ------------- */

module.exports = router;