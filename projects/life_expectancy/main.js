
(function() {

    d3.select(window).on("resize", throttle);

    var zoom = d3.behavior.zoom()
      .scaleExtent([1, 9])
      .on("zoom", move);


    var width = document.getElementById('container').offsetWidth;
    var height = width / 2;
    var topo, projection, path, svg, g, lifeExpectancies;
    var graticule = d3.geo.graticule();
    var tooltip = d3.select("#container").append("div").attr("class", "tooltip hidden");

    setup(width, height);

    function setup(width, height) {

      projection = d3.geo.mercator()
        .translate([(width / 2), (height / 2)])
        .scale(width / 2 / Math.PI);

      path = d3.geo.path().projection(projection);

      svg = d3.select("#container").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoom)
        .append("g");

      g = svg.append("g");

    }

    queue()
      .defer(d3.json, "data/world-topo-min.json")
      .defer(d3.csv, "data/life-expectancy.csv")
      .await(function (error, topoData, lifeCsv) {

        topo = topojson.feature(topoData, topoData.objects.countries).features;
        topo.forEach(function (country) {
          var filtered = lifeCsv.filter(function (expectancy) {
            return country.properties.name == expectancy.country
          });
          if (filtered.length != 1) {
            console.log("DID NOT FIND: " + country.properties.name);
          }
          else {
            country.properties.span = filtered[0].span;
          }
        })
        draw();

      });


    function draw() {
      /*
       svg.append("path")
       .datum(graticule)
       .attr("class", "graticule")
       .attr("d", path);


       g.append("path")
       .datum({type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]]})
       .attr("class", "equator")
       .attr("d", path);
       */

      var country = g.selectAll(".country").data(topo);

      country.enter().insert("path")
        .attr("class", function (d) {
          var rounded = Math.floor(d.properties.span / 5) * 5;
          return "country span-" + d.properties.span + " spanavg-" + rounded;
        })
        .attr("d", path)
        .attr("id", function (d, i) {
          return d.id;
        })
        .attr("title", function (d, i) {
          return d.properties.title;
        })

      //offsets for tooltips
      var offsetL = document.getElementById('container').offsetLeft + 20;
      var offsetT = document.getElementById('container').offsetTop + 10;

      //tooltips
      country
        .on("mousemove", function (d, i) {

          var mouse = d3.mouse(svg.node()).map(function (d) {
            return parseInt(d);
          });

          tooltip.classed("hidden", false)
            .attr("style", "left:" + (mouse[0] + offsetL) + "px;top:" + (mouse[1] + offsetT) + "px")
            .html(d.properties.name + ": " + d.properties.span + " years");
        })
        .on("mouseout", function (d, i) {
          tooltip.classed("hidden", true);
        });


    }


    function redraw() {
      width = document.getElementById('container').offsetWidth;
      height = width / 2;
      d3.select('svg').remove();
      setup(width, height);
      draw(topo);
    }


    function move() {

      var t = d3.event.translate;
      var s = d3.event.scale;
      zscale = s;
      var h = height / 4;


      t[0] = Math.min(
          (width / height) * (s - 1),
        Math.max(width * (1 - s), t[0])
      );

      t[1] = Math.min(
          h * (s - 1) + h * s,
        Math.max(height * (1 - s) - h * s, t[1])
      );

      zoom.translate(t);
      g.attr("transform", "translate(" + t + ")scale(" + s + ")");

      //adjust the country hover stroke width based on zoom level
      d3.selectAll(".country").style("stroke-width", 1.5 / s);

    }


    var throttleTimer;

    function throttle() {
      window.clearTimeout(throttleTimer);
      throttleTimer = window.setTimeout(function () {
        redraw();
      }, 200);
    }

})()