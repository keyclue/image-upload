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

var ApiClient = require('top-sdk').ApiClient;

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


router.post("/orders", function (req, res) {

	var date = req.body.dates;

	var date_Split = date.split(' - ');
	var date_Start = date_Split[0].split('/');

	var date_startReplace = date_Start[2] + '-' + date_Start[0] + '-' + date_Start[1];

	var date_end = date_Split[1].split('/');
	var date_endReplace = date_end[2] + '-' + date_end[0] + '-' + date_end[1];
	// datepicker 포맷을 타오바오 날짜 형식으로 변경

	var brand = {};
	var Props = {};
	var arrData = [];
	var splitInfo = [];



	client.execute('taobao.trades.sold.get', {
		'session': process.env.TMALL_SESSION,
		'fields': 'tid,num_iid,receiver_state,title,orders.oid,buyer_nick,pay_time,receiver_name,receiver_mobile,receiver_zip,receiver_city,receiver_district,receiver_address,orders.outer_sku_id,orders.title,payment,num,has_seller_memo,has_buyer_message,seller_flag',
		'start_created': date_startReplace, // datepicker start
		'end_created': date_endReplace, //datepicker end
		'status': 'WAIT_BUYER_CONFIRM_GOODS',
		'type': 'tmall_i18n'
	}, function (error, response) {
		var total_results = response.total_results;
		console.log(total_results);
		if (!error && total_results != 0) {
			var Orders = response.trades.trade;
			var index = 0;
			function renderOrderInfo() {
				var table = tableify(arrData);
				//				console.log(arrData);
				res.render('tmall/tmall-orders-success', { table: table });
			}
			Orders.forEach(function (element) {
				if (element.orders) {
					console.log('pos 1 ', index, element.tid);
					var temp = {
						"고객ID": element.buyer_nick,
						"주문날짜": element.pay_time,
						"주문번호": element.orders.order[0].oid,
						"결제시간": element.pay_time,
						"수취인": element.receiver_name,
						"핸드폰번호": element.receiver_mobile,
						"우편번호": element.receiver_zip,
						"수취정보": element.receiver_state + element.receiver_city + element.receiver_district + element.receiver_address,
						"SKU": element.orders.order[0].outer_sku_id,
						"상품명": element.orders.order[0].title,
						"단가": element.payment,
						"USD 가격": element.payment / 7,
						"개수": element.num,
						"물류회사": "",
						"송장번호": "",
						"브랜드": "",
						"등록시간": "",
						"발송시간": "",
						"판매자메모": "",
						"구매자요청": ""
					};
					if (element.payment >= 2000) {
						temp.물류회사 = "EMS";
					}
					else temp.물류회사 = "CAINIAO";

					client.execute('taobao.trade.get', {
						'session': process.env.TMALL_SESSION,
						'fields': 'seller_memo,buyer_message',
						'tid': element.tid
					}, function (error, response) {
						if (!error) {
							if (response.trade.buyer_message || response.trade.seller_memo) {
								var orders_Memo = response.trade;
								if (response.trade.seller_memo) {
									temp.판매자메모 = orders_Memo.seller_memo;
								}
								if (element.has_buyer_message) {
									temp.구매자요청 = orders_Memo.buyer_message;
								}
							}
							console.log(element);
							client.execute('taobao.item.seller.get', { //product_id 가져오기
								'session': process.env.TMALL_SESSION,
								'fields': 'product_id',
								'num_iid': element.num_iid
							}, function (error, response) {
								console.log('pos 3 ', index);
								if (!error) {
									client.execute('taobao.product.get', {
										'session': process.env.TMALL_SESSION, //브랜드명 가져오기
										'fields': 'props_str',
										'product_id': response.item.product_id
									}, function (error, response) {
										if (!error) {
											brand = response.product.props_str;
											brand = brand.replace(';', '","');
											brand = brand.replace('货号:', '货号":"');
											brand = brand.replace('品牌:', '品牌":"');
											Props = JSON.parse('{"' + brand + '"}');
											brand = Props.品牌;
											temp.브랜드 = brand;
											index++;
											console.log('pos 4 ', index);
											arrData.push(temp);
											if (index === total_results) {
												renderOrderInfo();
											}
										}
										else {
											index++;
											console.log('product.get error', index, error);
										}
									});
								}
								else {
									index++;
									console.log('item.seller.get error', index, error);
									console.log(element);
								}
							});
						}
						else {
							index++;
							console.log('trade.get error', index, error);
						}
					});
				}
				else {
					index++;
					console.log('no order', index);
					if (index === total_results) {
						renderOrderInfo(error, response);
					}
				}
			});
		}
		else {
			console.log(error);
			var table = "주문을 찾을 수 없습니다.";
			res.render('tmall/tmall-orders-success', { table: table });
		}

	});
});

module.exports = router;
