var mongoose = require('mongoose');
var adminSchema = new mongoose.Schema({
    email : {type:String},
    password: {type:String}
});
var admin = mongoose.model('admins',adminSchema);
module.exports = admin;