const csvtojson = require('csvtojson');
var _ = require('lodash');
var moment = require('moment');
var async = require('async');
const mysql = require("mysql");
var processing = require('./process');

// Date functions
var yesterday = moment().subtract(1, 'day')
var filterDate = yesterday.format("YYYY-MM-DD");   

// CSV to MySQL DB

csvtojson().fromFile(`services/Exports/${filterDate}Data.csv`).then(source=>{
  
  // Loadash Method to remove double data from csv

  let processResult = _.uniqBy(source, function(elem) {
    return JSON.stringify(_.pick(elem, ['employeeId','punchTime']));
  });

  const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Wissen@5567",
    dateStrings:true,
    database: "databaseemployees"
  });



  // Rollback
  function rollback(con, err) {
    connection.rollback(function () {
      throw err;
    });
  }
    
  // Commit Connection
  function commit(con) {
    connection.commit(function (err) {
      if (err) {
        rollback(con, err);
      }
      
      // Query to check rawdata against tempdata
      connection.query({
        sql:'delete t1 FROM rawdata t1 INNER JOIN tempdata t2 WHERE t1.id < t2.id AND t1.employeeId = t2.employeeId AND t1.punchDate = t2.punchDate AND t1.punchTime = t2.punchTime AND t1.IOType = t2.IOType;'
        },function (error, results, fields) {
          if (error) throw error;
        }
      );

      //  Query to check rawdata against itself
      connection.query({
        sql:'delete t2 FROM rawdata t1 INNER JOIN rawdata t2 WHERE t1.id < t2.id AND t1.employeeId = t2.employeeId AND t1.punchDate = t2.punchDate AND t1.punchTime = t2.punchTime AND t1.IOType = t2.IOType;'
        },function (error, results, fields) {
          if (error) throw error;
          console.log('Duplicate Removal Done');
          processing();
        }
      );

      
    });
  }

  // Temp Table creation

  connection.query("DROP TABLE tempdata", (err, drop) => {
    if(err) console.log(err);
    var createStatament = 
    "CREATE TABLE tempdata("+
    "id int NOT NULL AUTO_INCREMENT,"+
    "employeeId int,"+
    "employeeName varchar(255),"+
    "punchTime varchar(255),"+
    "IOType varchar(5),"+
    "punchMode varchar(10),"+
    "eventStatus varchar(15),"+
    "punchDate date,"+
    "primary key(id))"

    connection.query(createStatament, (error, create) => {
      if (error)
        console.log("ERROR: ", error);
    });

  });

  // Insert User Entry Function - temp data table

  function insertIntoTemp(sourcedata,callback) {
    async.each(sourcedata, function (entry, asyncCallback) {
      connection.query('INSERT INTO tempdata SET ?', entry, function (err, data) {
        return asyncCallback(err, data);
      });
    }, 
    
    function (err) {
      if (err) {           
        return callback(err);
      }
      return callback();
    });
  }

  // Insert User Entry Function - Raw data table

  function insertIntoRaw(sourcedata,callback) {
    async.each(sourcedata, function (entry, asyncCallback) {
      connection.query('INSERT INTO rawdata SET ?', entry, function (err, data) {
        return asyncCallback(err, data);
      });
    }, 
    
    function (error) {
      if (error) {           
        return callback(error);
      }
      return callback();
    });
  }


  // Transaction - Main
  connection.beginTransaction(function (err) {
    if (err) {
      throw err;
    }
    insertIntoTemp(processResult,function (temperror, tempdata) {
      if (temperror) {
        rollback(connection, temperror);
      } 
      else {
        insertIntoRaw(processResult,function (rawerror, rawdata) {
          if (rawerror) {
            rollback(connection, rawerror);
          } 
          else {
            commit(connection);
          }
        });
      }
    });
  });
});

