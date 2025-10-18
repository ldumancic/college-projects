async function crtajMapu() {
  
    const worldMapData = await d3.json('../world-geojson.json');
    const dataset = await d3.csv('../earthquakes.csv');
  
    const magnitude = d => d.mag;
    const latitude = d => +d.latitude;
    const longitude = d => +d.longitude;
  
    let dimenzije = {
      sirina: window.innerWidth * 0.9,
      margine: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
    };
  
    dimenzije.grSirina = dimenzije.sirina
      - dimenzije.margine.left - dimenzije.margine.right;
  
    const projection = d3.geoEqualEarth()
      .fitSize([dimenzije.grSirina, dimenzije.grVisina], worldMapData);
  
    const pathGenerator = d3.geoPath(projection);
  
    const earthquakeDensity = d3.contourDensity()
      .x(longitude)
      .y(latitude)
      .size([dimenzije.grSirina, dimenzije.grVisina])
      .bandwidth(30) // Adjust bandwidth for desired smoothness
      .thresholds(50) // Number of contour lines to draw
  
    const densityData = earthquakeDensity(dataset);
  
    const colorScale = d3.scaleSequential(d3.interpolateReds) // Change color scheme as needed
      .domain(d3.extent(densityData, d => d.value));
  
    const okvir = d3.select("#okvir")
      .append("svg")
      .attr("width", dimenzije.sirina)
      .attr("height", dimenzije.visina);
  
    const granice = okvir.append("g")
      .style("transform",
        `translate(
          ${dimenzije.margine.left}px, 
          ${dimenzije.margine.top}px
        )`
      );
  
    granice.selectAll(".heatmap")
      .data(densityData)
      .enter().append("path")
        .attr("class", "heatmap")
        .attr("d", d => pathGenerator(d.coordinates))
        .attr("fill", d => colorScale(d.value));
  
    // Add code for map features, legend, and interactivity as needed
  
  }
  
  crtajMapu();
  