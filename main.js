"use strict";

let dataSet
let svg
let graphWidth
let graphHeight
let xScale, yScale

let countryList
let countryById
let countryByName
let selectedCountries = []

let legendSvg

let countryGraphs = []
let legendItems = []

let currentDay
let graphLayer

window.onload = function() {
    createChart()
    readData()
}

function readData() {
    d3.dsv(',','data.csv', d=>{
        d.date = d3.timeParse("%d-%m-%Y")(d.dateRep)
        const countryFld = "countriesAndTerritories"
        d.country = d[countryFld]
        delete d[countryFld]
        return d
    })
    .then(processData)
}

function processData(data) {
    dataSet=data.sort((a,b) => a.date-b.date)
    const lst = dataSet.map(d=>d.country).sort()
        .filter((item, pos, ary) => { return !pos || item != ary[pos - 1]; })
    countryList = []
    countryByName = {}
    countryById = {}
    lst.forEach(countryName => {
        let cases = getCountryData(dataSet, countryName, 'cases', 10)
        if(cases.length > 0) {
            let country = {
                name: countryName,
                id: countryList.length,
                cases: cases,
                deaths: getCountryData(dataSet, countryName, 'deaths', 1)
            }
            countryList.push(country)
            countryById[country.id] = country
            countryByName[country.name] = country
        }
    })
    addGraph(countryByName["Italy"], "cases")
    updateCountrySelector()

}

function getCountryData(dataSet, country, field, minValue) {
    let data = dataSet
        .filter(d=>d.country == country)
        .filter(d=>!isNaN(d[field])  && d.date > xScale.domain()[0])
    const check = d => d[field] >= minValue
    let result = []
    let i = 0
    while(i<data.length) {
        while(i<data.length && !check(data[i])) i++
        if(i>=data.length) break
        let j = i
        let span = []
        for(;j<data.length && check(data[j]);j++) {
            const value = parseFloat(data[j][field])
            span.push({ date : data[j].date, value : value} )
        }
        result.push(span)
        i = j        
    }
    return result
}


function updateCountrySelector() {
    let s = document.getElementById('country-selector')
    let option = document.createElement("option");
    option.value = ""
    option.text = "Select a country"
    s.appendChild(option)
    countryList.forEach(country => {
        option = document.createElement("option");
        option.value = country.id
        option.text = country.name
        s.appendChild(option)
    })
    s.onchange = (e) => {
        let countryId = e.target.value
        if(countryId != "") {
            addGraph(countryById[countryId], 'cases')
            s.value = ""
        }
    }
}

