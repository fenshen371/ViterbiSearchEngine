var io = require('socket.io');
var fs = require('fs');
var dic = require('./norvig');
var dicText = fs.readFileSync(__dirname + '/dictionaries/big.txt', encoding='utf-8');

function initDic()
{
	dic.train(dicText);	
}

function check(query, socket)
{
	var words = query.split(" ");
	var correct = true;
	
	words.forEach(function (value, index){
		var low = value.toLowerCase();
		var sug = dic.correct(low);
		console.log("check: " + low + " => " + sug);
		if (sug != low) correct = false;
		words[index] = sug;
	});
	if (words.length == 0) return;
	var sugQuery = words[0];
	for (var i = 1; i < words.length; i++)
		sugQuery += ' ' + words[i];
	socket.emit('check_result',
				{'correct' : correct, 'suggestion' : sugQuery});
}

exports.initDic = initDic;
exports.check = check;
