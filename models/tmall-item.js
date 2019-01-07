var mongoose = require('mongoose');
//var db = require('../config/database');
var Schema = mongoose.Schema;

var itemSchema = new Schema({
    num_iid: String,
    outer_id: String,
    sku_id: String,
    title: String,
    created: Date,
    modified: Date,
    price: Number,
    quantity: Number,
    status: String
    });

var tmall-item = mongoose.model("tmall-item", itemSchema);

module.exports = tmall-item;