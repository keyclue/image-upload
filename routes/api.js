var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var xlsx = require('node-xlsx');
var request = require('request');
var fs = require("fs");
var multer = require("multer");
var storage = multer.diskStorage({
    filename: function(req, file, callback) {
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
    console.log(req.body)
    res.render("api/test-success", {data: req.body});
});

router.get("/xlsx", function(req, res){
    res.render("api/xlsx");
});

router.post("/xlsx", function(req, res){

    var wbook = xlsx.parse(fs.readFileSync(__dirname +'/test.xlsx'));
    console.log(wbook);

    res.render("api/xlsx-success", {filename: req.body.filename, sheetname: wbook.name, data: wbook.data});
});

module.exports = router;