require('dotenv').config();
process.env.NODE_ENV = process.env.NODE_ENV || 'development'; //set default if nil, (production, development)
const port = process.env.PORT || 8081;

const https = require('https');

const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');

//const http = require('http');
//const express = require('express');

const config = require('./config/config');

const mongoose = require('./config/mongoose');
const express = require('./config/express');

const TriggerLogs = require("./models/triggerLogs.model");

const db = mongoose(); //load first, db
const app = express(); //new express server

//- Connection configuration
var dbConfigApi = {
  host: config.env.databases.apidb.host,
  user: config.env.databases.apidb.user,
  password: config.env.databases.apidb.password,
  database : config.env.databases.apidb.database,
  charset : config.env.databases.apidb.charset,
  connectionLimit: config.env.databases.apidb.connectionLimit,
  queueLimit: config.env.databases.apidb.queueLimit,
  waitForConnection: config.env.databases.apidb.waitForConnection
};

//CCOM Interface
var dbConfigInf = {
  host: config.env.databases.ccomdb.host,
  user: config.env.databases.ccomdb.user,
  password: config.env.databases.ccomdb.password,
  database : config.env.databases.ccomdb.database,
  charset : config.env.databases.ccomdb.charset,
  connectionLimit: config.env.databases.ccomdb.connectionLimit,
  queueLimit: config.env.databases.ccomdb.queueLimit,
  waitForConnection: config.env.databases.ccomdb.waitForConnection
}

const requestServicesApi = async (action, requestAction) => {
  return new Promise((resolve, reject) => {
    console.log('action: ', action);
    console.log('requestAction: ', requestAction);

    const servicesActionPath = requestAction.path; //services action path
    const options = {
      //host: config.env.servicesEnpointUrl,
      hostname: config.env.servicesEnpointUrl,
      port: 443,
      path: config.env.servicesPrefixPath + servicesActionPath,
      method: 'GET',
      headers: {
        //'Content-Type': 'application/json',
        //'Content-Length': Buffer.byteLength(requestJson),
        'Authorization': config.env.servicesApiToken
      }
    }

    var req = https.request(options, function(res) {
      res.setEncoding('utf8');
      //console.log("statusCode: ", res.statusCode);
      //console.log("headers: ", res.headers);
    
      res.on('data', function(d) {
        //process.stdout.write(d);
        resolve(d);
      });
    });
    req.end();
    
    req.on('error', function(e) {
      //console.error(e);
      reject(e);
    });
    
    /* const req = https.request(options, res => {
      res.setEncoding('utf8');
      res.on('data', responseBody => {
        resolve(responseBody);
      });
    });
    
    req.on('error', error => {
      console.error(error);
      reject(error);
    });
    
    req.write(requestJson);
    req.end(); */

  });
}

