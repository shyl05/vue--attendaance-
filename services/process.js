const mysql = require("mysql");

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


                let empObject = {
                    employeeId : first.employeeId,
                    employeename : first.employeeName,
                    punchIn : first.punchTime,
                    punchout : last.punchTime,
                    punchDate : first.punchDate,
                }

                finalEmpArray.push(empObject);
                
            }

            console.log(finalEmpArray);

        })
    })
}

module.exports=processing;

