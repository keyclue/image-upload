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
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp/keyclue-upload');
    },
    filename: function(req, file, callback) {
      callback(null, Date.now() + file.originalname);
    }
});
xlsxj = require("xlsx-2-json");

var xlsxFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
        return cb(new Error('Only xlsx, xls files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: xlsxFilter});

//root route
router.get("/", function(req, res){
    res.render("api/api");
});

router.post("/", function(req, res){
    res.render("api/api-success", {data: req.body});
});

router.get("/test", function(req, res){
    res.render("api/test");
});

router.post("/test", function(req, res){
    res.render("api/test-success", {data: req.body});
});

router.get("/xlsx", middleware.isLoggedIn, function(req, res){
    res.render("api/xlsx");
});

router.post("/xlsx", middleware.isLoggedIn, upload.single('xlsx'), function(req, res){
    var local_filename = req.file.filename;

    var wbook = xlsx.parse(fs.readFileSync('/tmp/keyclue-upload/'+local_filename));
    console.log(wbook);
    var htmltable = tableify(wbook[0].data);

    res.render("api/xlsx-success", {
        filename: req.file.filename, 
        description: req.file.description, 
        sheetname: wbook[0].name, 
        data: wbook[0].data,
        table: htmltable
    });
});

//tmall root route
router.get("/tmall", function(req, res){
    res.render("api/tmall");
});

var ApiClient = require('taobao-sdk').ApiClient;

const client = new ApiClient({
  'appkey':process.env.TMALL_API_KEY,
  'appsecret': process.env.TMALL_API_SECRET,
  'url':'http://gw.api.taobao.com/router/rest'
});

router.post("/tmall", function(req, res){

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
          console.log(JSON.stringify(Orders));
          Orders.forEach(function(element){
            if (element.status = 'WAIT_SELLER_SEND_GOODS'){
              var temp = {
                "주문자ID": element.buyer_nick,
                "주문시각": element.created,
                "수량": element.num,
                "sku": element.orders.order.outer_sku_id,
                "상품명": element.orders.order.title,
                "결제시각": element.pay_time,
                "결제액": element.payment,
                "배송주소": element.receiver_address,
                "시": element.receiver_city,
                "구": element.receiver_district,
                "주문자휴대폰": element.receiver_mobile,
                "수신자명": element.receiver_name,
                "성": element.receiver_state,
                "우편번호": element.receiver_zip,
                "상태": element.status,
                "점포명": element.title
              };
              orderInfo.push(temp);
//              var xls = json2xls(orderInfo, { fields: ['주문자ID', '주문시각', '결제시각', 'sku', '상품명', '결제액', '성', '시', '구', '배송주소', '주문자휴대폰'] });
//              fs.writeFileSync('./output/orderinfo.xlsx', xls, 'binary');
            }
          });
      //    var xls = json2xls(orderInfo, { fields: ['spu', 'sku', 'sku_id', 'title', 'created', 'modified', 'price', 'quantity', 'status', 'property'] });
      //        fs.writeFileSync('./output/skuinfo.xlsx', xls, 'binary');  
      
        }
        console.log(error);
      });
    });

module.exports = router;