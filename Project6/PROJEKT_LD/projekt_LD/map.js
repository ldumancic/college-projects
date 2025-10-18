async function crtajMapu() {

  const worldMapData = await d3.json('../world-geojson.json')
  const dataset = await d3.csv('../earthquakes.csv')

  dataset.forEach(d => {
    d.time = new Date(d.time);
  });

  const place = d => d.place
  const date = d => d.time.toISOString().split('T')[0]
  const magnitude = d => d.mag
  const depth = d => d.depth

  const dimensions = {
    width: window.innerWidth * 0.9,
    margins: {
      top: 30,
      right: 10,
      bottom: 10,
      left: 10,
    },
  };

  dimensions.chartWidth = dimensions.width - dimensions.margins.left - dimensions.margins.right;

  const sphere = ({ type: "Sphere" })
  const projection = d3.geoEqualEarth().fitWidth(dimensions.chartWidth, sphere)
  const pathGenerator = d3.geoPath(projection);
  const [[x0, y0], [x1, y1]] = pathGenerator.bounds(sphere)

  dimensions.chartHeight = y1;
  dimensions.height = dimensions.chartHeight + dimensions.margins.top + dimensions.margins.bottom;

  const map = d3.select("#map")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)

  const borders = map.append("g")
    .style("transform",
      `translate(${dimensions.margins.left}px, ${dimensions.margins.top}px)`)

  borders.append("path")
    .attr("class", "sphere")
    .attr("d", pathGenerator(sphere))

  const graticule = d3.geoGraticule10()

  borders.append("path")
    .attr("class", "graticule")
    .attr("d", pathGenerator(graticule))

  borders.selectAll(".country")
    .data(worldMapData.features)
    .enter().append("path")
    .attr("class", "country")
    .attr("d", pathGenerator)

  circleRadius = 2.5;

  const magnitudeScale = d3.scaleThreshold()
    .domain([5, 6, 7])
    .range(["#73a942", "#ffd819", "#fb8b24", "#ff0000"])

  function updateEarthquakes(filteredData) {
    const earthquakes = borders.selectAll(".earthquake")
      .data(filteredData, d => d.id);

    earthquakes.enter().append("circle")
      .attr("class", "earthquake")
      .attr("cx", d => projection([+d.longitude, +d.latitude])[0])
      .attr("cy", d => projection([+d.longitude, +d.latitude])[1])
      .attr("r", d => circleRadius)
      .attr("fill", d => magnitudeScale(+d.mag))
      .merge(earthquakes)
      .on("mouseenter", onMouseEnter)
      .on("mouseleave", onMouseLeave);

    earthquakes.exit().remove();
  }

  const details_map = d3.select("#details_map")

  function onMouseEnter(e, d) {

    const [cx, cy] = projection([+d.longitude, +d.latitude]);

    details_map.select("#place").text(place(d))
    details_map.select("#date").text(date(d))
    details_map.select("#magnitude").text(magnitude(d))
    details_map.select("#depth").text(depth(d))

    const x = cx + dimensions.margins.left;
    const y = cy + dimensions.margins.top;

    details_map.style("transform", `translate(calc(-50% + ${x}px), calc(-100% + ${y}px))`)
      .style("opacity", 1)
      .style("background-color", d3.select(this).attr("fill"))
  }

  function onMouseLeave(e, d) {
    details_map.style("opacity", 0)
  }

  const legendData = [
    { magnitude: "< 5", color: "#73a942" },
    { magnitude: "≥ 5", color: "#ffd819" },
    { magnitude: "≥ 6", color: "#fb8b24" },
    { magnitude: "≥ 7", color: "#ff0000" }
  ];

  const legend = map.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + (dimensions.margins.left + 10) + "," + (dimensions.margins.top + 10) + ")");

  const legendTitle = legend.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .text("Earthquake Magnitude Legend")
    .attr("font-weight", "bold")
    .attr("font-size", "14px");

  const legendItems = legend.selectAll("g")
    .data(legendData)
    .enter().append("g")
    .attr("transform", (d, i) => `translate(0, ${i * 20 + 20})`);

  legendItems.append("rect")
    .attr("width", 18)
    .attr("height", 18)
    .attr("fill", d => d.color);

  legendItems.append("text")
    .attr("x", 25)
    .attr("y", 9)
    .attr("dy", ".35em")
    .text(d => d.magnitude);


  document.getElementById("month-select").addEventListener("change", function () {
    const selectedMonth = this.value;
    let filteredData;
    if (selectedMonth === "all") {
      filteredData = dataset;
    } else {
      filteredData = dataset.filter(d => d.time.getMonth() + 1 == selectedMonth);
    }

    updateEarthquakes(filteredData);
    updateLineGraph(filteredData, selectedMonth);
    updateScatterPlot(filteredData, selectedMonth);
    updateMagHistogram(filteredData, selectedMonth)
    updateDepthHistogram(filteredData, selectedMonth)
  });

  updateEarthquakes(dataset)
  createLineGraph(dataset);
  createScatterPlot(dataset)
  createMagHistogram(dataset);
  createDepthHistogram(dataset)
}

