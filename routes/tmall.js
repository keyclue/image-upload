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
		'fields': 'tid,num_iid,receiver_state,title,orders.oid,orders.num_iid,buyer_nick,pay_time,receiver_name,receiver_mobile,receiver_zip,receiver_city,receiver_district,receiver_address,orders.outer_sku_id,orders.title,payment,num,has_seller_memo,has_buyer_message,seller_flag',
		'start_created': date_startReplace, // datepicker start
		'end_created': date_endReplace, //datepicker end
		//		'status': 'WAIT_BUYER_CONFIRM_GOODS',
		'type': 'tmall_i18n'
	}, function (error, response) {
		var total_results = response.total_results;
		console.log(total_results);
		if (!error && total_results != 0) {
			var Trades = response.trades.trade;
			var index = 0;
			function renderOrderInfo() {
				var table = tableify(arrData);
				//				console.log(arrData);
				res.render('tmall/tmall-orders-success', { table: table });
			}
			Trades.forEach(function (Trade) {
				if (Trade.orders) {
					client.execute('taobao.trade.get', {
						'session': process.env.TMALL_SESSION,
						'fields': 'seller_memo,buyer_message',
						'tid': Trade.tid
					}, function (error, response) {
						console.log('pos t', response);
						var orders_Memo = response.trade;
						if (!error) {
							Orders = Trade.orders.order;
							num_items = Orders.length;
							console.log(num_items);
							var index1 = 0;
							Orders.forEach((Order) => {
								client.execute('taobao.item.seller.get', { //product_id 가져오기
									'session': process.env.TMALL_SESSION,
									'fields': 'product_id',
									'num_iid': Order.num_iid
								}, function (error, response) {
									if (!error) {
										client.execute('taobao.product.get', {
											'session': process.env.TMALL_SESSION, //브랜드명 가져오기
											'fields': 'props_str',
											'product_id': response.item.product_id
										}, function (error, response) {
											if (!error) {
												console.log('pos 4 ', index, Order.num_iid);
												var temp = {
													"고객ID": Trade.buyer_nick,
													"주문날짜": Trade.pay_time,
													"주문번호": Order.oid,
													"결제시간": Trade.pay_time,
													"수취인": Trade.receiver_name,
													"핸드폰번호": Trade.receiver_mobile,
													"우편번호": Trade.receiver_zip,
													"수취정보": Trade.receiver_state + Trade.receiver_city + Trade.receiver_district + Trade.receiver_address,
													"SKU": Order.outer_sku_id,
													"상품명": Order.title,
													"단가": Trade.payment,
													"USD 가격": Trade.payment / 7,
													"개수": Trade.num,
													"물류회사": "",
													"송장번호": "",
													"브랜드": "",
													"등록시간": "",
													"발송시간": "",
													"판매자메모": "",
													"구매자요청": ""
												};
												if (Trade.payment >= 2000) {
													temp.물류회사 = "EMS";
												}
												else temp.물류회사 = "CAINIAO";
												if (orders_Memo.seller_memo) {
													temp.판매자메모 = orders_Memo.seller_memo;
												}
												if (orders_Memo.buyer_message) {
													temp.구매자요청 = orders_Memo.buyer_message;
												}

												brand = response.product.props_str;
												brand = brand.replace(';', '","');
												brand = brand.replace('货号:', '货号":"');
												brand = brand.replace('品牌:', '品牌":"');
												Props = JSON.parse('{"' + brand + '"}');
												brand = Props.品牌;
												temp.브랜드 = brand;

												arrData.push(temp);
												index1++;
												if (index1 === num_items) {
													index++;
													if (index === total_results) {
														console.log('pos 4 ', index, index1);
														renderOrderInfo();
													}
												}
											}
											else {
												index1++;
												if (index1 === num_items) {
													index++;
												}
												console.log('product.get error', index, error);
											}
										});
									}
									else {
										index1++;
										if (index1 === num_items) {
											index++;
										}
										console.log('item.seller.get error', index, error);
										console.log(Trade);
									}
								});
							});
						}
						else {
							index++
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
