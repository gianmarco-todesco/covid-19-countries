"use strict";

let dataSet
let svg
let graphWidth
let graphHeight
let xScale, yScale
let countries

let legendSvg


let countryGraphs = []
let legendItems = []

window.onload = function() {
    createChart()
    readData()
}

function readData() {
    countries = []
    d3.dsv(';','data.csv', d=>{
        d.date = d3.timeParse("%m/%d/%Y")(d.DateRep)
        d.country = d['Countries and territories']
        return d
    })
    .then(data => {
        dataSet=data.sort((a,b) => a.date-b.date)
        countries = dataSet.map(d=>d.country).sort()
            .filter((item, pos, ary) => {
            return !pos || item != ary[pos - 1];
        })
        addGraph("Italy")
        updateCountrySelector()
    })
}

function updateCountrySelector() {
    let s = document.getElementById('country-selector')
    let option = document.createElement("option");
    option.value = ""
    option.text = "Add a new country"
    s.appendChild(option)
    countries.forEach(country => {
        option = document.createElement("option");
        option.value = option.text = country
        s.appendChild(option)
    })
    s.onchange = (e) => {
        let country = e.target.value
        if(country != "") {
            addGraph(country)
        }
    }
}

function createChart() {
    let cDiv = d3.select('#c').node()
    graphWidth = cDiv.clientWidth
    graphHeight = cDiv.clientHeight
    const margin = {
        top: 10, 
        right: 30, 
        bottom: 30, 
        left: 60}
    const width = graphWidth - margin.left - margin.right
    const height = graphHeight - margin.top - margin.bottom;

    let mainSvg = d3.select('#c')
        .append("svg")
            .attr('width','100%')
            .attr('height','100%')
    svg = mainSvg.append('g')
            .attr('transform',
                "translate("+margin.left+","+margin.top+")")

    let logTicks = [10,20,30,50,100,200,500,1000,2000,5000]   
    xScale = d3.scaleTime()
        .domain([new Date("2020-02-01"), new Date("2020-03-21")])
        .range([0, width])
    svg.append('g')
        .attr('transform', 'translate(0,'+height+')')
        .call(d3.axisBottom(xScale))
    yScale = d3.scaleLog()
        .domain([10,10000])
        .range([height, 0])
    svg.append('g')
        .call(d3.axisLeft(yScale)
            .tickSize(0).tickValues(logTicks)
            .tickFormat(d3.format(".0f")))
    
    legendSvg = mainSvg.append('g')
                .attr('transform',
                    "translate(100,30)")
}

function getCountryData(country) {
    let data = dataSet
        .filter(d=>d.country == country)
        .filter(d=>!isNaN(d.Cases) 
            && d.date > xScale.domain()[0])
    const check = d => d.Cases >= 10
    let result = []
    let i = 0
    while(i<data.length) {
        while(i<data.length && !check(data[i])) i++
        if(i>=data.length) break
        let j = i
        let span = []
        for(;j<data.length && check(data[j]);j++) {
            span.push(data[j])
        }
        result.push(span)
        i = j        
    }
    return result
}

function addGraph(country) {
    let data = getCountryData(country)
    if(data.length == 0) return null

    let g = svg.append('g')

    // select color
    let colorIndex = 0    
    for(let i=0;i<10;i++) {

        if(countryGraphs.filter(g=>g.colorIndex == colorIndex).length == 0)
            break
        colorIndex++
    }

    // add new graph
    countryGraphs.push(g)
    g.colorIndex = colorIndex
    let color = d3.schemeCategory10[colorIndex]

    data.forEach(span => {
        if(span.length>=2) {
            g.append('path')
                .datum(span)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 1.5)
                .attr('d', d3.line()
                    .x(d => xScale(d.date))
                    .y(d => yScale(d.Cases))
                )
        }
        g.append('g')
            .selectAll('dot')
            .data(span)
            .enter()
            .append('circle')
                .attr('cx', d=>xScale(d.date))
                .attr('cy', d=>yScale(d.Cases))
                .attr('r', 2)
                .attr('fill', color)        
    })

    let legend = addLegend(country, color)
    return g

}

function addLegend(country, color) {
    let index = legendItems.length
    let g = legendSvg.append('g')
    g.attr('transform', "translate(0,"+ index*20 +")")
    legendItems.push(g)

    g.append('circle')
        .attr('cx',0)
        .attr('cy',0)
        .attr('r',6)
        .style("fill", color)
    
    g.append("text")
        .attr("x", 10).attr("y", 0)
        .text(country)
        .style("font-size", "15px")
        .attr("alignment-baseline","middle")
    

    return 10

}