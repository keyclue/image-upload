var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var xlsx = require('xlsx');
var request = require('request');
var fs = require('fs');
var multer = require('multer');
var tableify = require('tableify');
var middleware = require('../middleware');
var json2xls = require('json2xls');
var mongoose = require("mongoose");
var mongoXlsx = require('mongo-xlsx');
var arraysort = require('array-sort');

var ApiClient = require('taobao-sdk').ApiClient;
var client = new ApiClient({
	appkey: process.env.TMALL_API_KEY,
	appsecret: process.env.TMALL_API_SECRET,
	REST_URL: 'http://gw.api.taobao.com/router/rest'
});

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, '/tmp/keyclue-upload');
	},
	filename: function (req, file, callback) {
		callback(null, Date.now() + file.originalname);
	}
});
var xlsxFilter = function (req, file, cb) {
	// accept image files only
	if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
		return cb(new Error('Only xlsx, xls files are allowed!'), false);
	}
	cb(null, true);
};
var imageFilter = function (req, file, cb) {
	// accept image files only
	if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
		return cb(new Error('Only image files are allowed!'), false);
	}
	cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: xlsxFilter });

/*var parser = require('fast-xml-parser');
var he = require('he');
var options = {
	attributeNamePrefix: "@_",
	attrNodeName: "attr", //default is 'false'
	textNodeName: "#text",
	ignoreAttributes: true,
	ignoreNameSpace: false,
	allowBooleanAttributes: false,
	parseNodeValue: true,
	parseAttributeValue: false,
	trimValues: true,
	cdataTagName: "__cdata", //default is 'false'
	cdataPositionChar: "\\c",
	localeRange: "", //To support non english character in tag/attribute values.
	parseTrueNumberOnly: false,
	attrValueProcessor: a => he.decode(a, { isAttributeValue: true }),//default is a=>a
	tagValueProcessor: a => he.decode(a) //default is a=>a
};*/

var parseString = require('xml2js').parseString;

router.get('/itemadd', function (req, res) {
	res.render('tmall/itemadd', { table: '' });
});

router.post('/itemadd', function (req, res) {

	var qinput = req.body.keyword;
	var Results = [];
	var temp = [];
	client.execute(
		'taobao.items.inventory.get', {
			session: process.env.TMALL_SESSION,
			'q': qinput,
			//    'seller_cids' : '1294459592',
			//			banner: 'never_on_shelf',
			page_no: '1',
			page_size: '1',
			fields: 'approve_status,num_iid,type,cid,num,list_time,price,modified,seller_cids,outer_id, title',
			start_created: '2019-01-01 00:00:00',
			start_modified: '2019-01-01 00:00:00'
		}, function (error, response) {
			if (!error && response.items.item) {
				//	console.log(response.items);
				var Items = response.items.item;
				Items.forEach((Item) => {
					client.execute('taobao.item.seller.get', { //product_id 가져오기
						'session': process.env.TMALL_SESSION,
						'fields': 'product_id, cid',
						'num_iid': Item.num_iid
					}, function (error, response) {
						if (!error) {
							//	console.log(response)
							var Product = response.item;
							var cid = Product.cid;
							var product_id = Product.product_id;
							console.log(Product, cid, product_id)
							client.execute('tmall.item.add.schema.get',
								{
									session: process.env.TMALL_SESSION,
									'category_id': cid,
									'product_id': product_id,
									'type': 'b',
									'isv_init': 'true'
								},
								function (error, response) {
									if (!error) {
										//	console.log(response.add_item_result);

										var xmlData = response.add_item_result;
										console.log(xmlData)

										/*if (parser.validate(xmlData) === true) { //optional (it'll return an object in case it's not valid)
											var jsonObj = parser.parse(xmlData, options);
											console.log(JSON.stringify(jsonObj));
										}

										// Intermediate obj
										/*var tObj = parser.getTraversalObj(xmlData, options);
										var jsonObj = parser.convertToJson(tObj, options);
										*/

										parseString(xmlData, function (err, result) {
											console.log(result.itemRule.field);
											var table = result.itemRule.field[1].rules;
											res.render('tmall/itemadd', { table: table })
										});
									}
									else console.log('error:' + error);
									/*
									index++
									Result.push(temp)
									if (index === length.Products) {

										Products = tableify(Products);
										res.render('tmall/tmall-item-success', { Products: Products });
									}
									else res.send(error);*/
								});
						}
						else consle.log(error);
					});
				});
			} else {
				res.render('tmall/tmall-item-success', { Products: '조건에 맞는 제품이 없습니다.' });
				console.log(error);
			}
		});
});


module.exports = router;