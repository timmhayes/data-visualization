
var msxml = (function(v) {
  var o, f=function(cid, version) {try {
    return new ActiveXObject('Msxml2.'+(cid||'FreeThreadedDOMDocument')+'.'+(version||v)+'.0');
  } catch(e) { }}; while (v--) { if (v==5) continue; if (o=f()) break; } o=null; f.version=v;
  return f;
})(9);

function GET(url, user, pass) {
  var req=msxml('XMLHTTP');
      req.open('GET', url, false, user, pass);
      req.send(Number(new Date));
  var res={
    body   :req.responseBody,
    text   :req.responseText,
    stream :req.responseStream,
    status :req.status,
    xml    :req.responseXML
  };
  req=null;
  return res;
};

var file = (function() {
  var io = new ActiveXObject('Scripting.FileSystemObject'),
      ForReading = 1, 
      ForWriting = 2
  return {
    read: function(path) {
      var file = io.OpenTextFile(path, ForReading, true),
          text = file.ReadAll()
      file.Close()
      return text
    },
    write: function(path, str){
      var file = io.OpenTextFile(path, ForWriting, true)
      file.Write(str)
      file.Close()
    }
  }
})()
