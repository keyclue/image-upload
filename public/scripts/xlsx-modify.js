<![if gt IE 9]>
<script type="text/javascript" src="//unpkg.com/xlsx/dist/shim.min.js"></script>
<script type="text/javascript" src="//unpkg.com/xlsx/dist/xlsx.full.min.js"></script>

<script type="text/javascript" src="//unpkg.com/blob.js@1.0.1/Blob.js"></script>
<script type="text/javascript" src="//unpkg.com/file-saver@1.3.3/FileSaver.js"></script>
<![endif]>

<script src="https://spin.js.org/spin.js"></script>

<script src="https://cdn.jsdelivr.net/npm/alertifyjs@1.11.2/build/alertify.min.js"></script>
<link rel="stylesheet" href="//cdn.jsdelivr.net/npm/alertifyjs@1.11.2/build/css/alertify.min.css"/>

<!--[if lte IE 9]>
<script type="text/javascript" src="shim.min.js"></script>
<script type="text/javascript" src="xlsx.full.min.js"></script>

<script type="text/javascript" src="Blob.js"></script>
<script type="text/javascript" src="FileSaver.js"></script>
<![endif]-->

<!--[if lte IE 9]>
<script type="text/javascript" src="swfobject.js"></script>
<script type="text/javascript" src="downloadify.min.js"></script>
<script type="text/javascript" src="base64.min.js"></script>
<![endif]-->



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
  var worker = new Worker('./modify.js');
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

  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-36810333-1']);
  _gaq.push(['_setDomainName', 'sheetjs.com']);
  _gaq.push(['_setAllowLinker', true]);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();