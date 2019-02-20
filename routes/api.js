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

var upload_csv = multer({ storage: storage, fileFilter: csvFilter });

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

/*
Upload Excell File
brandname으로 입력한 collection에 데이터를 저장함
*/
router.post('/xlsx',/*middleware.isLoggedIn,*/ upload_xlsx.single('xlsx'), function (req, res) {
	console.log(req.file)
	var local_filename = req.file.filename;
	var brand = req.body.brandname;
	//	Upload to buffer 
	//	var buffer = req.file.buffer;
	//	var wb = XLSX.read(buffer, { type: 'buffer' });

	// Upload to local file
	var wb = XLSX.readFile('/tmp/uploads/' + local_filename);
	var data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, range: 0, defval: "" });
	console.log(local_filename);
	//console.log(data);
	//console.log(wb.Sheets);

	var Darr = [];
	for(var i in data){
		if(i!=0){
			var tdata = {
				"SPU": data[i][0],
				"SKU": data[i][1],
				"브랜드品牌": data[i][2], //Brand명
				"상품명商品名":data[i][3],
				"바코드":data[i][4],
				"라벨가吊牌价":data[i][5],
				"판매가售价":data[i][6],
				"적응 고객客户群":data[i][7],
				"카테고리类目":data[i][8],
				"사이즈尺寸":data[i][9],
				"색상颜色":data[i][10],
				"재고库存":data[i][11],
				"소재材质":data[i][12],
				"HSCODE": data[i][13],
				"생산지产地":data[i][14],
				"중량（kg）重量":data[i][15],
				"세탁 방식洗涤方法":data[i][16],
				"ICB배송비":data[i][17],
				"ICB판매가": data[i][18],
			}
			Darr.push(tdata);
		}
	}

	//for mlab table view
	// {
	// 	"SPU": "SPU",
	// 	"SKU": "SKU",
	// 	"브랜드品牌": "브랜드品牌", 
	// 	"상품명商品名":"상품명商品名",
	// 	"바코드":"바코드",
	// 	"라벨가吊牌价":"라벨가吊牌价",
	// 	"판매가售价":"판매가售价",
	// 	"적응 고객客户群":"적응 고객客户群",
	// 	"카테고리类目":"카테고리类目",
	// 	"사이즈尺寸":"사이즈尺寸",
	// 	"색상颜色":"색상颜色",
	// 	"재고库存":"재고库存",
	// 	"소재材质":"소재材质",
	// 	"HSCODE": "HSCODE",
	// 	"생산지产地":"생산지产地",
	// 	"중량（kg）重量":"중량（kg）重量",
	// 	"세탁 방식洗涤方法":"세탁 방식洗涤方法",
	// 	"ICB배송비":"ICB배송비",
	// 	"ICB판매가":"ICB판매가" ,
	// }


	//console.log(Darr);
	//console.log(JSON.stringify(data));
	var htmltable = tableify(data);

	//DB에 저장하는 부분
	mongoose.connect(process.env.MONGO_DB_URI, { useNewUrlParser: true } ,function(err,db){
		if(err){
			console.log(err);
		}else{
			//console.log(arrData);
			try{
				console.log("here is "+ typeof(Darr));
				db.collection(brand).insertMany(Darr);
				//db.collection('testabc').insertOne(tempdata);
			} 
			catch(e){console.log(e);}
			db.close();
		}
	});

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
	res.render('api/csv', { filename: '', datatable: '' });
});

var iconv = require('iconv-lite');
// Convert a csv file with csvtojson
router.post('/csv',/*middleware.isLoggedIn,*/ upload.single('csv'), function (req, res) {
	//console.log(req.file)
	if (!req.file)
		return res.status(400).send('No files were uploaded.');

	var local_filename = req.file.filename;
	var path = '/tmp/uploads/' + local_filename;
	var wpath = '/tmp/uploads/decoded_file.csv';

	// Upload to buffer
	var buffer = req.file.buffer;
	var decodefile = iconv.decode(buffer, 'windows949')
	console.log(req.file)
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
			/*			Author.create(stocks, function (err, documents) {
							if (err) throw err;
						});*/
			console.log(stocks);
			htmltable = tableify(stocks);
			res.render('api/csv', {
				filename: 'decoded_file.csv',
				data: stocks,
				datatable: htmltable
			});
		})
});

module.exports = router;