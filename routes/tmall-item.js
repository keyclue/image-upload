var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var tableify = require('tableify');
var fs = require('fs');
var swig  = require('swig');

var mongo = require('mongodb');
var db = require('./config/database');
var config = require('./config/config').app;
var unwind = require('mongo-unwind');
var tableify = require('tableify');
var Promise = require('bluebird');

var index = require('./routes/index');
var users = require('./routes/users');
var products = require('./routes/products');
//collections = require('./routes/collections')

var app = express();
var router = express.Router();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//app.set('view engine', 'html');
app.set('view options', { layout: false });

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/products', products);
//app.use('/collection', collection);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

var fs = require('fs');
var flatten = require('flat');
var json2xls = require('json2xls');

app.set('port', (process.env.PORT || config.port));

var ApiClient = require('./api-client/top-sdk/index').ApiClient;

const client = new ApiClient({
  'appkey':'23557753',
  'appsecret':'fe07dd33eac65c1b13324395a2cde358',
  'url':'http://gw.api.taobao.com/router/rest'
});

var skuModel = require('./models/tmall-item-model');
var tmall-item= new Array;
var index = 0;

client.execute('taobao.items.inventory.get', {
  'session' :'61000051ff9e5102f2b320f2a2e773f0dafecc6ca1e5bd13031625218',
  'q':'lartigent',
  'fields':'num_iid,title,price',
  'start_created': '2018-05-01 00:00:00'
}, function(error, response) {
if (!error ) {
  var Products = response.items.item;
  Products.forEach(function(element){
    var n_iid = element.num_iid;
    index++;
    console.log(index+"  "+n_iid)
    client.execute('taobao.item.seller.get', {
      'session' :'61000051ff9e5102f2b320f2a2e773f0dafecc6ca1e5bd13031625218',
      'fields':'num_iid,outer_id,title,nick,price,approve_status,sku',
      'num_iid': n_iid,
    }, function(error, response) {
//      console.log(response)
      if (!error) {
        var Sku = response.item.skus.sku;
        Sku.forEach(function(element){
            var temp = {
              "num_iid": response.item.num_iid,
              "spu": response.item.outer_id,
              "sku": element.outer_id,
              "title": response.item.title,
              "price": element.price,
              "sku_id": JSON.stringify(element.sku_id),
              "status": response.item.approve_status,
              "created": element.created,
              "modified": element.modified,
              "quantity": element.quantity,
              "property": element.properties_name
            };
            skuInfo.push(temp);
//            console.log(skuInfo);
            var xls = json2xls(skuInfo, { fields: ['spu', 'sku', 'sku_id', 'title', 'created', 'modified', 'price', 'quantity', 'status', 'property'] });
            fs.writeFileSync('./output/skuinfo.xlsx', xls, 'binary');  
          });
//          skuModel.collection.insert(skuInfo, onInsert);
        }
        else
          console.log(error+" total result = "+response.total_results);
        });
      });
//      console.log(skuInfo);
//          var xls = json2xls(skuInfo, { fields: ['spu', 'sku', 'sku_id', 'title', 'created', 'modified', 'price', 'quantity', 'status', 'property'] });
//          fs.writeFileSync('./output/skuinfo.xlsx', xls, 'binary');  
//          skuModel.collection.insert(skuInfo, onInsert);
    }
    else
      skuInfo = '조건에 맞는 제품이 없습니다.';
  });     

  function onInsert(err, skuInfo) {
    if (err) {
      // TODO: handle error
    } else {
      console.info('%d SKU information was successfully stored.', skuInfo.length);
    }
  }

//tells our application to listen on the specified port
app.listen(config.port);
console.log("App running on port " + config.port);