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

xlsxj = require("xlsx-2-json");
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

var upload = multer({ storage: storage, fileFilter: xlsxFilter});

//tmall root route
router.get("/", function(req, res){
    res.render("tmall/tmall");
});

router.post("/", function(req, res){

    client.execute('taobao.trades.sold.get', {
        'session':process.env.TMALL_SESSION,
        'fields':'created,title,buyer_nick,pay_time,status,receiver_name,receiver_mobile,receiver_zip,receiver_state,receiver_city,receiver_district,receiver_address,orders.outer_sku_id,payment,num,orders.title',
        'start_created':'2018-01-01 00:00:00',
      //'end_created':'2019-12-31 23:59:59',
        'status':'WAIT_SELLER_SEND_GOODS',
        'type':'tmall_i18n',
      //  'tag':'time_card',//
      //  'page_no':'1',
      //  'page_size':'40',
      //  'use_has_next':'true'
    }, function(error, response) {
        var orderInfo=[];
        if (!error) {
          var Orders = response.trades.trade;
//          console.log(JSON.stringify(Orders));
            res.render("tmall/tmall-success", {Orders: Orders});  
        }
        console.log(error);
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
module.exports = router;

router.get("/orders", function(req, res){
  res.render("tmall/tmall-orders");
});

router.post("/orders", function(req, res){

  client.execute('taobao.trades.sold.get', {
      'session':process.env.TMALL_SESSION,
      'fields':'created,title,buyer_nick,pay_time,status,receiver_name,receiver_mobile,receiver_zip,receiver_state,receiver_city,receiver_district,receiver_address,orders.outer_sku_id,payment,num,orders.title',
      'start_created':'2018-01-01 00:00:00',
    //'end_created':'2019-12-31 23:59:59',
      'status':'WAIT_SELLER_SEND_GOODS',
      'type':'tmall_i18n',
    //  'tag':'time_card',//
    //  'page_no':'1',
    //  'page_size':'40',
    //  'use_has_next':'true'
  }, function(error, response) {
      var orderInfo=[];
      if (!error) {
        var table = tableify(response.trades.trade);
        res.render("tmall/tmall-orders-success", {Orders: table});  
      }
      else
      console.log(error);
  });
});