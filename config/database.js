//http://theholmesoffice.com/mongoose-connection-best-practice/
//https://gist.github.com/pasupulaphani/9463004
var mongoose = require('mongoose');
var options = {
   db: { native_parser: true },
   server: { poolSize: 5 },
   // replset: { rs_name: 'myReplicaSetName' },
   // user: 'vits',
   // pass: 'VitS$#@!'
};

mongoose.Promise = global.Promise;

var uristring = process.env.MONGO_DB_URI;
//var uristring = 'mongodb://admin:admin123@ds135926.mlab.com:35926/heroku_914rlv3g';
mongoose.connect(uristring, function (err, res) {
   if (err) {
      console.log('ERROR connecting to: ' + uristring + '. ' + err);
   } else {
      console.log('Succeeded connected to: ' + uristring);
   }
});