function createLineGraph(data) {
  const dimensions = { width: window.innerWidth * 0.9, height: 350, margins: { top: 60, right: 30, bottom: 30, left: 50 } };
  const graphWidth = dimensions.width - dimensions.margins.left - dimensions.margins.right;
  const graphHeight = dimensions.height - dimensions.margins.top - dimensions.margins.bottom;

  const svg = d3.select("#line-chart").append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height)

  svg.append("text")
    .attr("class", "graph-title")
    .attr("x", dimensions.width / 2)
    .attr("y", dimensions.margins.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("font-weight", "bold")
    .text("Earthquake Counts - 2023");

  svg.append("g").attr("class", "x-axis").attr("transform", `translate(${dimensions.margins.left},${graphHeight + dimensions.margins.top})`);
  svg.append("g").attr("class", "y-axis").attr("transform", `translate(${dimensions.margins.left},${dimensions.margins.top})`);
  svg.append("path").attr("class", "line").attr("transform", `translate(${dimensions.margins.left},${dimensions.margins.top})`);

  svg.append("g").attr("class", "tooltip-group").attr("transform", `translate(${dimensions.margins.left},${dimensions.margins.top})`);

  updateLineGraph(data, "all");
}

function updateLineGraph(data, selectedMonth) {
  const lineChartDimensions = { width: window.innerWidth * 0.9, height: 300, margins: { top: 20, right: 30, bottom: 30, left: 50 } };
  const graphWidth = lineChartDimensions.width - lineChartDimensions.margins.left - lineChartDimensions.margins.right;
  const graphHeight = lineChartDimensions.height - lineChartDimensions.margins.top - lineChartDimensions.margins.bottom;

  const svg = d3.select("#line-chart svg");

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const titleText = selectedMonth === "all" ? "Earthquake Counts - 2023" : `Earthquake Counts - ${monthNames[selectedMonth - 1]}`;

  svg.select(".graph-title")
    .text(titleText);

  let xScale, yScale, xAxis, line;

  const xScaleAll = d3.scaleTime()
    .domain(d3.extent(data, d => d.time))
    .range([0, graphWidth]);

  const monthlyData = d3.rollup(data, v => v.length, d => d3.timeMonth(d.time));
  
  const yScaleAll = d3.scaleLinear()
    .domain([0, d3.max(Array.from(monthlyData.values()))])
    .range([graphHeight, 0]);

  const dailyData = selectedMonth !== "all" ? d3.rollup(data.filter(d => d.time.getMonth() + 1 == selectedMonth), 
                                                                    v => v.length, 
                                                                    d => d3.timeDay(d.time)) : null;

  const yScaleMonth = dailyData ? d3.scaleLinear().domain([0, d3.max(Array.from(dailyData.values()))]).range([graphHeight, 0]) : null;

  if (selectedMonth === "all") {
    xScale = xScaleAll;
    yScale = yScaleAll;
    line = d3.line().x(d => xScale(d[0])).y(d => yScale(d[1]));
    xAxis = d3.axisBottom(xScale).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%B"));
  } else {
    const startOfMonth = new Date(2023, selectedMonth - 1, 1);
    const endOfMonth = new Date(2023, selectedMonth, 0);

    xScale = d3.scaleTime()
      .domain([startOfMonth, endOfMonth])
      .range([0, graphWidth]);

    yScale = yScaleMonth;
    line = d3.line().x(d => xScale(d[0])).y(d => yScale(d[1]));
    xAxis = d3.axisBottom(xScale).ticks(d3.timeDay.every(1)).tickFormat(d3.timeFormat("%d"));
  }

  svg.select(".line")
    .datum(selectedMonth === "all" ? Array.from(monthlyData) : Array.from(dailyData))
    .attr("d", line)
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("fill", "none");

  svg.select(".x-axis").call(xAxis);
  svg.select(".y-axis").call(d3.axisLeft(yScale));
  
  const tooltipGroup = svg.select(".tooltip-group");

  tooltipGroup.selectAll(".tooltip-circle").remove();

  tooltipGroup.selectAll(".tooltip-circle")
    .data(selectedMonth === "all" ? Array.from(monthlyData) : Array.from(dailyData))
    .enter()
    .append("circle")
    .attr("class", "tooltip-circle")
    .attr("cx", d => xScale(d[0]))
    .attr("cy", d => yScale(d[1]))
    .attr("r", 5)
    .attr("fill", "#fb8b24")
    .on("mouseenter", (event, d) => onMouseEnter(event, d, selectedMonth, xScale, yScale))
    .on("mousemove", (event, d) => onMouseMove(event, d, selectedMonth, xScale, yScale))
    .on("mouseleave", onMouseLeave);
  
  function onMouseEnter(event, d, selectedMonth, xScale, yScale) {
    const detailsLine = d3.select("#details_line");
    const dateFormat = selectedMonth === "all" ? d3.timeFormat("%B") : d3.timeFormat("%d %B");

    detailsLine.select("#date").text(dateFormat(d[0]));
    detailsLine.select("#count").text(d[1]);

    detailsLine.style("opacity", 1);
  }

  function onMouseMove(event, d, selectedMonth, xScale, yScale) {
    const detailsLine = d3.select("#details_line");

    const circle = d3.select(event.target);
    const circleBBox = circle.node().getBBox();

    const x = circleBBox.x + circleBBox.width / 2 + lineChartDimensions.margins.left;
    const y = circleBBox.y + circleBBox.height / 2 + lineChartDimensions.margins.top;

    detailsLine.style("transform", `translate(calc(-50% + ${x}px), calc(-100% + ${y}px - 10px))`);
  }

  function onMouseLeave() {
    d3.select("#details_line").style("opacity", 0);
  }

}

