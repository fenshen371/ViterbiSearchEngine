var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var pageSchema = new Schema({
	fileName: String,
	url: String
	},
	{collection:"eagle"});
var Page = mongoose.model('page', pageSchema);
function redirect(res, path){
	mongoose.connect('mongodb://localhost/572');
	var db = mongoose.connection;
	console.log('Connection created!');
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function(){
		console.log('Opens do something');
	});
	Page.findOne({fileName: path}, function(err, page){
		console.log('start findOne');
		//console.log('url: ' + Res.res[i].url);
		if (err ||  page === null){
			res.send("Ops! This page doesn't exist - 404");
		}
		else{
			res.redirect(page.url);
		}
		mongoose.connection.close();
	});
}

exports.redirect = redirect;
