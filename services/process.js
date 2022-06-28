const mysql = require("mysql");
var moment = require('moment');
const { indexOf } = require("lodash");

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
            
            var keysdata = [...map.keys()]
            console.log(keysdata);

            for(let key of keysdata){
                empdata = map.get(key);

                var first = empdata.find(function(value,index,array){
                    if(value.IOType === 'IN'){
                        return value;
                    }
                })

                var last = empdata.reverse().find(function(value,index,array){
                    if(value.IOType === 'OUT'){
                        return value;
                    }
                })

                let loopEmpdata = empdata.reverse(); 
                let i = 0;
                let n = loopEmpdata.length;

                var sumOfDiff = '00:00:00';

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

                finalEmpArray.push(empObject);
                
            }

            console.log(finalEmpArray);

        })
    })
}

module.exports=processing;

