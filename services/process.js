const mysql = require("mysql");
var moment = require('moment');
var async = require('async');

// Date functions
var yesterday = moment().subtract(1, 'day')
var filterDate = yesterday.format("YYYY-MM-DD"); 

const processing = ()=>{
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "Wissen@5567",
        dateStrings:true,
        database: "databaseemployees"
    });
    
    connection.connect(error => {
        if (error) throw error;
        // query data from MySQL
        connection.query("SELECT * FROM tempdata", function(err, data, fields) {
            if (err) throw error;
            const jsonData = JSON.parse(JSON.stringify(data));

            // Map the jsonData

            let finalEmpArray = [];
            const map=new Map();
            var empdata = null;

            jsonData.forEach((ele)=>{
                if(map.has(ele.employeeId)){
                   let values=map.get(ele.employeeId);
                   values.push(ele);
                   map.set(ele.employeeId,values);
                }else{
                    let arr=[]
                    arr.push(ele)
                    map.set(ele.employeeId,arr);
                }
                return map
            })
            
            // keys are array of employeeId's here
            var keysdata = [...map.keys()]
            console.log(keysdata);

            for(let key of keysdata){
                empdata = map.get(key);

                // first punchIn
                var first = empdata.find(function(value,index,array){
                    if(value.IOType === 'IN'){
                        return value;
                    }
                })

                // last punchOut
                var last = empdata.reverse().find(function(value,index,array){
                    if(value.IOType === 'OUT'){
                        return value;
                    }
                })

                let loopEmpdata = empdata.reverse(); 
                let i = 0;
                let n = loopEmpdata.length;

                // initial
                var sumOfDiff = '00:00:00';

                // duration of hours employee inside office
                while(i<n){
                    let start;
                    let end;
                    if(loopEmpdata[i].IOType === 'IN' && loopEmpdata[i].punchDate === filterDate){
                        start = moment(loopEmpdata[i].punchTime,"HH:mm:ss");
                    }
                    if(loopEmpdata[i+1].IOType === 'OUT' && loopEmpdata[i+1].punchDate === filterDate){
                        end = moment(loopEmpdata[i+1].punchTime,"HH:mm:ss"); 
                    }
                    var difference = moment.duration(end.diff(start));
                    let differenceResult = `${difference.hours()}:${difference.minutes()}:${difference.seconds()}`;
                    sumOfDiff = moment.duration(sumOfDiff).add(moment.duration(differenceResult));
                    i=i+2;
                }

                //total hours                
                let sumOfTotalHours = `${sumOfDiff.hours()}:${sumOfDiff.minutes()}:${sumOfDiff.seconds()}`;
                let totalHours = sumOfTotalHours;

                let empObject = {
                    employeeId : first.employeeId,
                    employeename : first.employeeName,
                    punchIn : first.punchTime,
                    punchout : last.punchTime,
                    punchDate : first.punchDate,
                    totalHours : totalHours
                }

                // final processed array of Objects
                finalEmpArray.push(empObject);
                
            }

            // Rollback
            function rollback(con, rollerr) {
                connection.rollback(function () {
                    throw rollerr;
                });
            }

            // Commit Connection
            function commit(connect) {
                connection.commit(function (commiterr) {
                    if (commiterr) {
                        rollback(connect, commiterr);
                    }

                    //  Query to check processeddata against itself
                    connection.query({
                        sql:'delete t2 FROM processeddata t1 INNER JOIN processeddata t2 WHERE t1.id < t2.id AND t1.employeeId = t2.employeeId AND t1.punchDate = t2.punchDate AND t1.punchIn = t2.punchIn AND t1.punchOut = t2.punchOut;'
                        },function (duperr, results,field) {
                        if (duperr) throw error;
                        console.log('Duplicates are removed from processeddata');
                        }
                    );

                });
            }

            // Insert into processeddata table
            function insertIntoProcess(sourcedata,callback) {
                async.each(sourcedata, function (entry, asyncCallback) {
                  connection.query('INSERT INTO processeddata SET ?', entry, function (inserterr, datas) {
                    return asyncCallback(inserterr, datas);
                  });
                }, 
                
                function (callerr) {
                  if (callerr) {           
                    return callback(callerr);
                  }
                  return callback();
                });
            }

            // Transaction - processeddata
            connection.beginTransaction(function (transacterror) {
                if (transacterror) {
                    throw transacterror;
                }
                insertIntoProcess(finalEmpArray,function (processerror, processdata) {
                if (processerror) {
                    rollback(connection, processerror);
                } 
                else {
                    commit(connection);
                }
                });
            });

        })
    })
}

module.exports=processing;

