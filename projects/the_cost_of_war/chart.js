/// <reference path="../../common/js/d3.v3.min.js">

(function () {

  var padding = { top: 20, right: 20, bottom: 50, left: 20 }
  var size = { height: 900, width: 900, x: 450, y: 450, circle: 4 }

  var svg = d3.select(".chartwrapper").append("svg")
              .attr("width", size.width)
              .attr("height", size.height)
  var title = svg.append("text")
              .attr("class", "title")
              .attr("transform", "translate(" + size.x + "," + (size.y - 200) + ")")
              .text("The Cost of War")
  var subtitle = svg.append("text")
              .attr("class", "subtitle")
              .attr("transform", "translate(" + size.x + "," + (size.y - 180) + ")")
              .text("U.S. Fatalities: 2001-2014")
  var tooltip = d3.select("body").append("div")
              .attr("class", "tooltip")
  var counter = svg.append("text")
              .attr("class", "counter loading")
              .attr("transform", "translate(" + size.x + "," + (size.y) + ")")
              .text("loading...")
  var counterTitle = svg.append("text")
              .attr("class", "title-counter")
              .attr("transform", "translate(" + size.x + "," + (size.y + 32) + ")")


  function circlePlotter(input, rangeX, rangeY, radius, pointSize) {

    var currentView = "rings"
    var τ = 2 * Math.PI
    var points = []
    var oneQuarterCircle = (0.25 * τ)
    var threeQuarterCircle = (0.75 * τ)
    var centerPoint = {
      x: (rangeX[1] - rangeX[0]) / 2,
      y: (rangeY[1] - rangeY[0]) / 2
    }

    var circumference, circleCount, incrementAngle, pointEnd = -1

    for (var i = input[0], l = input[1]; i < l; i++) {

      if (i >= pointEnd) {
        circleCount = 0
        radius += pointSize
        circumference = τ * radius

        var maxPoints = Math.round(circumference / pointSize)
        incrementAngle = τ / maxPoints

        pointEnd = i + maxPoints
      }

      var angle = incrementAngle * circleCount  // starting from 90 degrees
      var topAngle = (angle > threeQuarterCircle) ? (angle - threeQuarterCircle) : (angle + oneQuarterCircle) // offset by 90 degrees so pie starts at 12 o'clock

      points[i] = {
        x: radius * Math.cos(angle) + centerPoint.x,
        y: radius * Math.sin(angle) + centerPoint.y,
        angle: topAngle,
        order: i
      }

      circleCount++
    }

    function plot(item) {
      return points[item]
    }

    plot.setDrawMode = function (type) {
      if (type == currentView) return
      var attr = (type == "rings") ? "order" : "angle"
      points = points.sort(function (a, b) { return a[attr] - b[attr] })
      currentView = type
    }

    return plot

  }

  d3.json("data.js", function (json) {

    var data = json

    var branches = {}
    data.forEach(function (o) {
      o.dateInt = new Date(o.date).valueOf()
      if (!branches[o.b]) branches[o.b] = 1
      else branches[o.b]++
    })
    data.forEach(function (o) {
      // allow sorting of military branch by most frequent to least
      o.branchSort = 1 / branches[o.b]
    })

    var plot = circlePlotter([0, data.length], [0, size.width], [0, size.height], 100, 9)
    var color20 = d3.scale.category20c()
    var color10 = d3.scale.category10()
    counter.text("[ start ]")
      .classed("initial", true)
      .classed("loading", false)
      .on("click", function () {
        animation.start()
      })

    d3.select(".namesearch")
      .on("input", function (e) {
        if (!animation.complete) animation.stop()
        var clean = this.value.replace(/[^0-9a-zA-Z ÁÉÍÓÚ-áéíóu-ñÑ]+/, ""),
            re = new RegExp(clean, "i")
        svg.selectAll("circle").attr("class", function (d) {
          return re.test(d.name) ? "match" : "nomatch"
        })
      })

    d3.selectAll(".controls li[data-type]")
      .on("click", function () {
        if (!animation.complete) animation.stop()
        draw(this.getAttribute("data-type"))
        var that = this
        d3.selectAll(".controls li[data-type]").classed("active", function () { return this == that })
      })
    d3.selectAll(".restart")
      .on("click", function () {
        if (this.classList.contains("disabled")) return
        d3.selectAll(".controls li[data-type]").classed("active", false)
        animation.start()
      })

    var circleMouseEvents = {

      "mouseover": function (d, i) {
        d3.select(this)
          .classed("over", true)
        tooltip.style("visibility", "visible")
          .html("<h3>" + d.name + "</h3>" +
                "<div><span>Died:</span><span class='date'>" + d.date + "</span></div>" +
                "<div><span>In:</span><span class='loc'>" + d.c + ((!d.c.match(/(Iraq|Afghanistan)/)) ? (d.loc == "2" ? ", Afghanistan" : ", Iraq") : "") + "</span></div>" +
                "<div><span>At age:</span><span class='age'>" + d.age + "</span></div> " +
                "<div><span>Branch:</span><span class='b'>" + d.b + "</span></div>")
      },
      "mousemove": function (d) {
        tooltip
          .style("top", (d3.event.pageY - 10) + "px")
          .style("left", (d3.event.pageX + 10) + "px")
      },
      "mouseout": function () {
        d3.select(this)
          .classed("over", false)
        tooltip.style("visibility", "hidden")
      }

    }

    function draw(type) {

      plot.setDrawMode((type == "initial") ? "rings" : "wedge") // force circlePlot to draw view in concentric rings or wedges

      var attributeToSortOn = (type == "initial" || type == "date") ? "dateInt" : ((type == "b") ? "branchSort" : type)
      data = data.sort(function (a, b) {
        // chrome does not sort matching values consistently (like dates). Return secondary unique value if primary values are equal
        if (a[attributeToSortOn] == b[attributeToSortOn]) return a.name > b.name ? 1 : -1
        else return a[attributeToSortOn] > b[attributeToSortOn] ? 1 : -1
      })

      tooltip.classed("filter-initial filter-date filter-loc filter-age filter-b", false)
        .classed("filter-" + type, true)
      var circle = svg.selectAll("circle")
                      .data(data, function (d) { return d.name; })

      circle
        .enter()
        .append("circle")
        .on(circleMouseEvents)

        circle.transition().duration(type=="initial"?0:1000)
          .attr("r", size.circle)
          .attr("cx", function (d, i) { return plot(i).x })//+ Math.random()*5}
          .attr("cy", function (d, i) { return plot(i).y })//+ Math.random()*5}

      if (type == "initial")   circle.attr("fill", "red").attr("class", "match initial")
      else if (type == "date") circle.attr("fill", function (d, i) { return color20((new Date(d.date)).getYear() - 2000); })
      else if (type == "loc")  circle.attr("fill", function (d, i) { return color10((d.loc == "2")); })
      else if (type == "age")  circle.attr("fill", function (d, i) { return color10(Math.floor((d.age - 5) / 10)); })
      else if (type == "b")    circle.attr("fill", function (d, i) { return color20(d.b); })

    }


    var animation = (function () {

      var circles, increment, tickCount
      var cycleTime = 8000
      var toggleOnTick = 2
      var tickCounter

      var nameWrapper = svg.append("g")
      var animationText = svg.append("text")
                  .attr("class", "animationText")
      var arc = d3.svg.arc()
                  .innerRadius(80)
                  .outerRadius(85)
                  .startAngle(0)
      var bigCircle = svg.append("path")
                  .attr("class", "bigcircle")
                  .attr("transform", "translate(" + size.x + "," + size.y + ")")
                  .datum({ endAngle: 0 })
                  .attr("d", arc)
      draw("initial")

      function arcTween(transition, newAngle) {
        transition.attrTween("d", function (d) {
          var interpolate = d3.interpolate(d.endAngle, newAngle)
          return function (t) {
            d.endAngle = interpolate(t)
            return arc(d)
          }
        })
      }

      function tick() {

        // stop interval at end
        if (tickCount >= data.length) {
          animation.stop()
        }

        // speed up incrementally
        if (tickCount > 0 && tickCount % 250 === 0) {
          increment = Math.min(increment + 1, 7)
        }

        counter.text((tickCount + 1))
        if (tickCount === 0) counterTitle.text("fatality")
        else if (tickCount == 1) counterTitle.text("fatalities")

        // this is faster than css query once thousands of items on screen
        Array.prototype.slice.call(circles, tickCount, tickCount + increment).forEach(function (o) {
          d3.select(o).classed("initial", false)
        })

        /* for first soldiers */
        if (tickCount <= toggleOnTick) {

          // animate circle
          bigCircle
            .datum({ endAngle: 0 })
            .transition()
              .duration(cycleTime / 10)
              .call(arcTween, 2 * Math.PI)

          svg.select("circle:nth-of-type(" + (tickCount + 1) + ")")
            .transition().delay(cycleTime * 0.1)
              .duration(cycleTime * 0.1)
              .attr("r", "20")
            .transition()
              .delay(cycleTime * 0.8)
              .attr("r", size.circle)

          // amimate details about first few soldiers
          var coord = plot(tickCount)
          animationText
          .transition()
            .text(data[tickCount].name)
            .attr("opacity", 0)
            .attr("transform", "translate(" + (coord.x + 30) + "," + (coord.y - 100) + ")")
          .transition()
            .delay(cycleTime * 0.1)
            .duration(cycleTime * 0.1)
            .attr("opacity", 1)
            .attr("transform", "translate(" + (coord.x + 25) + "," + (coord.y + 5) + ")")
          .transition()
            .delay(cycleTime * 0.3)
            .attr("opacity", 0)
          .transition()
            .delay(cycleTime * 0.4)
            .text("Died in " + data[tickCount].c + " on " + data[tickCount].date)
            .attr("opacity", 1)
          .transition()
            .delay(cycleTime * 0.6)
            .attr("opacity", 0)
          .transition()
            .delay(cycleTime * 0.7)
            .text("Age " + data[tickCount].age)
            .attr("opacity", 1)
          .transition()
            .delay(cycleTime * 0.9)
            .attr("opacity", 0)
            .attr("transform", "translate(" + (coord.x + 30) + "," + (coord.y + 100) + ")")

          // clean up on last item
          if (tickCount == toggleOnTick) {
            bigCircle
              .transition()
                .delay(cycleTime)
                .duration(4000)
                .call(arcTween, 0)

            svg.selectAll(".title, .subtitle")
              .transition()
                .delay(cycleTime)
                .duration(4000)
                .style("opacity", 0)

            clearInterval(tickCounter)
            tickCounter = setTimeout(function () {
              tickCounter = setInterval(tick, 0)
            }, cycleTime + 5000)
          }

        }
        else { // for the full aimation
          var text = nameWrapper.selectAll("text.name")
                          .data(data.slice(Math.max(0, tickCount - 200), tickCount), function (d) { return d.name; })

          text.enter()
            .append("text")
            .attr("class", "name")
            .text(function (d) { return d.name })
            .attr("transform", function () { return "translate(" + Math.round(Math.random() * size.width) + "," + Math.round(Math.random() * size.height) + "), scale(1,1)" })
            .style('opacity', 0.3)
            .transition()
              .duration(5000)
              .attr("transform", function () {
                var scale = Math.random() + 0.5
                var matrix = this.transform.baseVal.getItem(0).matrix
                return "translate(" + (matrix.e + (Math.random() * 50 - 25)) + ", " + (matrix.f + (Math.random() * 50 - 25)) + "), scale(" + scale + "," + scale + ")"
              })
            .transition()
              .delay(2000)
              .style("opacity", 0)
              .style("display", "none")
          text.exit().remove()
        }
        tickCount = tickCount + increment

      }

      return {
        complete: false,
        start: function () {
          animation.complete = false
          d3.select(".restart").classed("disabled", true)
          draw("initial")
          circles = document.querySelectorAll("circle")
          d3.select(".counter.initial").on("click", null).classed("initial", false)
          svg.selectAll(".title, .subtitle, .animationText, .bigcircle").style("display", "block")
          svg.selectAll(".title, .subtitle").transition().style("opacity", 1)
          increment = 1
          tickCount = 0
          setTimeout(function(){ // allow redraw in IE
            tick()
            tickCounter = setInterval(tick, cycleTime + 1000)
          },0)
        },
        stop: function () {
          animation.complete = true
          d3.select(".restart").classed("disabled", false)
          d3.select(".counter.initial").classed("initial", false)
          d3.selectAll("circle").classed("initial", false).attr("r", size.circle)
          svg.selectAll(".title, .subtitle, .animationText, .bigcircle").style("display", "none")
          counter.text(data.length)
          counterTitle.text("fatalities")
          clearInterval(tickCounter)
        }

      }


    })()

  })
})()