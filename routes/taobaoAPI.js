function taobaoAPI(error, options) {
    return new Promise(function (resolve, reject) {
        client.execute(options.api_name, options.fields, (error, response) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(JSON.parse(response));
            }
        });
    });
}
