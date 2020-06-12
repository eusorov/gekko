/*jshint esversion: 6 */
import moment from 'moment';

export default function (roundtrips, config) {

        console.log(roundtrips);
        // console.log(config)

        var dataset = roundtrips.map((d) => {
                return {
                        date: moment.unix(d.exitAt).toDate(),
                        value: +d.exitBalance,
                        pnl: +d.pnl
                }
        });

        var from = moment(config.backtest.daterange.from).toDate();
        var to = moment(config.backtest.daterange.to).toDate();
        var startBalance = +config.paperTrader.simulationBalance.currency;
        
        
        dataset.unshift({date: from, value: startBalance, pnl : 0});

        var last = Object.assign(roundtrips[roundtrips.length-1])
        last.date = to;
        last.value = +last.exitBalance;
        dataset.push(last);

        // set the dimensions and margins of the graph
        var margin = { top: 20, right: 20, bottom: 30, left: 50 },
                width = 800 - margin.left - margin.right,
                height = 500 - margin.top - margin.bottom;

        var x = d3.scaleTime()
                .domain([from, to])
                .range([0, width]);

        var y = d3.scaleLinear()
                .domain([8000, d3.max(dataset, function (d) { return +d.value; })])
                .range([height, 0]);

        var procent = d3.scaleLinear()
                .domain([80, d3.max(dataset, function (d) { return +d.value*100/startBalance; })])
                .range([height, 0]);

        // Define the div for the tooltip
        var div = d3.select("body").append("div")	
                .attr("class", "tooltip")				
                .style("opacity", 0);

        // 7. d3's line generator
        var line = d3.line()
                .defined(d => !isNaN(d.value))
                .x(d => x(d.date))
                .y(d => y(d.value));

        // 1. Add the SVG to the page and employ #2
        var svg = d3.select("#chart")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform","translate(" + margin.left + "," + margin.top + ")");

        // 3. Call the x axis in a group tag
        svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x).ticks(d3.timeMonth).tickFormat(d3.timeFormat('%b')));


        // 4. Call the y axis in a group tag
        svg.append("g")
                .attr("class", "y axis")
                .call(d3.axisRight(y)) // Create an axis component with d3.axisLeft
                .attr("transform", "translate("+width + ", 0 )")
                //.call(g => g.select(".domain").remove())

        svg.append("g")
                .attr("class", "axis")
                .call(d3.axisLeft(procent).tickFormat( d => d +'%')) // Create an axis component with d3.axisLeft
                .call(g => g.select(".domain").remove())                

        // 9. Append the path, bind the data, and call the line generator 
        svg.append("path")
                .datum(dataset) // 10. Binds data to the line 
                // .attr("class", "lineclass") // Assign a class for styling 
                .style("fill", "none")
                .style("stroke", "steelblue")
                .style("stroke-width", 1.5)
                .style("stroke-linejoin", "round")
                .style("stroke-linecap", "round")
                .style("opacity", "0.8")
                .on("mouseover", mouseover)
                .on("mouseout", mouseout)
                .attr("d", line); // 11. Calls the line generator 

        function mouseover (d) {
                d3.select(this).style("opacity", "1")
                        .style("stroke-width", 2);
        }

        function mouseout (d) {
                d3.select(this).style("opacity", "0.8")
                        .style("stroke-width", 1.5);
        }
        // locale
        const numberFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
        // 12. Appends a circle for each datapoint 
        svg.selectAll(".dot")
            .data(dataset)
            .enter().append("circle") // Uses the enter().append() method
            .attr("fill", "#ffab00")
            .attr("stroke", "#fff")
            .attr("cx", function(d) { return x(d.date) })
            .attr("cy", function(d) { return y(d.value) })
            .attr("r", 5)
            .on("mouseover", function(d) {		
                d3.select(this).attr("r", 10);
                div.transition()		
                    .duration(100)		
                    .style("opacity", .9);		
                div.html('<span>'+numberFormat.format(d.pnl)+'</span>')	
                    .style("left", (d3.event.pageX) + "px")		
                    .style("top", (d3.event.pageY - 28) + "px");	
                })					
            .on("mouseout", function(d) {	
                d3.select(this).attr("r", 5);	
                div.transition()		
                    .duration(100)		
                    .style("opacity", 0);
            })	            






}
