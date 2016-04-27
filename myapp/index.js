var express = require('express');
var io = require('socket.io');
var solr = require('./solr');
var red	= require('./redirect');
var spellchecker = require('./spellchecker');
var app = express();

spellchecker.initDic();

app.set('view engine', 'ejs');

app.get('/', function(req, res){
	res.render('default');
});

app.get('/suggest', function(req, res){
	console.log('received :' + req.query.term);
	solr.getSuggest(req.query.term, res);
});

app.get('/redirect', function(req, res){
	red.redirect(res, '/home/fenshen371/crawlv1/' + req.query.url);
});

app.get('*', function(req, res){
	res.send("This page doesn't exist - 404");
});

var server = app.listen(3000, function(){
	console.log("Example app listening on port 3000!");
});

var listener = io.listen(server);
listener.sockets.on('connection', function(socket){
	socket.on('query_data', function(data){
		solr.search(data, socket);
		if (data['needCheck'] == true)
			spellchecker.check(data['q'], socket);
	});
});
