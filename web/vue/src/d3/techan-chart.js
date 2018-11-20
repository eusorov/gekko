/*jshint esversion: 6 */
import _ from 'lodash';
import moment from 'moment';

// techanjs candle chart with indicatorsEmbedded
// based on example http://bl.ocks.org/andredumas/edf630690c10b89be390

export default function(_data, _trades, _indicatorResults, _height, _config) {

  // get chart config from current strategy/method
    var configIndicators = {}
    if (_config && _config.tradingAdvisor){
        configIndicators = (_config[_config.tradingAdvisor.method]) || {};
    }

    let MAX_WIDTH = window.innerWidth;

    var dim = {
        width: MAX_WIDTH,
        margin: { top: 20, right: 100, bottom: 30, left: 70 },
        ohlc: { height: 505 },
        indicator: { height: 100, padding: 5 }
    };
    dim.plot = {
        width: dim.width - dim.margin.left - dim.margin.right,
    };
    dim.indicator.top = dim.ohlc.height+dim.indicator.padding;
    dim.indicator.bottom = dim.indicator.top+dim.indicator.height+dim.indicator.padding;

    var indicatorTop = d3.scaleLinear()
            .range([dim.indicator.top, dim.indicator.bottom]);

    var parseDate = d3.timeParse("%d-%b-%y");

    var zoom = d3.zoom()
            .scaleExtent([1, 20])
            .on("zoom", zoomed);

    d3.selectAll("g").on("scroll", null);

    var x = techan.scale.financetime()
            .range([0, dim.plot.width]);

    var y = d3.scaleLinear()
            .range([dim.ohlc.height, 0]);


    var yPercent = y.copy();   // Same as y at this stage, will get a different domain later

    var yInit, yPercentInit, zoomableInit;

    var yVolume = d3.scaleLinear()
            .range([y(0), y(0.2)]);

    var candlestick = techan.plot.candlestick()
            .xScale(x)
            .yScale(y);

    var tradearrow = techan.plot.tradearrow()
            .xScale(x)
            .yScale(y)
            .y(function(d) {
                // Display the buy and sell arrows a bit above and below the price, so the price is still visible
                if(d.type.includes('buy')) return y(d.low)+5;
                if(d.type.includes('sell')) return y(d.high)-5;
                else return y(d.price);
            })
            .on("mouseenter", enter)
            .on("mouseout", out);

    // strategy indicatorsEmbedded
    let indicatorsEmbedded = {};
    let indicatorData = {};
    let indicatorsExtraPlot = [];

    _indicatorResults.forEach((res) => {
        _.each(res.indicators, (val, name)=> {
           indicatorData[name] = indicatorData[name] ? indicatorData[name] : [];

           const configChart = configIndicators[name] != undefined ? configIndicators[name].chart : undefined;

           if (configChart && configChart.showInExtraWindow){
                if (indicatorsExtraPlot.filter((extraPlot)=> extraPlot.name === name).length != 1){
                   indicatorsExtraPlot.push({name : name, config: configIndicators[name].chart});
                }
            }else{
                let plotName = "sma"
                if (configChart && configChart.type){
                     plotName = getPlotName(configChart.type);
                }
                indicatorsEmbedded[name] = techan.plot[plotName]().xScale(x).yScale(y);
                indicatorsEmbedded[name].config = configChart;
            }
            const offset = moment.unix(res.date).toDate().getTimezoneOffset();
            let result = {date: moment.unix(res.date).add(offset, "m").toDate()};

            if (configChart && configChart.type === "stochastic"){
                    result.middle = 50;
                    result.overbought = configIndicators[name].thresholds.up;
                    result.oversold = configIndicators[name].thresholds.buy.strong_down;
                    result.stochasticD = !isNaN(+val.stochK) ? +val.stochK : null;
                    result.stochasticK = !isNaN(+val.stochD) ? +val.stochD : null;
            } if (configChart && configChart.type === "bollinger") {
                    result.lowerBand = !isNaN(+val.bbandsLower) ? +val.bbandsLower : null;
                    result.middleBand = !isNaN(+val.bbandsMiddle) ? +val.bbandsMiddle : null;
                    result.upperBand = !isNaN(+val.bbandsUpper) ? +val.bbandsUpper : null;
            } if (configChart && configChart.type === "macd") {
                    result.difference = +val.diff;
                    result.macd = +val.macd;
                    result.signal = +val.signal;
                    result.zero = 0;
            } if (configChart && configChart.type === "rsi") {
                    result.middle = 50;
                    result.overbought = 70;
                    result.oversold = 30;
                    result.rsi = !isNaN(+val) ? +val : null;
            } if (configChart && configChart.type === "res_sup") {
                    result.value = !isNaN(+(val)) ? +(val) : null;
                    result.props = val.props;
            } else if (!isNaN(+val)) {
                    result.value = +val;
            } else if (val !== null && typeof val === 'object') {
                    result.value = !isNaN(+val.result) ? +val.result : null
            } else {
                    result.value = null;
            }

            indicatorData[name].push(result);
        });
    });

    dim.height = (555 + (indicatorsExtraPlot.length *105));
    dim.plot.height = dim.height - dim.margin.top - dim.margin.bottom;

    var volume = techan.plot.volume()
            .accessor(candlestick.accessor())   // Set the accessor to a ohlc accessor so we get highlighted bars
            .xScale(x)
            .yScale(yVolume);

    var xAxis = d3.axisBottom(x);

    var timeAnnotation = techan.plot.axisannotation()
            .axis(xAxis)
            .orient('bottom')
            .format(d3.timeFormat('%Y-%m-%d %H:%M'))
            .width(85)
            .translate([0, dim.plot.height]);

    var yAxis = d3.axisRight(y);

    var ohlcAnnotation = techan.plot.axisannotation()
            .axis(yAxis)
            .orient('right')
            .format(d3.format(',.2f'))
            .translate([x(1), 0]);

    var closeAnnotation = techan.plot.axisannotation()
            .axis(yAxis)
            .orient('right')
            .accessor(candlestick.accessor())
            .format(d3.format(',.2f'))
            .translate([x(1), 0]);

    var percentAxis = d3.axisLeft(yPercent)
            .tickFormat(d3.format('+.1%'));

    var percentAnnotation = techan.plot.axisannotation()
            .axis(percentAxis)
            .orient('left');

    var volumeAxis = d3.axisRight(yVolume)
            .ticks(3)
            .tickFormat(d3.format(",.3s"));

    var volumeAnnotation = techan.plot.axisannotation()
            .axis(volumeAxis)
            .orient("right")
            .width(35);

    var ohlcCrosshair = techan.plot.crosshair()
                    .xScale(timeAnnotation.axis().scale())
                    .yScale(ohlcAnnotation.axis().scale())
                    .xAnnotation(timeAnnotation)
                    .yAnnotation([ohlcAnnotation, percentAnnotation, volumeAnnotation])
                    .verticalWireRange([0, dim.plot.height])
                    .on("move", crosshairMove);

// indikators stochastic
  for (let i = 0; i < indicatorsExtraPlot.length; i++){
    createIndicator(indicatorsExtraPlot[i], i);
  }

  function createIndicator(indicator, i){
    var scale = d3.scaleLinear()
            .range([indicatorTop(i)+dim.indicator.height, indicatorTop(i)]);
    indicator.scale = scale;

    let plotName = getPlotName(indicator.config.type);

    var plot = techan.plot[plotName]()
            .xScale(x)
            .yScale(scale);
    indicator.plot = plot;

    indicator.scale.domain(techan.scale.plot[plotName](indicatorData[indicator.name]).domain());

    var axis = d3.axisRight(scale)
            .ticks(3);
    indicator.axis = axis;

    var annotation = techan.plot.axisannotation()
            .axis(axis)
            .orient("right")
            .format(d3.format(',.2f'))
            .translate([x(1), 0]);
    indicator.annotation = annotation;

    var axisLeft = d3.axisLeft(scale)
            .ticks(3);
    indicator.axisLeft = axisLeft;

    var annotationLeft = techan.plot.axisannotation()
            .axis(axisLeft)
            .orient("left")
            .format(d3.format(',.2f'));
    indicator.annotationLeft = annotationLeft;

    var crosshair = techan.plot.crosshair()
        .xScale(timeAnnotation.axis().scale())
        .yScale(annotation.axis().scale())
        .xAnnotation(timeAnnotation)
        .yAnnotation([annotation, annotationLeft])
        .verticalWireRange([0, dim.plot.height])
        .on("move", crosshairMove);

   indicator.crosshair = crosshair;

  }


// show indicator values
//     var bollingerBandsScale = d3.scaleLinear()
//           .range([indicatorTop(4)+dim.indicator.height, indicatorTop(4)]);

//     var bollingerBands = techan.plot.bollinger()
//             .xScale(x)
//             .yScale(bollingerBandsScale);

//     var bollingerBandsAxis = d3.axisRight(bollingerBandsScale)
//             .ticks(3);

//     var bollingerBandsAnnotation = techan.plot.axisannotation()
//             .axis(bollingerBandsAxis)
//             .orient("right")
//             .format(d3.format(',.2f'))
//             .translate([x(1), 0]);

//     var bollingerBandsAxisLeft = d3.axisLeft(bollingerBandsScale)
//             .ticks(3);

//     var bollingerBandsAnnotationLeft = techan.plot.axisannotation()
//             .axis(bollingerBandsAxisLeft)
//             .orient("left")
//             .format(d3.format(',.2f'));

//   var bollingerBandsCrosshair = techan.plot.crosshair()
//         .xScale(timeAnnotation.axis().scale())
//         .yScale(bollingerBandsAnnotation.axis().scale())
//         .xAnnotation(timeAnnotation)
//         .yAnnotation([bollingerBandsAnnotation, bollingerBandsAnnotationLeft])
//         .verticalWireRange([0, dim.plot.height])
//         .on("move", crosshairMove);
// END
// RSI
  //   var macdScale = d3.scaleLinear()
  //         .range([indicatorTop(2)+dim.indicator.height, indicatorTop(2)]);
  //
  //   var macd = techan.plot.macd()
  //           .xScale(x)
  //           .yScale(macdScale);
  //
  //   var macdAxis = d3.axisRight(macdScale)
  //           .ticks(3);
  //
  //   var macdAnnotation = techan.plot.axisannotation()
  //           .axis(macdAxis)
  //           .orient("right")
  //           .format(d3.format(',.2f'))
  //           .translate([x(1), 0]);
  //
  //   var macdAxisLeft = d3.axisLeft(macdScale)
  //           .ticks(3);
  //
  //   var macdAnnotationLeft = techan.plot.axisannotation()
  //           .axis(macdAxisLeft)
  //           .orient("left")
  //           .format(d3.format(',.2f'));
  //
  // var macdCrosshair = techan.plot.crosshair()
  //       .xScale(timeAnnotation.axis().scale())
  //       .yScale(macdAnnotation.axis().scale())
  //       .xAnnotation(timeAnnotation)
  //       .yAnnotation([macdAnnotation, macdAnnotationLeft])
  //       .verticalWireRange([0, dim.plot.height])
  //       .on("move", crosshairMove);
// END
    var svg = d3.select("#chart")
            .attr("width", dim.width)
            .attr("height", dim.height);

    var defs = svg.append("defs");

    defs.append("clipPath")
            .attr("id", "ohlcClip")
        .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", dim.plot.width)
            .attr("height", dim.ohlc.height);

// clippath
    defs.selectAll("indicatorClip").data(indicatorsExtraPlot)
        .enter()
            .append("clipPath")
            .attr("id", function(d, i) { return "indicatorClip-" + i; })
        .append("rect")
            .attr("x", 0)
            .attr("y", function(d, i) { return indicatorTop(i); })
            .attr("width", dim.plot.width)
            .attr("height", dim.indicator.height);

    svg = svg.append("g")
            .attr("transform", "translate(" + dim.margin.left + "," + dim.margin.top + ")");

    svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + dim.plot.height + ")");

    var candleLabel = svg.append('text')
            .style("text-anchor", "start")
            .attr("class", "label")
            .attr("x", 5)
            .attr("y", 8);

    var ohlcSelection = svg.append("g")
            .attr("class", "ohlc")
            .attr("transform", "translate(0,0)");

    ohlcSelection.append("g")
            .attr("class", "axis")
            .attr("transform", "translate(" + x(1) + ",0)")
        .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -12)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Price");

    ohlcSelection.append("g")
            .attr("class", "close annotation up");

    ohlcSelection.append("g")
            .attr("class", "volume")
            .attr("clip-path", "url(#ohlcClip)");

    ohlcSelection.append("g")
            .attr("class", "candlestick")
            .attr("clip-path", "url(#ohlcClip)");

    var indicatorLabels = {};
    var labelYOffset = 20;
    _.each(indicatorsEmbedded, (indicator, name) => {
        var style = (indicator.config && indicator.config.style) ? indicator.config.style : "";
        let color = (indicator.config && indicator.config.color) ? indicator.config.color : "blue";
        const inlineStyle = (style || "") + `stroke: ${color};`;
        ohlcSelection.append("g")
            .attr("class", "indicator line-"+name)
            .attr("clip-path", "url(#ohlcClip)")
            .attr("style", inlineStyle)

        indicatorLabels[name] = svg.append('text')
            .style("text-anchor", "start")
            .attr("class", "label")
            .attr("x", 5)
            .attr("y", labelYOffset)
            .style("fill", color)
            .text(name)
        labelYOffset += 12;
    });

    ohlcSelection.append("g")
            .attr("class", "percent axis");

    ohlcSelection.append("g")
            .attr("class", "volume axis");

    var indicatorSelection = svg.selectAll("svg > g.indicator").data(indicatorsExtraPlot).enter()
             .append("g")
                .attr("class", function(d) { return d.name + " indicator"; })

    indicatorSelection.append("g")
            .attr("class", "axis right")
            .attr("transform", "translate(" + x(1) + ",0)");

    indicatorSelection.append("g")
            .attr("class", "axis left")
            .attr("transform", "translate(" + x(0) + ",0)");

    indicatorSelection.append("g")
            .attr("class", "indicator-plot")
            .attr("clip-path", function(d, i) { return "url(#indicatorClip-" + i + ")"; })
            .attr("style",  function(d, i) {
              let color = "#000000";
              if (d.config && d.config.color){
                color = d.config.color;
              }
              return  `stroke: ${color}`;
            })

    // Add trendlines and other interactions last to be above zoom pane
    svg.append('g')
            .attr("class", "crosshair ohlc")
            .call(ohlcCrosshair);

    svg.append("g")
            .attr("class", "tradearrow")
            .attr("clip-path", "url(#ohlcClip)");

    let indicatorsExtraPlotLabels = {};
    indicatorsExtraPlot.forEach((indicator, i) => {
      indicatorsExtraPlotLabels[indicator.name] = svg.append('text')
          .style("text-anchor", "start")
          .attr("class", "label")
          .attr("x", 5)
          .attr("y", (indicatorTop(i) + 10))
          .style("fill", "blue")
          .text(indicator.name + ":")
    })

    var valueText = svg.append('text')
        .style("text-anchor", "end")
        .attr("class", "coords")
        .attr("x", dim.plot.width-20)
        .attr("y", 8);

    var accessor = candlestick.accessor(),
        indicatorPreRoll = 10;  // Don't show where indicatorsEmbedded don't have data
    var bisectDate = d3.bisector(accessor.d).left; // accessor.d is equal to function(d) { return d.date; };


    let data = _data.map( d => {
        //techan works only with Date but we have UTC date. We need shift the date bei x minutes from offset
        const offset = moment.unix(d.start).toDate().getTimezoneOffset();
        return {
            date: moment.unix(d.start).add(offset, "m").toDate(),
            open: +d.open,
            high: +d.high,
            low: +d.low,
            close: +d.close,
            volume: +d.volume
        };
    }).sort(function(a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });

    x.domain(techan.scale.plot.time(data).domain());
    y.domain(techan.scale.plot.ohlc(data.slice(indicatorPreRoll)).domain());
    yPercent.domain(techan.scale.plot.percent(y, accessor(data[indicatorPreRoll])).domain());
    yVolume.domain(techan.scale.plot.volume(data).domain());

    let candleSize = 0;
    if (_config && _config.tradingAdvisor){
        candleSize = (+_config.tradingAdvisor.candleSize); //match candles dates to trades!
    }

    let trades = _trades.map( t => {
        let trade = _.pick(t, ['price']);
        trade.quantity = 1;
        trade.type = t.action; // .includes('buy') ? 'buy' : 'sell';
        const offset = moment.unix(t.date).toDate().getTimezoneOffset();
        const utcDate = moment.unix(t.date).add(offset, "m");
        if (candleSize % 60 === 0 ){
         utcDate.minutes(0);
        }else{
           // subract the remainder so, we allign the arrow with the candle
           utcDate.subtract(utcDate.minutes % candleSize, "m");
        }
        trade.date = utcDate.toDate();
        trade.dateoriginal = t.date;
        trade.high = trade.price;
        trade.low = trade.price;
        trade.adviceProps = t.adviceProps;
        // console.log((moment.unix(t.date)).utc().format("YYYY-MM-DD HH:mm") + ' '+trade.date  + ' '+(offset))
        return trade;
    });

    console.log(trades);

    svg.select("g.candlestick").datum(data).call(candlestick);
    svg.select("g.close.annotation").datum([data[data.length-1]]).call(closeAnnotation);
    svg.select("g.crosshair.ohlc").call(ohlcCrosshair).call(zoom);
    svg.select("g.volume").datum(data).call(volume);

    _.each(indicatorsEmbedded, (indicator, name) => {
        svg.select("g.indicator.line-"+name).datum(indicatorData[name]).call(indicator);
    });

    indicatorsExtraPlot.forEach(indicator => {
      svg.append('g')
        .attr("class", "crosshair "+indicator.name);
        if (indicator.config && indicator.config.type === "macd" ){
                //var rsiData = techan.indicator.macd()(data);
                //rsiScale.domain(techan.scale.plot.rsi(rsiData).domain());
                svg.select("g."+ indicator.name+" .indicator-plot").datum(indicatorData[indicator.name]).call(indicator.plot);
                svg.select("g.crosshair."+indicator.name).call(indicator.crosshair).call(zoom);

        }else {
          svg.select("g."+ indicator.name+" .indicator-plot").datum(indicatorData[indicator.name]).call(indicator.plot);
          svg.select("g.crosshair."+indicator.name).call(indicator.crosshair).call(zoom);
        }
    })

    svg.select("g.tradearrow").datum(trades).call(tradearrow);

    // Stash for zooming
    zoomableInit = x.zoomable().clamp(false).domain([indicatorPreRoll, data.length]).copy();
    yInit = y.copy();
    yPercentInit = yPercent.copy();

    crosshairMove({ x: x.domain()[x.domain().length-1], y:1 }) // display last candles in label

    draw();

    function zoomed() {
        let xzoomalbe = d3.event.transform.rescaleX(zoomableInit).domain();
        x.zoomable().domain(xzoomalbe);
        y.domain(d3.event.transform.rescaleY(yInit).domain());
        yPercent.domain(d3.event.transform.rescaleY(yPercentInit).domain());

        draw();
    }

    function draw() {
        svg.select("g.x.axis").call(xAxis);
        svg.select("g.ohlc .axis").call(yAxis);
        svg.select("g.volume.axis").call(volumeAxis);
        svg.select("g.percent.axis").call(percentAxis);

        indicatorsExtraPlot.forEach(indicator => {
          svg.select("g."+indicator.name +" .axis.right").call(indicator.axis);
          svg.select("g."+indicator.name +" .axis.left").call(indicator.axisLeft);
          svg.select("g."+indicator.name+ " .indicator-plot").call(indicator.plot.refresh);
          svg.select("g.crosshair."+indicator.name).call(indicator.crosshair.refresh);
        })

        // We know the data does not change, a simple refresh that does not perform data joins will suffice.
        svg.select("g.candlestick").call(candlestick.refresh);
        svg.select("g.close.annotation").call(closeAnnotation.refresh);
        svg.select("g.volume").call(volume.refresh);

        _.each(indicatorsEmbedded, (indicator, name) => {
            svg.select("g.indicator.line-"+name).call(indicator.refresh);
        });

        svg.select("g.crosshair.ohlc").call(ohlcCrosshair.refresh);
        svg.select("g.tradearrow").call(tradearrow.refresh);
    }

    function crosshairMove(coords) {
        let i = bisectDate(data, coords.x); //get closest index
        let candle = data[i];
        _.each(indicatorsEmbedded, (indicator, name) => {
            let value="";
            if (indicatorData[name][i]){
               value = indicatorData[name][i].value
            }
            indicatorLabels[name].text(name +": "+ ohlcAnnotation.format()(value));
        });

        indicatorsExtraPlot.forEach(indicator => {
          let result = {};
          if (indicatorData[indicator.name][i]){
            result = indicatorData[indicator.name][i];
          }

          if (!result.value){
            const valueEntries = Object.entries(result);
            let text = "";
            valueEntries.forEach(v => {
              if (v[0]!== "date")
                text += v[0] + ": "+ohlcAnnotation.format()(v[1]) + " ";
            })
            indicatorsExtraPlotLabels[indicator.name].text(name + ' '+text);
          }else{
            indicatorsExtraPlotLabels[indicator.name].text(indicator.name +": "+ ohlcAnnotation.format()(result.value));
          }
        })

        candleLabel.text(
            timeAnnotation.format()(coords.x || new Date())
            + " - O: " + ohlcAnnotation.format()(candle.open)
            + " | H: " + ohlcAnnotation.format()(candle.high)
            + " | L: " + ohlcAnnotation.format()(candle.low)
            + " | C: " + ohlcAnnotation.format()(candle.close)
            + " - Vol: " + volumeAxis.tickFormat()(candle.volume)
        );
    }

    function getPlotName(type){
        let plotName = "sma";
        if (type && type === "bollinger"){
            plotName = type;
        }else if (type && type === "stochastic"){
            plotName = type;
        }else if (type && type === "rsi"){
            plotName = type;
        }else if (type && type === "macd"){
            plotName = type;
        }
        return plotName;
    }

    function enter(d) {
        valueText.style("display", "inline");
        let text = "";
        if (d.adviceProps){
                const valueEntries = Object.entries(d.adviceProps);

                valueEntries.forEach(v => {
                        if (v[0]!== "date" && v[0]!== "type")
                        text += v[0] + ": "+ohlcAnnotation.format()(v[1]) + " ";
                })
        }
        valueText.text("Trade: " +moment.unix(d.dateoriginal).utc().format("YYYY-MM-DD HH:mm") + ", " + d.type + ", " +ohlcAnnotation.format()(d.price) + " "+ text);
    }

    function out() {
        valueText.style("display", "none");
    }
}
