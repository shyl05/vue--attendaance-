const mysql = require("mysql");
var moment = require('moment');
var async = require('async');

// Date functions
var yesterday = moment().subtract(1, 'day')
var filterDate = yesterday.format("YYYY-MM-DD");

const processed=()=>{
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

            //  Query to check finalprocesseddata against itself
            connection.query({
                sql:'delete t2 FROM finalprocesseddata t1 INNER JOIN finalprocesseddata t2 WHERE t1.id < t2.id AND t1.employeeId = t2.employeeId AND t1.punchDate = t2.punchDate;'
                },function (error, results, fields) {
                    if (error) throw error;
                    console.log('Final Processing Done');
                }
            );

        });
    }

    connection.connect(error=>{
        if (error) throw error;

        // finalprocesseddata Table creation for passing filterdate values for Api and remove Exclusions

        connection.query("DROP TABLE finalprocesseddata", (err, drop) => {
            if(err) console.log(err);
            var createStatament = 
            "CREATE TABLE finalprocesseddata("+
            "id int NOT NULL AUTO_INCREMENT,"+
            "employeeId int,"+
            "employeeName varchar(255),"+
            "punchIn varchar(255),"+
            "punchOut varchar(255),"+
            "totalHours varchar(255),"+
            "punchDate date,"+
            "primary key(id))"

            connection.query(createStatament, (error1, create) => {
                if(error1){
                    console.log("ERROR: ", error1);
                }

                let final = [];
                connection.query({
                    sql:'SELECT * FROM processeddata WHERE employeeId NOT IN (SELECT employeeId FROM exclusiondata);'
                    },[filterDate],function (err1, results,fields) {
                        if (err1){ throw err1}
                        final = results;
                    }
                );
    
    
                // Insert data - finalprocesseddata table
    
                function insertIntoFinal(sourcedata,callback) {
                    async.each(sourcedata, function (entry, asyncCallback) {
                        connection.query('INSERT INTO finalprocesseddata SET ?', entry, function (err2, data) {
                            return asyncCallback(err2, data);
                        });
                    }, 
        
                    function (err2) {
                    if (err2) {           
                        return callback(err2);
                    }
                    return callback();
                    });
                }
    
                connection.beginTransaction(function (err3) {
                    if (err3) {
                      throw err3;
                    }
                    insertIntoFinal(final,function (finalerror, finaldata) {
                      if (finalerror) {
                        rollback(connection, finalerror);
                      } 
                      else {
                        commit(connection);
                      }
                    });
                });

            });


        });

        
    })
}

module.exports = processed;