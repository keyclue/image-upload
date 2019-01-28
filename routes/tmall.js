var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var xlsx = require('xlsx'); 
var request = require('request');
var fs = require("fs");
var multer = require("multer");
var tableify = require('tableify');
var middleware = require("../middleware");
var json2xls =require("json2xls");
var mongoose = require("mongoose");
var mongoXlsx = require('mongo-xlsx');

var ApiClient = require('taobao-sdk').ApiClient;

const client = new ApiClient({
  'appkey':process.env.TMALL_API_KEY,
  'appsecret': process.env.TMALL_API_SECRET,
  'url':'http://gw.api.taobao.com/router/rest'
});

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp/keyclue-upload');
    },
    filename: function(req, file, callback) {
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

var upload = multer({ storage: storage, fileFilter: xlsxFilter});

//tmall root route
router.get("/", function(req, res){
    res.render("tmall/tmall");
});

router.post("/", function(req, res){
        if (!error) {
            res.render("tmall/tmall-success");  
        }
        console.log(error);
});

router.get("/item", function(req, res){
    res.render("tmall/tmall-item");
});

router.post("/item", function(req, res){
  var qinput = req.body.keyword;

  client.execute('taobao.items.inventory.get', {
    'session' : process.env.TMALL_SESSION,
    'q':qinput,
    'fields':'approve_status,num_iid,title,nick,type,cid,pic_url,num,props,valid_thru, list_time,price,has_discount,has_invoice,has_warranty,has_showcase, modified,delist_time,postage_id,seller_cids,outer_id',
    'start_created': '2018-12-01 00:00:00'
  }, function(error, response) {
  if (!error ) {
    var Products = response.items.item;
//    console.log(Products);
    Products = tableify(Products);
    res.render("tmall/tmall-item-success", {Products: Products});  
  }
  else
    console.log('조건에 맞는 제품이 없습니다.', error);
  });     
});

router.get("/item", function(req, res){
  res.render("tmall/tmall-item");
});

router.post("/item", function(req, res){
client.execute('taobao.items.inventory.get', {
  'session' : process.env.TMALL_SESSION,
  'q':'lartigent',
  'fields':'num_iid,title,price',
  'start_created': '2019-01-01 00:00:00'
}, function(error, response) {
if (!error ) {
  var Products = response.items.item;
  console.log(JSON.stringify(Products));
  res.render("tmall/tmall-item-success", {Products: Products});  
}
else
  console.log('조건에 맞는 제품이 없습니다.', error);
});     
});

router.get("/search", function(req, res){
    res.render("tmall/tmall-search");
});

router.post("/search", function(req, res){
  console.log(req.body.keyword)
client.execute('taobao.products.search', {
  'session' : process.env.TMALL_SESSION,
	'fields':'product_id,name,pic_url,cid,props,price,tsc',
	'q':req.body.keyword,
	'cid':'50011999',
	'props':'pid:vid;pid:vid',
	'status':'3',
	'page_no':'1',
	'page_size':'40',
	'vertical_market':'4',
	'customer_props':'20000:优衣库:型号:001:632501:1234',
	'suite_items_str':'1000000062318020:1;1000000062318020:2;',
	'barcode_str':'6924343550791,6901028180559',
	'market_id':'2'
}, function(error, response) {
	if (!error) console.log(response);
	else console.log(error);
})
})


var arrData = new Array();


router.get("/orders", function(req, res){
  res.render("tmall/tmall-orders");
});

router.post("/orders", function(req, res){

  var date = req.body.dates;

  var date_Split = date.split(' - ');
  var date_Start = date_Split[0].split('/');
  
  var date_startReplace = date_Start[2] + '-' + date_Start[0] + '-' + date_Start[1];
  console.log(date_startReplace);
  var date_end = date_Split[1].split('/');
  var date_endReplace = date_end[2] + '-' + date_end[0] + '-' + date_end[1];
  console.log(date_endReplace);
  // datepicker 포맷을 타오바오 날짜 형식으로 변경
  
  client.execute('taobao.trades.sold.get', {
    'session': process.env.TMALL_SESSION,
    'fields': 'num_iid,receiver_state,title,orders.oid,buyer_nick,pay_time,receiver_name,receiver_mobile,receiver_zip,receiver_city,receiver_district,receiver_address,orders.outer_sku_id,orders.title,payment,num,has_buyer_message,seller_flag',
    'start_created': date_startReplace, // datepicker start
    'end_created' : date_endReplace, //datepicker end
  'type': 'tmall_i18n',
  }, function (error, response) {
    if (!error) {
      var Orders = response.trades.trade;
      Orders.forEach(function (element) {
        client.execute('taobao.item.seller.get', { //product_id 가져오기
          'session': process.env.TMALL_SESSION,
          'fields': 'product_id',
          'num_iid': element.num_iid
        }, function (error, response) {
          if (!error) {
            client.execute('taobao.product.get', {
              'session': process.env.TMALL_SESSION, //브랜드명 가져오기
              'fields': 'props_str',
              'product_id': response.item.product_id
            }, function (error, response) {
              if (!error) {
                var brand = response.product.props_str;
               // console.log(brand);
                var split1 = brand.split(';'); 
                var split2 = split1[0].split(':', 2);
                var split4 = new String("品牌");
                var split5 = new String(split2);
                if (split4.charAt(0) === split5.charAt(0)) { //브랜드명 추출
  
                    var splitInfo = [];
                    splitInfo.push(split2[1]);
                    //console.log(splitInfo);
                    splitInfo.forEach(function (element2) { // 엑셀 데이터
                        var temp = {
                  
                            "주문날짜": element.pay_time,
                            "매장": element.title,
                            "주문번호": element.orders.order[0].oid,
                            "고객ID": element.buyer_nick,
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
                            "물류회사" : "",
                            "송장번호" : "",
                            "브랜드": element2,
                            "댓글": element.has_buyer_message,
                            "등록시간" : "",
                            "발송시간" : "",
                            "비고" : element.seller_flag
                          }
                        
                        arrData.push(temp);
                    });
                }
                else {
                    var split3 = split1[1].split(':', 2);
                    var splitInfo2 = [];
                    splitInfo2.push(split3[1]);
                    splitInfo2.forEach(function (element3) {
                        var temp = {
                          "주문날짜": element.pay_time,
                          "매장": element.title,
                          "주문번호": element.orders.order[0].oid,
                          "고객ID": element.buyer_nick,
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
                          "물류회사" : "",
                          "송장번호" : "",
                          "브랜드": element3,
                          "댓글": element.has_buyer_message,
                          "등록시간" : "",
                          "발송시간" : "",
                          "비고" : element.seller_flag
                        };
                        arrData.push(temp);
  
                    });
                }

  
  
  
                                var model = mongoXlsx.buildDynamicModel(arrData); //엑셀 쓰기
                                mongoXlsx.mongoData2Xlsx(arrData, model, function (err, data) {
                                    console.log('File saved at:', data.fullPath);

                                    mongoose.connect("mongodb://localhost:27017/api", { useNewUrlParser: true } ,function(err,db){ // db 연결
                                      if(err){
                                        console.log(err);
                                      }else{
                                        //console.log(arrData);
                                        try{
                                          db.collection('api').insertMany(arrData);
                                          //db.collection('testabc').insertOne(tempdata);
                                        } 
                                        catch(e){console.log(e);}
                                        db.close();
                                      }
                                    });
                                  
                                });

                               // console.log(arrData);

                            } else console.log(error);
                        });
                        
                        
                    }
                    else console.log(error);
            });
  
           
   
  });
   

  
}else console.log(error);
  });
  res.send('download!!'); 
});

module.exports = router;