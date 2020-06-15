const config = require('./config');
const mongoose = require('mongoose');

module.exports = function(){

	mongoose.set('debug', config.env.mongo_debug); //config debug
	//const db = mongoose.connect(config.env.mongoUri, {useNewUrlParser: true});

	var db = mongoose.connect(config.env.mongo_uri, { //?ssl=true
        /* auth: {
            user: config.env.mongo_username,
            password: config.env.mongo_password,
        }, */
        useNewUrlParser: true,
        useFindAndModify: false,
		useCreateIndex: true,
		useUnifiedTopology: true
    })
    .then(() => console.log('Successfully connected to MongoDB.'))
    .catch((err) => console.error(err));
	
    //model schema
    //2019-11-18, move to controller require
	//require('../models/user.model'); //from user model

    return db;
}