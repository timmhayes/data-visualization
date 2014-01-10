
var msxml = (function(v) {
  var o, f=function(cid, version) {try {
    return new ActiveXObject('Msxml2.'+(cid||'FreeThreadedDOMDocument')+'.'+(version||v)+'.0');
  } catch(e) { }}; while (v--) { if (v==5) continue; if (o=f()) break; } o=null; f.version=v;
  return f;
})(9);

function here(s) { return (/:/.test(s)?'':here.path)+(s||'') };
here.fix=function(s) { while (here.fix.r.test(s)) s=s.replace(here.fix.r, ''); return s };
here.fix.r=/([^\\\/]+[\\{2}\/]\.{2}[\\{2}\/]?)/;
String.prototype.base=function() {var s=this.replace(/\\/g, '/');return s.substring(0, s.lastIndexOf('/')+1)};
here.path=(this.WScript?WScript.ScriptFullName:location.href).base();

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
  function Stream(text, charset) {
    var stream = new ActiveXObject('ADODB.Stream');
    stream.CharSet=charset||'utf-8'
    stream.Open()
    if (typeof text!='undefined')
      stream.WriteText([].concat(text).join('\n'))
    return stream
  }
  return {

    read: function(path) {
      var io   = new ActiveXObject('Scripting.FileSystemObject'),
          text = io.OpenTextFile(path, 1),
          data = text.ReadAll()
      text.Close()

      if (data.charCodeAt(0) == 255) { // Unicode
        text = io.OpenTextFile(path, 1, false, -1)
        data = text.ReadAll()
        text.Close()
      }

      if (data.charCodeAt(0) == 239) { // UTF-8
        data = GET(here(path)).text
      }
      return data
    },

    write: function(path, str, charset){
      Stream(str, charset).SaveToFile(path, 2);
    }

  }
})()