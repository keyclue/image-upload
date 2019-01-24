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
var Promise = global.Promise;

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

var Items = [];

router.get("/item", function(req, res){
    res.render("tmall/tmall-item");
});

router.post("/item", function(req, res){
  var qinput = req.body.keyword;
  client.execute('taobao.items.inventory.get', {
    'session' : process.env.TMALL_SESSION,
    'q':qinput,
    'fields':'num_iid, title, list_time',
//    'page_no':'10',
    'start_created': '2018-12-01 00:00:00',
    'start_modified': '2019-01-01 00:00:00'
    }, function(error,response){
//      console.log(response.items.item);
      if (!error){
        var Num_iids = response.items.item;
        Num_iids.forEach(function(element) {
          var num_iid = element.num_iid;
          client.execute('taobao.item.seller.get', {
            'session' : process.env.TMALL_SESSION,
            'num_iid': num_iid,
            'fields': 'approve_status,num_iid,title,cid,num,list_time,price,seller_cids,outer_id'
          }, function (error, response){
            if (!error){
              var temp = response.item;
              console.log(Items)
              Items.push(temp);
            }
            else{
              console.log('Item.seller.get api error!', error);
            }
          })
        })
        var Products = tableify(Items);
        console.log(Items);
        res.render('tmall/tmall-item-success', {Products: Products})
      }
      else{
        console.log('조건에 맞는 제품이 없습니다.', error);
      }
    }
  );
      client.execute('tmall.item.calculate.hscode.get', {
        'session' : process.env.TMALL_SESSION,
        'item_id':'563833169393'
      }, function(error, response) {
        if (!error) {
          var temp = JSON.stringify(response)
          console.log("HSCODE "+temp);
        }
        else console.log(error);
      })
      ;
});


router.get("/orders", function(req, res){
  res.render("tmall/tmall-orders");
});

router.post("/orders", function(req, res){

  client.execute('taobao.trades.sold.get', {
      'session':process.env.TMALL_SESSION,
      'fields':'Tid,created,title,buyer_nick,pay_time,status,receiver_name,receiver_mobile,receiver_zip,receiver_state,receiver_city,receiver_district,receiver_address,orders.outer_sku_id,payment,num,orders.title',
      'start_created':'2019-01-09 00:00:00',
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
        Orders.forEach(function(element){
            var temp = {
              "주문자ID": element.buyer_nick,
              "주문시각": element.created,
              "수량": element.num,
              "외부sku": element.orders.order[0].outer_sku_id,
              "상품명": element.orders.order[0].title,
              "결제시각": element.pay_time,
              "결제액": element.payment,
              "배송주소": element.receiver_address,
              "시": element.receiver_city,
              "구": element.receiver_district,
              "주문자휴대폰": element.receiver_mobile,
              "수신자명": element.receiver_name,
              "성": element.receiver_state,
              "우편번호": element.receiver_zip,
              "점포명": element.title,
              "상태": element.status
            };
          orderInfo.push(temp);
        });
//        console.log(JSON.stringify(orderInfo))
        var xls = json2xls(orderInfo, { fields: ['주문자ID', '주문시각', '결제시각', '외부sku', '상품명', '결제액', '성', '시', '구', '배송주소', '주문자휴대폰'] });
        fs.writeFileSync('/tmp/order-info.xlsx', xls, 'binary');
        var table = tableify(orderInfo);
        res.render("tmall/tmall-orders-success", {table: table, Orders: orderInfo});
      }
      else
      console.log(error);
  });
});


module.exports = router;