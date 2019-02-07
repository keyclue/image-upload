var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var xlsx = require('node-xlsx');
var request = require('request');
var fs = require('fs');
var multer = require('multer');
var tableify = require('tableify');
var middleware = require('../middleware');
var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, '/tmp/keyclue-upload');
	},
	filename: function (req, file, callback) {
		callback(null, Date.now() + file.originalname);
	}
});
xlsxj = require('xlsx-2-json');

var xlsxFilter = function (req, file, cb) {
	// accept image files only
	if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
		return cb(new Error('Only xlsx, xls files are allowed!'), false);
	}
	cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: xlsxFilter });

//root route
router.get('/', function (req, res) {
	res.render('api/api');
});

router.post('/', function (req, res) {
	res.render('api/api-success', { data: req.body });
});

router.get('/test', function (req, res) {
	var itemp = res.render('api/test');
});

router.post('/test', function (req, res) {
	res.render('api/test', { data: data });
});

var username = 'Default Username';
router.get('/ajax', function (req, res) {
	res.render('api/ajax', { username: username });
});

router.post('/ajax', function (req, res, next) {
	res.render('api/ajax', { username: username });
});

router.get('/xlsx', middleware.isLoggedIn, function (req, res) {
	res.render('api/xlsx');
});

router.post('/xlsx', middleware.isLoggedIn, upload.single('xlsx'), function (req, res) {
	var local_filename = req.file.filename;

	var wbook = xlsx.parse(fs.readFileSync('/tmp/keyclue-upload/' + local_filename));
	console.log(wbook);
	var htmltable = tableify(wbook[0].data);

	res.render('api/xlsx-success', {
		filename: req.file.filename,
		description: req.file.description,
		sheetname: wbook[0].name,
		data: wbook[0].data,
		table: htmltable
	});
});

router.get('/upload', function (req, res) {
	res.render('api/upload');
});

router.post('/uploads', function (req, res) {
	//console.log(req.files);

	var files = req.files.file;
	if (Array.isArray(files)) {
		// response with multiple files (old form may send multiple files)
		console.log('Got ' + files.length + ' files');
	} else {
		// dropzone will send multiple requests per default
		console.log('Got one file');
	}
	res.status(204);
	res.send();
});

router.get('/modify', function (req, res) {
	res.render('api/modify');
});

router.post('/modify', function (req, res) {
	res.render('api/modify');
});

//router.use(express.bodyParser());

/*app.get('/endpoint', function(req, res){
	var obj = {};
	obj.title = 'title';
	obj.data = 'data';
	
	console.log('params: ' + JSON.stringify(req.params));
	console.log('body: ' + JSON.stringify(req.body));
	console.log('query: ' + JSON.stringify(req.query));
	
	res.header('Content-type','application/json');
	res.header('Charset','utf8');
	res.send(req.query.callback + '('+ JSON.stringify(obj) + ');');
});*/

router.all('/endpoint', function (req, res) {
	var obj = {};
	console.log('body: ' + JSON.stringify(req.body));
	res.send(req.body);
});

let data = [{ item: "Get milk" }, { item: "Walk dog" }, { item: "Clean kitchen" }];

let bodyParser = require("body-parser");
let jsonParser = bodyParser.json();
let urlencodedParser = bodyParser.urlencoded({ extended: false });

//Handle get data requests
router.get("/todo", function (req, res) {
	res.render("api/todo", { todos: data });
});

//Handle post data requests (add data)
router.post("/todo", urlencodedParser, function (req, res) {
	console.log(req.body);
	data.push(req.body);
	res.render("api/todo", { todos: data });
});

//Handle delete data requests
router.delete("/todo", function (req, res) {

});

module.exports = router;
