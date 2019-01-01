var dotenv = require('dotenv').config()

var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mongoose    = require("mongoose"),
    passport    = require("passport"),
    cookieParser = require("cookie-parser"),
    LocalStrategy = require("passport-local"),
    flash        = require("connect-flash"),
    photo  = require("./models/photo"),
    Comment     = require("./models/comment"),
    User        = require("./models/user"),
    session = require("express-session"),
    seedDB      = require("./seeds"),
    methodOverride = require("method-override");
    
//requiring routes
var commentRoutes    = require("./routes/comments"),
    photoRoutes = require("./routes/photos"),
    indexRoutes = require("./routes/index"),
    testRoutes = require("./routes/test")
    
mongoose.connect("mongodb://localhost/keyclue_image");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride('_method'));
app.use(cookieParser('secret'));

// seedDB(); //seed the database

// PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "Once again Rusty wins cutest dog!",
    resave: false,
    saveUninitialized: false
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.success = req.flash('success');
   res.locals.error = req.flash('error');
   next();
});

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'keyclue', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.locals.cloudinary = cloudinary;

app.use("/", indexRoutes);
app.use("/photos", photoRoutes);
app.use("/photos/:id/comments", commentRoutes);
app.use("/test", testRoutes)

app.listen(3000 || process.env.PORT, process.env.IP, function(){
   console.log("The Keyclue Server Has Started!");
});