const programLogTriggerAPI = async () => {

  /* const connection = mysql.createConnection(db_config);
  connection.connect(function(err) {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return;
    }
    console.log('connected as id ' + connection.threadId);
  }); */

  const poolAPI = mysql.createPool(dbConfigApi);
  poolAPI.getConnection(function(err, connection) {
    // connected! (unless `err` is set)
    console.log('connected api db as id ' + connection.threadId);
  });

  //OK
  /* connection.query("SELECT * FROM order_temp WHERE ref_no LIKE 'CC2973763' ORDER BY id DESC LIMIT 1", function (error, results, fields) {
    if (error) throw error;
    // connected!
    console.log('result => ', results);
  }); */

 /*  connectionPool.getConnection(function(err, dbConnection) {
    if(err) {
        console.error('MySQL — Error connecting: ' + err.stack);
        return;
    }

    console.log('MySQL — Connected');
  }); */

  /* var del = connection._protocol._delegateError;
  connection._protocol._delegateError = function(err, sequence){
    if (err.fatal) {
      console.trace('fatal error: ' + err.message);
    }
    return del.call(this, err, sequence);
  }; */
  
  const instanceAPI = new MySQLEvents(poolAPI, {
    startAtEnd: true, // to record only the new binary logs, if set to false or you didn'y provide it all the events will be console.logged after you start the app
    excludedSchemas: {
      mysql: true,
    },
  });
  
  instanceAPI.start()
  .then(() => console.log('I\'m running, api db!'))
  .catch(err => console.error('Something bad happened, api db', err));

  instanceAPI.stop()
  .then(() => console.log('I\'m stopped, api db!'))
  .catch(err => console.error('Something bad happened, API db', err));
  
  instanceAPI.addTrigger({
    //name: 'monitoring all statments',
    //expression: 'TEST.*', // listen to TEST database !!!
    //expression: 'ccinterface.log_session', // listen to ccinterface database !!!
    //expression: '*.*', // listen to ccinterface database !!!
    //expression: '*.*', // listen to test database !!!
    name: 'SAP_PRODUCT_TRIGGER',
    //expression: '*',
    expression: dbConfigApi.database + '.SapProductList', // listen to apishop database !!!
    //statement: MySQLEvents.STATEMENTS.ALL, // you can choose only insert for example MySQLEvents.STATEMENTS.INSERT, but here we are choosing everything
    //statement: MySQLEvents.STATEMENTS.INSERT,
    statement: MySQLEvents.STATEMENTS.ALL, //INSERT, UPDATE, DELETE
    onEvent: (event) => {
      //console.log(event.affectedRows);
      const productCode = (event.affectedRows[0].after.ProductCode)?event.affectedRows[0].after.ProductCode:undefined;
      console.log('Effected ProductCode: ', productCode);
      //check not delete action

      requestServicesApi('product', {path: `/salesforce/call_create_product/${productCode}`})
      .then(res => {
        console.log('call service api res: ', res);

        const productListtLog = new TriggerLogs({actionName: 'SAP_PRODUCT_TRIGGER', actionStatus:'success', actionInfo: {productCode: productCode, action: 'upsert'}});
          const productData = productListtLog.save()
          .then(product => {
            console.log('save sap product log success => ', productCode);
          }).catch(err => {
            console.log('catch err, save sap product log failed => ', err);
          });

      }).catch(err => {
        console.log('call service api err: ', err);
      });
    }
  });

  instanceAPI.addTrigger({
    name: 'SAP_PRICELIST_TRIGGER',
    expression: dbConfigApi.database + '.SapProductPricelist', // listen to apishop database !!!
    statement: MySQLEvents.STATEMENTS.ALL, //INSERT, UPDATE, DELETE
    onEvent: (event) => {
      
      //console.log(event.affectedRows);

      //2020-05-28, option for case delete, create new api for upsert delete status for sf
      if(event.affectedRows[0].after == undefined){
        console.log('delete action before: ', event.affectedRows[0].before.pricelist_id, event.affectedRows[0].before.condition_id);
        //call api delete action...
      } else {
        const pricelistId = (event.affectedRows[0].after.PriceListID)?event.affectedRows[0].after.PriceListID:undefined;
        console.log('Effected pricelistId: ', pricelistId);
        //check not delete action

        requestServicesApi('pricelist', {path: `/salesforce/call_create_pricelist/${pricelistId}`})
        .then(res => {
          console.log('call service api res: ', res);

          const productPricelistLog = new TriggerLogs({actionName: 'SAP_PRICELIST_TRIGGER', actionStatus:'success', actionInfo: {pricelistId: pricelistId, action: 'upsert'}});
          const pricelistData = productPricelistLog.save()
          .then(pricelist => {
            console.log('save sap pricelist log success => ', pricelistId);
          }).catch(err => {
            console.log('catch err, save sap pricelist log failed => ', err);
          });

        }).catch(err => {
          console.log('call service api err: ', err);
        });

      }
    }
  });

  instanceAPI.addTrigger({
    name: 'SAP_CHANNEL_PRICELIST_MAPPING_TRIGGER',
    expression: dbConfigApi.database + '.SapPricelistCondition', // listen to apishop database !!!
    statement: MySQLEvents.STATEMENTS.ALL, //INSERT, UPDATE, DELETE
    onEvent: (event) => {

      //console.log(event.affectedRows);

      //# case delete ##//
      //2020-05-28, option for case delete, create new api for upsert delete status for sf
      if(event.affectedRows[0].after == undefined){
        const pricelistId = (event.affectedRows[0].before.pricelist_id)?event.affectedRows[0].before.pricelist_id:undefined;
        const conditionId = (event.affectedRows[0].before.condition_id)?event.affectedRows[0].before.condition_id:undefined;

        console.log('delete action before: ', pricelistId, conditionId);

        //call api delete action...
        requestServicesApi('delete pricelist mapping', {path: `/salesforce/call_delete_channel_mapping/${conditionId}/${pricelistId}`})
        .then(res => {
          console.log('call service api res: ', res);

          const channelPriceMappingLog = new TriggerLogs({actionName: 'SAP_CHANNEL_PRICELIST_MAPPING_TRIGGER', actionStatus:'success', actionInfo: {pricelistId: pricelistId, conditionId: conditionId, action: 'delete'}});
          const pricelistData = channelPriceMappingLog.save()
          .then(pricelist => {
            console.log('save channel pricelist mapping log success => ', pricelistId, conditionId);
          }).catch(err => {
            console.log('catch err, save channel pricelist mapping log failed => ', err);
          });

        }).catch(err => {
          console.log('catch err, call service api channel pricelist mapping failed: ', err);
        });
        
      } else {

        const pricelistId = (event.affectedRows[0].after.pricelist_id)?event.affectedRows[0].after.pricelist_id:undefined;
        const conditionId = (event.affectedRows[0].after.condition_id)?event.affectedRows[0].after.condition_id:undefined;

        console.log('Effected Channel pricelistId Mapping: ', pricelistId);
        console.log('Effected Channel conditionId Mapping: ', conditionId);

        requestServicesApi('pricelist mapping', {path: `/salesforce/call_create_channel_mapping/${conditionId}/${pricelistId}`})
        .then(res => {
          console.log('call service api res: ', res);

          const channelPriceMappingLog = new TriggerLogs({actionName: 'SAP_CHANNEL_PRICELIST_MAPPING_TRIGGER', actionStatus:'success', actionInfo: {pricelistId: pricelistId, conditionId: conditionId, action: 'upsert'}});
          const pricelistData = channelPriceMappingLog.save()
          .then(pricelist => {
            console.log('save channel pricelist mapping log success => ', pricelistId, conditionId);
          }).catch(err => {
            console.log('catch err, save channel pricelist mapping log failed => ', err);
          });

        }).catch(err => {
          console.log('call service api err: ', err);
        });

      }
    }
  });

  instanceAPI.addTrigger({
    name: 'ORDER_PAID_TRIGGER',
    expression: dbConfigApi.database + '.order_temp_paid', // listen to apishop database !!!
    statement: MySQLEvents.STATEMENTS.ALL, //INSERT, UPDATE, DELETE
    onEvent: (event) => {

      //console.log(event.affectedRows);

      //# case delete ##//
      //2020-05-28, option for case delete, create new api for upsert delete status for sf
      if(event.affectedRows[0].after == undefined){
        console.log('delete action before: ', event.affectedRows[0].before.orderId);
        //call api delete action...
      } else if(event.affectedRows[0].after.actionStatus !== 'complete'){
        const orderId = (event.affectedRows[0].after.orderId)?event.affectedRows[0].after.orderId:undefined;

        console.log('Effected Paid, orderId: ', orderId);
  
        requestServicesApi('paid order', {path: `/salesforce/call_paid_order/${orderId}`})
        .then(res => {
          console.log('call service api res: ', res);

          const paidOrderLog = new TriggerLogs({actionName: 'ORDER_PAID_TRIGGER', actionStatus:'success', actionInfo: {orderId: orderId, action: 'upsert'}});
          const paidData = paidOrderLog.save()
          .then(paid => {
            console.log('save paid log success => ', orderId);
          }).catch(err => {
            console.log('catch err, save paid log failed => ', err);
          });

        }).catch(err => {
          console.log('call service api err: ', err);
        });  

      }
    }
  });

  instanceAPI.addTrigger({
    name: 'ORDER_DELIVERY_TRIGGER',
    expression: dbConfigApi.database + '.order_temp_delivery', // listen to apishop database !!!
    statement: MySQLEvents.STATEMENTS.ALL, //INSERT, UPDATE, DELETE
    onEvent: (event) => {

      //console.log(event.affectedRows);

      //# case delete ##//
      //2020-05-28, option for case delete, create new api for upsert delete status for sf
      if(event.affectedRows[0].after == undefined){
        console.log('delete action before: ', event.affectedRows[0].before.orderId);
        //call api delete action...
      } else if(event.affectedRows[0].after.actionStatus !== 'complete'){
        const orderId = (event.affectedRows[0].after.orderId)?event.affectedRows[0].after.orderId:undefined;

        console.log('Effected Delivery, orderId: ', orderId);

        requestServicesApi('delivery order', {path: `/salesforce/call_delivery_order/${orderId}`})
        .then(res => {
          console.log('call service api res: ', res);

          const deliveryOrderLog = new TriggerLogs({actionName: 'ORDER_DELIVERY_TRIGGER', actionStatus:'success', actionInfo: {orderId: orderId, action: 'upsert'}});
          const deliveryData = deliveryOrderLog.save()
          .then(delivery => {
            console.log('save delivery log success => ', orderId);
          }).catch(err => {
            console.log('catch err, save delivery log failed => ', err);
          });

        }).catch(err => {
          console.log('call service api err: ', err);
        });

      }
    }
  });

  instanceAPI.addTrigger({
    name: 'ORDER_CANCEL_TRIGGER',
    expression: dbConfigApi.database + '.order_temp_cancel', // listen to apishop database !!!
    statement: MySQLEvents.STATEMENTS.ALL, //INSERT, UPDATE, DELETE
    onEvent: (event) => {

      //console.log(event.affectedRows);

      //# case delete ##//
      //2020-05-28, option for case delete, create new api for upsert delete status for sf
      if(event.affectedRows[0].after == undefined){
        console.log('delete action before: ', event.affectedRows[0].before.orderId);
        //call api delete action...
      } else if(event.affectedRows[0].after.actionStatus !== 'complete'){

        const orderId = (event.affectedRows[0].after.orderId)?event.affectedRows[0].after.orderId:undefined;

        console.log('Effected Cancel, orderId: ', orderId);

        requestServicesApi('cancel order', {path: `/salesforce/call_cancel_order/${orderId}`})
        .then(res => {
          console.log('call service api res: ', res);

          const cancelOrderLog = new TriggerLogs({actionName: 'ORDER_CANCEL_TRIGGER', actionStatus:'success', actionInfo: {orderId: orderId, action: 'upsert'}});
          const cancelData = cancelOrderLog.save()
          .then(cancel => {
            console.log('save cancel log success => ', orderId);
          }).catch(err => {
            console.log('catch err, save cancel log failed => ', err);
          });

        }).catch(err => {
          console.log('call service api err: ', err);
        });

      }
    }
  });
  
  instanceAPI.on(MySQLEvents.EVENTS.CONNECTION_ERROR, (err) => console.log('Connection api db error', err));
  instanceAPI.on(MySQLEvents.EVENTS.ZONGJI_ERROR, (err) => console.log('ZongJi api db error', err));

};

