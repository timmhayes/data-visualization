/*global d3, topojson*/

(function () {

  var svg = d3.select('svg')
  var path = d3.geoPath()
  var countyData = {}

  function update (type) {

    var color = d3.scaleSequential(d3.interpolateRdYlGn).domain([20, 0])

    svg.select('.counties').selectAll('path')
      .transition()
      .attr('fill', function (d) {
        var cData = countyData[d.id]
        if (!cData || typeof cData[type] !== 'number') {
          return '#dddddd'
        } else {
          return color(cData[type])
        }
      })
    d3.selectAll('[data-update]').classed('active', false)
    d3.select('[data-update="' + type + '"]').classed('active', true)

  }

  var tooltip = {

    hide: function () {
      svg.on('mousemove.tooltip', null)
      d3.select('#tooltip').classed('on', false)
    },

    format: function (val) {
      if (typeof val !== 'number') return val
      else return val.toFixed(3)
    },

    position: function () {
      var t = d3.select('#tooltip')
      var rect = t.node().getBoundingClientRect()
      var x = (d3.event.pageX + rect.width + 25 < document.body.offsetWidth)
                ? d3.event.pageX + 25
                : d3.event.pageX - rect.width - 25
      var h = rect.height / 2
      var y = (d3.event.pageY + rect.height - h < document.body.offsetHeight)
                ? d3.event.pageY - h
                : d3.event.pageY - rect.height

      t.style('left', x + 'px')
        .style('top', y + 'px')
    },

    show: function (id) {
      var data = countyData[id]
      if (!data) return
      d3.select('#tooltip').html(
          '<h2>' + data.county + ', ' + data.st + '</h2>' +
          '<table>' +
          '<tr><td>All:</td><td>' + tooltip.format(data.all) + '</td></tr>' +
          '<tr><td>Suicide:</td><td>' + tooltip.format(data.suicide) + '</td></tr>' +
          '<tr><td>Homicide:</td><td>' + tooltip.format(data.homicide) + '</td></tr>' +
          '</table>'
        ).classed('on', true)
      tooltip.position()
      svg.on('mousemove.tooltip', tooltip.position)
      d3.event.preventDefault()
      d3.event.stopPropagation()
    }

  }

  d3.select('html').on('click', function () {
    if (d3.event.target.tagName !== 'path') tooltip.hide()
  })

  d3.queue(2)
    .defer(d3.json, 'https://d3js.org/us-10m.v1.json')
    .defer(d3.csv, 'gun-deaths-all.csv')
    .await(function (error, us, deaths) {

      if (error) throw error

      deaths.forEach(function (county) {
        var id = county.StateFIPS.padStart(2, '0') + county.CountyFIPS.padStart(3, '0')
        countyData[id] = {
          all: county.S_C_Rate ? parseFloat(county.S_C_Rate) : 'n/a',
          homicide: county.S_Homicide_Rate ? parseFloat(county.S_Homicide_Rate) : 'n/a',
          suicide: county.S_Suicide_Rate ? parseFloat(county.S_Suicide_Rate) : 'n/a',
          st: county.ST,
          county: county.County
        }
      })

      svg.append('g')
        .attr('class', 'counties')
        .selectAll('path')
        .data(topojson.feature(us, us.objects.counties).features)
        .enter().append('path')
        .attr('d', path)
        .on('click, mouseover', function (d, s, el) { tooltip.show(d.id) })
        .on('mouseout', tooltip.hide)

      svg.append('path')
        .attr('class', 'county-borders')
        .attr('d', path(topojson.mesh(us, us.objects.counties, function (a, b) { return a !== b })))

      update('all')

    })

  d3.selectAll('[data-update]').on('click', function (e) {
    update(this.getAttribute('data-update'))
  })

})()


/* Polyfills */
if (!String.prototype.padStart) {
  String.prototype.padStart = function padStart (targetLength, padString) {
    targetLength = targetLength >> 0
    padString = String((typeof padString !== 'undefined' ? padString : ' '))
    if (this.length > targetLength) {
      return String(this)
    } else {
      targetLength = targetLength - this.length
      if (targetLength > padString.length) {
        padString += padString.repeat(targetLength / padString.length)
      }
      return padString.slice(0, targetLength) + String(this)
    }
  }
}
