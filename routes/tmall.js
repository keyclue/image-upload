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

var ApiClient = require('taobao-sdk').ApiClient;

const client = new ApiClient({
	appkey: process.env.TMALL_API_KEY,
	appsecret: process.env.TMALL_API_SECRET,
	url: 'http://gw.api.taobao.com/router/rest'
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

//tmall root route
router.get('/', function (req, res) {
	res.render('tmall/tmall');
});

router.post('/', function (req, res) {
	if (!error) {
		res.render('tmall/tmall-success');
	}
	console.log(error);
});

router.get('/item', function (req, res) {
	res.render('tmall/tmall-item');
});

router.post('/item', function (req, res) {
	var qinput = req.body.keyword;
	client.execute(
		'taobao.items.inventory.get',
		{
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
				var Products = response.items.item;
				console.log(Object.keys(Products).length);
				Products = tableify(Products);
				res.render('tmall/tmall-item-success', { Products: Products });
			} else {
				res.render('tmall/tmall-item-success', { Products: '조건에 맞는 제품이 없습니다.' });
			}

		}
	);
});

router.get('/search', function (req, res) {
	res.render('tmall/tmall-search');
});

router.post('/search', function (req, res) {
	console.log(req.body.keyword);
	client.execute(
		'taobao.products.search',
		{
			session: process.env.TMALL_SESSION,
			fields: 'product_id,name,pic_url,cid,props,price,tsc',
			q: req.body.keyword,
			cid: '50011999',
			props: 'pid:vid;pid:vid',
			status: '3',
			page_no: '1',
			page_size: '40',
			vertical_market: '4',
			customer_props: '20000:优衣库:型号:001:632501:1234',
			suite_items_str: '1000000062318020:1;1000000062318020:2;',
			barcode_str: '6924343550791,6901028180559',
			market_id: '2'
		},
		function (error, response) {
			if (!error) console.log(response);
			else console.log(error);
		}
	);
});

router.get('/orders', function (req, res) {
	res.render('tmall/tmall-orders');
});

router.post('/orders', function (req, res) {
	var qinput = req.body.keyword;
	var Dates = req.body.dates;
	var arr = Dates.split(" - ");
	console.log(arr)
	client.execute(
		'taobao.trades.sold.get',
		{
			session: process.env.TMALL_SESSION,
			fields:
				'Tid,created,title,buyer_nick,pay_time,status,receiver_name,receiver_mobile,receiver_zip,receiver_state,receiver_city,receiver_district,receiver_address,orders.outer_sku_id,payment,num,orders.title',
			start_created: '2019-01-09 00:00:00',
			//'end_created':'2019-12-31 23:59:59',
			//status: 'WAIT_SELLER_SEND_GOODS',
			type: 'tmall_i18n'
			//  'tag':'time_card',//
			//  'page_no':'1',
			//  'page_size':'40',
			//  'use_has_next':'true'
		},
		function (error, response) {
			var orderInfo = [];
			if (!error) {
				var Orders = response.trades.trade;
				Orders.forEach(function (element) {
					var temp = {
						주문자ID: element.buyer_nick,
						주문시각: element.created,
						수량: element.num,
						sku: element.orders.order.outer_sku_id,
						상품명: element.orders.order.title,
						결제시각: element.pay_time,
						결제액: element.payment,
						배송주소: element.receiver_address,
						시: element.receiver_city,
						구: element.receiver_district,
						주문자휴대폰: element.receiver_mobile,
						수신자명: element.receiver_name,
						성: element.receiver_state,
						우편번호: element.receiver_zip,
						점포명: element.title,
						상태: element.status
					};
					orderInfo.push(temp);
				});
				//        console.log(JSON.stringify(orderInfo))
				/*				var xls = json2xls(orderInfo, {
									fields: ['주문자ID', '주문시각', '결제시각', 'sku', '상품명', '결제액', '성', '시', '구', '배송주소', '주문자휴대폰']
								});*/
				var table = tableify(orderInfo);
				res.render('tmall/tmall-orders-success', { Orders: table });
				/*				xlsx.writeFile(
<<<<<<< HEAD
				/*					{
										SheetNames: ['Sheet1'],
										Sheets: {
											Sheet1: orderInfo
										}
									},
									'./a-outputs/orderinfo-1.xlsx'
								);
								console.log('xlsx  file written!');*/
			} else console.log(error);
		}
	);
});

/*let promisify = require('util').promisify;

let tmallAPI = function(error, tdata) {
	api_name = tdata.api_name;
	options = tdata.options;
	console.log(api_name, options);
	client.execute(api_name, options, function(error, response) {
		return response;
		console.log('response=' + response);
	});
};

let orderInfoGet = () => {
	let orderSheet = new Promise((resolve, reject) => {
		if (!error) {
			orderInfo = [];
			var Orders = response.trades.trade;
			Orders.forEach(function(element) {
				var temp = {
					주문자ID: element.buyer_nick,
					주문시각: element.created,
					수량: element.num,
					sku: element.orders.order.outer_sku_id,
					상품명: element.orders.order.title,
					결제시각: element.pay_time,
					결제액: element.payment,
					배송주소: element.receiver_address,
					시: element.receiver_city,
					구: element.receiver_district,
					주문자휴대폰: element.receiver_mobile,
					수신자명: element.receiver_name,
					성: element.receiver_state,
					우편번호: element.receiver_zip,
					점포명: element.title,
					상태: element.status
				};
				orderInfo.push(temp);
			});
			resolve(orderInfo);
		} else reject(error);
	});
};

router.post('/orders1', function(req, res) {
	var tdata = {
		api_name: 'taobao.trades.sold.get',
		options: {
			session: process.env.TMALL_SESSION,
			fields:
				'Tid,created,title,buyer_nick,pay_time,status,receiver_name,receiver_mobile,receiver_zip,receiver_state,receiver_city,receiver_district,receiver_address,orders.outer_sku_id,payment,num,orders.title',
			start_created: '2019-01-09 00:00:00',
			//'end_created':'2019-12-31 23:59:59',
			//  'status':'WAIT_SELLER_SEND_GOODS',
			type: 'tmall_i18n'
			//  'tag':'time_card',//
			//  'page_no':'1',
			//  'page_size':'40',
			//  'use_has_next':'true'
		}
	};
	var orderInfo = tmallAPI(null, tdata);
	var table = tableify(orderInfo);
	console.log(orderInfo);
	res.render('tmall/tmall-orders-success', { Orders: table });
});*/

module.exports = router;
