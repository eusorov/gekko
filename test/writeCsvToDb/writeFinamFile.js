'use strict';
const parse      = require('csv-parse');
const util       = require('util');
const fs         = require('fs');
const mysql      = require('mysql');
const csvHeaders = require('csv-headers');
const async      = require('async');
const moment      = require('moment');
// const path       = require('path');
// const co         = require('co');
// const leftpad    = require('leftpad');

const dbhost = "localhost"
const dbuser = "crypto"
const dbpass = "123456"
const dbname = "cryptodb"
const tblnm  = "stocks_candles_eur_"+process.argv[3];
const csvfn  = process.argv[2];

new Promise((resolve, reject) => {
    csvHeaders({
        file      : csvfn,
        delimiter : ','
    }, function(err, headers) {
        if (err) reject(err);
        else resolve({ headers });
    });
})
.then(context => {
    return new Promise((resolve, reject) => {

        context.db = mysql.createConnection({
            host     : dbhost,
            user     : dbuser,
            password : dbpass,
            database : dbname
        });

        context.db.connect((err) => {
            if (err) {
                console.error('error connecting: ' + err.stack);
                reject(err);
            } else {
                resolve(context);
            }
        });
    })
})
.then(context => {
    return new Promise((resolve, reject) => {
        context.db.query(`drop table IF EXISTS ${tblnm}`,
        [ ],
        err => {
            if (err) reject(err);
            else resolve(context);
        })
    });
})
.then(context => {
    return new Promise((resolve, reject) => {
        var fields = '';
        var fieldnms = '';
        var qs = '';
        context.fieldnms = fieldnms;
        console.log(`about to create CREATE TABLE IF NOT EXISTS ${tblnm}`);
        context.db.query(`CREATE TABLE IF NOT EXISTS ${tblnm} 
            (
            id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
            start INT UNSIGNED UNIQUE,
            open DOUBLE NOT NULL,
            high DOUBLE NOT NULL,
            low DOUBLE NOT NULL,
            close DOUBLE NOT NULL,
            vwp DOUBLE NOT NULL,
            volume DOUBLE NOT NULL,
            trades INT UNSIGNED NOT NULL
          );`, err => {
              if (err){
                  console.log(err);
                  reject(err);
              }
              resolve (context);
          });
    });
})
.then(context => {
    return new Promise((resolve, reject) => {
        const parser = parse({
            delimiter: ',',
            columns: true,
            relax_column_count: false,
            skip_lines_with_error: false,
            skip_empty_lines: true
        });

        const date = 'Date'; const time = 'Timestamp'; const open = 'Open'; 
        const high = 'High'; const low = 'Low'; const close = 'Close'; const volumen = 'Volume';

        parser.on('readable', function(){
                let row

                let i = 0;
                let data = [];
                // console.log("readable");
                while (row = parser.read()) {

                    let d = [];
                    let dateComibined = row[date]+'-'+row[time];
                    let timeMoment = moment.utc(dateComibined, "YYYYMMDD-HH:mm:ss");

                    // if (date === "20190501-000100"){
                    //     console.log("time in unix: "+time.unix()); //1556668860
                    // }
                    // console.log(row);
                    d.push(timeMoment.unix())
                    d.push(Number(row[open].trim()).valueOf())
                    d.push(Number(row[high].trim()).valueOf())
                    d.push(Number(row[low].trim()).valueOf())
                    d.push(Number(row[close].trim()).valueOf())
                    d.push(0);
                    d.push(Number(row[volumen].trim()).valueOf())
                    d.push(0);

                    data.push(d);

                }
                        if (data.length > 0) {
                            context.db.query(`INSERT INTO ${tblnm} (start, open, high,low, close, vwp, volume, trades) VALUES ? `, [data],
                            (err, result) => {
                                if (err) {
                                    console.error(err); 
                                    reject(err);
                                }
    
                                ++i;
                                // console.log("inserted, data.length "+data.length);
                                // data.length = 0;
                                data = [];
    
                                // console.log("result")
                                // console.log(result);
                            })
                        }
            });

        parser.on('error', function(err){
                console.error(err.message)
            })

        parser.on('end', function(){
                resolve(context);
            });
        fs.createReadStream(csvfn).pipe(parser);

    });
})
.then(context => { context.db.end(); })
.catch(err => { console.error(err.stack); });