function createScatterPlot(data) {
  const margin = { top: 60, right: 30, bottom: 40, left: 60 };
  const width = window.innerWidth * 0.9 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#scatterplot").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`)

  svg.append("text")
    .attr("class", "scatterplot-title")
    .attr("x", width / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("font-weight", "bold")
    .text("Earthquake Magnitude vs Depth - 2023");

  const xPaddingFactor = 0.002;
  const yPaddingFactor = 0.01;

  const xExtent = d3.extent(data, d => +d.depth);
  const yExtent = d3.extent(data, d => +d.mag);

  const xPadding = (xExtent[1] - xExtent[0]) * xPaddingFactor;
  const yPadding = (yExtent[1] - yExtent[0]) * yPaddingFactor;

  const xScale = d3.scaleLinear()
    .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
    .range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale))
    .append("text")
    .attr("fill", "#000")
    .attr("x", width / 2)
    .attr("y", margin.bottom - 10)
    .attr("text-anchor", "middle")
    .text("Depth (km)");

  svg.append("g")
    .call(d3.axisLeft(yScale))
    .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 20)
    .attr("x", -height / 2)
    .attr("dy", "1em")
    .attr("text-anchor", "middle")
    .text("Magnitude");

  const colorScale = d3.scaleThreshold()
    .domain([5, 6, 7])
    .range(["#73a942", "#ffd819", "#fb8b24", "#ff0000"]);

  svg.selectAll("circle")
    .data(data)
    .enter().append("circle")
    .attr("cx", d => xScale(+d.depth))
    .attr("cy", d => yScale(+d.mag))
    .attr("r", 4)
    .attr("fill", d => colorScale(+d.mag))
    .attr("stroke", "#000");

  function updateScatterPlot(filteredData, selectedMonth) {
    const title = d3.select(".scatterplot-title");
    if (selectedMonth === "all") {
      title.text("Earthquake Magnitude vs Depth - 2023");
    } else {
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      title.text(`Earthquake Magnitude vs Depth - ${monthNames[selectedMonth - 1]}`);
    }

    const circles = svg.selectAll("circle")
      .data(filteredData);

    circles.enter().append("circle")
      .merge(circles)
      .attr("cx", d => xScale(+d.depth))
      .attr("cy", d => yScale(+d.mag))
      .attr("r", 4)
      .attr("fill", d => colorScale(+d.mag))
      .attr("stroke", "#000");

    circles.exit().remove();
  }

  window.updateScatterPlot = updateScatterPlot;
}

