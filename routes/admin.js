var express = require('express');
var router = express.Router();
var jpeg = require('jpeg-js');
var async = require('async');
var url = require('url');
var _ = require("underscore");
var path = require('path');
var fs = require('fs');
var http = require('http');
var multer = require('multer');
var fileupload = require('express-fileupload');
var shopifyAPI = require('shopify-node-api');
var Shopify = new shopifyAPI({
    shop: process.env.SHOPIFY_STORE_NAME, // MYSHOP.myshopify.com 
    shopify_api_key: process.env.SHOPIFY_API_KEY, // Your API key 
    access_token: process.env.SHOPIFY_ACCESS_TOKEN // Your API password 
});
var expressSession = require('express-session');
var db = require('../config/database');
var middleware = require('../middleware');
var mongoose = require('mongoose');
var mongo = require('mongodb');
var crypto = require("crypto");
var algorithm = "aes-256-ctr";
var password = "d6F3Efeq";
var Auth = require('../middleware/auth');
var brand = require("../controllers/brand.js");
var collection = require("../controllers/collection.js");
var cloudinary = require("../API-Clients/cloudinary.js");
var googleSheet = require("../API-Clients/googleSheet.js");
var shopifyModel = require("../API-Clients/shopify.js");
var uristring = process.env.MONGO_DB_URI;
var isLoggedIn = middleware.isLoggedIn;

