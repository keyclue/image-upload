var express = require('express');
var fs = require('fs');
var multer = require('multer');
var bodyParser = require('body-parser');
var router = express();

router.use('/public', express.static(__dirname + '/public'));
router.use(bodyParser.urlencoded({extended: true}));
router.use(multer({dest: 'uploads'})); // dest is not necessary if you are hroutery with the default: /tmp

router.locals.title = 'Extended Express Example';

router.all('*', function(req, res, next){
  fs.readFile('posts.json', function(err, data){
    res.locals.posts = JSON.parse(data);
    next();
  });
});

router.get('/upload', function(req, res){
  res.render('upload.ejs');
});

router.post('/uploads', function (req, res) {
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