function createMagHistogram(dataset, selectedMonth = "all") {
  const margin = { top: 60, right: 30, bottom: 40, left: 60 };
  const width = 960 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#histogram-mag")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(dataset, d => d.mag)).nice()
    .range([0, width]);

  const xAxis = d3.axisBottom(x)
    .ticks(11);

  svg.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

  svg.append("text")
    .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
    .text("Magnitude");

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const titleText = selectedMonth === "all" ? "Histogram of Magnitudes - 2023" : `Histogram of Magnitudes - ${monthNames[selectedMonth - 1]}`;

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .attr("font-weight", "bold")
    .text(titleText);

  const bins = d3.bin()
    .domain(x.domain())
    .thresholds(11)
    (dataset.map(d => d.mag));

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)]).nice()
    .range([height, 0]);

  const yAxis = d3.axisLeft(y)

  svg.append("g")
    .attr("class", "axis axis--y")
    .call(yAxis);

  const bar = svg.selectAll(".bar")
    .data(bins)
    .enter().append("g")
    .attr("class", "bar")
    .attr("transform", d => `translate(${x(d.x0)},${y(d.length)})`)
    .attr("fill", "#73a942")

  bar.append("rect")
    .attr("x", 1)
    .attr("width", x(bins[0].x1) - x(bins[0].x0) - 1)
    .attr("height", d => height - y(d.length))
    .on("mouseenter", onBarMouseEnter)
    .on("mouseleave", onBarMouseLeave);

  bar.append("text")
    .attr("dy", ".75em")
    .attr("y", -15)
    .attr("x", (x(bins[0].x1) - x(bins[0].x0)) / 2)
    .attr("text-anchor", "middle")
    .text(d => d.length)
    .attr("fill", "black")

  svg.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Frequency");

  const mean = d3.mean(dataset, d => d.mag);

  svg.append("line")
    .attr("x1", x(mean))
    .attr("y1", 0)
    .attr("x2", x(mean))
    .attr("y2", height)
    .attr("stroke", "red")
    .attr("stroke-width", 2);

  svg.append("text")
    .attr("x", x(mean))
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("fill", "red")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text(`Mean: ${mean.toFixed(2)}`);

  const details_mag = d3.select("#details_mag");

  function onBarMouseEnter(event, d) {
    console.log("Mouse entered bar:", d);
    details_mag.select("#count").text(d.length);
    details_mag.select("#range").text(`${d.x0} - ${d.x1}`);

    const barX = x(d.x0) + (x(d.x1) - x(d.x0)) / 2 + margin.left;
    const barY = y(d.length) + margin.top;

    details_mag.style("transform", `translate(calc(-50% + ${barX}px), calc(-100% + ${barY}px))`)
      .style("opacity", 1)
  }

  function onBarMouseLeave(e, d) {
    details_mag.style("opacity", 0);
    console.log("Mouse left bar")
  }

}

