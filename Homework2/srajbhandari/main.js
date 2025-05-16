let processedData = [];
const width = 800;
const height = 400;

// loading CSV data
d3.csv("data/fitness_cleaned.csv").then(data => {
    // grouped data by Age and Exercise Frequency, then counted each group
    const grouped = d3.rollups(
      data,
      v => v.length, // counted the number of rows in each group
      d => d.Age,
      d => d.ExerciseFreq
    );
    // Flattened the grouped data for bar chart
    grouped.forEach(([age, freqMap]) => {
      freqMap.forEach(([freq, count]) => {
        processedData.push({ age, freq, count });
      });
    });


    // Heatmap data processing
    const heatmapData = [];
    const likertQuestions = {
        "Has the fitness wearable helped you stay motivated to exercise?": "Motivation",
        "Do you think that the fitness wearable has made exercising more enjoyable?": "Enjoyable",
        "Engagement": "Engagement",
        "CommunityConnection": "Community",
        "SleepImpact": "Sleep",
        "WellbeingImpact": "Wellbeing",
        "InfluenceExercise": "Exercise Change",
        "InfluencePurchase": "Buy Fitness Gear",
        "InfluenceGym": "Join Gym/Class",
        "InfluenceDiet": "Diet Change"
    };

    // Defining the order of Likert responses
    const responseScale = [
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree"
    ];
    // Counting how many people gave each response for each question
    Object.entries(likertQuestions).forEach(([col, shortLabel]) => {
        const counts = d3.rollup(
        data,
        v => v.length,
        d => (d[col] || "").trim() // clean and group by response text
        );
        responseScale.forEach(response => {
        heatmapData.push({
            question: shortLabel,
            response: response,
            count: counts.get(response) || 0
        });
        });
    });
    // Calling chart functions with processed data
    drawBarChart(processedData);
    drawSankey(data);
    drawHeatmap(heatmapData);
  });


  function drawBarChart(data) {
    const svg = d3.select("#chart1 svg");

    // Getting the container size to scale chart
    const container = document.querySelector(".Dashboard").getBoundingClientRect();
    const fullWidth = container.width || container.right - container.left ;
    const fullHeight = 500; 

    // Setting SVG size and responsive behavior
    svg
        .attr("width", fullWidth)
        .attr("height", fullHeight)
        .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Setting the chart margins and inner width/height
    const margin = { top: 40, right: 30, bottom: 100, left: 60 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Get the age groups and frequency labels
    const ages = [...new Set(data.map(d => d.age))];
    const freqs = [...new Set(data.map(d => d.freq))];
    
    // Setting up scales
    const x0 = d3.scaleBand().domain(ages).range([0, width]).padding(0.2); // outer band
    const x1 = d3.scaleBand().domain(freqs).range([0, x0.bandwidth()]).padding(0.05); // inner band
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).nice().range([height, 0]);
    const color = d3.scaleOrdinal().domain(freqs).range(d3.schemeSet2);
  
    // X axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x0))
      .selectAll("text")
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .attr("stroke", "#999"); 
    
    // X Axis Label
    g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 60)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Age Group")
    .attr("stroke", "#999");
    

    // Y axis
    g.append("g").call(d3.axisLeft(y));

    // Y Axis Label
    g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Number of Respondents")
    .attr("stroke", "#999");
  
    // drawing grouped Bars
    g.selectAll("g.bar-group")
      .data(data)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${x0(d.age)},0)`)
      .append("rect")
      .attr("x", d => x1(d.freq))
      .attr("y", d => y(d.count))
      .attr("rx", 25)  
      .attr("ry", 25)
      .attr("width", x1.bandwidth())
      .attr("height", d => height - y(d.count))
      .attr("opacity", 0.7)
      .attr("fill", d => color(d.freq));
    
    // Styling axis lines and ticks
    svg.selectAll(".domain").attr("stroke", "#999"); 
    svg.selectAll(".tick line").attr("stroke", "#ccc");

  
    // Adding legend for frequency colors
    const legend = svg.append("g").attr("transform", `translate(${width - 100},20)`);
    freqs.forEach((f, i) => {
    // Drawing color box
      legend.append("rect")
        .attr("x", 0)
        .attr("y", i * 20)
        .attr("rx", 6)  
        .attr("ry", 6)
        .attr("width", 10)
        .attr("height", 10)
        .attr("opacity", 0.7)
        .attr("fill", color(f));

    // Labeling for each frequency
      legend.append("text")
        .attr("x", 15)
        .attr("y", i * 20 + 9)
        .text(f)
        .style("font-size", "14px")
        .attr("alignment-baseline", "middle")
        .attr("stroke", "#999");
    });
  }

  function drawSankey(data) {  
    const svg = d3.select("#sankey-svg");
    // Clearing any previous elements from the SVG
    svg.selectAll("*").remove();
  
    // using width and height from the chart container
    const container = document.getElementById("chart2").getBoundingClientRect();
    const fullWidth = container.width || container.right - container.left || 2000;
    const fullHeight = 500;
  
    // Setting SVG size and responsiveness
    svg
      .attr("width", fullWidth)
      .attr("height", fullHeight)
      .attr("viewBox", `0 0 ${fullWidth} ${fullHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    
    // margins and inner chart dimensions
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = fullWidth - margin.left - margin.right;
    const height = fullHeight - margin.top - margin.bottom;
  
    // Adding main group for Sankey content
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Initializing links array and node name set
    const links = [];
    const nodeNames = new Set();

    // Defining color scales for each flow stage
    const colorUse = d3.scaleOrdinal(d3.schemeSet2); // For Wearable Use Frequency
    const colorEngagement = d3.scaleOrdinal(d3.schemePastel1); // For Engagement
    const colorImpact = d3.scaleOrdinal(d3.schemeTableau10); // For Impact

    // Storing the unique values for each node group
    const useFreqSet = new Set();
    const engagementSet = new Set();
    const impactSet = new Set();

    // Shorten long impact response labels
    const impactRename = {
        "Positively impacted my fitness routine": "Positive impact",
        "No impact on my fitness routine": "No impact",
        "Negatively impacted my fitness routine": "Negative impact",
        "I don't know": "Don't know"
      };

    data.forEach(d => {
      if (d.WearableUseFreq && d.Engagement && d.RoutineImpact) {
        // Getting the values for each stage, trim whitespace
        const step1 = d.WearableUseFreq.trim();
        const step2 = d.Engagement.trim();
        const rawImpact = d.RoutineImpact.trim();
        const step3 = impactRename[rawImpact] || rawImpact;

        // Storing node names for all stages
        nodeNames.add(step1);
        nodeNames.add(step2);
        nodeNames.add(step3);

        // Track which stage each node belongs to
        useFreqSet.add(d.WearableUseFreq.trim());
        engagementSet.add(d.Engagement.trim());
        impactSet.add(d.RoutineImpact.trim());
        
        // Creating links between each step
        links.push({ source: step1, target: step2, value: 1 });
        links.push({ source: step2, target: step3, value: 1 });
      }
    });

  // Combining duplicate links 
    const linkMap = {};
    links.forEach(link => {
      const key = `${link.source}___${link.target}`;
      if (!linkMap[key]) {
        linkMap[key] = { source: link.source, target: link.target, value: 0 };
      }
      linkMap[key].value += 1;
    });
    
    // Assigning a stage and color to each node
    const finalNodes = Array.from(nodeNames).map(name => ({ 
        name,
        stage: useFreqSet.has(name) ? "use" :
         engagementSet.has(name) ? "engagement" : "impact"
     }));

    // Mapping the node names to index for Sankey layout
    const nameToIndex = {};
    finalNodes.forEach((node, i) => {
    nameToIndex[node.name] = i;
    });

    // Assigning color to each node based on its stage
    finalNodes.forEach(node => {
        if (node.stage === "use") {
          node.color = colorUse(node.name);
        } else if (node.stage === "engagement") {
          node.color = colorEngagement(node.name);
        } else {
          node.color = colorImpact(node.name);
        }
      });

    // Rebuilding final links using index instead of name
    const finalLinks = Object.values(linkMap).map(link => ({
    source: nameToIndex[link.source],
    target: nameToIndex[link.target],
    value: link.value
    }));

    // Creating Sankey layout
    const sankey = d3.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0, 0], [width, height]]);
  
    // Generating node and link positions
    const { nodes, links: layoutLinks } = sankey({
      nodes: finalNodes.map(d => ({ ...d })),
      links: finalLinks.map(d => ({ ...d }))
    });
  
    // grawing node rectangles
    g.append("g")
      .selectAll("rect")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("rx", 10)  
      .attr("ry", 10)
      .attr("fill", "#69b3a2")
      .attr("fill", d => d.color)
      .append("title")
      .text(d => d.name);
      
  
    // drawing links between nodes
    g.append("g")
      .attr("fill", "none")
      .selectAll("path")
      .data(layoutLinks)
      .enter()
      .append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", "#aaa")
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("stroke", d => {
        const sourceColor = nodes[d.source.index].color;
        return sourceColor;
      })
      .attr("opacity", 0.6);
  
    // Adding node labels beside each rectangle
    g.append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("x", d => d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("stroke", "#999")
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text(d => d.name)
      .filter(d => d.x0 < width / 2)
      .attr("x", d => d.x1 + 6)
      .attr("text-anchor", "start");
  }

  function drawHeatmap(data) {
    const svg = d3.select("#likert-svg");

    // Clearing any previous heatmap content
    svg.selectAll("*").remove();
    
    // Setting up margins and SVG size
    const margin = { top: 40, right: 10, bottom: 40, left: 130 };
    const width = 600;
    const height = 350;
  
    // Setting the SVG dimensions and responsive viewBox
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    
    // Adding main group inside margins
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
    // Defining Likert scale responses on the X-axis
    const responses = [
      "Strongly disagree",
      "Disagree",
      "Neutral",
      "Agree",
      "Strongly agree"
    ];
    
    // Get different question labels for Y-axis
    const questions = Array.from(new Set(data.map(d => d.question)));
  
    // Setting up band scales for X and Y positions
    const x = d3.scaleBand()
        .domain(responses)
        .range([0, width - margin.left - margin.right])
        .padding(0.05);

    const y = d3.scaleBand()
        .domain(questions)
        .range([0, height - margin.top - margin.bottom])
        .padding(0.05);
    
    // adding color scale based on response count 
    const color = d3.scaleSequential()
        .interpolator(d3.interpolatePuRd)
        .domain([0, d3.max(data, d => +d.count)]);
  
    // creating X-axis
    g.append("g")
      .attr("transform", `translate(0,${y.range()[1]})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("stroke", "#888")
      .style("font-family", "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', 'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif")
      .style("font-size", "11px");
        
    // creating Y-axis
    g.append("g")
      .call(d3.axisLeft(y))
      .attr("stroke", "#888")
      .selectAll("text")
      .style("font-family", "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', 'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif")
      .style("font-size", "11px");
      
  
    // Drawing heatmap squares for each question/response
    g.selectAll()
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(d.response))
      .attr("y", d => y(d.question))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("rx", 6)  
      .attr("ry", 6)
      .style("fill", d => color(d.count))
      .append("title")
      .text(d => `${d.question} – ${d.response}: ${d.count}`);

    // Style axis lines and ticks
    svg.selectAll(".domain")
        .attr("stroke", "#999"); 
    svg.selectAll(".tick line")
        .attr("stroke", "#ccc");

    // creating vertical legend
    const legendHeight = 150;
    const legendWidth = 12;

    // defining gradient 
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient-vertical")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    // creating color stops for gradient
    linearGradient.selectAll("stop")
        .data([
            { offset: "0%", color: color.range()[0] },
            { offset: "100%", color: color.range()[1] }
        ])
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    // Adding group to position the legend to the right side
    const legend = svg.append("g")
        .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

    // creating vertical gradient bar
    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient-vertical)");

    // creating linear scale for legend axis (number of responses)
    const legendScale = d3.scaleLinear()
        .domain(color.domain())
        .range([legendHeight, 0]);
    
    // making right-side axis with tick marks
    const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(d3.format("d"));
    legend.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", "10px")
        .attr("stroke", "#888")
        .style("font-family", "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', 'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif");


    // adding legend label
    legend.append("text")
        .attr("x", -10)
        .attr("y", -10)
        .attr("text-anchor", "start")
        .style("font-size", "11px")
        .attr("stroke", "#888")
        .style("font-family", "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', 'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif")
        .text("Responses");

  }
  
  // Redraw charts on window resize
  window.addEventListener("resize", () => {
    d3.select("#chart1-svg").selectAll("*").remove();
    drawBarChart(processedData);
    drawSankey(data);
    drawHeatmap(data);
  });