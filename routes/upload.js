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


router.get('/itemadd', function (req, res) {
	res.render('tmall/itemadd');
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
			page_size: '40',
			fields: 'approve_status,num_iid,type,cid,num,list_time,price,modified,seller_cids,outer_id, title',
			start_created: '2019-01-01 00:00:00',
			start_modified: '2019-01-01 00:00:00'
		},
		function (error, response) {
			if (!error) {
				client.execute('taobao.item.seller.get', { //product_id 가져오기
					'session': process.env.TMALL_SESSION,
					'fields': 'product_id',
					'num_iid': Order.num_iid
				}, function (error, response) {
					if (!error) {
						var Products = response.items.item;
						console.log(Object.keys(Products).length);
						Products.forEach((Product) => {
							client.execute('tmall.item.add.simpleschema.get',
								{
									session: process.env.TMALL_SESSION,
									'category_id': '162201',
									'product_id': '12314',
									'type': 'b',
									'isv_init': 'true'
								},
								function (error, response) {
									temp = {
										'category_id': req.category_id,
										'product_id': req.product_id,
										'schema': response.schema
									}
									index++
									Result.push(temp)
									if (index === length.Products) {

										Products = tableify(Products);
										res.render('tmall/tmall-item-success', { Products: Products });
									}
									else res.send(error);
								});
						});
					}
				});
			}
			else {
				res.render('tmall/tmall-item-success', { Products: '조건에 맞는 제품이 없습니다.' });
				console.log(error);
			}
		})
})



module.exports = router;