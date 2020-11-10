var path = require('path');
var express = require('express');
var app = express();

var dir = path.join(__dirname, 'public');

app.get('/*',function(req,res,next){
    next(); // http://expressjs.com/guide.html#passing-route control
});
app.use(express.static(dir));

app.listen(8080);
