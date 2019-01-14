var dotenv = require('dotenv').config()

var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    passport    = require("passport"),
    cookieParser = require("cookie-parser"),
    LocalStrategy = require("passport-local"),
    flash        = require("connect-flash"),
    photo  = require("./models/photo"),
    Comment     = require("./models/comment"),
    User        = require("./models/user"),
    session = require("express-session"),
    seedDB      = require("./seeds"),
    methodOverride = require("method-override");
    
//requiring routes
var commentRoutes    = require("./routes/comments"),
    photoRoutes = require("./routes/photos"),
    indexRoutes = require("./routes/index")
    
mongoose.connect("mongodb://localhost/keyclue_image", { useNewUrlParser: true } );
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
app.use(cookieParser('secret'));

// seedDB(); //seed the database

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.success = req.flash('success');
   res.locals.error = req.flash('error');
   next();
});

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'keyclue', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.locals.cloudinary = cloudinary;

app.use("/", indexRoutes);
app.use("/photos", photoRoutes);
app.use("/photos/:id/comments", commentRoutes);

var testRoutes = require("./routes/test");
app.use("/test", testRoutes);

var fs = require('fs');
var flatten = require('flat');
var json2xls = require('json2xls');

var ApiClient = require("taobao-sdk").ApiClient;

const client = new ApiClient({
  'appkey': process.env.TMALL_API_KEY,
  'appsecret': process.env.TMALL_API_SECRET,
  'url':'http://gw.api.taobao.com/router/rest'
});

console.log(client);

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
      console.log(response)
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
            tmall-item.push(temp);
            console.log(tmall-item);
            var xls = json2xls(tmall-item, { fields: ['spu', 'sku', 'sku_id', 'title', 'created', 'modified', 'price', 'quantity', 'status', 'property'] });
            fs.writeFileSync('./output/tmall-item.xlsx', xls, 'binary');  
          });
//          skuModel.collection.insert(tmall-item, onInsert);
        }
        else
          console.log(error+" total result = "+response.total_results);
        });
      });
//      console.log(tmall-item);
//          var xls = json2xls(tmall-item, { fields: ['spu', 'sku', 'sku_id', 'title', 'created', 'modified', 'price', 'quantity', 'status', 'property'] });
//          fs.writeFileSync('./output/tmall-item.xlsx', xls, 'binary');  
//          skuModel.collection.insert(tmall-item, onInsert);
    }
    else
      tmall-item = '조건에 맞는 제품이 없습니다.';
  });     

  function onInsert(err, tmall-item) {
    if (err) {
      // TODO: handle error
    } else {
      console.info('%d SKU information was successfully stored.', tmall-item.length);
    }
  }

app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The Keyclue Server Has Started!");
});


