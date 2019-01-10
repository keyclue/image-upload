var express = require("express");
var router  = express.Router();
var photo = require("../models/photo");
var middleware = require("../middleware");
var request = require("request");
var multer = require('multer');
var storage = multer.diskStorage({

    filename: function(req, file, cb) {
        cb(null, Date.now() + file.originalname);
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

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'keyclue', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//INDEX - show all photos
router.get("/", function(req, res){
    // Get all photos from DB
    photo.find({}, function(err, allphotos){
       if(err){
           console.log(err);
       } else {
           request('http://google.com', function (error, response, body) {
            if (!error && response.statusCode == 200) {
//                console.log(body); // Show the HTML for the Modulus homepage.
                res.render("photos/index",{photos:allphotos});

            }
});
       }
    });
});

//CREATE - add new photo to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the photo object under image property
      req.body.photo.image = result.secure_url;
      // add image's public_id to photo object
      req.body.photo.imageId = result.public_id;
      // add author to photo
      req.body.photo.author = {
        id: req.user._id,
        username: req.user.username
      }
      photo.create(req.body.photo, function(err, photo) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        res.redirect('/photos/' + photo.id);
      });
    });
});

//NEW - show form to create new photo
router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("photos/new"); 
});

//NEW - show form to create new photo drag and drop 
router.get("/new-drop", middleware.isLoggedIn, function(req, res){
    res.render("photos/new-drop"); 
 });

// SHOW - shows more info about one photo
router.get("/:id", function(req, res){
    //find the photo with provided ID
    photo.findById(req.params.id).populate("comments").exec(function(err, foundphoto){
        if(err){
            console.log(err);
        } else {
            console.log(foundphoto)
            //render show template with that photo
            res.render("photos/show", {photo: foundphoto});
        }
    });
});

router.get("/:id/edit", middleware.checkUserphoto, function(req, res){
    console.log("IN EDIT!");
    //find the photo with provided ID
    photo.findById(req.params.id, function(err, foundphoto){
        if(err){
            console.log(err);
        } else {
            //render show template with that photo
            res.render("photos/edit", {photo: foundphoto});
        }
    });
});

router.put("/:id", upload.single('image'), function(req, res){
    photo.findById(req.params.id, async function(err, photo){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
              try {
                  await cloudinary.v2.uploader.destroy(photo.imageId);
                  var result = await cloudinary.v2.uploader.upload(req.file.path);
                  photo.imageId = result.public_id;
                  photo.image = result.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            photo.name = req.body.name;
            photo.description = req.body.description;
            photo.save();
            req.flash("success","Successfully Updated!");
            res.redirect("/photos/" + photo._id);
        }
    });
});

router.delete('/:id', function(req, res) {
  photo.findById(req.params.id, async function(err, photo) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
        await cloudinary.v2.uploader.destroy(photo.imageId);
        photo.remove();
        req.flash('success', 'photo deleted successfully!');
        res.redirect('/photos');
    } catch(err) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
    }
  });
});

module.exports = router;

