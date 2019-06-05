var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var XLSX = require('xlsx');
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

var items_schema = '';

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
				//console.log(response);
				var Products = response.items.item;
				console.log(Products)
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

var wb = XLSX.utils.book_new();
function writeit(type, fn) {
	console.log(fn);
	XLSX.writeFile(wb, fn || ('ordersheet.' + (type || 'xlsx')));
}

router.get('/download', function (req, res) {
	res.download('주문리스트.xls');
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
	var wb = XLSX.utils.book_new();

	function renderOrderInfo(req) {
		var table = tableify(req);
		//				console.log(arrData);
		res.render('tmall/tmall-orders-success', { table: table, wb: wb });
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


			//			console.log(Trades);
			Trades.forEach(function (Trade) {
				if (Trade.orders && Trade.pay_time) {
					client.execute('taobao.logistics.orders.detail.get', {
						'session': process.env.TMALL_SESSION,
						'fields': 'tid,order_code',
						'tid': Trade.tid,
						'page_no': '1',
						'page_size': '1'
					}, function (error, response) {
						if (!error) {
							var order_code = response.shippings.shipping[0].order_code;
							var order_tid = response.shippings.shipping[0].tid;
							console.log(order_tid, order_code)
							client.execute('taobao.trade.get', {
								'session': process.env.TMALL_SESSION,
								'fields': 'seller_memo,buyer_message',
								'tid': Trade.tid
							}, function (error, response) {
								if (!error) {
									var orders_Memo = response.trade;
									Orders = Trade.orders.order;
									var num_items = Orders.length;
									var index1 = 0;

									Orders.forEach((Order) => {

										client.execute('taobao.item.seller.get', { //product_id 가져오기
											'session': process.env.TMALL_SESSION,
											'fields': 'product_id',
											'num_iid': Order.num_iid
										}, function (error, response) {
											if (!error) {
												console.log("product_id=", response.item.product_id);
												client.execute('taobao.product.get', {
													'session': process.env.TMALL_SESSION, //브랜드명 가져오기
													'fields': 'props_str',
													'product_id': response.item.product_id
												}, function (error, response) {
													if (!error) {
														var temp = {
															"주문날짜": Trade.pay_time,
															"매장": Trade.title,
															"주문번호": order_tid,
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

														//	console.log(response.product)
														brand = response.product.props_str;
														brand = brand.replace(';', '","');
														brand = brand.replace('货号:', '货号":"');
														brand = brand.replace('品牌:', '品牌":"');
														brand = brand.replace('款号:', '款号":"');
														Props = JSON.parse('{"' + brand + '"}');
														brand = Props.品牌;
														temp.브랜드 = brand;

														arrData.push(temp);
														index1++;
														if (index1 === num_items) {
															index++;
															if (index === total_results) {
																//																arraysort(arrData, '주문날짜', '고객ID');
																arraysort(arrData, '브랜드');
																//																console.log(arrData);
																//	var realjson = JSON.parse(arrData); // 파일 실행이 끝나면 realjson의 값을 없애야 한다.
																var ws = XLSX.utils.json_to_sheet(arrData);
																XLSX.utils.book_append_sheet(wb, ws, 'order');
																//																fs.writeFileSync('주문리스트.xls', wb, 'binary');
																//															console.log(wb);
																XLSX.writeFile(wb, '주문리스트.xls', { bookType: "biff8", sheet: "" })
																renderOrderInfo(arrData);
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
									})
								}
								else console.log('logistics.get err', error);
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

//brandList를 업데이트하기위한 코드
router.get("/cellupdate", function (req, res) {
	client.execute('taobao.sellercats.list.get', {
		'session': process.env.TMALL_SESSION,
		'nick': 'keyclue海外旗舰店',
		'fields': 'cid,name'
	}, function (error, response) {
		if (!error) {
			console.log(response);
			var tempbrand = new Array();

			for (var i in response.seller_cats.seller_cat) {
				tempbrand.push(response.seller_cats.seller_cat[i].cid);
				tempbrand.push(response.seller_cats.seller_cat[i].name);
			}
			var brandData = JSON.stringify(tempbrand);
			fs.writeFile("./routes/brandData/brand.txt", brandData, 'utf8', function (err) {
				if (err) console.log(err);
				else {
					console.log("write success");
				}
			});

			//for test
			// fs.readFile('./routes/brandData/brand.txt', 'utf-8', function(error, data) {
			// 	var brandList = JSON.parse(data);
			// 	console.log("read : "+brandList);
			// });
		}
		else console.log(error);
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

	fs.readFile('./routes/brandData/brand.txt', 'utf-8', function (error, data) {
		var brandList = JSON.parse(data);
		console.log(brandList);

		for (var i in brandList) {
			if (brandList[i] == req.body.brandName) {
				selectedCid = brandList[i - 1];
				//console.log("cid is " +selectedCid);
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
					//console.log(Products.item);
					//console.log(Products.item[a].num_iid);
					arr.push(Products.item[a].num_iid);
					a++;
				}

				//여기부터 각 num_iid에 대해 데이터 찾아서 디비에 넣기.
				var itemcnt = 0; //마지막경우를 찾아서 excell을 쓰기 위해

				for (var j in arr) {
					client.execute('taobao.item.seller.get', {
						'session': '610112705e986a0941348b0a68bad97b5001bcd30cbc0f13031625218',
						'fields': 'Property_alias,Type,input_str,num_iid,title,nick,price,approve_status,sku,outer_id,cid,num,item_weight,item_size',
						'num_iid': arr[j],
					}, function (error, response) {
						itemcnt++;
						if (!error && response.item.skus != undefined) {
							//console.log(response);
							//console.log(response.item.skus);
							var ri = response.item;
							var rs = response.item.skus.sku;
							// console.log(ri);
							console.log(rs);
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

							//엑셀시트로 저장하는 부분 
							if (itemcnt == arr.length) {
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

								//화면에 엑셀하나 띄워줌
								var brandtable = tableify(arrData);
								res.render('tmall/tmall-celldown-success', { Orders: brandtable });

							}
						}

						else console.log("error");
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
				//               db.collection('test').insertMany(arrData);
				//               //db.collection('test').insertOne(tempdata);
				//             } 
				//             catch(e){console.log(e);}
				//             db.close();
				//           }
				//         });
			}
			else console.log(error);
		}
		)
	});

});




router.get('/product', function (req, res) {

	var table = "Get product by schema!"
	var data = ""
	res.render('tmall/product', { table: table, data: data });
});

router.post("/product", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;
	console.log(product_id, " ", category_id)

	client.execute('tmall.product.schema.get', {
		'session': process.env.TMALL_SESSION,
		'product_id': product_id,
		'category_id': category_id
	}, function (error, response) {
		if (!error) {
			console.log(req.body);
			console.log(response);
			var table = tableify(response.get_product_result);
//			console.log(table)
			res.render('tmall/product', { table: table });
		}
		else {
			console.log("error= ",error);
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});
});

router.post("/product_match_schema", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;
	client.execute('tmall.product.match.schema.get', {
		'session': process.env.TMALL_SESSION,
		'product_id': product_id,
		'category_id': category_id
	}, function (error, response) {
		if (!error) {
			data = response.match_result;
			console.log(response);
			//console.log(table)
			var table = tableify(response);
			res.render('tmall/product', { data: data, table: table });

		}
		else {
			console.log(error);
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});
});

router.post("/product_schema", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;
	client.execute('tmall.product.add.schema.get', {
		'session': process.env.TMALL_SESSION,
		'product_id': product_id,
		'category_id': category_id
	}, function (error, response) {
		if (!error) {
			data = response.match_result;
			console.log(response);
			//console.log(table)
			var table = tableify(response);
			res.render('tmall/product', { data: data, table: table });

		}
		else {
			console.log(error);
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});
});

router.post("/item_schema", function (req, res) {

	client.execute('tmall.item.add.schema.get', {
		'session': process.env.TMALL_SESSION,
		'product_id': product_id,
		'category_id': category_id
	}, function (error, response) {
		if (!error) {
			data = response.match_result;
			console.log(response);
			//console.log(table)
			var table = tableify(response);
			res.render('tmall/product', { data: data, table: table });

		}
		else {
			console.log(error);
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});

});

router.post("/itemsadd", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;
	client.execute('tmall.item.schema.add', {
		'session': process.env.TMALL_SESSION,
		'product_id': product_id,
		'category_id': category_id,
		'xml_data': '<rules><field id=\"prop_20000\" isInput=\"true\">Apple</field></rules>'
	}, function (error, response) {
		if (!error) {
			//				console.log(response);
			var table = "item added";
			//console.log(table)
			res.render('tmall/product', { table: response });
		}
		else {
			console.log(error);
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});
});

router.post("/item_simpleschema_get", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;
	client.execute('tmall.item.add.simpleschema.get', {
		'session': process.env.TMALL_SESSION,
		'product_id': product_id,
		'category_id': category_id
	}, function (error, response) {
		if (!error) {
			data = response.match_result;
			console.log(response);
			//console.log(table)
			var table = tableify(response);
			res.render('tmall/product', { data: data, table: table });

		}
		else {
			console.log(error);
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});

});

router.post("/item_simpleschema_add", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;
	client.execute('tmall.item.simpleschema.add', {
		'session': process.env.TMALL_SESSION,
		'product_id': product_id,
		'category_id': category_id,
		'xml_data': '<rules><field id=\"prop_20000\" isInput=\"true\">Apple</field></rules>'
	}, function (error, response) {
		if (!error) {
			//				console.log(response);
			var table = "item added";
			//console.log(table)
			res.render('tmall/product', { table: response });
		}
		else {
			console.log(error);
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});
});

router.post("/product_match_get", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;

	client.execute('tmall.product.match.schema.get', {
		'session': process.env.TMALL_SESSION,
		'product_id': product_id,
		'category_id': category_id
	}, function (error, response) {	
		if (!error) {
			data = response.match_result;
			client.execute('tmall.product.schema.match', {
				'session': process.env.TMALL_SESSION,
				'category_id': category_id,
				'propvalues': data
			}, function (error, response) {	
				if (!error) {
					data = response.match_result;
					console.log(response);
					table = tableify(data);
					res.render('tmall/product', { data: data, table: table });
				}
				else {
					console.log(error);
					var table = tableify(error)
					res.render('tmall/product', { table: table });
				}
			});
		}
		else {
			console.log("error2=",error);
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});
});

router.post("/product_add", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;

	var data = '<itemRule><field id="prop_13021751" name="货号" type="input"><rules><rule name="requiredRule" value="true"/></rules></field><field id="prop_20000" name="品牌" type="singleCheck"><rules><rule name="requiredRule" value="true"/></rules><options><option displayName="lartigent" value="726064086"/><option displayName="NOYCOMMON" value="837522601"/><option displayName="VEMVER" value="1154216370"/><option displayName="13month" value="27160010"/><option displayName="BIBYSEOB" value="790378331"/><option displayName="At the moment" value="252274394"/><option displayName="MAIN BOOTH" value="973774876"/><option displayName="GENERAL-COTTON" value="1828417157"/><option displayName="LuvIsTrue" value="998840531"/><option displayName="KEYCLUE" value="1883212677"/><option displayName="eyeye" value="83644670"/><option displayName="ONORE" value="285446314"/><option displayName="WOOZO" value="206146992"/><option displayName="Chae Look" value="2350037137"/><option displayName="FATALISM23" value="2403027716"/><option displayName="JALDOENCASE" value="283207592"/></options></field><field id="material_prop_149422948" name="材质成分" type="multiComplex"><rules><rule name="maxInputNumRule" value="5" exProperty="include"/><rule name="requiredRule" value="true"/></rules><fields><field id="material_prop_name" name="材质" type="singleCheck"><options><option displayName="PU" value="PU"/><option displayName="PVC" value="PVC"/><option displayName="仿皮草" value="仿皮草"/><option displayName="兔毛皮" value="兔毛皮"/><option displayName="头层牛皮" value="头层牛皮"/><option displayName="山羊皮" value="山羊皮"/><option displayName="水貂毛" value="水貂毛"/><option displayName="牛二层皮" value="牛二层皮"/><option displayName="狐狸毛" value="狐狸毛"/><option displayName="猪皮" value="猪皮"/><option displayName="獭兔毛" value="獭兔毛"/><option displayName="紫貂毛" value="紫貂毛"/><option displayName="绵羊皮" value="绵羊皮"/><option displayName="羊皮毛一体" value="羊皮毛一体"/><option displayName="聚酯纤维" value="聚酯纤维"/><option displayName="貉子毛" value="貉子毛"/><option displayName="鹿皮" value="鹿皮"/><option displayName="麂皮" value="麂皮"/><option displayName="其他" value="其他"/></options></field><field id="material_prop_content" name="含量(%)" type="input"><rules><rule name="requiredRule" value="true"/><rule name="disableRule" value="true"><depend-group operator="or"><depend-express fieldId="material_prop_name" value="PU" symbol="=="/><depend-express fieldId="material_prop_name" value="PVC" symbol="=="/><depend-express fieldId="material_prop_name" value="仿皮草" symbol="=="/><depend-express fieldId="material_prop_name" value="兔毛皮" symbol="=="/><depend-express fieldId="material_prop_name" value="头层牛皮" symbol="=="/><depend-express fieldId="material_prop_name" value="山羊皮" symbol="=="/><depend-express fieldId="material_prop_name" value="水貂毛" symbol="=="/><depend-express fieldId="material_prop_name" value="牛二层皮" symbol="=="/><depend-express fieldId="material_prop_name" value="狐狸毛" symbol="=="/><depend-express fieldId="material_prop_name" value="猪皮" symbol="=="/><depend-express fieldId="material_prop_name" value="獭兔毛" symbol="=="/><depend-express fieldId="material_prop_name" value="紫貂毛" symbol="=="/><depend-express fieldId="material_prop_name" value="绵羊皮" symbol="=="/><depend-express fieldId="material_prop_name" value="羊皮毛一体" symbol="=="/><depend-express fieldId="material_prop_name" value="貉子毛" symbol="=="/><depend-express fieldId="material_prop_name" value="鹿皮" symbol="=="/><depend-express fieldId="material_prop_name" value="麂皮" symbol="=="/></depend-group></rule><rule name="valueTypeRule" value="decimal"/><rule name="regexRule" value="^\\d+(\\.\\d{1,2})?$"/><rule name="minValueRule" value="0" exProperty="not include"/><rule name="maxValueRule" value="100" exProperty="include"/></rules></field></fields></field><field id="prop_148380063" name="销售渠道类型" type="singleCheck"><options><option displayName="纯电商(只在线上销售)" value="852538341"/></options></field><field id="prop_122216586" name="服装版型" type="singleCheck"><options><option displayName="直筒" value="29947"/><option displayName="修身" value="130137"/><option displayName="斗篷型" value="27295812"/><option displayName="宽松" value="4043538"/></options></field><field id="prop_122216562" name="款式" type="singleCheck"><options><option displayName="超短" value="6465859"/><option displayName="短款" value="47502"/><option displayName="常规" value="3226292"/><option displayName="中长款" value="44597"/><option displayName="长款" value="66612"/></options></field><field id="prop_20663" name="领型" type="singleCheck"><options><option displayName="立领" value="29541"/><option displayName="圆领" value="29447"/><option displayName="V领" value="29448"/><option displayName="方领" value="29538"/><option displayName="西装领" value="3267189"/><option displayName="娃娃领" value="27316112"/><option displayName="可脱卸帽" value="3267193"/><option displayName="双层领" value="3267194"/><option displayName="一字领" value="29917"/><option displayName="荷叶领" value="9977673"/><option displayName="POLO领" value="3276127"/><option displayName="半开领" value="30066992"/><option displayName="高领" value="29546"/><option displayName="海军领" value="57658638"/><option displayName="堆堆领" value="7486925"/><option displayName="其他" value="20213"/><option displayName="连帽" value="3267192"/><option displayName="半高领" value="29075742"/></options></field><field id="prop_2917380" name="袖型" type="singleCheck"><options><option displayName="飞飞袖" value="95316670"/><option displayName="公主袖" value="11245515"/><option displayName="其他" value="20213"/><option displayName="堆堆袖" value="145654279"/><option displayName="衬衫袖" value="27414723"/><option displayName="插肩袖" value="27414630"/><option displayName="蝙蝠袖" value="7576170"/><option displayName="花瓣袖" value="42625521"/><option displayName="荷叶袖" value="27414678"/><option displayName="常规" value="3226292"/><option displayName="灯笼袖" value="7216758"/><option displayName="包袖" value="27414703"/><option displayName="喇叭袖" value="19306903"/><option displayName="泡泡袖" value="5618747"/></options></field><field id="prop_31611" name="衣门襟" type="singleCheck"><options><option displayName="拉链" value="115481"/><option displayName="单排两粒扣" value="85462454"/><option displayName="三粒扣" value="112633"/><option displayName="其他" value="20213"/></options></field><field id="prop_122216589" name="制作工艺" type="singleCheck"><options><option displayName="磨砂" value="90765"/><option displayName="水洗皮" value="10081169"/><option displayName="压花皮" value="14464883"/><option displayName="漆皮" value="28402"/><option displayName="蛇纹皮" value="16802982"/><option displayName="爆炸皮" value="19778009"/></options></field><field id="prop_20017" name="适用年龄" type="singleCheck"><options><option displayName="30-34周岁" value="494072162"/><option displayName="35-39周岁" value="494072164"/><option displayName="25-29周岁" value="494072160"/><option displayName="18-24周岁" value="494072158"/><option displayName="40-49周岁" value="494072166"/><option displayName="17周岁以下" value="136515180"/></options></field><field id="prop_122216347" name="年份/季节" type="singleCheck"><rules><rule name="requiredRule" value="true"/></rules><options><option displayName="2016年冬季" value="740138901"/><option displayName="2016年夏季" value="828914351"/><option displayName="2016年春季" value="854168429"/><option displayName="2016年秋季" value="728146012"/><option displayName="2017年春季" value="1375048537"/><option displayName="2014年冬季" value="379886796"/><option displayName="2014年夏季" value="379818839"/><option displayName="2014年春季" value="379930774"/><option displayName="2014年秋季" value="380120406"/><option displayName="2015年冬季" value="740132938"/><option displayName="2015年夏季" value="647672577"/><option displayName="2015年春季" value="379874864"/><option displayName="2015年秋季" value="715192583"/><option displayName="2017年夏季" value="828896582"/><option displayName="2017年秋季" value="728066917"/><option displayName="2019年冬季" value="1930994249"/><option displayName="2019年夏季" value="828896460"/><option displayName="2019年春季" value="1767451285"/><option displayName="2019年秋季" value="1930889840"/><option displayName="2011年秋季" value="96618833"/><option displayName="2012年夏季" value="132721297"/><option displayName="2012年冬季" value="132721335"/><option displayName="2012年春季" value="132721270"/><option displayName="2011年夏季" value="96618834"/><option displayName="2011年春季" value="94386424"/><option displayName="2011年冬季" value="96618832"/><option displayName="2012年秋季" value="132721317"/><option displayName="2013年夏季" value="186026840"/><option displayName="2013年春季" value="199870733"/><option displayName="2013年冬季" value="209928863"/><option displayName="2013年秋季" value="209928864"/><option displayName="2017年冬季" value="740150614"/><option displayName="2018年春季" value="1586070154"/><option displayName="2018年夏季" value="828880787"/><option displayName="2018年秋季" value="1586027483"/><option displayName="2018年冬季" value="556502669"/></options></field><field id="product_images" name="产品图片" type="complex"><fields><field id="product_image_0" name="产品图片" type="input"><rules><rule name="valueTypeRule" value="url"/><rule name="requiredRule" value="true"/></rules></field><field id="product_image_1" name="产品图片" type="input"><rules><rule name="valueTypeRule" value="url"/></rules></field><field id="product_image_2" name="产品图片" type="input"><rules><rule name="valueTypeRule" value="url"/></rules></field><field id="product_image_3" name="产品图片" type="input"><rules><rule name="valueTypeRule" value="url"/></rules></field><field id="product_image_4" name="产品图片" type="input"><rules><rule name="valueTypeRule" value="url"/></rules></field></fields></field></itemRule>'
	
	client.execute('tmall.product.schema.add', {
			'session': process.env.TMALL_SESSION,
			'category_id': category_id,
			'xml_data': data
		}, function (error, response) {	
			if (!error) {
				data = response.match_result;
				console.log(response);
				table = tableify(data);
				res.render('tmall/product', { data: data, table: table });
			}
			else {
				console.log("error1 = ",error);
				var table = tableify(error)
				res.render('tmall/product', { table: table });
			}
		});
});

router.post("/product_match", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;

	client.execute('tmall.product.schema.match', {
		'session': process.env.TMALL_SESSION,
		'product_id': product_id,
		'category_id': category_id
	}, function (error, response) {	
		if (!error) {
			data = response.match_result;
			console.log(response);
			table = tableify(data);
			res.render('tmall/product', { data: data, table: table });
		}
		else {
			console.log(error);
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});
});

router.post("/item_authorize_cats", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;

	client.execute('taobao.itemcats.get', {
		'session': process.env.TMALL_SESSION,
		'fields':'brand.vid, brand.name'
	}, function(error, response) {
		if (!error) {
			console.log(response.seller_authorize.brands.brand);
			table = tableify(response.seller_authorize.brands.brand);
			res.render('tmall/product', { data: data, table: table });
		}
		else {
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});
});

router.post("/item_cats", function (req, res) {

	var product_id = req.body.product_id;
	var category_id = req.body.category_id;

	client.execute('taobao.itemcats.get', {
		'session': process.env.TMALL_SESSION,
		'fields':'brand.vid, brand.name'
	}, function(error, response) {
		if (!error) {
			console.log(response);
			table = tableify(response.brands.brand);
			res.render('tmall/product', { data: response, table: table });
		}
		else {
			var table = tableify(error)
			res.render('tmall/product', { table: table });
		}
	});
});

module.exports = router;