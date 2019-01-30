
var mongo = require('mongodb');
var uristring = process.env.MONGO_DB_URI;

var createOption = function (input, callback) {
	var option_name = input.option_name;
	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			console.log('ERROR connecting to: ' + uristring + '. ' + err);
			return callback(null, null);
		} else {
			db.collection("options", function (err, collection) {
				collection.insert({ "name": option_name }, function (err, success) {
					if (err) {
						return callback(null, null);
					} else {
						db.close();
						return callback(null, "success");
					}
				});
			});
		}
	});
}
exports.createOption = createOption;

function addSheet(auth) {
	var sheets = google.sheets('v4');
	sheets.spreadsheets.create({
		auth: auth,
		resource: {
			properties: {
				title: brand_name
			}
		}
	}, (err, response) => {
		if (err) {
			console.log("errr" + err);
			return callback(null, null);
		} else {
			// console.log("Added"+JSON.stringify(response));   
			// res.send(response);   
			db.collection("brands", function (err, collection) {
				collection.insert({ "name": brand_name, 'sheet_id': response.spreadsheetId }, function (err, success) {
					if (err) {
						return callback(null, null);
					} else {
						db.close();
						return callback(null, "success");
					}
				});
			});

		}
	});
}

var createBrand = function (input, callback) {
	var brand_name = input.brand_name;
	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			console.log('ERROR connecting to: ' + uristring + '. ' + err);
			return callback(null, null);
		} else {
			let google = require('googleapis');
			let authentication = require("../authentication");
			authentication.authenticate().then((auth) => {
				console.log("auth", auth);
				addSheet(auth);
			});
		}
	});
}
exports.createBrand = createBrand;

var deleteBrand = function (input, callback) {
	var col_name = input.col_name;
	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			return callback(null, null);
		} else {
			db.collection("brands", function (err, collection) {
				collection.deleteOne({ "sheet_id": col_name }, function (err, success) {
					if (err) {
						return callback(null, null);
					} else {
						db.close();
						return callback(null, "success");
					}
				});
			});
		}
	});
}
exports.deleteBrand = deleteBrand;

var saveSheetData = function (input, callback) {
	var data = JSON.parse(input.data);
	var dataBase = input.data_base;
	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			console.log('ERROR connecting to: ' + uristring + '. ' + err);
			return callback(null, null);
		} else {
			db.collection(dataBase, function (err, collection) {
				collection.insert({ "product_details": data }, function (err, success) {
					if (err) {
						return callback(null, null);
					} else {
						db.close();
						return callback(null, "success");
					}
				});
			});
		}
	});
}
exports.saveSheetData = saveSheetData;