var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var xlsx = require('node-xlsx');
var XLSX = require('xlsx');
var request = require('request');
var fs = require('fs');
var multer = require('multer');
var tableify = require('tableify');
var middleware = require('../middleware');
var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, '/tmp/uploads');
	},
	filename: function (req, file, callback) {
		callback(null, file.originalname);
	}
});


var memory_storage = multer.memoryStorage()
var upload = multer({ storage: memory_storage })

var xlsxFilter = function (req, file, cb) {
	if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
		return cb(new Error('Only xlsx, xls files are allowed!'), false);
	}
	cb(null, true);
};
var upload_xlsx = multer({ storage: storage, fileFilter: xlsxFilter });

var csvFilter = function (req, file, cb) {
	if (!file.originalname.match(/\.(csv)$/i)) {
		return cb(new Error('Only csv files are allowed!'), false);
	}
	cb(null, true);
};

var upload_csv = multer({ storage: memory_storage, fileFilter: csvFilter });

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

router.get('/xlsx', /*middleware.isLoggedIn,*/function (req, res) {
	res.render('api/xlsx');
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

router.post('/xlsx',/*middleware.isLoggedIn,*/ upload.single('xlsx'), function (req, res) {
	console.log(req.file)
	var local_filename = req.file.filename;

	//	var wbook = xlsx.parse(fs.readFileSync('/tmp/uploads/' + local_filename));
	var buffer = req.file.buffer;
	var wb = XLSX.read(buffer, { type: 'buffer' });
	//	var wb = XLSX.readFile(/*'/tmp/uploads/' + local_filename*/xlsx);
	var data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, range: 0, defval: "" });
	//	console.log(data);
	var htmltable = tableify(data);

	res.render('api/xlsx-success', {
		filename: req.file.filename,
		description: req.file.description,
		sheetname: wb.SheetNames[0],
		data: data,
		table: htmltable
	});
});
// require csvtojson
let csv = require('fast-csv');
var mongoose = require('mongoose');
var Author = require('../models/author');

router.get('/csv', function (req, res) {
	var authors = [];
	res.render('api/csv', { authors: authors });
});

var iconv = require('iconv-lite');
// Convert a csv file with csvtojson
router.post('/csv',/*middleware.isLoggedIn,*/ upload_csv.single('csv'), function (req, res) {
	//console.log(req.file)
	if (!req.file)
		return res.status(400).send('No files were uploaded.');

	//	var local_filename = req.file.filename;
	var buffer = req.file.buffer;

	var decodefile = iconv.decode(buffer, 'EUC-KR')
	console.log(buffer, decodefile)
	var stocks = [];
	csv
		.fromString(decodefile.toString(), {
			headers: true,
			ignoreEmpty: false
		})
		.on("data", function (data) {
			data['_id'] = new mongoose.Types.ObjectId();

			stocks.push(data);
			console.log(data);
		})
		.on("end", function () {
			Author.create(stocks, function (err, documents) {
				if (err) throw err;
			});
			console.log(stocks)
			res.send(stocks.length + ' Stock info have been successfully uploaded.');
		});
});

module.exports = router;

