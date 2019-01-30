var Comment = require("../models/comment");
var photo = require("../models/photo");
module.exports = {
    isLoggedIn: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash("error", "You must be signed in to do that!");
        res.redirect("/login");
    },
    checkUserphoto: function (req, res, next) {
        if (req.isAuthenticated()) {
            photo.findById(req.params.id, function (err, photo) {
                if (photo.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that!");
                    console.log("BADD!!!");
                    res.redirect("/photos/" + req.params.id);
                }
            });
        } else {
            req.flash("error", "You need to be signed in to do that!");
            res.redirect("/login");
        }
    },
    checkUserComment: function (req, res, next) {
        console.log("YOU MADE IT!");
        if (req.isAuthenticated()) {
            Comment.findById(req.params.commentId, function (err, comment) {
                if (comment.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that!");
                    res.redirect("/photos/" + req.params.id);
                }
            });
        } else {
            req.flash("error", "You need to be signed in to do that!");
            res.redirect("login");
        }
    }
}