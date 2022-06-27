const mysql = require("mysql");
const Json2csvParser = require("json2csv").Parser;
const fs = require("fs");
var moment = require('moment');
var server = require('./server');

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Wissen@5567",
  dateStrings:true,
  database: "employeedata"
});


connection.connect(error => {
    if (error) throw error;
    // query data from MySQL
    connection.query("SELECT * FROM employeedata", function(err, data, fields) {
        if (err) throw error;
        const jsonData = JSON.parse(JSON.stringify(data));

        // Date functions
        var yesterday = moment().subtract(1, 'day')

        var filterDate = yesterday.format("YYYY-MM-DD");      

        var csvData = jsonData.filter(function(element){
            return element.punchDate === `${filterDate}`
        })

        // export to CSV file
        const json2csvParser = new Json2csvParser({ header: true});
        const csv = json2csvParser.parse(csvData);

        fs.writeFile(`services/Exports/${filterDate}Data.csv`, csv, function(er){
            if (er) throw error;
            console.log(".csv successfully!");
            server();
        });
    }); 
});