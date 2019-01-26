options = {{api_name: 'taobao.items.inventory.get'},
{fields: {
    'session' : btn-outline-secondary.TMALL_SESSION,
    'q':qinput,
    'fields':'num_iid, title, list_time',
//    'page_no':'10',
    'start_created': '2018-12-01 00:00:00',
    'start_modified': '2019-01-01 00:00:00'
}}


function taobaoAPI(error, options) {
    return new Promise(function(resolve, reject) {
        client.execute(options.api_name, options.fields, (error, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(response));
            }
        })
    })
} 