function updateMagHistogram(filteredData, selectedMonth = "all") {
  const histogramSvg = d3.select("#histogram-mag svg");
  if (!histogramSvg.empty()) {
    histogramSvg.remove();
  }
  createMagHistogram(filteredData, selectedMonth);
}

function createDepthHistogram(dataset, selectedMonth = "all") {
  const margin = { top: 60, right: 30, bottom: 40, left: 60 };
  const width = 960 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#histogram-depth")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const filteredDataset = dataset.filter(d => d.depth >= 0);

  const maxDepth = d3.max(filteredDataset, d => +d.depth);
  
  const x = d3.scaleLinear()
    .domain([0, maxDepth]).nice()
    .range([0, width]);

  const xAxis = d3.axisBottom(x)
    .ticks(14);

  svg.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis);

  svg.append("text")
    .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 10})`)
    .text("Depth (km)");

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const titleText = selectedMonth === "all" ? "Histogram of Depths - 2023" : `Histogram of Depths - ${monthNames[selectedMonth - 1]}`;

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .attr("font-weight", "bold")
    .text(titleText);

  const bins = d3.bin()
    .domain(x.domain())
    .thresholds([0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650])
    (filteredDataset.map(d => d.depth));

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)]).nice()
    .range([height, 0]);

  const yAxis = d3.axisLeft(y)

  svg.append("g")
    .attr("class", "axis axis--y")
    .call(yAxis);

  const bar = svg.selectAll(".bar")
    .data(bins)
    .enter().append("g")
    .attr("class", "bar")
    .attr("transform", d => `translate(${x(d.x0)},${y(d.length)})`)
    .attr("fill", "#73a942")

  bar.append("rect")
    .attr("x", 1)
    .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", d => height - y(d.length))
    .on("mouseenter", onBarMouseEnter)
    .on("mouseleave", onBarMouseLeave);

  bar.append("text")
    .attr("dy", ".75em")
    .attr("y", -15)
    .attr("x", (x(bins[0].x1) - x(bins[0].x0)) / 2)
    .attr("text-anchor", "middle")
    .text(d => d.length)
    .attr("fill", "black")

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Frequency");

  const mean = d3.mean(filteredDataset, d => d.depth); 

  svg.append("line")
    .attr("x1", x(mean))
    .attr("y1", 0)
    .attr("x2", x(mean))
    .attr("y2", height)
    .attr("stroke", "red")
    .attr("stroke-width", 2);

  svg.append("text")
    .attr("x", x(mean))
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("fill", "red")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text(`Mean: ${mean.toFixed(2)}`);

  const details_depth = d3.select("#details_depth");

  function onBarMouseEnter(event, d) {
    console.log("Mouse entered bar:", d);
    details_depth.select("#count").text(d.length);
    details_depth.select("#range").text(`${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}`);

    const barX = x(d.x0) + (x(d.x1) - x(d.x0)) / 2 + margin.left;
    const barY = y(d.length) + margin.top;

    details_depth.style("transform", `translate(calc(-50% + ${barX}px), calc(-100% + ${barY}px))`)
      .style("opacity", 1)
  }

  function onBarMouseLeave(e, d) {
    details_depth.style("opacity", 0);
    console.log("Mouse left");
  }
}

function updateDepthHistogram(data, selectedMonth = "all") {
  const histogramSvg = d3.select("#histogram-depth svg");
  if (!histogramSvg.empty()) {
    histogramSvg.remove();
  }
  createDepthHistogram(data, selectedMonth);
}

crtajMapu();
