
var mongo = require('mongodb');
var uristring = process.env.MONGO_DB_URI;
var _ = require('underscore');
var googleSheet = function (input, callback) {
	var log_id = input.sheet_url;
	var col_name = input.col_name;
	var GoogleSpreadsheet = require('google-spreadsheet');
	var async = require('async');
	// spreadsheet key is the long id in the sheets URL
	// var doc = new GoogleSpreadsheet('1a_VZIN7bHNSzZ4YKRowKMznJE9ByKiJaTOSuBKclSog');
	var doc = new GoogleSpreadsheet(log_id);
	var sheet;

	async.series([
		function setAuth(step) {
			// see notes below for authentication instructions!
			var creds = require('../Oauth-Keyclue-81f0dec8682d.json');
			// OR, if you cannot save the file locally (like on heroku)
			var creds_json = {
				client_email: 'keycluehub@oauth-keyclue.iam.gserviceaccount.com',
				private_key: '\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCfV3KnmYuD2mMl\nxf/hldXNunMBq5I3kOb4mywPJOGPgxCiMen7/ALpLcGcU1vwzryKjTg6wJXpAoK+\nvCCFoN/9WYoB8UPc37K/3h2o/9lBARGLjLd4RWgORqAKG8kmAf3ZV9md4saXstwT\nAm7tETdzjNu69QO/QdJQqnVM9+4lRdzCJ82xNZRpnjFz8TINkiQd4zlGRdDR6dvC\n4H19fo2FJKK3fY0dWjX4v3GNRf+RnEKIHhudeAlUcG8pAuUsK4Ci370HXeaCEvhI\nQJNr5t6mcqPOPlD/i6i1N4lkfpqdRUQPvOog1+Tm92tvaSrTSesLTjTyCuA4BbQ6\nkjzWzRNPAgMBAAECggEAI0q3mtZ/16rhpeamZ50Lt17SBS8umf8OoUahKhOFoAcs\nAniitgyZynK3fLvb08i+asOfjifErFDBi6RYYbCBm/gegJKi8MNdMHDuSdWtFWA6\nthlrM4jP5MWQwdxon3H2exKhoP4u9T+Ize8OiZR0HzQ2IMEO3OgjwHkYtPz+8qMe\nTiVIaUu3vhyP4Iud50MMg5QhrtXtxIEKVO+iiTZ5FFTyfRtTQTAmM/1y4vbCEzx5\nWxO2q5D20J9JBdWvug4oF3xAcOrhniwmgmmgZKH0ia/ys5sMiYsFeD5+YmuG/vUo\n9bCAAs6NN2/AUDlPNcvB07nSI33G/Ke8zNMnYWYKPQKBgQDdFoSJVmz8oAt9q6W0\nT1mlLl+x67fTLcWNLmtJzvITtxHiYkVIDSqx2c4MhENHlCjyuqzZO5+UzMaXoh3b\ndt6uFmseHGKC43KlagXWzh4z7HxtYhWUv20taJBlkly3lmwnUyxqV40STgjDjMgY\nNDe3ERoo09pKa9+dCWNR1KhN4wKBgQC4gNU2Scwp4YALEkwHrcjTnThbrY7aZ63Y\nwIgVAZJRLKFBhJpiEOAH97DNx2IhaUcs2vEZwsW6Pqo6MzTnJUQtlbemHo3AmOzM\n5sfZMQF2L3ACzxFopxZytLLx9ufY4JeYQ5a9J8BVQZtI1bMZJRuTFx/P4md2ABe1\nfqAK5NegpQKBgGhwjbWPBTclp6f7IPEXlwKH8J7M+m6hLbRu3DHmt8aGccVepNnP\nln6jpEmXZWz32YwokSShnNYfEiVpaO9WrQTSBFIaGJM6PNtVRWLexbfDnFfTwNwe\nvcV4otXImVIElhzRlqa5qyOdh1hRNejxKeyqAJCO24zSfrThTXDHo6X/AoGBAJOd\nb/i5XoF7i4hQIUhbgDvepAKlf4+6N9sdX0L/OON9Q585ypL/UV7Oi0R4a0i0BGAc\n451queviyys5YPA2Xq/iA0cDVwJq17qwQeDBVpwKJCH7LcB/PnSToj/4/VIFjwQh\nv26jaTxM+0Jwx5Qsnj022Rrn10MPm+h34PAWW3aJAoGAMNgoauVVWbMVb4y1HB+J\nxoZfood3bRmoYI5eefXSOw0pkd0NMcMw7Cw3kKuQvh0MF5M0Fx78+zugqIcMUV2u\n1F3Rx4ov8kF013kahjd1yaNBG+OJieZaMqkW9hYNLbsW8lSiEuBfGIMcVzRDaJH5\n44+gAoyZxeJeKBlKavaiuls=\n'
			}
			doc.useServiceAccountAuth(creds, step);
		},
		function getInfoAndWorksheets(step) {
			doc.getInfo(function (err, info) {
				if (err) {
					console.log('err doc: ' + err);
					return callback(null, 'error');
				} else {
					console.log('Loaded doc: ' + JSON.stringify(info.worksheets));
					console.log('Loaded doc: ' + info.title + ' by ' + info.author.email);
					async.eachSeries(info.worksheets, function (item, next) {

						// console.log("item"+col_name);
						// console.log("item2"+item.title);
						if (item.title == col_name) {
							sheet = item;
						}
						next();
					}, function (err) {
						if (err) {
							return callback(err);
						}
						console.log('sheet 1: ' + sheet.title + ' ' + sheet.rowCount + 'x' + sheet.colCount);
						step();
					});
				}
			});
		},
		/* function workingWithRows(step) {
			// google provides some query options
			sheet.getRows({
				offset	: 1,
				limit	: 20,
				orderby : 'col2'
			}, function( err, rows ){
				console.log('Read '+rows.length+' rows');
				if(rows.length)
				// the row is an object with keys set by the column headers
				rows[0].colname = 'new val';
				rows[0].save(); // this is async
				// deleting a row
				rows[0].del();  // this is async
				step();
			});
		}, */
		function workingWithCells(step) {
			sheet.getCells({
				'min-row': 1,
				'max-row': 39,
				'min-col': 1,
				'max-col': 23,
				'return-empty': true
			}, function (err, cells) {
				console.log("cells" + JSON.stringify(cells));
				var cell = cells[0];
				// console.log('Cell R'+cell.row+'C'+cell.col+' = '+cell.value);
				// response.send(cells);
				return callback(null, cells)
				// cells have a value, numericValue, and formula
				cell.value == '1'
				cell.numericValue == 1;
				cell.formula == '=ROW()';
				// updating `value` is "smart" and generally handles things for you
				cell.value = 123;
				cell.value = '=A1+B2'
				cell.save(); //async
				// bulk updates make it easy to update many cells at once
				cells[0].value = 1;
				cells[1].value = 2;
				cells[2].formula = '=A1+B1';
				sheet.bulkUpdateCells(cells); //async
				step();
			});
		}/* ,
			function managingSheets(step) {
				doc.addWorksheet({
					title: 'my new sheet'
				}, function(err, sheet) {
					if(err){
						console.log(err+"errr");
						response.send(err);
					}else{
						// change a sheet's title
						sheet.setTitle('new title'); //async
						//resize a sheet
						sheet.resize({rowCount: 50, colCount: 20}); //async
						sheet.setHeaderRow(['name', 'age', 'phone']); //async
						// removing a worksheet
						sheet.del(); //async
						step();
					}
				});
			} */
	], function (err) {
		if (err) {
			console.log('Error: ' + err);
		}
	});
}
exports.googleSheet = googleSheet;


var getSheetData = function (input, callback) {

	var collection_id = input.col_id;
	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			console.log('ERROR connecting to: ' + uristring + '. ' + err);
			respone.send(err);
		} else {
			db.collection("sheet_data", function (err, collection) {
				collection.find({ "collection_id": collection_id }).toArray(function (error, success) {
					if (error) {
						return callback(error);
					} else {
						return callback(null, success);
					}
				});
			});
		}
	});
}
exports.getSheetData = getSheetData;
