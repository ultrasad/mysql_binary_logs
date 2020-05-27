require('dotenv').config();
process.env.NODE_ENV = process.env.NODE_ENV || 'development'; //set default if nil, (production, development)
const port = process.env.PORT || 8081;

const mysql = require('mysql');
const MySQLEvents = require('@rodrigogs/mysql-events');

//const http = require('http');
//const express = require('express');

const config = require('./config/config');

//const mongoose = require('./config/mongoose');
const express = require('./config/express');
const app = express(); //new express server

//- Connection configuration
var dbConfig = {
  host: config.env.databases.ccomdb.host,
  user: config.env.databases.ccomdb.user,
  password: config.env.databases.ccomdb.password,
  database : config.env.databases.ccomdb.database,
  charset : config.env.databases.ccomdb.charset,
  connectionLimit: config.env.databases.ccomdb.connectionLimit,
  queueLimit: config.env.databases.ccomdb.queueLimit,
  waitForConnection: config.env.databases.ccomdb.waitForConnection
};

const pricelist = async (pricelistId) => {
  /* return new Promise((resolve, reject) => {
    const options = {
      host: config.env.loyalty_enpoint_url,
      port: 443,
      path: '/api/loyalty/member',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "Content-Length": Buffer.byteLength(requestJson),
        'Authorization': config.env.loyalty_api_token
      }
    }
    
    const req = https.request(options, res => {
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
    req.end();

  }); */
};

const program = async () => {

  /* const connection = mysql.createConnection(db_config);
  connection.connect(function(err) {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return;
    }
    console.log('connected as id ' + connection.threadId);
  }); */

  const pool = mysql.createPool(dbConfig);
  pool.getConnection(function(err, connection) {
    // connected! (unless `err` is set)
    console.log('connected as id ' + connection.threadId);
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

  
  //const instance = new MySQLEvents(connection, {
  const instance = new MySQLEvents(pool, {
    startAtEnd: true, // to record only the new binary logs, if set to false or you didn'y provide it all the events will be console.logged after you start the app
    excludedSchemas: {
      mysql: true,
    },
  });
  
  instance.start()
  .then(() => console.log('I\'m running!'))
  .catch(err => console.error('Something bad happened', err));

  instance.stop()
  .then(() => console.log('I\'m stopped!'))
  .catch(err => console.error('Something bad happened', err));
  
  instance.addTrigger({
    //name: 'monitoring all statments',
    //expression: 'TEST.*', // listen to TEST database !!!
    //expression: 'ccinterface.log_session', // listen to ccinterface database !!!
    //expression: '*.*', // listen to ccinterface database !!!
    //expression: '*.*', // listen to test database !!!
    name: 'MYSQL PRD 234', //234(223)
    //expression: '*',
    expression: dbConfig.database + '.log_callid', // listen to apishop database !!!
    //statement: MySQLEvents.STATEMENTS.ALL, // you can choose only insert for example MySQLEvents.STATEMENTS.INSERT, but here we are choosing everything
    //statement: MySQLEvents.STATEMENTS.INSERT,
    statement: MySQLEvents.STATEMENTS.ALL, //INSERT, UPDATE, DELETE
    onEvent: (event) => {
      console.log(event.affectedRows);
      //console.log('Effected Ref No: ', (event.affectedRows[0])?event.affectedRows[0].before.ref_no:undefined);
    }
  });
  
  instance.on(MySQLEvents.EVENTS.CONNECTION_ERROR, (err) => console.log('Connection error', err));
  instance.on(MySQLEvents.EVENTS.ZONGJI_ERROR, (err) => console.log('ZongJi error', err));

};

let appServer = app.listen(port, () => {
  console.log('Server listening at port: %d, env: %s', port, process.env.NODE_ENV);

  //console.log('config db => ', config.env.databases.apidb.host);

  program()
  .then(() => console.log('Waiting for database events...', dbConfig.database))
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