function createChart() {
    let cDiv = d3.select('#c').node()
    graphWidth = cDiv.clientWidth
    graphHeight = cDiv.clientHeight
    const margin = {
        top: 10, 
        right: 60, 
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

    let bg = svg.append('rect')
        .attr('class', 'graph-bg')
        .attr('x',0)
        .attr('y',0)
        .attr('width',width)
        .attr('height',height)
        .attr('fill', '#eee')
        
    let logTicks = [10,20,30,50,100,200,500,1000,2000,5000,10000,20000]   
    xScale = d3.scaleTime()
        .domain([new Date("2020-02-15"), new Date("2020-03-27")])
        .range([0, width])
    svg.append('g')
        .attr('transform', 'translate(0,'+height+')')
        .call(d3.axisBottom(xScale))
    yScale = d3.scaleLog()
        .domain([10,50000])
        .range([height, 0])
    svg.append('g')
        .call(d3.axisLeft(yScale)
            .tickSize(0).tickValues(logTicks)
            .tickFormat(d3.format(".0f")))
    
    legendSvg = mainSvg.append('g').attr('transform',"translate(100,30)")

    graphLayer = svg.append('g')
    currentDay = svg.append('g')
    currentDay.append('line')
        .attr('x0',0).attr('x1',0)
        .attr('y0',0).attr('y1',height)
        .attr('stroke', 'gray')
    currentDay.attr('visibility', 'hidden')        
    bg.on('mousemove', () => {
        let coords = d3.mouse(bg.node())
        let x = Math.round( xScale.invert(coords[0]))
        // console.log(x, new Date(x))
        visualizeDayData(new Date(x))
    } )
    bg.on('mouseout', () => currentDay.attr('visibility', 'hidden')  )
}

function visualizeDayData(d) {

    d = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    let x = xScale(d)
    currentDay
        .attr('transform','translate('+x+',0)')
        .attr('visibility', 'visible')

    currentDay.selectAll('.currentDay').remove()
    selectedCountries.forEach(country => {
        let point = getClosestPoint(country.cases.flat(), d)
        if(point != null && Math.abs(d - point.date) < 43200000) {
            let y = yScale(point.value)
            currentDay.append('circle')
                .attr('cx', 0).attr('cy',y).attr('r', 5)
                .attr('class', 'currentDay')
                .style('stroke', 'black')
                .style('fill', '#888')
                .style('opacity', 0.5)

            currentDay.append('rect')
                .attr('x', 10)
                .attr('y', y-15)
                .attr('width', 50)
                .attr('height', 20)
                .attr('rx', 5)
                .attr('class', 'currentDay')
                .attr('fill', 'white')
                .attr('stroke', 'gray')
            currentDay.append('text')
                .text(point.value)
                .attr('class', 'currentDay')
                .attr('fill', country.color)
                .attr('transform', 'translate(20,'+y+')')


        }

    })
    currentDay.append('text')
                .text(d3.timeFormat("%d %b")(d))
                .style("text-anchor", "middle")
                .style("font-size", "10px")                
                .attr('class', 'currentDay')
                .attr('fill', 'black')
                .attr('transform', 'translate(0,-1)')

}

function getClosestPoint(points, date) {
    if(!points || points.length == 0) return null
    let n = points.length
    if(date<=points[0].date) return points[0]
    else if(date>=points[n-1].date) return points[n-1]
    let a = 0, b = n-1
    if(date<=points[a].date || date>=points[b].date) throw "uffa"
    while(b-a>1) {
        let c = Math.floor((a+b)/2)
        if(points[c].date <= date) a=c
        else b=c
    }
    if(date<points[a].date || date>=points[b].date) throw "uffa2"
    if(date - points[a].date < points[b].date - date) 
        return points[a]
    else 
        return points[b]
}


function selectColorIndex() {
    let touched = {}
    selectedCountries.forEach(country => touched[country.colorIndex] = true)
    let n = d3.schemeCategory10.length
    for(let i=0; i+1<n; i++) {
        if(!touched[i]) return i
    }
    return n-1
}


function addGraph(country, field) {
    let data = country[field]
    if(!data) return null;

    let g = graphLayer.append('g').attr('class','graph-'+country.id)

    // select color
    let colorIndex = selectColorIndex()
    country.colorIndex = colorIndex
    let color = country.color = d3.schemeCategory10[colorIndex]

    // add new graph
    countryGraphs.push(g)

    data.forEach(span => {
        if(span.length>=2) {
            g.append('path')
                .datum(span)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 1.5)
                .attr('d', d3.line()
                    .x(d => xScale(d.date))
                    .y(d => yScale(d.value))
                )
        }
        g.append('g')
            .selectAll('dot')
            .data(span)
            .enter()
            .append('circle')
                .attr('cx', d=>xScale(d.date))
                .attr('cy', d=>yScale(d.value))
                .attr('r', 2)
                .attr('fill', color)        
    })
    selectedCountries.push(country)
    updateLegend()
    return g

}

function addLegend(country) {
    let color = country.color
    let index = legendItems.length
    let g = legendSvg.append('g')
        .attr('transform', "translate(0,"+ index*20 +")")
        .attr('class','legend-'+country.id)

    legendItems.push(g)

    g.append('circle')
        .attr('cx',0)
        .attr('cy',-2)
        .attr('r',6)
        .style("fill", color)
    
    g.append("text")
        .attr("x", 10).attr("y", 0)
        .text(country.name)
        .style("font-size", "15px")
        .attr("alignment-baseline","middle")
    
    g.append('text').text('(x)').attr('x',50).style('cursor','pointer').on('click', ()=>removeCountry(country))

    return 10

}

function updateLegend() {
    let g = legendSvg.selectAll('g').data(selectedCountries)
    let newg = g.enter().append('g').attr('class', d=>'legend legend-'+d.id)
    console.log("-->", g.size(), newg.size())
    
    newg.append('text')
        .attr("x", 10)
        .attr("y", 0)
        .attr('class', 'name')

    newg.append('circle')
        .attr('cx',0)
        .attr('cy',-5)
        .attr('r',6)

    newg.append('text')
        .text('(x)')
        .attr('class', 'del-btn')
        .attr('x',-30)
        .style('cursor','pointer')
        .on('click', (d,i) => removeCountry(selectedCountries[i]))
    g.exit().remove()


    g.merge(newg)
        .attr('transform', (d,i)=>"translate(0,"+ i*20 +")")
        .attr('class', d=>'legend legend-'+d.id)

    // appearently there is a problem with d3 data binding and child element
    // there should be a better way to do this! :(
    legendSvg.selectAll('text.name').data(selectedCountries).text(d=>d.name)
    legendSvg.selectAll('circle').data(selectedCountries).attr('fill', d=>d.color)

    

    /*

    let newg = g.enter()
    newg.append('g')

    
    g.exit().remove()

    g.attr('class', d=>'legend legend-'+d.id)
        .attr('transform', (d,i)=>"translate(0,"+ i*20 +")")
    g.selectAll('text').text(d => d.name)
    g.selectAll('circle').style("fill", d=>d.color)
    */
}

function removeCountry(country) {
    console.log("remove", country)
    d3.select('.graph-'+country.id).remove()
    let i = selectedCountries.map(d=>d.id).indexOf(country.id)
    if(i>=0) selectedCountries.splice(i,1)
    updateLegend() 
}
