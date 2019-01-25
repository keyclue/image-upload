var counter = 0;
function changeBG() {
	var imgs = [
		'url(https://res.cloudinary.com/keyclue/image/upload/v1545030195/sycpihxcnegxevwwjt74.jpg)',
		'url(https://res.cloudinary.com/keyclue/image/upload/v1545379397/op22xipilyuk809nza7z.jpg)',
		'url(https://res.cloudinary.com/keyclue/image/upload/v1545034200/vzwehmf8hnghodxmdtlz.jpg)'
	];

	if (counter === imgs.length) counter = 0;
	$('body').css('background-image', imgs[counter]);

	counter++;
}

setInterval(changeBG, 2000);
