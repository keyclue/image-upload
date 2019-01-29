// var app = require('../bin/www');
var Auth = function isUserAuthenticated(req,res,next){
    if(req.session.adminUser){
        req.session.admin_name = [{'msg':req.session.admin_name}];
        return next();
    }
    // console.log("PORT "+app.get('port'));
    res.redirect("/login");
}
module.exports = Auth; 