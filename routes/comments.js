var express = require("express");
var router  = express.Router({mergeParams: true});
var photo = require("../models/photo");
var Comment = require("../models/comment");
var middleware = require("../middleware");

//Comments New
router.get("/new", middleware.isLoggedIn, function(req, res){
    // find photo by id
    console.log(req.params.id);
    photo.findById(req.params.id, function(err, photo){
        if(err){
            console.log(err);
        } else {
             res.render("comments/new", {photo: photo});
        }
    })
});

//Comments Create
router.post("/",middleware.isLoggedIn,function(req, res){
   //lookup photo using ID
   photo.findById(req.params.id, function(err, photo){
       if(err){
           console.log(err);
           res.redirect("/photos");
       } else {
        Comment.create(req.body.comment, function(err, comment){
           if(err){
               console.log(err);
           } else {
               //add username and id to comment
               comment.author.id = req.user._id;
               comment.author.username = req.user.username;
               //save comment
               comment.save();
               photo.comments.push(comment);
               photo.save();
               console.log(comment);
               req.flash('success', 'Created a comment!');
               res.redirect('/photos/' + photo._id);
           }
        });
       }
   });
});

router.get("/:commentId/edit", middleware.isLoggedIn, function(req, res){
    // find photo by id
    Comment.findById(req.params.commentId, function(err, comment){
        if(err){
            console.log(err);
        } else {
             res.render("comments/edit", {photo_id: req.params.id, comment: comment});
        }
    })
});

router.put("/:commentId", function(req, res){
   Comment.findByIdAndUpdate(req.params.commentId, req.body.comment, function(err, comment){
       if(err){
           res.render("edit");
       } else {
           res.redirect("/photos/" + req.params.id);
       }
   }); 
});

router.delete("/:commentId",middleware.checkUserComment, function(req, res){
    Comment.findByIdAndRemove(req.params.commentId, function(err){
        if(err){
            console.log("PROBLEM!");
        } else {
            res.redirect("/photos/" + req.params.id);
        }
    })
});

module.exports = router;