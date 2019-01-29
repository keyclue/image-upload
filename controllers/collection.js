
var mongo = require('mongodb');
var uristring = process.env.MONGO_DB_URI;
var rn = require('random-number');
var options = {
	min: 1
	, max: 10000
	, integer: true
}
let google = require('googleapis');
let authentication = require("../authentication");

var createCollection = function (input, callback) {
	var col_name = input.col_name;
	var id = input._id;
	var random = rn(options);
	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			return callback(error);
		} else {
			authentication.authenticate().then((auth) => {
				appendData(auth);
			});

			function appendData(auth) {
				var sheets = google.sheets('v4');
				console.log("sheets.spreadsheets" + JSON.stringify(sheets.spreadsheets));
				sheets.spreadsheets.batchUpdate({
					auth: auth,
					spreadsheetId: id,
					resource: {
						requests: [{
							addSheet: {
								properties:
								{
									"sheetId": random,
									"title": col_name,
									"index": 1,
									// "sheetType": enum(SheetType),
									// "gridProperties": {
									// object(GridProperties)
									// },
									// "hidden": boolean,
									// "tabColor": {
									// object(Color)
									// },
									// "rightToLeft": boolean,
								}

							}
						}]
					}

				}, (err, response) => {
					if (err) {
						console.log('The API returned an error: ' + err);
						return;
					} else {

						db.collection("collections", function (err, collection) {
							collection.insert({ "is_deleted": 0, "name": col_name, "brand_id": id, "sheet_id": random, "tag": col_name }, function (err, result) {
								if (err) {
									return callback(null, null);
								} else {
									return callback(null, id);
									db.close();
								}
							});
						});
						console.log("Appended");
					}
				});
			}
		}
	});
}
exports.createCollection = createCollection;
var duplicateCollection = function (input, callback) {
	var col_id = input.col_id;
	var brand_id = input.brand_id;
	var sheet_id = input.sheet_id;
	var col_name = input.col_name;
	var old_col_name = input.old_col_name;

	var random = rn(options);
	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			return callback(error);
		} else {
			authentication.authenticate().then((auth) => {
				appendData(auth);
			});

			function appendData(auth) {
				db.collection("collections", function (err, collection) {
					collection.find({ $and: [{ "brand_id": brand_id }, { "tag": old_col_name }] }).toArray(function (error, result) {


						var colName = old_col_name + '-' + result.length;

						var sheets = google.sheets('v4');
						// console.log("sheets.spreadsheets"+JSON.stringify(sheets.spreadsheets));
						sheets.spreadsheets.batchUpdate({
							auth: auth,
							spreadsheetId: brand_id,
							resource: {
								requests: [{
									duplicateSheet: {

										"sourceSheetId": sheet_id,
										"insertSheetIndex": 1,
										"newSheetId": random,
										"newSheetName": colName,

									}
								}]
							}

						}, (err, response) => {
							if (err) {
								console.log('The API returned an error: ' + err);
								return;
							} else {

								db.collection("collections", function (err, collection) {
									collection.insert({ "tag": col_name, "name": colName, "brand_id": brand_id, "sheet_id": random }, function (err, result) {
										if (err) {
											return callback(null, null);
										} else {
											return callback(null, brand_id);
											db.close();
										}
									});
								});
								console.log("Appended");
							}
						});
					});
				});

			}
		}
	});
}
exports.duplicateCollection = duplicateCollection;

var deleteCollection = function (input, callback) {
	var col_id = input.col_id;
	var brand_id = input.brand_id;
	var sheet_id = input.sheet_id;
	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			return callback(null, null);
		} else {
			authentication.authenticate().then((auth) => {
				appendData(auth);
			});

			function appendData(auth) {
				var sheets = google.sheets('v4');
				console.log("sheets.spreadsheets" + JSON.stringify(sheets.spreadsheets));
				sheets.spreadsheets.batchUpdate({
					auth: auth,
					spreadsheetId: brand_id,
					resource: {
						requests: [{

							"deleteSheet": {
								"sheetId": sheet_id
							}

						}]
					}

				}, (err, response) => {
					if (err) {
						console.log('The API returned an error: ' + err);
						return;
					} else {
						db.collection("collections", function (err, collection) {
							collection.update({ "_id": new mongo.ObjectID(col_id) }, { $set: { "is_deleted": 1 } }, function (err, success) {
								console.log("delete" + JSON.stringify(success))
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
		}
	});
}
exports.deleteCollection = deleteCollection;

var saveSheetData = function (input, callback) {
	var data = JSON.parse(input.data);
	var collection_id = input.data_base;
	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			console.log('ERROR connecting to: ' + uristring + '. ' + err);
			return callback(null, null);
		} else {
			db.collection("sheet_data", function (err, collection) {
				collection.findOne({ "collection_id": collection_id }, function (err, item) {
					if (err) {
						// res.redirect("/error404");
					} else {
						if (item == null) {
							collection.insert({ "product_details": data, "collection_id": collection_id }, function (err, success) {
								if (err) {
									return callback(null, null);
								} else {
									db.close();
									return callback(null, "success");
								}
							});
						} else {
							collection.deleteOne({ "collection_id": collection_id }, function (err, item) {
								if (err) {
									return callback(null, null);
								} else {
									collection.insert({ "product_details": data, "collection_id": collection_id }, function (err, success) {
										if (err) {
											return callback(null, null);
										} else {
											db.close();
											return callback(null, "success");
										}
									});
								}
							});
						}
					}
				});
			});


		}
	});
}
exports.saveSheetData = saveSheetData;