/* for encryption   */
function encrypt(text) {
    var cipher = crypto.createCipher(algorithm, password);
    var crypted = cipher.update(text, "utf8", "hex");
    crypted += cipher.final("hex");
    return crypted;
}
/* for decryption */
function decrypt(text) {
    var decipher = crypto.createDecipher(algorithm, password);
    var dec = decipher.update(text, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
}
router.get('/create_token_sheet', function (request, response) {
    let google = require('googleapis');
    let authentication = require("../authentication");
    authentication.authenticate().then((auth) => {
        console.log("auth", auth);
        addSheet(auth);
    });
});

router.get('/manage-options', function (request, response) {
    mongo.connect(uristring, function (err, db) {
        if (err) {
            db.close();
            console.log('ERROR connecting to: ' + uristring + '. ' + err);
            respone.send(err);
        } else {
            db.collection("options", function (err, collection) {
                collection.find({}).toArray(function (error, success) {
                    if (error) {
                        console.log("error : " + error);
                    } else {
                        // console.log("SS"+JSON.stringify(success.product_details));
                        response.render('pages/manage-options', { url: "brands", data: success });
                    }
                });
            });
        }
    });
});

router.get('/proxy', function (request, response) {
    var ip = require("ip");
    console.log(request.ip);
    response.send({ " here": request.ip });
});

router.post('/create_collection', function (request, response) {
    collection.createCollection(request.body, function (err, result) {
        if (err) {
            response.send({ "error": err });
        }
        if (result == null) {
            response.redirect('/collection_view/' + result + '/' + request.body.brand_name);
        } else {
            response.redirect('/collection_view/' + result + '/' + request.body.brand_name);
        }
    });
});

router.post('/create_brand', function (request, response) {
    brand.createBrand(request.body, function (err, result) {
        if (err) {
            response.send({ "error": err });
        }
        if (result == null) {
            response.redirect('/admin/brands');
        } else {
            response.redirect('/admin/brands');
        }
    });
});

router.post('/create_option', function (request, response) {
    brand.createOption(request.body, function (err, result) {
        if (err) {
            response.send({ "error": err });
        }
        if (result == null) {
            response.redirect('/admin/manage-options');
        } else {
            response.redirect('/admin/manage-options');
        }
    });
});
router.get('/delete_brand/:col_name', function (request, response) {
    brand.deleteBrand(request.params, function (err, result) {
        if (err) {
            response.send({ "error": err });
        }
        if (result == null) {
            response.redirect('/brands');
        } else {
            response.redirect('/brands');
        }
    });
});
router.post('/save_record', function (request, response) {
    collection.saveSheetData(request.body, function (err, result) {
        if (err) {
            response.redirect('/collection_view/' + request.body.brand_id + '/' + request.body.brand_name);
        }
        if (result == null) {
            response.redirect('/collection_view/' + request.body.brand_id + '/' + request.body.brand_name);
        } else {
            response.redirect('/collection_view/' + request.body.brand_id + '/' + request.body.brand_name);
        }
    });
});

router.get('/delete_collection/:col_id/:brand_id/:sheet_id/:brand_name', function (request, response) {
    collection.deleteCollection(request.params, function (err, result) {
        if (err) {
            response.redirect('/collection_view/' + request.params.brand_id + '/' + request.params.brand_name);
        }
        if (result == null) {
            response.redirect('/collection_view/' + request.params.brand_id + '/' + request.params.brand_name);
        } else {
            response.redirect('/collection_view/' + request.params.brand_id + '/' + request.params.brand_name);
        }
    });
});
function randomString(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


router.get('/duplicate_collection/:col_id/:brand_id/:sheet_id/:brand_name/:col_name/:old_col_name', function (request, response) {
    collection.duplicateCollection(request.params, function (err, result) {
        if (err) {
            response.redirect('/collection_view/' + request.params.brand_id + '/' + request.params.brand_name);
        }
        if (result == null) {
            response.redirect('/collection_view/' + request.params.brand_id + '/' + request.params.brand_name);
        } else {
            response.redirect('/collection_view/' + request.params.brand_id + '/' + request.params.brand_name);
        }
    });
});

router.all('/collection_view/:_id/:brand_name', isLoggedIn, function (request, response) {
    var brand_id = request.params._id
    var brand_name = request.params.brand_name
    mongo.connect(uristring, function (err, db) {
        if (err) {
            db.close();
            console.log('ERROR connecting to: ' + uristring + '. ' + err);
            respone.send(err);
        } else {
            console.log('Succeeded connected to-: ' + uristring);
            db.collection("collections", function (err, collection) {
                collection.find({ $and: [{ "brand_id": brand_id }, { "is_deleted": { $ne: 1 } }] }).toArray(function (error, result) {
                    if (error) {
                        respone.send(err);
                    } else {
                        console.log("respone" + JSON.stringify(result));
                        db.close();
                        response.render('pages/collection_view', { url: "collection_view", data: result, brand_id: brand_id, brand_name: brand_name })
                    }
                });
            });
        }
    });
});

router.all('/brands', function (request, response) {
    mongo.connect(uristring, function (err, db) {
        if (err) {
            db.close();
            console.log('ERROR connecting to: ' + uristring + '. ' + err);
            respone.send(err);
        } else {
            db.collection("brands", function (err, collection) {
                collection.find({}).toArray(function (error, success) {
                    if (error) {
                        console.log("error : " + error);
                    } else {
                        // console.log("SS"+JSON.stringify(success.product_details));
                        response.render('pages/brand', { url: "brands", data: success });
                    }
                });
            });
        }
    });
});

router.all('/upload/:id/:brand_name/:col_name', isLoggedIn, function (request, response) {
    var id = request.params.id;
    var brand_name = request.params.brand_name;
    var col_name = request.params.col_name;
    mongo.connect(uristring, function (err, db) {
        if (err) {
            db.close();
            console.log('ERROR connecting to: ' + uristring + '. ' + err);
            respone.send(err);
        } else {
            db.collection("sheet_data", function (err, collection) {
                collection.find({ "collection_id": id }).toArray(function (error, success) {
                    if (error) {
                        console.log("error : " + error);
                    } else {
                        cloudinary.getAllImages(request.params, function (err, result) {
                            if (err) {
                                response.render('pages/upload_new', { url: "upload", data: success, dataBase: id, images: "", col_name: col_name, brand_name: brand_name, id: id });
                            }
                            if (result == null) {
                                response.render('pages/upload_new', { url: "upload", data: success, dataBase: id, images: "", col_name: col_name, brand_name: brand_name, id: id });
                            } else {
                                response.render('pages/upload_new', { url: "upload", data: success, dataBase: id, images: result, col_name: col_name, brand_name: brand_name, id: id });
                            }
                        });
                    }
                });
            });
        }
    });
});

router.all('/add_image/:spu/:Col_name', isLoggedIn, function (request, response) {
    cloudinary.addImage(request.params, function (err, result) {
        if (err) {
            response.json({ "result": "failed" });
        }
        if (result == null) {
            response.json({ "result": "failed" });
        } else {
            response.json(result);
        }
    });
});

router.all('/delete_product_image/:col_name/:sku', isLoggedIn, function (request, response) {
    cloudinary.deleteImage(request.params, function (err, result) {
        if (err) {
            response.json({ "result": "failed" });
        }
        if (result == null) {
            response.json("success");
        } else {
            response.json("success");
        }
    });
});

router.all('/update_product/:col_name/:sku/:spu/:imageId', function (request, response) {
    cloudinary.updateImage(request.params, function (err, result) {
        if (err) {
            response.json({ "result": "failed" });
        }
        if (result == null) {
            response.json("success");
        } else {
            response.json("success");
        }
    });
});

router.all('/sheet/:col_id/:brand_id/:brand_name/:col_name', function (request, response) {
    var coll_name = request.params.col_name;
    var col_name = request.params.col_id;
    var brand_id = request.params.brand_id;
    var brand_name = request.params.brand_name;
    var options = '';
    mongo.connect(uristring, function (err, db) {
        if (err) {
            db.close();

        } else {
            db.collection("options", function (err, collection) {
                collection.find({}).toArray(function (error, success) {
                    if (error) {
                        options = ''
                    } else {
                        options = success;
                    }

                    if (request.method === 'POST') {
                        if (request.body.type === 'sheet') {
                            googleSheet.googleSheet(request.body, function (err, result) {
                                if (err) {
                                    response.render('pages/sheet', { url: "collection_view", title: 'get', data: "", data_base: col_name, brand_id: brand_id, brand_name: brand_name, error: "", col_name: coll_name, options: options, type: "Sheet" })
                                }
                                if (result == null) {
                                    response.render('pages/sheet', { url: "collection_view", title: 'get', data: "", data_base: col_name, brand_id: brand_id, brand_name: brand_name, error: "", col_name: coll_name, options: options, type: "Sheet" })
                                } else if (result == 'error') {
                                    response.render('pages/sheet', { url: "collection_view", title: 'get', data: "", data_base: col_name, brand_id: brand_id, brand_name: brand_name, error: "Please give permissions 'public on web' to sheet to read and write data.", col_name: coll_name, options: options, type: "Sheet" })
                                } else {
                                    // console.log("result"+JSON.stringify(result));
                                    response.render('pages/sheet', { url: "collection_view", title: 'post', data: result, row: 5, data_base: col_name, brand_id: brand_id, brand_name: brand_name, error: "", col_name: coll_name, options: options, type: "Sheet" })
                                }
                            });
                        } else {
                            var result = [];
                            var csvValues = "";
                            var title = "";
                            var title2 = "";
                            var indexOfProduct = "";
                            const sampleFile = request.files.csvdata;
                            var random1 = randomString(15);
                            var image_name1 = random1 + '' + ".csv";
                            var dir_path = path.resolve(__dirname, 'csv');
                            sampleFile.mv(dir_path + '/' + image_name1, function (err) {
                                if (err) {
                                    console.log('File upload failed');
                                }
                                console.log('File uploaded!');
                            });
                            const csvFilePath = dir_path + "/" + image_name1;
                            const csv = require('csvtojson');
                            csv()
                                .fromFile(csvFilePath)
                                .on('csv', (csvRow, rowIndex) => {
                                    // if(rowIndex == 0){
                                    // var firstLoop = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
                                    // async.eachSeries(firstLoop, function (item, outerLoop) {
                                    // _.each(firstLoop, function (item) {
                                    // if(csvRow[item] == 'PRODUCT NAME'){
                                    // indexOfProduct = item;
                                    // outerLoop();
                                    // }else{
                                    // outerLoop();
                                    // }
                                    // });
                                    // }else{
                                    // }, function(err){

                                    // if(err){
                                    // return callback(err);
                                    // }

                                    // console.log("----++-",rowIndex);
                                    // console.log("-----",csvRow[indexOfProduct]);
                                    // console.log("-----1",title);
                                    // console.log("-----2",title2);

                                    // if(title == csvRow[indexOfProduct]  || title == csvRow[indexOfProduct] || title2 == csvRow[indexOfProduct]  || title2 == csvRow[indexOfProduct]){

                                    // }else{
                                    // csvValues = 
                                    result.push(
                                        { "value": csvRow[0] },
                                        { "value": csvRow[1] },
                                        { "value": csvRow[2] },
                                        { "value": csvRow[3] },
                                        { "value": csvRow[4] },
                                        { "value": csvRow[5] },
                                        { "value": csvRow[6] },
                                        { "value": csvRow[7] },
                                        { "value": csvRow[8] },
                                        { "value": csvRow[9] },
                                        { "value": csvRow[10] },
                                        { "value": csvRow[11] },
                                        { "value": csvRow[12] },
                                        { "value": csvRow[13] },
                                        { "value": csvRow[14] },
                                        { "value": csvRow[15] },
                                        { "value": csvRow[16] },
                                        { "value": csvRow[17] },
                                        { "value": csvRow[18] },
                                        { "value": csvRow[19] },
                                        { "value": csvRow[20] },
                                        { "value": csvRow[21] },
                                        { "value": csvRow[22] }
                                    );
                                    // title = csvRow[indexOfProduct];
                                    // title2 = csvRow[indexOfProduct];
                                    // }
                                    // }
                                    // });
                                }).on('done', (error) => {
                                    console.log('end' + error);
                                    response.render('pages/sheet', { url: "collection_view", title: 'post', data: result, row: 5, data_base: col_name, brand_id: brand_id, brand_name: brand_name, error: "", col_name: coll_name, options: options, type: "csv" })
                                });
                        }
                    } else {
                        response.render('pages/sheet', { url: "collection_view", title: 'get', data: "", data_base: col_name, brand_id: brand_id, brand_name: brand_name, error: "", col_name: coll_name, options: options, type: "" })
                    }
                });
            });
        }
    });
});

router.all('/shopify_add_product', isLoggedIn, function (request, response) {
    // response.send(request.body);
    shopifyModel.addProduct(request.body, function (err, result) {
        if (err) {
            response.redirect('/brands');
        }
        if (result == null) {
            response.redirect('/brands');
        } else {
            response.redirect('/brands');
        }
    });
});

module.exports = router;