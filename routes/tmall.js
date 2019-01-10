var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var xlsx = require('node-xlsx');
var request = require('request');
var fs = require("fs");
var multer = require("multer");
var tableify = require('tableify');
var middleware = require("../middleware");
var mongoose = require("mongoose");
xlsxj = require("xlsx-2-json");
var ApiClient = require('taobao-sdk').ApiClient;

const client = new ApiClient({
  'appkey':process.env.TMALL_API_KEY,
  'appsecret': process.env.TMALL_API_SECRET,
  'url':'http://gw.api.taobao.com/router/rest'
});
console.log(client.appkey);
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
    'fields':'num_iid,title,price',
    'start_created': '2018-12-01 00:00:00'
  }, function(error, response) {
  if (!error ) {
    var Products = response.items.item;
    console.log(JSON.stringify(Products));
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
  'start_created': '2018-12-01 00:00:00'
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


router.get("/orders", function(req, res){
  res.render("tmall/tmall-orders");
});

router.post("/orders", function(req, res){

  client.execute('taobao.trades.sold.get', {
      'session':process.env.TMALL_SESSION,
      'fields':'buyer_nick,consign_time,seller_nick,created,title,pay_time,status,receiver_name,receiver_mobile,receiver_zip,receiver_state,receiver_city,receiver_district,receiver_address,orders.order.outer_sku_id,payment,num,orders.order.title',
      'start_created':'2019-01-09 00:00:00',
    //'end_created':'2019-12-31 23:59:59',
    //  'status':'WAIT_SELLER_SEND_GOODS',
      'type':'tmall_i18n',
    //  'tag':'time_card',//
    //  'page_no':'1',
    //  'page_size':'40',
    //  'use_has_next':'true'
  }, function(error, response) {
      var orderInfo=[];
      if (!error) {
        var Orders = response.trades.trade;
        Orders.forEach(function(element){
//          if (element.status = 'WAIT_SELLER_SEND_GOODS'){
            var temp = {
              "주문날짜": element.consign_time,
              "매장": element.seller_nick,
              //"주문번호": element.buyer_nick,
              "고객ID": element.buyer_nick,
              "결제시간": element.pay_time,
              "수취인": element.receiver_name,
              "핸드폰번호": element.receiver_mobile,
              "우편번호": element.receiver_zip,
              "배송주소": element.receiver_address,
              //"시": element.receiver_city,
              //"구": element.receiver_district,
              "SKU": element.orders.order.outer_sku_id,
              "상품명": element.orders.order.title,
              "주문시각": element.created,
              "결제액": element.payment,
              "수량": element.num,
              "점포명": element.title,
              //"점포명": element.has_buyer_message,
              "상태": element.status
            };
            orderInfo.push(temp);
    //              var xls = json2xls(orderInfo, { fields: ['주문자ID', '주문시각', '결제시각', 'sku', '상품명', '결제액', '성', '시', '구', '배송주소', '주문자휴대폰'] });
    //              fs.writeFileSync('./output/orderinfo.xlsx', xls, 'binary');
//          }
        });
        
        mongoose.connect("mongodb://localhost:27017/tmall", { useNewUrlParser: true } ,function(err,db){
          if(err){
              console.log(err);
          }else{
          db.collection('tmall').insertMany(orderInfo);
          db.close();
          }
        });

        var table = tableify(orderInfo);
        res.render("tmall/tmall-orders-success", {Orders: table});  
      }
      else
      console.log(error);
  });
});

router.get("/xlsx", function(req, res){
  res.render("tmall/tmall-orders");
});





module.exports = router;