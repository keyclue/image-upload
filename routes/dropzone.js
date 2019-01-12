var express = require('express');
var fs = require('fs');
var multer = require('multer');
var bodyParser = require('body-parser');
var router = express();
var middleware = require("../middleware");

var urlbodyparer = bodyParser.urlencoded({extended: true})
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, '/tmp/keyclue-upload');
  },
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, cb) {
  // accept image files only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

var upload = multer({ storage: storage, fileFilter: imageFilter});

router.all('*', function(req, res, next){
  fs.readFile('posts.json', function(err, data){
    res.locals.posts = JSON.parse(data);
    next();
  });
});

router.get('/upload', function(req, res){
  res.render('/api/upload.ejs');
});

router.post('/uploads', middleware.isLoggedIn, upload.single('image'), function (req, res) {
    //console.log(req.files);

    var files = req.files.file;
    if (Array.isArray(files)) {
        // response with multiple files (old form may send multiple files)
        console.log("Got " + files.length + " files");
    }
    else {
        // dropzone will send multiple requests per default
        console.log("Got one file");
    }
    res.status(204);
    res.send();
});

module.exports = router;