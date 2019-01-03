var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");

// show test form
router.get("/test", function(req, res){
    res.render("test"); 
 });

module.exports = router;