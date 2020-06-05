//Q: Why is the const variable Datastore in brackets here?
const { Datastore } = require('@google-cloud/datastore');

const projectID = 'final-madrigje';

module.exports.Datastore = Datastore;
//Q: Why is projectID included here?
module.exports.datastore = new Datastore({projectID:projectID});
module.exports.fromDatastore = function fromDatastore(item){
    item.id = item[Datastore.KEY].id; 
    return item;
}
module.exports.addSelf = function addSelf(item){
    item.self = this + item.id;
    if (item.loads === undefined) {
        item.loads = [];
    }
    return item;
}

module.exports.addSelfLoad = function addSelfLoad(item) {
    item.self = this + item.id;
    return item;
}
//TODO: May not be needed for Assignment 5 
module.exports.getKey = function getKey(id) {
    var key = datastore.key([LOAD, parseInt(id, 10)]);
    return datastore.get(key).then((load) => {
        load[0].carrier.splice(0, 1);
        const entity = { "key": key, "data": load[0] };
        return entity;
    });
}

module.exports.validateName = function validateName(name) {
    //I've allowed spaces and absolutely no numbers
    //The passed in string must be between 2 and 33 characters. 
    //TODO: Document that it must contain two chars. 
    var letters = /^[A-Za-z\s]+$/;
    if(name.match(letters)) {
        if(name.length > 33 || name.length < 2) {
            return false;
        }
        return true;
    } else {
        return false;
    }
}

// ACTION: Would like to revamp this. Maybe base it off of state?!
module.exports.validateCity = function validateCity(city) {
    //I've allowed spaces and absolutely no numbers
    //The passed in string must be between 2 and 33 characters. 
    //TODO: Document that it must contain two chars. 
    var letters = /^[A-Za-z\s]+$/;
    if(type.match(letters)) {
        if(type.city > 33 || type.city < 2) {
            return false;
        }
        return true;
    } else {
        return false;
    }
}

module.exports.validateState = function validateState(states) {
    // The state property must match one of the keys in state_codes below. 
    let state_codes = { 'Mississippi': 'MS', 'Oklahoma': 'OK', 
        'Delaware': 'DE', 'Minnesota': 'MN', 'Illinois': 'IL', 'Arkansas': 'AR', 
        'New Mexico': 'NM', 'Indiana': 'IN', 'Maryland': 'MD', 'Louisiana': 'LA', 
        'Idaho': 'ID', 'Wyoming': 'WY', 'Tennessee': 'TN', 'Arizona': 'AZ', 
        'Iowa': 'IA', 'Michigan': 'MI', 'Kansas': 'KS', 'Utah': 'UT', 
        'Virginia': 'VA', 'Oregon': 'OR', 'Connecticut': 'CT', 'Montana': 'MT', 
        'California': 'CA', 'Massachusetts': 'MA', 'West Virginia': 'WV', 
        'South Carolina': 'SC', 'New Hampshire': 'NH', 'Wisconsin': 'WI',
        'Vermont': 'VT', 'Georgia': 'GA', 'North Dakota': 'ND', 
        'Pennsylvania': 'PA', 'Florida': 'FL', 'Alaska': 'AK', 'Kentucky': 'KY', 
        'Hawaii': 'HI', 'Nebraska': 'NE', 'Missouri': 'MO', 'Ohio': 'OH', 
        'Alabama': 'AL', 'Rhode Island': 'RI', 'South Dakota': 'SD', 
        'Colorado': 'CO', 'New Jersey': 'NJ', 'Washington': 'WA', 
        'North Carolina': 'NC', 'New York': 'NY', 'Texas': 'TX', 
        'Nevada': 'NV', 'Maine': 'ME' }

    return state_codes.hasOwnProperty(states);
}