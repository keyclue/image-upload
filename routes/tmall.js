var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var xlsx = require('node-xlsx');
var request = require('request');
var fs = require("fs");
var multer = require("multer");
var tableify = require('tableify');
var middleware = require("../middleware");
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp/keyclue-upload');
    },
    filename: function(req, file, callback) {
      callback(null, Date.now() + file.originalname);
    }
});
xlsxj = require("xlsx-2-json");

var xlsxFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(xlsx|xls)$/i)) {
        return cb(new Error('Only xlsx, xls files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: xlsxFilter});

//root route
router.get("/tmall", function(req, res){
    res.render("api/tmall");
});

router.post("/tmall", function(req, res){
    res.render("api/tmall-success", {data: req.body});
});

module.exports = router;