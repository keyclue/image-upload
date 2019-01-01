var dotenv = require('dotenv').config();

var cloudinary = require('cloudinary').v2;
cloudinary.config({ 
  cloud_name: 'keyclue', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log(cloudinary.config());

var main_image = "https://res.cloudinary.com/keyclue/image/upload/v1545034200/vzwehmf8hnghodxmdtlz.jpg";
var keyclue_icon = "https://res.cloudinary.com/keyclue/image/upload/v1511340188/KEYCLUE-%EA%B4%80%EB%B0%A9%EC%A0%90%ED%92%88_g5bt7z.png";

var output = cloudinary.image("sample", 
            {
            secure: true, transformation: [
            { width: 800, height: 800, crop: 'thumb', gravity: 'face', radius: 20, effect: 'sepia' },
            { overlay: keyclue_icon, gravity: 'south_east', x: 5, y: 5, opacity: 60, 
                effect: 'brightness:200' },
            { angle: 10 }                  
            ]
            });

console.log(output);

