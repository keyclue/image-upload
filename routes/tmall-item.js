

var ApiClient = require('./api-client/top-sdk/index').ApiClient;

const client = new ApiClient({
  'appkey':process.env.TMALL_API_KEY,
  'appsecret': process.env.TMALL_API_SECRET,
  'url':'http://gw.api.taobao.com/router/rest'
});

client.execute('taobao.items.inventory.get', {
  'session' : process.env.TMALL_SESSION,
  'q':'lartigent',
  'fields':'num_iid,title,price',
  'start_created': '2018-05-01 00:00:00'
}, function(error, response) {
if (!error ) {
  var Products = response.items.item;
  console.log(Products)
}
else
  skuInfo = '조건에 맞는 제품이 없습니다.';
  console.log(skuInfo);
});     