const programLogTriggerInf = async () => {

  const poolInf = mysql.createPool(dbConfigInf);
  poolInf.getConnection(function(err, connectionInf) {
    // connected! (unless `err` is set)
    console.log('connected inf db as id ' + connectionInf.threadId);
  });
  
  const instanceInf = new MySQLEvents(poolInf, {
    startAtEnd: true, // to record only the new binary logs, if set to false or you didn'y provide it all the events will be console.logged after you start the app
    excludedSchemas: {
      mysql: true,
    },
  });

  instanceInf.start()
  .then(() => console.log('I\'m running, inf db!'))
  .catch(err => console.error('Something bad happened, api db', err));

  instanceInf.stop()
  .then(() => console.log('I\'m stopped, inf db!'))
  .catch(err => console.error('Something bad happened, inf db', err));

  //CCOM DB
  instanceInf.addTrigger({
    name: 'TALK_PROGRAM_DETAIL_SAP_TRIGGER',
    expression: dbConfigInf.database + '.talk_programdetail_sap', // listen to apishop database !!!
    statement: MySQLEvents.STATEMENTS.ALL, //INSERT, UPDATE, DELETE
    onEvent: (event) => {

      //console.log(event.affectedRows);

      //# case delete ##//
      //2020-05-28, option for case delete, create new api for upsert delete status for sf
      if(event.affectedRows[0].after == undefined){
        console.log('delete action before: ', event.affectedRows[0].before.program_detail_id);
        //call api delete action...
      } else {

        const programDetailId = (event.affectedRows[0].after.program_detail_id)?event.affectedRows[0].after.program_detail_id:undefined;

        console.log('Effected Talk, programDetailId: ', programDetailId);

        requestServicesApi('talk program detail', {path: `/salesforce/call_create_program/${programDetailId}`})
        .then(res => {
          console.log('call service api res: ', res);

          const talkProgramDetailLog = new TriggerLogs({actionName: 'TALK_PROGRAM_DETAIL_SAP_TRIGGER', actionStatus:'success', actionInfo: {programDetailId: programDetailId, action: 'upsert'}});
          const programData = talkProgramDetailLog.save()
          .then(programDeail => {
            console.log('save program detail log success => ', programDetailId);
          }).catch(err => {
            console.log('catch err, save program detail log failed => ', err);
          });

        }).catch(err => {
          console.log('call service api err: ', err);
        });

      }
    }
  });

  instanceInf.addTrigger({
    name: 'TALK_ITEM_MAPPING_SAP_TRIGGER',
    expression: dbConfigInf.database + '.talk_mapprogramitem_sap', // listen to apishop database !!!
    statement: MySQLEvents.STATEMENTS.ALL, //INSERT, UPDATE, DELETE
    onEvent: (event) => {

      //console.log(event.affectedRows);

      //# case delete ##//
      //2020-05-28, option for case delete, create new api for upsert delete status for sf
      if(event.affectedRows[0].after == undefined){
        console.log('delete action before: ', event.affectedRows[0].before.map_program_item_id);
        //call api delete action...
      } else {

        const programItemId = (event.affectedRows[0].after.map_program_item_id)?event.affectedRows[0].after.map_program_item_id:undefined;

        console.log('Effected Talk, mapProgramItemId: ', programItemId);

        requestServicesApi('talk item mapping', {path: `/salesforce/call_create_item_mapping/${programItemId}`})
        .then(res => {
          console.log('call service api res: ', res);

          const talkItemMappingLog = new TriggerLogs({actionName: 'TALK_ITEM_MAPPING_SAP_TRIGGER', actionStatus:'success', actionInfo: {programItemId: programItemId, action: 'upsert'}});
          const itemData = talkItemMappingLog.save()
          .then(itemMapping => {
            console.log('save item mapping log success => ', programItemId);
          }).catch(err => {
            console.log('catch err, save item mapping log failed => ', err);
          });

        }).catch(err => {
          console.log('call service api err: ', err);
        });

      }
    }
  });

  instanceInf.addTrigger({
    name: 'TALK_SCHEDULE_SAP_TRIGGER',
    expression: dbConfigInf.database + '.talk_promoteschedule_sap', // listen to apishop database !!!
    statement: MySQLEvents.STATEMENTS.ALL, //INSERT, UPDATE, DELETE
    onEvent: (event) => {

      //console.log(event.affectedRows);

      //# case delete ##//
      //2020-05-28, option for case delete, create new api for upsert delete status for sf
      if(event.affectedRows[0].after == undefined){
        console.log('delete action before: ', event.affectedRows[0].before.talk_id);
        //call api delete action...
      } else {

        const talkId = (event.affectedRows[0].after.talk_id)?event.affectedRows[0].after.talk_id:undefined;

        console.log('Effected Talk, mapping talkId: ', talkId);

        requestServicesApi('talk schedule', {path: `/salesforce/call_create_schedule/${talkId}`})
        .then(res => {
          console.log('call service api res: ', res);

          const scheduleLog = new TriggerLogs({actionName: 'TALK_SCHEDULE_SAP_TRIGGER', actionStatus:'success', actionInfo: {talkId: talkId, action: 'upsert'}});
          const scheduleData = scheduleLog.save()
          .then(schedule => {
            console.log('save schedule log success => ', talkId);
          }).catch(err => {
            console.log('catch err, save schedule log failed => ', err);
          });

        }).catch(err => {
          console.log('call service api err: ', err);
        });

      }
    }
  });

  instanceInf.on(MySQLEvents.EVENTS.CONNECTION_ERROR, (err) => console.log('Connection inf db error', err));
  instanceInf.on(MySQLEvents.EVENTS.ZONGJI_ERROR, (err) => console.log('ZongJi inf db error', err));
}

let appServer = app.listen(port, () => {
  console.log('Server listening at port: %d, env: %s', port, process.env.NODE_ENV);

  //console.log('config db => ', config.env.databases.apidb.host);

  programLogTriggerAPI()
  .then(() => console.log('Waiting for database events api db: ', dbConfigApi.database))
  .catch(console.error);

  programLogTriggerInf()
  .then(() => console.log('Waiting for database events inf db: ', dbConfigInf.database))
  .catch(console.error);

  // Here we send the ready signal to PM2
  //process.send('ready');

   // 1# Notify application ready
  setTimeout(function() {
    process.send('ready');
  }, 200);

});


/* program()
  .then(() => console.log('Waiting for database events...'))
  .catch(console.error); */