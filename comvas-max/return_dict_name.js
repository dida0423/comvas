inlets = 1;
outlets = 2;

var number = 0;
var dictName = "";
var myDicts;
var myDict;
var v;

function bang(){
	outlet(0, number);
	outlet(1, dictName);
}

function list(){
	var a = arrayfromargs(arguments)
	number = a[0];
	myDicts = a[1];
	dictName = a[number + 1];
	var d = new Dict(dictName);
	myDict = d;
	post(dictName);
	post("\n\nReceived list " + a + "\n");
	bang();
}

function msg_int(v)
{
	post("received int " + v + "\n");
	dictName = myDicts[v];
	number = v + 1;
	bang();
}