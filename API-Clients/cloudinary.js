
var mongo = require('mongodb');
var uristring = process.env.MONGO_DB_URI;
var cloudinary = require('cloudinary');
cloudinary.config({
	cloud_name: 'keyclue',
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
});

var addImage = function (input, callback) {
	var col_name = input.col_name;
	var spu = input.spu;

	cloudinary.v2.api.resources_by_tag(spu, function (error, result) {
		if (error) {
			return callback(null, null);
		} else {
			if (result.resources == "") {
				return callback(null, null);
			} else {
				return callback(null, result);
			}
		}
	});
}
exports.addImage = addImage;

var getAllImages = function (input, callback) {

	cloudinary.v2.api.resources(function (error, result) {
		console.log("err" + error);
		console.log("result" + JSON.stringify(result));
		if (error) {
			return callback(null, null);
		} else {
			if (result.resources == "") {
				return callback(null, null);
			} else {
				return callback(null, result);
			}
		}
	});
}
exports.getAllImages = getAllImages;

var deleteImage = function (input, callback) {
	var col_name = input.col_name;
	var sku = input.sku;

	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			console.log('ERROR connecting to: ' + uristring + '. ' + err);
			return callback(null, null);
		} else {

			db.collection(col_name, function (err, collection) {
				collection.update({ "product_details.sku": sku }, { $set: { "product_details.$.image": "" } }, function (error, success) {
					if (error) {

						return callback(null, "success");
					} else {
						db.close();
						return callback(null, "success");
					}

				});
			});
		}
	});


}
exports.deleteImage = deleteImage;

var updateImage = function (input, callback) {
	var col_name = input.col_name;
	var sku = input.sku;
	var spu = input.spu;
	var imageId = input.imageId;
	console.log("input" + JSON.stringify(input));
	mongo.connect(uristring, function (err, db) {
		if (err) {
			db.close();
			console.log('ERROR connecting to: ' + uristring + '. ' + err);
			return callback(null, null);
		} else {

			db.collection("sheet_data", function (err, collection) {
				collection.update({ $and: [{ "product_detssails.sku": sku }, { "collecsstion_id": col_name }] }, { $set: { "product_details.$.image": spu, "prossduct_details.$.image_id": imageId } }, function (error, success) {
					if (error) {
						console.log('ERROR--' + error);
						return callback(null, "success");
					} else {
						console.log('ERROR7777' + JSON.stringify(success));
						return callback(null, "success");
					}

				});
			});
		}


	});


}
exports.updateImage = updateImage;