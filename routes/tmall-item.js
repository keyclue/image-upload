

var ApiClient = require('./api-client/top-sdk/index').ApiClient;

const client = new ApiClient({
  'appkey':process.env.TMALL_API_KEY,
  'appsecret': process.env.TMALL_API_SECRET,
  'url':'http://gw.api.taobao.com/router/rest'
});




