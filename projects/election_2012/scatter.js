/// <reference path="d3.v3.min.js">

d3.json("data.js", function (json) {

  var filters = [
        { title: "Racially Diverse", type: "min", tickFormat: "%,", description: "Percentage of minority (non-white) population" },
        { title: "Wealthy", type: "inc", tickFormat: "$,", description: "Median household income of county" },
        { title: "Educated", type: "grads", tickFormat: "%", description: "Percentage of people over 25 years old with a 4-year college degree or higher" },
        { title: "On Welfare", type: "snap", tickFormat: "%,", description: "Percentage of households with cash public assistance or food stamps/SNAP in the last 12 months" },
        { title: "Urban", type: "pop", tickFormat: ",", description: "Total population of county" }
  ]

  if (window.Worker) {
    // offload loess number crunching to web worker
    var loessWorker = new Worker("loess-webworker.js")
    loessWorker.addEventListener("message", function (e) {
      filters.forEach(function(filter){
        if (filter.type==e.data.type) filter.loessCache = e.data.loess
      })
    }, false)
    loessWorker.postMessage({ "filters": filters, "json": json })
  }
    /* ~~~~~~~~~~~~~~ establish sizing ~~~~~~~~~~~~~~ */
    var data    = json.sort(function (a, b) { return a.pop > b.pop ? -1 : a.pop < b.pop ? 1 : 0 }),
        padding = { top: 20, right: 130, bottom: 50, left: 100 },
        size    = { height: 500, width: 900 },

        format =  {

          number: d3.format(","),
          percent: d3.format(",p")

        },

        scales = {

          y: d3.scale.linear()
              .domain(d3.extent(data, function (d) { return d.result }).reverse())
              .range([padding.top, size.height - padding.bottom]),

          radius: d3.scale.sqrt()// sqrt to set circle by area rather than radius  / r = sqrt(a/pi)
              .domain(d3.extent(data, function (d) { return parseFloat(d.pop) }))
              .range([0, 35]),

          ordinal: d3.scale.ordinal()
              .domain(["Obama", "Tied", "Romney"])
              .rangePoints([padding.top, size.height - padding.bottom])

        }

    /* ~~~~~~~~~~~~~~ add interactive buttons ~~~~~~~~~~~~~~ */

    var nav = d3.select(".chartwrapper").append("ul")
    nav.attr("class", "nav")
      .selectAll("li")
      .data([
        { title: "Racially Diverse", type: "min", tickFormat: "%,", description: "Percentage of minority (non-white) population" },
        { title: "Wealthy", type: "inc", tickFormat: "$,", description: "Median household income of county" },
        { title: "Educated", type: "grads", tickFormat: "%", description: "Percentage of people over 25 years old with a 4-year college degree or higher" },
        { title: "On Welfare", type: "snap", tickFormat: "%,", description: "Percentage of households with cash public assistance or food stamps/SNAP in the last 12 months" },
        { title: "Urban", type: "pop", tickFormat: ",", description: "Total population of county" }
      ])
      .enter()
      .append("li")
      .on("click", function (d) {
        var clicked = this;
        d3.selectAll(".nav li").classed("active", function () { return this == clicked })
        draw(d)
      })
      .attr("title", function (d) { return d.description })
      .text(function (d) { return d.title })

    nav.append("li")
      .append("input")
      .attr("placeholder", "search for county/state")
      .on("keyup", function (d) { filter(this.value) })

    /* ~~~~~~~~~~~~~~ intialize chart ~~~~~~~~~~~~~~ */

    var chart = d3.select(".chartwrapper").append("svg")
          .attr("class", "chart")
          .attr("width", size.width)
          .attr("height", size.height),

    /* ~~~~~~~~~~~~~~ axes and labels */

    axisXElement = chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + (size.height - padding.bottom + 5) + ")"),
    axisYElement = chart.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (padding.left - 10) + ",0)"),

    labelX = axisXElement.append("text")
      .attr("class", "labelX")
      .attr("x", (size.width - padding.left - padding.right) / 2 + padding.left)
      .attr("y", 35),
    labelY = axisYElement.append("text")
      .attr("class", "labelY")
      .attr("transform", "rotate(-90)")
      .attr("x", 0 - (size.height / 2) - 20)
      .attr("y", -50)
      .text("Margin of victory"),

    dividerY = scales.y(0),
    dividerLine = chart.append("line")
      .attr("class", "divider")
      .attr("x1", padding.left)
      .attr("y1", dividerY)
      .attr("x2", size.width - padding.right)
      .attr("y2", dividerY)
    chart.append("text")
      .attr("x", size.width - padding.right)
      .attr("y", dividerY - 5)
      .attr("text-anchor", "end")
      .attr("class", "label-victor label-obama")
      .text("Obama Counties")
    chart.append("text")
      .attr("x", size.width - padding.right)
      .attr("y", dividerY + 14)
      .attr("text-anchor", "end")
      .attr("class", "label-victor label-romney")
      .text("Romney Counties")

    var tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")

    /* ~~~~~~~~~~~~~~ population key */

    var key  = chart.append("g")
                .attr("class", "key")
                .attr("transform", "translate(" + (size.width - padding.left) + "," + padding.top + ")"),
        keys = key.selectAll("g")
                .data([10000, 100000, 500000, 1000000])
                .enter()
                .append("g")
                .attr("transform", function (d, i) { return "translate(" + 0 + "," + ((i + 1) * 25) + ")" })

    key.append("text")
      .attr("class", "key-title")
      .text("County Size")
      .attr("y", 5)

    keys.append("circle")
      .attr("r", function (d) { return scales.radius(d) })

    keys.append("text")
      .attr("x", 20)
      .attr("dy", "0.3em")
      .text(function (d) { return format.number(d) })

    /* ~~~~~~~~~~~~~~ chart drawing ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

    function draw(selectionData) {

      var dataColumn = selectionData.type

      scales.x = d3.scale.linear()//pow().exponent(0.2)
        .domain(d3.extent(data, function (d) { return parseFloat(d[dataColumn]) }))
        .range([padding.left, size.width - padding.right])

      /* ~~~~~~~~~~~~~~ mouseover tooltip code */

      var mouseEvents =
      {
        "mouseover": function (d) {
          d3.select(this)
            .attr("stroke", "#000")
            .attr("stroke-width", 3)
          tooltip.style("visibility", "visible")
            .html("<h2>" + d.name + "</h2>" +
                  ["Population: " + format.number(d.pop),
                   "College grads: " + Math.round(d.grads * 10000) / 100 + "%", // float issues with d3 percent
                   "Median household income: $" + format.number(d.inc),
                   "Minories: " + Math.round(d.min * 10000) / 100 + "%",
                   "Welfare recipents: " + Math.round(d.snap * 10000) / 100 + "%",
                   ((d.result > 0) ? "Obama" : "Romney") + "'s margin of victory: " + Math.abs(d.result) + "%"
                  ].join("<br/>"))
        },
        "mousemove": function (d) {
          tooltip
           .style("top",  (d3.event.pageY - 10) + "px")
           .style("left", (d3.event.pageX + 10) + "px")
        },
        "mouseout": function () {
          d3.select(this)
            .attr("stroke-width", "1")
          tooltip.style("visibility", "hidden")
        }
      },


      /* ~~~~~~~~~~~~~~ initial append of circles */

      circle = chart.selectAll("svg>circle").data(data)

      circle
        .enter()
        .append("circle")
        .on(mouseEvents)
        .style("fill", function (d, i) {
          var alpha = 0.7,
              intensity = Math.max(50, 85 - Math.abs(d.result))
          if      (d.result >  0) return "hsla(243,100%," + intensity + "%, " + alpha + ")"
          else if (d.result == 0) return "rgba(240,240,240," + alpha + ")"
          else                    return "hsla(0,100%,"   + intensity + "%, " + alpha + ")"
        })
        .attr("stroke", "black")
        .attr("stroke-width", 0.8)
        .attr("r", function (d) { return scales.radius(d.pop) }) //x.rangeBand()
        .attr("cx", size.width / 2)
        .attr("cy", size.height / 2)

      /* ~~~~~~~~~~~~~~ animate changes */

      circle
        .transition().duration(1000)
        .attr("cx", function (d) { return scales.x(d[dataColumn]) })
        .attr("cy", function (d) {
          return scales.y(d.result)
        })

      /* ~~~~~~~~~~~~~~ change axis and labels */

      var xAxis = d3.svg.axis().scale(scales.x).orient("bottom").tickFormat(d3.format(selectionData.tickFormat)),
          yAxis = d3.svg.axis().scale(scales.y).orient("left")

      axisXElement.call(xAxis)
      axisYElement.call(yAxis)
      chart.selectAll(".labelX").text(selectionData.description)

    /* ~~~~~~~~~~~~~~ Loess curve calculation */

    setTimeout(function(){

      var line = d3.svg.line()
                    .x(function (d) { return scales.x(d[0]); })
                    .y(function (d) { return scales.y(d[1]); })
      if (!filter.loessCache) {
        // If Worker isn't available or hasn't cached it, cache it here
        var clone = data.slice(0).sort(function (a, b) { return a[dataColumn] - b[dataColumn] })
        filter.loessCache = (function () {
          var resultMap = clone.map(function (d) { return d.result; }),
              dataMap   = clone.map(function (d) { return d[dataColumn] })
          return [d3.zip(dataMap, loess(dataMap, resultMap, 0.2))]
        })()
      }
      var path = chart.selectAll("path.loess")
                  .data(filter.loessCache)

      path.enter()
        .append("path")
        .attr("class", "loess")

      path.transition().attr("d", line)

    }, 1000)

    /* ~~~~~~~~~~~~~~ other helpers ~~~~~~~~~~~~~~ */

    function filter(query) {
      var clean = query.replace(/[^0-9a-zA-Z ÁÉÍÓÚ-áéíóu-ñÑ]+/, ""),
          re = new RegExp(clean, "i")
      chart.selectAll("svg>circle").attr("class", function (d) {
        return re.test(d.name) ? "match" : "nomatch"
      })
    }

    /* click first button in key onload */

    var event = document.createEvent("HTMLEvents");
    event.initEvent("click", true, false);
    document.querySelector(".nav>li").dispatchEvent(event);

})
