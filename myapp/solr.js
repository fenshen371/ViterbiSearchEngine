var solr = require('solr-client');
var io = require('socket.io');
var stemmer = require('./stem');
var client = solr.createClient({core : 'eagle'});

var stopWords = new Set([
"a",
"about",
"above",
"after",
"again",
"against",
"all",
"am",
"an",
"and",
"any",
"are",
"aren't",
"as",
"at",
"be",
"because",
"been",
"before",
"being",
"below",
"between",
"both",
"but",
"by",
"can't",
"cannot",
"could",
"couldn't",
"did",
"didn't",
"do",
"does",
"doesn't",
"doing",
"don't",
"down",
"during",
"each",
"few",
"for",
"from",
"further",
"had",
"hadn't",
"has",
"hasn't",
"have",
"haven't",
"having",
"he",
"he'd",
"he'll",
"he's",
"her",
"here",
"here's",
"hers",
"herself",
"him",
"himself",
"his",
"how",
"how's",
"i",
"i'd",
"i'll",
"i'm",
"i've",
"if",
"in",
"into",
"is",
"isn't",
"it",
"it's",
"its",
"itself",
"let's",
"me",
"more",
"most",
"mustn't",
"my",
"myself",
"no",
"nor",
"not",
"of",
"off",
"on",
"once",
"only",
"or",
"other",
"ought",
"our",
"ours	ourselves",
"out",
"over",
"own",
"same",
"shan't",
"she",
"she'd",
"she'll",
"she's",
"should",
"shouldn't",
"so",
"some",
"such",
"than",
"that",
"that's",
"the",
"their",
"theirs",
"them",
"themselves",
"then",
"there",
"there's",
"these",
"they",
"they'd",
"they'll",
"they're",
"they've",
"this",
"those",
"through",
"to",
"too",
"under",
"until",
"up",
"very",
"was",
"wasn't",
"we",
"we'd",
"we'll",
"we're",
"we've",
"were",
"weren't",
"what",
"what's",
"when",
"when's",
"where",
"where's",
"which",
"while",
"who",
"who's",
"whom",
"why",
"why's",
"with",
"won't",
"would",
"wouldn't",
"you",
"you'd",
"you'll",
"you're",
"you've",
"your",
"yours",
"yourself",
"yourselves" 
		//'a', 'an', 'and', 'are', 'as',
		//'at', 'be', 'by', 'for', 'from',
		//'has', 'he', 'in', 'is', 'it',
		//'its', 'of', 'on', 'that', 'the',
		//'to', 'was', 'were', 'will', 'with',
		//'or', 'what', 'any', 'am', 'which',
		//'very', 'all', 'been', 'being', 'do'
]);

function search(query_data, socket)
{
    console.log("Query_data received by solr!\nIt is : " + query_data.q);
	client.SELECT_HANDLER = 'select';
	var query;
	if (query_data.pr == false)
		query = client.createQuery().q(query_data.q)
					.start(0).rows(10);
	else query = client.createQuery().q(query_data.q)
					.sort({'pageRank' : 'desc'}).start(0).rows(10);
	var res = [];
	client.search(query, function(err, obj){
		if (err){
			console.log(err);
			socket.emit('res', {'Res' : 
							{'numFound' : 0,
							 'res' : res}});
		}else{
			genRes(socket, obj, res);
		}
	});
}
function getSuggest(term, res)
{
	client.SELECT_HANDLER = 'suggest';
	var gap = term.lastIndexOf(' ');
	term = term.toLowerCase();
	if (gap == term.length - 1)	//no word is being typed now
	{
		res.send([]);
		return;
	}
	var termNeedSug;
	var correctPart = '';	//the substring that can directly used in the suggestions
	var removeStopWord = true;	//whether stop word should be removed
	if (gap == -1)//no space, whole term is a single word
		termNeedSug = term;
	else//contains space, so we only autocomplete the last word being typed and directly used the others in the suggestions 
	{
		correctPart = term.substr(0, gap) + ' ';
		termNeedSug = term.substr(gap + 1);
		removeStopWord = false;	//if this is not the first word in the query, dont remove stop words from suggestion
	}
	var query = client.createQuery().q(termNeedSug)
										.rows(25);
	console.log("getSuggest-termNeedSug_line45: " + termNeedSug + '$');
	client.search(query, function(err, obj){
		if (err){
			console.log(err);
		}else{
			console.log("find suggestions: " + obj['suggest']['suggest'][termNeedSug]['numFound']);
			var docs = obj['suggest']['suggest'][termNeedSug]['suggestions'];
			var suggestion = [];
			var rootsInRes = new Set();
			for (var i = 1; suggestion.length < 5 && i < docs.length; i++)
			{
				var curTerm = docs[i]['term'].toLowerCase();
				
				if (/^[a-z0-9]+$/.test(curTerm) == false)//contains non num or alphabetic characters
					continue;
				if (removeStopWord && stopWords.has(curTerm))//remove single stop word
					continue;
				var root = stemmer.stem(curTerm);//stem
				if (rootsInRes.has(root))//remove duplicate
					continue;
				suggestion.push(correctPart + docs[i]['term']);
				rootsInRes.add(root);
			}
			res.send(suggestion);
		}
	});
}


function genRes(socket, obj, res){
	console.log('response content: ' + obj['response']);
	var numFound = obj['response']['numFound'];
	if (obj['response']['docs'].length > 0){
		var docnum = (obj['response']['docs'].length > 9) ? 10 : obj['response']['docs'].length; 
		for (var i = 0; i < docnum; i++){
			var doci = obj['response']['docs'][i];
			var title = 'Untitled page';
			var size = 'N/A';
			var author = 'N/A';
			var date = 'N/A';
			if (typeof doci != 'undefined'){
			
				if (doci.hasOwnProperty('title'))	
					title = doci['title'];
				else if (doci.hasOwnProperty('dc_title'))
					title = doci['dc_title'];
				if (doci.hasOwnProperty('stream_size')){
					var tem = parseInt(doci['stream_size']);
					tem = (tem + 0.0) / 1000;
					size = String(tem) + 'k';
				}
				if (doci.hasOwnProperty('author'))
					author = doci['author'];
 				if (doci.hasOwnProperty('creation_date'))
					date = doci['creation_date'];
			}
			var url = "";
			if (typeof doci != 'undefined')
				url = 'redirect/?url=' + doci['id'].substring(25);
			res.push({'title' : title, 'url' : url, 'size' : size, 'author' : author, 'date' : date});
		}
	}
	var Res = {'numFound' : numFound, 'res' : res};
	socket.emit('res', {'Res' :  Res});
}
exports.search = search;
exports.getSuggest = getSuggest;
