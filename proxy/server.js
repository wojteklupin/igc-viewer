const fetch = require('node-fetch');
const http = require('http');
require("url");

const requestListener = function (req, res) {
    let { method, url, headers } = req;
    if (method === "GET" && url.startsWith("/dl?")) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        
        let urlParts = new URL(url, `http://${headers.host}`);
        const fileURL = urlParts.searchParams.get("url");
        let respContentType;
        
        fetch(fileURL)
        .then(response => {
            respContentType = response.headers.get("Content-Type");
            return response.text();
        })
        .then(text => {
            res.statusCode = 200;
            res.setHeader("Content-Type", respContentType);
            
            res.write(text);
            res.end();
        })
        .catch(e => {
            console.log(e);
            res.statusCode = 404;
            res.write("Invalid URL");
            res.end();
        });
    }
    else {
        res.write("Unsupported request");
        res.statusCode = 501;
        res.end();
    }
}

const server = http.createServer(requestListener);
server.listen(3000);
