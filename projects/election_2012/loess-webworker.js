importScripts("../../common/js/loess.js")

// process loess curve for each type in worker thread - min | inc | grads | snap | pop

function zip(array1, array2) { // equavalent in this case with d3.zip()
  if (array1.length != array2.length) throw "Array lengths not equal"
  var a = new Array()
  array1.forEach(function(o, i){
    a.push([o, array2[i]])
  })
  return a;
}


self.addEventListener("message", function(e) {
  var filters = e.data.filters,
      json = e.data.json

  filters.forEach(function(o){
    json.sort(function (a, b) { return a[o.type] - b[o.type] })
    var resultMap = json.map(function (d) { return d.result; }),
        dataMap   = json.map(function (d) { return d[o.type] })
    self.postMessage( {"type":o.type, "loess":[zip(dataMap, loess(dataMap, resultMap, 0.2))]})
  })

}, false)