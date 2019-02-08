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

	function compare(a, b, column) {
		if (a.column < b.column)
			return -1;
		if (a.column > b.column)
			return 1;
		return 0;
	}

	client.execute('taobao.trades.sold.get', {
		'session': process.env.TMALL_SESSION,
		'fields': 'tid,num_iid,receiver_state,title,orders.oid,orders.num_iid,buyer_nick,pay_time,receiver_name,receiver_mobile,receiver_zip,receiver_city,receiver_district,receiver_address,orders.outer_sku_id,orders.title,payment,orders.num,orders.refund_status,has_seller_memo,has_buyer_message,seller_flag',
		'start_created': date_startReplace, // datepicker start
		'end_created': date_endReplace, //datepicker end
		//		'status': "WAIT_SELLER_SEND_GOODS",
		'type': 'tmall_i18n'
	}, function (error, response) {
		var total_results = response.total_results;
		//console.log(total_results, response);

		if (!error && total_results != 0) {
			var Trades = response.trades.trade;
			var index = 0;
			function renderOrderInfo() {
				var table = tableify(arrData);
				//				console.log(arrData);
				res.render('tmall/tmall-orders-success', { table: table });
			}
			//			console.log(Trades);
			Trades.forEach(function (Trade) {
				if (Trade.orders && Trade.pay_time) {
					client.execute('taobao.trade.get', {
						'session': process.env.TMALL_SESSION,
						'fields': 'seller_memo,buyer_message',
						'tid': Trade.tid
					}, function (error, response) {
						if (!error) {
							var orders_Memo = response.trade;
							Orders = Trade.orders.order;
							var num_items = Orders.length;
							//							console.log(index, Orders);
							var index1 = 0;

							Orders.forEach((Order) => {
								client.execute('taobao.logistics.orders.detail.get', {
									'session': process.env.TMALL_SESSION,
									'fields': 'tid,order_code',
									'tid': Trade.tid,
									'page_no': '1',
									'page_size': '40'
								}, function (error, response) {
									if (!error) {
										order_code = response.shippings.shipping[0].order_code;
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
														var temp = {
															"주문날짜": Trade.pay_time,
															"매장": Trade.title,
															"주문번호": Trade.tid,
															"고객ID": Trade.buyer_nick,
															"결제시간": Trade.pay_time,
															"수취인": Trade.receiver_name,
															"핸드폰번호": Trade.receiver_mobile,
															"우편번호": Trade.receiver_zip,
															"수취인주소": Trade.receiver_state + Trade.receiver_city + Trade.receiver_district + Trade.receiver_address,
															"SKU": Order.outer_sku_id,
															"상품명": Order.title,
															"가격": Trade.payment,
															"USD 가격": (Trade.payment / 7.00).toFixed(2),
															"개수": Order.num,
															"물류회사": "",
															"송장번호": order_code,
															"브랜드": "",
															"구매자요청": "",
															"등록시간": "",
															"발송시간": "",
															"판매자메모": "",
															"합배송": "",
															"환불상태": ""
														};

														if (num_items > 1) {
															temp.합배송 = '동일고객합배송';
														}
														if (Trade.payment >= 5000) {
															temp.물류회사 = "EMS";
														}
														else temp.물류회사 = "ICB";
														if (orders_Memo.seller_memo) {
															temp.판매자메모 = orders_Memo.seller_memo;
														}
														if (orders_Memo.buyer_message) {
															temp.구매자요청 = orders_Memo.buyer_message;
														}
														if (Order.refund_status === "SUCCESS") {
															temp.환불상태 = "환불"
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
																arraysort(arrData, '주문날짜', '고객ID');
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
											}
										});
									}
									else console.log('logistics.get err', error);
								})
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

router.get("/celldown", function (req, res) {
	res.render("tmall/tmall-celldown");
});

//taobao -> node -> db, xlsx

router.post("/celldown", function (req, res) {
	var selectedCid = 0;
	var arr = [];   //num_iid를 모두 담아놓을 배열
	var arrData = new Array();    //디비에 저장할 모든 데이터를 담을 배열
	var brandList = ['DESIGNERS.设计师',
		'13MONTH',
		'AT THE MOMENT',
		'ANDERSSON BELL',
		'AROUND80',
		'ALICE MARTHA',
		'BIBYSEOB',
		'CHAE LOOK',
		'CHERRY ON TOP',
		'EYEYE',
		'FATALISM',
		'GEMMA ALUS',
		'GENERAL-COTTON',
		'J.GRACELET',
		'KEYCLUE',
		'LARTIGENT',
		'LUV IS TRUE',
		'M.M.D',
		'MAIN BOOTH',
		'MIDNIGHT MOMENT',
		'NOYCOMMON',
		'ONORE',
		'SALAD BOWLS',
		'VEM.VER',
		'WOOZO',
		'ZANIMAL',
		'新品九折',
		'掌柜推荐',
		'新品上市',
		'7月新品',
		'8月新品',
		'9月新品',
		'10月新品',
		'11月新品',
		'12月新品',
		'2019年1月新品',
		'新品推荐',
		'明星同款',
		'女神驾到',
		'WEEKLY SALE',
		'UNISEX.情侣同款',
		'WOMEN.女士',
		'毛呢大衣',
		'羽绒服',
		'卫衣',
		'外套',
		'针织衫',
		'T恤',
		'衬衫',
		'裙装',
		'裤装',
		'套装',
		'连衣裙',
		'MEN.男士',
		'T恤',
		'衬衫',
		'卫衣',
		'外套',
		'裤装',
		'内衣',
		'OUTER.外套',
		'TOP.T恤 / 衬衫',
		'BOTTOM.裤装',
		'SKIRT.裙装',
		'OPS.连衣裙',
		'ACC.配饰',
		'帽子',
		'首饰',
		'包包',
		'眼镜',
		'手机壳',
		'围巾',
		'丝巾',
		'SWIMSUIT.泳装',
		'SLIPPER.拖鞋',
		'HOODIE.卫衣',
		'KNIT.针织衫/毛衣'];
	var brandCid = [1285783221,
		1292930146,
		1295053809,
		1285783222,
		1287542050,
		1285992028,
		1292930147,
		1390578475,
		1399131991,
		1360210052,
		1386159680,
		1305914596,
		1323778222,
		1294459592,
		1349623831,
		1331025101,
		1332863043,
		1320475296,
		1317438312,
		1311206618,
		1285783226,
		1374297643,
		1333532889,
		1285783225,
		1373692513,
		1307022071,
		1400908713,
		1339840022,
		1334584406,
		1397511326,
		1397291243,
		1399918550,
		1406105377,
		1419606421,
		1419606422,
		1429178088,
		1389461161,
		1289678450,
		1358490112,
		1374226642,
		1294287032,
		1285786106,
		1352572377,
		1352572378,
		1291874017,
		1285785334,
		1285785335,
		1301040453,
		1301643758,
		1285785336,
		1285785337,
		1335652105,
		1361579902,
		1285786107,
		1301041313,
		1309567707,
		1291874018,
		1285785338,
		1285785340,
		1374299293,
		1378567379,
		1378535594,
		1378543114,
		1378542607,
		1378543232,
		1285786108,
		1286085098,
		1287544866,
		1285783772,
		1287546007,
		1324286403,
		1400353578,
		1400353579,
		1329485109,
		1388085618,
		1394211111,
		1394211110];

	for (var i in brandList) {
		console.log("1 : " + brandList[i]);
		console.log("2 : " + req.body.brandName);
		if (brandList[i] == req.body.brandName) {
			selectedCid = brandCid[i];
			console.log("cid is " + selectedCid);
			break;
		}
	}
	if (selectedCid == 0) {
		console.log("THERE IS NO BRAND")
		exit(0);
	}
	client.execute('taobao.items.inventory.get', {
		'session': '610112705e986a0941348b0a68bad97b5001bcd30cbc0f13031625218',
		//'q':'j.gracelet', //q로 검색하면안되고 seller_cids로 해야함
		'seller_cids': selectedCid,
		//'banner':'never_on_shelf,regular_shelved, off_shelf, sold_out, violation_off_shelved',
		'banner': 'never_on_shelf',
		'fields': 'approve_status, num_iid, title, nick, type, cid, pic_url, num, props, valid_thru, list_time, price, has_discount, has_invoice, has_warranty, has_showcase, modified, delist_time, postage_id , seller_cids, outer_id',
		//'fields':'approve_status, num_iid, title, nick, type, cid, num, list_time,  modified, delist_time',
		'order_by': 'list_time:desc',
		'page_no': '1',
		'page_size': '200',
		//'start_modified': '2018-12-01 00:00:00'
	}, function (error, response) {
		if (!error) {
			var a = 0; //for count
			var Products = response.items;

			//response의 각 item의 num_iid만 배열에 담음
			for (var i in Products.item) {
				console.log(Products.item);
				//console.log(Products.item[a].num_iid);
				arr.push(Products.item[a].num_iid);
				a++;
			}

			//여기부터 각 num_iid에 대해 데이터 찾아서 디비에 넣기.
			for (var j in arr) {
				client.execute('taobao.item.seller.get', {
					'session': '610112705e986a0941348b0a68bad97b5001bcd30cbc0f13031625218',
					'fields': 'Property_alias,Type,input_str,num_iid,title,nick,price,approve_status,sku,outer_id,cid,num,item_weight,item_size',
					'num_iid': arr[j],
				}, function (error, response) {
					if (!error && response.item.skus != undefined) {
						console.log("L2-----------------------------------------------");
						console.log(response);
						console.log(response.item.skus);
						var ri = response.item;
						var rs = response.item.skus.sku;
						// console.log(ri);
						// console.log(rs);
						//console.log("Brand name is " +req.body.brandName);
						//sku숫자만큼 반복
						for (var k in rs) {
							//size and color 파싱해서 찾기
							var SizeandColor = rs[k].properties_name;
							var SizeorColor = SizeandColor.split(";");
							var itemColorarr = SizeorColor[0].split(":");
							var itemColor = itemColorarr[3];
							var itemSize = '均码'; //default Size is 均码(FREE)
							if (SizeorColor[1] != null) {
								var itemSizearr = SizeorColor[1].split(":");
								itemSize = itemSizearr[3];
							}
							console.log("color is :" + itemColor);
							console.log("size is :" + itemSize);

							var tempdata = {
								"SPU": ri.outer_id,
								"SPU_ID": ri.num_iid,
								"SKU": rs[k].outer_id,
								"SKU_ID": rs[k].sku_id,
								"브랜드品牌": req.body.brandName,   //Brand명
								"货品名称": 'test',   //Brand+카테고리+spu+색상+사이즈 13번
								"색상+사이즈": itemColor + itemSize, //14번
								"재고": rs[k].quantity,
								"소재": 'test', //cid는 아는데 이걸로 소재 찾아와야함.
								"HSCODE": 'test',
								"중량": ri.item_weight * 1000,
								"판매가": ri.price,
								//text for 2번시트
								"货品类型": "普通货品",
								"否": '否',
								//text for 3번셀
								"用途": '衣着用品',
								"011": '011',
								"盒装": '盒装',
								"韩国": '韩国',
								"1": "1",
								"035": "035"
							};
							//arrData.push(JSON.stringify(tempdata)); //이렇게 하면안됨, db insert함수의 인자로는 object를 주어야함
							arrData.push(tempdata);

						}
						//console.log(arrData);
					}
					else console.log(error);
				}
				)
			}

			// //DB에 저장하는 부분
			// // setTimeout(function(){},3000); 
			//           mongoose.connect("mongodb://localhost:27017/testz", { useNewUrlParser: true } ,function(err,db){
			//           if(err){
			//             console.log(err);
			//           }else{
			//             //console.log(arrData);
			//             try{
			//               db.collection('testabc').insertMany(arrData);
			//               //db.collection('testabc').insertOne(tempdata);
			//             } 
			//             catch(e){console.log(e);}
			//             db.close();
			//           }
			//         });

			//엑셀에 쓰기위한 모델
			setTimeout(function () {
				//var model = mongoXlsx.buildDynamicModel(arrData);
				var modelforAll = [
					{ displayName: 'SPU', access: 'SPU', type: 'string' },
					{ displayName: 'SPU_ID', access: 'SPU_ID', type: 'number' },
					{ displayName: 'SKU', access: 'SKU', type: 'string' },
					{ displayName: 'SKU_ID', access: 'SKU_ID', type: 'number' },
					{ displayName: '브랜드品牌', access: '브랜드品牌', type: 'string' },
					{ displayName: '货品名称', access: '货品名称', type: 'string' },
					{ displayName: '색상+사이즈', access: '색상+사이즈', type: 'string' },
					{ displayName: '재고', access: '재고', type: 'string' },
					{ displayName: 'HSCODE', access: 'HSCODE', type: 'string' },
					{ displayName: '중량', access: '중량', type: 'string' },
					{ displayName: '판매가', access: '판매가', type: 'string' }]

				var model1 = [
					{ displayName: '宝贝id', access: 'SPU_ID', type: 'number' },  //spu_id
					{ displayName: '宝贝标题', access: '货品名称', type: 'string' },  //hm
					{ displayName: 'SKUid', access: 'SKUid', type: 'number' },  //sku_id
					{ displayName: 'SKU名称', access: '색상+사이즈', type: 'string' },  //hm
					{ displayName: '宝贝当前库存', access: '재고', type: 'number' }, //재고 
					{ displayName: '货品编码', access: 'SKU', type: 'string' },  //sku
					{ displayName: 'keyclue001', access: '재고', type: 'number' }]  //재고

				var model2 = [
					{ displayName: '货品编码(SKU)', access: 'SKU', type: 'string' },  //
					{ displayName: '货品名称', access: '-', type: 'number' },  //
					{ displayName: '品类名称', access: '-', type: 'number' },  //
					{ displayName: '品牌名称', access: '-', type: 'number' },  //
					{ displayName: '产品编码', access: '-', type: 'number' },  //
					{ displayName: '条形码', access: '-', type: 'number' },  //
					{ displayName: '货品类型', access: '货品类型', type: 'number' },  //
					{ displayName: '行业品类名', access: '-', type: 'number' },  //
					{ displayName: '吊牌价', access: '판매가', type: 'number' },  //
					{ displayName: '零售价', access: '판매가', type: 'number' },  //
					{ displayName: '成本价', access: '판매가', type: 'number' },  //
					{ displayName: '区域销售', access: '-', type: 'number' },  //
					{ displayName: '易碎品', access: '-', type: 'number' },  //
					{ displayName: '危险品', access: '-', type: 'number' },  //
					{ displayName: '效期管理', access: '否', type: 'number' },  //
					{ displayName: '有效期（天）', access: '-', type: 'number' },  //
					{ displayName: '临期预警（天）', access: '-', type: 'number' },  //
					{ displayName: '禁售天数（天）', access: '-', type: 'number' },  //
					{ displayName: '禁收天数（天）', access: '-', type: 'number' },  //
					{ displayName: '体积（cm3）', access: '-', type: 'number' },  //
					{ displayName: '长', access: '-', type: 'number' },  //
					{ displayName: '宽', access: '-', type: 'number' },  //
					{ displayName: '高', access: '-', type: 'number' },  //
					{ displayName: '重量', access: '중량', type: 'number' },  //
					{ displayName: '毛重', access: '-', type: 'number' },  //
					{ displayName: '净重', access: '-', type: 'number' },  //
					{ displayName: '皮重', access: '-', type: 'number' },  //
					{ displayName: '箱装数', access: '-', type: 'number' },  //
					{ displayName: '体积-运输单元', access: '-', type: 'number' },  //
					{ displayName: '长-运输单元', access: '-', type: 'number' },  //
					{ displayName: '宽-运输单元', access: '-', type: 'number' },  //
					{ displayName: '高-运输单元', access: '-', type: 'number' },  //
					{ displayName: '重量-运输单元', access: '-', type: 'number' },  //
					{ displayName: '税率（%）', access: '-', type: 'number' },  //
					{ displayName: '税率分类编码', access: '-', type: 'number' },  //
					{ displayName: '包含电池', access: '-', type: 'number' }]  //일단 AJ열까지


				var model3 = [
					{ displayName: '货品ID*', access: 'SPU_ID', type: 'string' },  //
					{ displayName: '货品英文名称', access: 'SKU', type: 'string' },  //
					{ displayName: '规格型号*', access: '색상+사이즈', type: 'string' },  //
					{ displayName: '主要成分*', access: '소재', type: 'string' },  //
					{ displayName: '用途*', access: '用途', type: 'string' },  //
					{ displayName: '商品备案价格（人民币：元）*', access: '-', type: 'string' },  //
					{ displayName: '生产企业*', access: '브랜드品牌', type: 'string' },  //
					{ displayName: '销售单位*', access: '011', type: 'string' },  // 텍스트
					{ displayName: '销售包装*', access: '盒装', type: 'string' },  // 텍스트
					{ displayName: '品牌*', access: '브랜드品牌', type: 'string' },  //
					{ displayName: '前端宝贝链接', access: '-', type: 'string' },  // 상품등록링크
					{ displayName: '贸易国*', access: '韩国', type: 'string' },  //
					{ displayName: '启运国*', access: '韩国', type: 'string' },  //
					{ displayName: '原产国*', access: '韩国', type: 'string' },  //
					{ displayName: 'HSCODE*', access: 'HSCODE', type: 'string' },  //
					{ displayName: '申报要素*', access: '-', type: 'string' },  //텍스트3개 + 카테고리+성분함량
					{ displayName: '第一单位*', access: '011', type: 'string' },  //
					{ displayName: '第一数量*', access: '1', type: 'string' },  //
					{ displayName: '第二单位', access: '035', type: 'string' },  //
					{ displayName: '第二数量', access: '1', type: 'string' },  //
					{ displayName: '目的国申报价值(出口)', access: '-', type: 'string' },  //
					{ displayName: '目的国申报货币类型(出口)', access: '-', type: 'string' },  //
					{ displayName: '品牌所在国', access: '-', type: 'string' },  //
					{ displayName: '生产企业地址', access: '-', type: 'string' },  //
					{ displayName: 'sku', access: 'SKU', type: 'string' }]  //y열 뒷부분은 셀에 필요없음



				//excell에 쓰기.
				/* Generate Excel */
				mongoXlsx.mongoData2Xlsx(arrData, model1, function (err, data) {
					console.log('File saved at:', data.fullPath);
				});
				mongoXlsx.mongoData2Xlsx(arrData, model2, function (err, data) {
					console.log('File saved at:', data.fullPath);
				});
				mongoXlsx.mongoData2Xlsx(arrData, model3, function (err, data) {
					console.log('File saved at:', data.fullPath);
				});
			}, 3000);
		}
		else console.log(error);
	}
	)
});
module.exports = router;
