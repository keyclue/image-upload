function doit(type, fn, dl) {
	var elt = document.getElementById('data-table');
	var wb = XLSX.utils.table_to_book(elt, {sheet:"Sheet JS"});
	return dl ?
		XLSX.write(wb, {bookType:type, bookSST:true, type: 'base64'}) :
		XLSX.writeFile(wb, fn || ('test.' + (type || 'xlsx')));
}

function tableau(pid, iid, fmt, ofile) {
	if(typeof Downloadify !== 'undefined') Downloadify.create(pid,{
			swf: 'downloadify.swf',
			downloadImage: 'download.png',
			width: 100,
			height: 30,
			filename: ofile, data: function() { return doit(fmt, ofile, true); },
			transparent: false,
			append: false,
			dataType: 'base64',
			onComplete: function(){ alert('Your File Has Been Saved!'); },
			onCancel: function(){ alert('You have cancelled the saving of this file.'); },
			onError: function(){ alert('You must put something in the File Contents or there will be nothing to save!'); }
	}); else document.getElementById(pid).innerHTML = "";
}
tableau('xlsbbtn',  'xportxlsb',  'xlsb',  'test.xlsb');
tableau('xlsxbtn',  'xportxlsx',  'xlsx',  'test.xlsx');
tableau('csvbtn',   'xportcsv',   'csv',   'test.csv');

var pending = false;
var rABS = typeof FileReader !== "undefined" && typeof FileReader.prototype !== "undefined" && typeof FileReader.prototype.readAsBinaryString !== "undefined";
function fixdata(data) {
  var o = "", l = 0, w = 10240;
  for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
  o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
  return o;
}
function process_wb(wb) {
  console.log(wb);
  var o = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]], {editable:true}).replace("<table", '<table id="data-table" border="1"')
  spinner.stop();
  document.getElementById('data-table').outerHTML = o;
  pending = false;
}
var drop = document.getElementById('drop');
var spinner;
function xw(data, cb) {
  pending = true;
  spinner = new Spinner().spin(drop);
  var worker = new Worker('/scripts/modify.js');
  worker.onmessage = function(e) {
    switch(e.data.t) {
      case 'ready': break;
      case 'e': pending = false; console.error(e.data.d); break;
      case 'xlsx': cb(JSON.parse(e.data.d)); break;
    }
  };
  var arr = rABS ? data : btoa(fixdata(data));
  worker.postMessage({d:arr,b:rABS});
}
function handleDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  if(pending) return alertify.alert('Please wait until the current file is processed.', function(){});
  var files = e.dataTransfer.files;
  var f = files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    if(typeof console !== 'undefined') console.log("onload", new Date());
    var data = e.target.result;
    function doitnow() {
      try {
        xw(data, process_wb);
      } catch(e) {
        console.log(e);
        alertify.alert('We unfortunately dropped the ball here.  Please test the file using the <a href="/js-xlsx/">raw parser</a>.  If there are issues with the file processor, please send this file to <a href="mailto:dev@sheetjs.com?subject=I+broke+your+stuff">dev@sheetjs.com</a> so we can make things right.', function(){});
        pending = false;
      }
    }
    if(e.target.result.length > 1e6) alertify.confirm("This file is " + e.target.result.length + " bytes and may take a few moments.  Your browser may lock up during this process.  Shall we play?", function(k) { if(k) doitnow(); });
    else doitnow();
  };
  if(rABS) reader.readAsBinaryString(f);
  else reader.readAsArrayBuffer(f);
}

function handleDragover(e) {
  e.stopPropagation();
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}


if(drop.addEventListener) {
  drop.addEventListener('dragenter', handleDragover, false);
  drop.addEventListener('dragover', handleDragover, false);
  drop.addEventListener('drop', handleDrop, false);
}
