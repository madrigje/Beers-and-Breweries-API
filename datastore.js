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

module.exports.validateType = function validateType(type) {
    //I've allowed spaces and absolutely no numbers
    //The passed in string must be between 2 and 33 characters. 
    //TODO: Document that it must contain two chars. 
    var letters = /^[A-Za-z\s]+$/;
    if(type.match(letters)) {
        if(type.length > 33 || type.length < 2) {
            return false;
        }
        return true;
    } else {
        return false;
    }
}

module.exports.validateLength = function validateLength(length) {
    //All characters must be numbers
    //No spaces allowed
    //Must be between 1 and 9999
    var stringLength = length.toString()
    var numbers = /^\d+$/;
    if(stringLength.match(numbers)) {
        if(stringLength.length > 4 || stringLength.length === 0) {
            return false;
        }
        return true;
    } else {
        return false;
    }
}