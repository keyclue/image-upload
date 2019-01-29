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

var options = {};
var client = require('node-rest-client-promise').Client(options);
var token = {
    headers: { "Authorization": "Bearer fIqXuGR8CCpIfy1IiXII5L" } // Bearer 뒤에 access_token을 넣는다.
};


var strArray = [];
var receiverArray = [];
var idArray = [];
var orderdateArray = [];
var orderIdArray1 = [];
var productcodeArray = [];
var nameArray = [];
var optiononeArray = [];
var quantityArray = [];
var priceArray = [];
var jsonArray = [];

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

//cafe24 root route
router.get('/', function (req, res) {
    res.render('cafe24/cafe24');
});

router.post('/', function (req, res) {
    if (!error) {
        res.render('cafe24/cafe24-success');
    }
    console.log(error);
});

router.get('/item', function (req, res) {
    res.render('cafe24/cafe24-item');
});

router.post('/item', function (req, res) {
    console.log(req.body),
        function (error, response) {
            if (!error) {
                var Products = 'products';
                //            Products = tableify(Products);
                res.render('cafe24/cafe24-item-success', { Products: Products });
            } else {
                res.render('cafe24/cafe24-item-success', { Products: '조건에 맞는 제품이 없습니다.' });
            }

        }
});

router.get('/orders', function (req, res) {
    res.render('cafe24/cafe24-orders');
});

/*
router.post('/orders', function (req, res) {
    var Start_Date = '2019-01-25';
    var End_Date = '2019-01-31';
    var API = 'https://{{mallid}}.cafe24api.com/api/v2/admin/orders?start_date=' + Start_Date + '&end_date=' + End_Date;
    client.get(API, token, function (data, response) {
        if (!error) {
            var Orders = response.body;
            res.render('cafe24/cafe24-orders-success', { Orders: Orders });
            /*        xlsx.writeFile(
                        {
                            SheetNames: ['Sheet1'],
                            Sheets: {
                                Sheet1: orderInfo
                            }
                        },
                        './a-outputs/orderinfo-1.xlsx'
                    );
                    console.log('xlsx  file written!')
        } else console.log('No orders' + error);
    });
});
*/
router.post('/orders', function (req, res) {
    var ordernumber = req.body.ordernumber;
    var count = (ordernumber.match(/,/g) || []).length;
    for (var i = 0; i <= count; i++) {
        idArray.push(ordernumber.split(',')[i].trim());
    }
    for (var index = 0; index <= idArray.length - 1; index++) {
        var str = "https://platformfactory.cafe24api.com/api/v2/admin/orders/" + idArray[index] + "/items";
        strArray.push(str);
        var receiver = "https://platformfactory.cafe24api.com/api/v2/admin/orders/" + idArray[index] + "/receivers";
        receiverArray.push(receiver);
        console.log(str, "  ", receiver)
    }
    for (var index = 0; index <= strArray.length - 1; index++) {
        client.get(strArray[index], token, function (data, response) {
            var item = data.items;
            var bufferlength = idArray.length;
            // 발주서 작성에 필요한 정보들 (자세한 설명은 cafe24 Admin API OrderItems 폴더 참고하세요)
            var orderdate = "\"" + item[0].order_item_code.split("-")[0] + "\"";
            var orderId = "\"" + item[0].order_item_code.split("-")[0] + "-" + item[0].order_item_code.split("-")[1] + "\"";
            var productname = item[0].supplier_product_name;
            var itemname = "\"" + item[0].product_name.split("BELL]")[1] + "\"";
            var bracketcolor = "(" + item[0].product_name.split("(")[1];
            var nobracketcolor = item[0].product_name.split("(")[1].split(")")[0];
            if (item[0].option_value == '') {
                var size = "F"; // 사이즈에 대한 정보가 없으면 사이즈를 F로 설정한다.
            } else {
                var size = item[0].option_value.split("=")[1]; // "사이즈=M" 이런 식으로 담겨있기에 = 뒤의 내용만 뽑아온다.
            }
            var productcode = "\"" + productname + bracketcolor + size + "\"";
            var optionone = "\"" + nobracketcolor + ":" + size + "\"";
            var quantity = "\"" + item[0].quantity + "\"";
            var price = item[0].product_price.split(".00")[0];
            orderdateArray.push(orderdate);
            orderIdArray1.push(orderId);
            productcodeArray.push(productcode);
            nameArray.push(itemname);
            optiononeArray.push(optionone);
            quantityArray.push(quantity);
            priceArray.push(price);

            // 웹에 올리는 경우는, 한 주문번호에 한 개의 앤더슨벨 제품이 들어간 Case만 구현했습니다.
            if (typeof item[1] == "undefined") {
                if (productcodeArray.length == bufferlength) {
                    for (var index = 0; index <= orderIdArray1.length - 1; index++) {
                        var jsonstr = "{ \"주문일자\": " + orderdateArray[index] + ", \n \"주문번호\": " + orderIdArray1[index] + ", \n \"상품코드\": " + productcodeArray[index] + ", \n \"상품명\": " + nameArray[index]
                            + ", \n \"옵션1\": " + optiononeArray[index] + ", \n \"수량\": " + quantityArray[index] + ", \n \"납품가\": " + priceArray[index] + ", \n \"정상가\": " + priceArray[index] + "}";
                        // jsonstr은 header와 그에 해당하는 정보를 담는 문자열이다. 모든 변형이 다 끝나면 jsonstr을 객체로 변환한 뒤 객체화된 jsonstr을 json2xls의 parameter로 쓸 것이다.
                        jsonArray.push(jsonstr);
                    }
                    var jsonstring = "[";
                    for (var index = 0; index <= jsonArray.length - 2; index++) {
                        jsonstring += jsonArray[index] + ",\n";
                    }
                    jsonstring += jsonArray[jsonArray.length - 1] + "]";
                    var realjson = JSON.parse(jsonstring); // 파일 실행이 끝나면 realjson의 값을 없애야 한다.
                    var xls = json2xls(realjson);
                    fs.writeFileSync('앤더슨벨아이템리스트.xlsx', xls, 'binary');
                    var Orders = tableify(realjson);
                    res.render('cafe24/cafe24-orders-success', { Orders: Orders });
                    //                res.send("폴더를 확인해보세요.");
                }
            }
        })
    }
    //return message with parms form
    //res.send("Received message: " + nameArray);
});

module.exports = router;