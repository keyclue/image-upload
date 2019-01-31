var mongo = require('mongodb');
var uristring = process.env.MONGO_DB_URI;
var _ = require('underscore');
var async = require('async');
var shopifyAPI = require('shopify-node-api');
var Shopify = new shopifyAPI({
	shop: 'keyclue-wholesale-store_old', // MYSHOP.myshopify.com 
	shopify_api_key: 'aa2839db2d7cd62e8b5d9094ea359616_old', // Your API key 
	access_token: 'a0577311b7e283cd4b3e9a7396326a00_old' // Your API password 
});

var addProduct = function (input, callback) {

	var id = input.id;
	var brand_name = input.brand_name;
	var col_name = input.col_name;
	var productSku = JSON.parse(input.product_sku);
	var productIds = [];
	console.log("product" + productSku);
	var oldProductName = "";
	var savedProductId = "";
	async.eachSeries(productSku, function (item, next) {
		console.log("item" + item);
		mongo.connect(uristring, function (err, db) {
			if (err) {
				db.close();
				//console.log ('ERROR connecting to: ' + uristring + '. ' + err);
				return callback(null, null);
			} else {
				db.collection("sheet_data", function (err, collection) {
					collection.aggregate([
						{ "$unwind": "$product_details" },
						{
							"$match": {
								"$and": [{
									"product_details.sku": item
								},
								{
									"collection_id": id
								}]
							}
						},
						{
							"$group": {
								"_id": "$_id",
								"product_detail": { "$push": "$product_details" }
							}
						}
					], function (error, result) {
						console.log("rewsult+++", JSON.stringify(result));

						async.eachSeries(result, function (item1, next1) {
							async.eachSeries(item1.product_detail, function (item2, next2) {
								console.log('here');
								var image = item2.image.replace(new RegExp("'", "gi"), "");
								var imageData = image.split(',');
								var uploadData = [];
								_.each(imageData, function (imgData) {
									uploadData.push({ "src": imgData })
								});

								/*
								var post_data = {
"product": {
	"title": "Burton Custom Freestyle 151",
	"body_html": "<strong>Good snowboard!</strong>",
	"vendor": "Burton",
	"product_type": "Snowboard",
	
"variants": [
		{
			"option1": "Blue",
			"option2": "155",
	"sku": "123"
		},
	{
			"option1": "Blue",
			"option2": "159",
	"sku": "123"
		},
		{
			"option1": "Black",
			"option2": "159",
		"sku": "111"
		},
		{
			"option1": "Black",
			"option2": "156",
		"sku": "111"
		}
	],
	"options": [
		{
			"name": "Color",
			"values": [
				"Blue",
				"Black"
			]
		},
		{
			"name": "Size",
			"values": [
				"155",
				"159"
			]
		}
	]
 
}
};*/
								/*	var post_data = {
									  "product": {
										"title": item2.product_name,
										"body_html": "<strong>Good snowboard!</strong>",
										"vendor": brand_name,
										"product_type": "Snowboard",
										"images":uploadData,
										// "product_id": 632910392,
										
										"variants": [
										  {
											"price": item2.product_price,
											"sku": item2.sku,
											"barcode": item2.barcode_number,
											"created_at": item2.created_date,
											"weight": item2.weight_in_kg,
											"weight_unit": "kg",
											"inventory_management": "shopify",
											"inventory_policy": "continue",
											"inventory_quantity": 10,
											"position": 1,
											"requires_shipping": true,
											"taxable": true,
											"updated_at": item2.modified_date
										}]
				
									  }
									};
							if(item2.shopify == 0){
								console.log('here-postData'+JSON.stringify(post_data));
									Shopify.post('/admin/products.json', post_data, function(err, data, headers){
										console.log('----------------------------resp----', data);
										console.log('----------------------------err----', err);
										if(data.errors == undefined){
											db.collection("sheet_data").update({"product_details.sku":item2.sku},{ $set: { "product_details.$.shopify" : data.product.id }});
											productIds.push({"product_id" : data.product.id});
										}else{
											return callback(null, 'success');
										}
										
									next2();
									});
								}else{
									
									Shopify.get('/admin/products/' + item2.shopify + '.json', function(err, data, headers){
											console.log('*********resp----', data.errors);
											console.log('****************err----', err);
										if(data.errors == "Not Found"){
											Shopify.post('/admin/products.json', post_data, function(err, data, headers){
												console.log('++++++++++++++++resp----', data);
												console.log('++++++++++++++++err----', err);
												 if(data.errors == undefined){
											console.log("iffffffelse");
													 
													db.collection("sheet_data").update({"product_details.sku":item2.sku},{ $set: { "product_details.$.shopify" : data.product.id }});
													productIds.push({"product_id" : data.product.id});
												}else{
											console.log("else");
													return callback(null, 'success');
												 }
												next2();
											});
											
										}else{
											console.log("else");
											var  post_data2 ={
									  "product": {
										"id": item2.shopify,
										"title": item2.product_name
									  }
									};
										Shopify.put('/admin/products/' + item2.shopify + '.json', post_data2, function(err, data, headers){
																									
											next2();
										});
										}
									});
								} */

							}, function (err) {
								if (err) {
									return callback(err);
								}
								next1();
							});
						}, function (err) {
							if (err) {
								return callback(err);
							}
							next();
						});



					});
				});
			}
		});

	}, function (err) {
		if (err) {
			return callback(err);
		}
		var exist = false;
		Shopify.get('/admin/custom_collections.json', function (err, data, headers) {

			if (err) {

			}
			if (data == null) {
				var collData = { "custom_collection": { "title": col_name, "collects": productIds } };
				Shopify.post('/admin/custom_collections.json', collData, function (err, data, headers) {

				});
			} else {
				var col_id;
				async.eachSeries(data.custom_collections, function (item, next) {
					// console.log("--"+item.title);
					if (item.title == col_name) {
						// console.log("--++++"+item.id);
						exist = true;
						col_id = item.id;
					}
					next();
				}, function (err) {
					if (err) {
						return callback(err);
					}
					console.log("exist" + exist);
					if (exist == true) {
						console.log("col_id" + col_id);
						var data = { "custom_collection": { "id": col_id, "collects": productIds } };
						Shopify.put('/admin/custom_collections/' + col_id + '.json', data, function (err, data, headers) {

						});
					} else {
						var collData = { "custom_collection": { "title": col_name, "collects": productIds } };
						Shopify.post('/admin/custom_collections.json', collData, function (err, data, headers) {
						});
					}

				});
			}
			return callback(null, 'success');
		});
	});
}


exports.addProduct = addProduct;
