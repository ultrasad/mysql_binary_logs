let mongoose = require('mongoose');

const TriggerLogSchema = new mongoose.Schema({
    /* orderId: {
		type: String,
        unique: true,
        //index: true
		//required: 'userId is required'
	}, */
	actionName: String,
    actionStatus: String,
    actionInfo: {type : Array , "default" : []},
	/* orderItem:{type : Array , "default" : []},
	orderItemError: {type : Array , "default" : []},
	orderInfo:{type : Array , "default" : []},
	orderReject:{type : Array , "default" : []},
	orderPayment:{type : Array , "default" : []},
	orderDelivery:{type : Array , "default" : []},
	orderCancel:{type : Array , "default" : []},
	orderPaid:{type : Array , "default" : []},
    orderSalesforceId: String, */
    //requestId: String,
    created: {
		type: Date,
		default: Date.now
	},
	updated: Date,
});

TriggerLogSchema.set('toJSON', {
	virtuals: true,
	versionKey:false,
	transform: function (doc, ret, options) {   
		//console.log('tojSON => ', ret);
	}
});

TriggerLogSchema.pre('findOneAndUpdate', function(next) {
	console.log('pre save order log....');
	//this.updated = Date.now();
	this._update.updated = Date.now();
	next();
});

TriggerLogSchema.post('save', function(doc) {
	console.log('%s has been saved', doc._id);
});

TriggerLogSchema.pre('findOne', function(next) {
	//console.log('user pre find one => ', httpContext.get('testX'));
	next();
});

module.exports = mongoose.model('TriggerLog', TriggerLogSchema); //model name 'TriggerLog' form TriggerLogSchema