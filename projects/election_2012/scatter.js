/// <reference path="d3.v3.min.js">

d3.json("data.js", function(json) {

      format =  {

      padding = { top: 20, right: 130, bottom: 50, left: 100 },
        number  : d3.format(","),
        percent : d3.format(",p")
      size = { height: 500, width: 900 },

      },

      scales = {

        y: d3.scale.linear()
            .domain(d3.extent(data, function(d) { return d.result }).reverse())
            .range([padding.top, size.height - padding.bottom]),

        radius: d3.scale.sqrt()// sqrt to set circle by area rather than radius  / r = sqrt(a/pi)
            .domain(d3.extent(data, function(d) { return parseFloat(d.pop) }))
            .range([0, 35]),

        ordinal: d3.scale.ordinal()
            .domain(["Obama", "Tied", "Romney"])
            .rangePoints([padding.top, size.height - padding.bottom])


  /* ~~~~~~~~~~~~~~ add interactive buttons ~~~~~~~~~~~~~~ */

  var nav = d3.select(".wrapper").append("ul")
  nav.attr("class", "nav")
        .selectAll("li")
        .data([
            { title: "Racially Diverse", type: "min", tickFormat: "%,", description: "Percentage of minority (non-white) population", lowlabel: "white", highlabel: "minority" },
            { title: "Wealthy", type: "inc", tickFormat: "$,", description: "Median household income of county", lowlabel: "low-income", highlabel: "high-income" },
            { title: "Educated", type: "grads", tickFormat: "%", description: "Percentage of people over 25 years old with a 4-year college degree or higher", lowlabel: "less-educated", highlabel: "more-educated" },
            { title: "On Welfare", type: "snap", tickFormat: "%,", description: "Percentage of households with cash public assistance or food stamps/SNAP in the last 12 months", lowlabel: "non welfare", highlabel: "welfare" },
            { title: "Urban", type: "pop", tickFormat: ",", description: "Total population of county", lowlabel: "small county", highlabel: "large county" }
        ])
        .enter()
        .append("li")
        .on("click", function(d) {
          var clicked = this;
          d3.selectAll(".nav li").classed("active", function() { return this == clicked })
            draw( d.type, d.tickFormat, d.description )
        })
        .attr("title", function(d) { return d.description })
        .text(function(d) { return d.title })

  nav.append("li")
        .append("input")
        .attr("placeholder", "search for county/state")
        .on("keyup", function(d) { filter(this.value) })

  /* ~~~~~~~~~~~~~~ intialize chart ~~~~~~~~~~~~~~ */

  var chart = d3.select(".wrapper").append("svg")
        .attr("class", "chart")
        .attr("width", size.width)
        .attr("height", size.height),

  /* ~~~~~~~~~~~~~~ axes and labels */

  axisXElement = chart.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + (size.height - padding.bottom + 5 ) + ")"),
  axisYElement = chart.append("g").attr("class", "axis axisY")
    .attr("class", "y axis")
    .attr("transform", "translate(" + (padding.left-10) + ",0)"),

  labelX = axisXElement.append("text")
    .attr("class", "labelX")
    .attr("x", (size.width - padding.left - padding.right) / 2 + padding.left)
    .attr("y", 35) 
  labelY = axisYElement.append("text")
    .attr("class", "labelY")
    .attr("transform", "rotate(-90)")
    .attr("x", 0 - (size.height / 2) - 20)
    .attr("y", -50)
    .text("Margin of victory"),
  
  dividerY = (size.height - padding.top - padding.bottom)/2 + padding.top
  dividerLine = chart.append("line")
    .attr("x1", padding.left)
    .attr("y1", dividerY)
    .attr("x2", size.width - padding.right)
    .attr("y2", dividerY)
    .attr("stroke-width", 0.5)
    .attr("stroke", "black")
    .attr("stroke-dasharray", "5,5"),

  arrowLine = "M25,0L45,30L35,30L25,150,L15,30L5,30Z"
  arrowUp = chart.append("path")
    .attr("class", "arrow up")
    .attr("d", arrowLine)
    .attr("transform", "translate(13,30)")
  arrowDown = chart.append("path")
    .attr("class", "arrow down")
    .attr("d", arrowLine)
    .attr("transform", "rotate(180) translate(-62,-530)")

  var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")

  /* ~~~~~~~~~~~~~~ population key */

  var key = chart.append("g")
              .attr("class", "key")
              .attr("transform", "translate(" + (size.width - padding.left) + "," + padding.top + ")"),
      keys = key.selectAll("g")
              .data([10000, 100000, 500000, 1000000])
              .enter()
              .append("g")
              .attr("transform", function(d, i) { return "translate(" + 0 + "," + ((i + 1) * 25) + ")" })

  key.append("text")
     .text("County Size")
     .attr("y", 5)
     .attr("class", "key-title")

  keys.append("circle")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("fill", "rgba(128,128, 128, 0.2)")
      .attr("r", function(d) { return scales.radius(d) })
  keys.append("text")
      .attr("x", 20)
      .attr("dy", "0.3em")
      .text(function(d) { return format.number(d) })

  /* ~~~~~~~~~~~~~~ chart drawing ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

  function draw(type, tickFormat, description) {

    scales.x = d3.scale.linear()//pow().exponent(0.2)
        .domain(d3.extent(data, function (d) {return parseFloat(d[type]) }))
        .range([padding.left, size.width - padding.right])

    /* ~~~~~~~~~~~~~~ mouseover tooltip code */

    var mouseEvents =
    {
      "mouseover": function(d) {
        d3.select(this)
          .attr("stroke", "#000")
          .attr("stroke-width", 3)
        tooltip.style("visibility", "visible")
          .html("<h2>"+d.name + "</h2>" +
                ["Population: "               + format.number(d.pop),
                 "College grads: "            + Math.round(d.grads * 10000)/100 + "%", // float issues with d3 percent
                 "Median household income: $" + format.number(d.inc),
                 "Minories: " + Math.round(d.min * 10000) / 100 + "%",
                 "Welfare recipents: "        + Math.round(d.snap * 10000)/100 + "%", 
                 ((d.result > 0)? "Obama":"Romney") + "'s margin of victory: " + Math.abs(d.result) +"%"
                ].join("<br/>"))
      },
      "mousemove": function(d) {
        tooltip
         .style("top", (d3.event.pageY - 10) + "px")
         .style("left", (d3.event.pageX + 10) + "px")
      },
      "mouseout": function() {
        d3.select(this)
          .attr("stroke-width", "1")
        tooltip.style("visibility", "hidden")
      }
    },
    circle = chart.selectAll("svg>circle").data(data)

    /* ~~~~~~~~~~~~~~ initial append of circles */

    circle
      .enter()
      .append("circle")
      .on(mouseEvents)
      .style("fill", function(d, i) {
        var alpha = 0.7,
            intensity = Math.max(50, 85  - Math.abs(d.result))
        if (d.result > 0)       return "hsla(243,100%," + intensity + "%, " + alpha + ")"
        else if (d.result == 0) return "rgba(240,240,240," + alpha + ")"
        else                    return "hsla(0,100%," + intensity + "%, " + alpha + ")"
      })
      .attr("stroke", "black")
      .attr("stroke-width", 0.8)
      .attr("r", function(d) { return scales.radius(d.pop) }) //x.rangeBand()
      .attr("cx", size.width / 2)
      .attr("cy", size.height / 2)

    /* ~~~~~~~~~~~~~~ animate changes */

    circle
      .transition().duration(1000)
      .attr("cx", function(d) { return scales.x(d[selectionData.type]) })
      .attr("cy", function(d) {
        return scales.y(d.result)
      })

    /* ~~~~~~~~~~~~~~ change axis and labels */

    var xAxis = d3.svg.axis().scale(scales.x).orient("bottom").tickFormat( d3.format(tickFormat) ),
        yAxis = d3.svg.axis().scale(scales.ordinal).orient("left")
    axisXElement.call(xAxis)
    axisYElement.call(yAxis)
    chart.selectAll(".labelX").text(description)

  }

  /* ~~~~~~~~~~~~~~ other helpers ~~~~~~~~~~~~~~ */

  function filter(query) {
    var clean = query.replace(/[^0-9a-zA-Z ÁÉÍÓÚ-áéíóu-ñÑ]+/, ""),
        re = new RegExp(clean, "i")
    chart.selectAll("svg>circle").attr("class", function(d) {
      return d.name.match(re) ? "match" : "nomatch"
    })
  }

  /* click first button in key onload */

  var event = document.createEvent("HTMLEvents");
  event.initEvent("click", true, false);
  document.querySelector(".nav>li").dispatchEvent(event);

})
