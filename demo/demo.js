// constants
var CIRCLE_RADIUS = 15;
var EASING_CREATE = 'elastic-in';
var EASING_REMOVE = 'back-in';
var EASING_SOLVE = 'back-out';
// globals
var graph = new EspressoGraph.Graph(false);
var svg = d3.select('svg');
var lineGroup = svg.append('g');
var circleGroup = svg.append('g');
var activeNode = null;
// is node selected?
function isSelected(node) {
  return node === activeNode;
}
// select single node
function selectNode(node) {
  if (hasSelection()) {
    d3.select(activeNode).classed('selected', false);
    animateSelection(activeNode);
  }
  activeNode = node;
  if (hasSelection()) {
    d3.select(activeNode).classed('selected', true);
    animateSelection(activeNode);
  }
}
function animateSelection(node) {
  d3.select(node)
    .attr('r', CIRCLE_RADIUS*0.9)
    .transition()
      .attr('r',CIRCLE_RADIUS);
}
function animateSolve(domNode) {
  var d3node = d3.select(domNode);
  var name = domNode.tagName.toLowerCase();
  if (name === 'circle') {
    d3node
      .attr('r', CIRCLE_RADIUS*1.5)
      .transition()
        .attr('r', CIRCLE_RADIUS)
        .ease(EASING_SOLVE);
  } else if (name === 'line') {
    console.log('LINE');
    var w = parseFloat(d3node.style('stroke-width'));
    console.log(w);
    d3node
      .style('stroke-width', CIRCLE_RADIUS*2*1.5)
      .transition()
        .style('stroke-width', w)
        .ease(EASING_SOLVE);
  }
}
// toggle node selection
function toggleSelected(node) {
  return selectNode( isSelected(node) ? null : node );
}
// clear selection
function clearSelection() {
  selectNode(null);
}
// is something selected
function hasSelection() {
  return activeNode !== null;
}
// create node
function createNode(x, y, selected) {
  console.log("CREATING NODE");
  var circle = circleGroup.append('circle');
  var node = circle.node();
  circle
    .attr('cx', x)
    .attr('cy', y)
    .attr('r', 0)
    .transition()
      .attr('r', CIRCLE_RADIUS)
      .ease(EASING_CREATE);
  circle.on('click', function(){
    nodeClickEvent(node);
  });
  graph.addNode(node);
  if (selected === true) selectNode(node);
  return node;
}
// delete node
function removeNode(node) {
  graph.getNeighbors(node).forEach(function(neighbor){
    disconnectNodes(node, neighbor);
  });
  graph.removeNode(node);
  d3.select(node).transition().attr('r',0).ease(EASING_REMOVE).remove();
}
// delete all nodes
function removeAllNodes(){
  graph.nodes.forEach(function(node){
    removeNode(node);
  });
}
// node clicked
function nodeClickEvent(node) {
  var evt = d3.event;
  if (evt.defaultPrevented) return;
  evt.stopPropagation();
  console.log('circle clicked');
  if (isSelected(node) || !hasSelection()) {
    toggleSelected(node);
  } else {
    // there is another selected node but no this one
    if (graph.containsEdge(activeNode, node)) {
      disconnectNodes(activeNode, node)
    } else {
      connectNodes(activeNode, node);
    }
    animateSelection(node);
    clearSelection();
  }
}
// click function
d3.select('body').on('click', function(d,i){
  // if event is cancelled, do nothing
  var evt = d3.event;
  if (evt.defaultPrevented) return;
  // get click coordinates & shift key
  var coords = d3.mouse(svg.node());
  var x = coords[0];
  var y = coords[1];
  // if outside of bounds, ignore
  var svgW = parseInt(svg.style('width'));
  var svgH = parseInt(svg.style('height'));
  var inRange = x > 0 && x < svgW && y > 0 && y < svgH;
  if (!inRange) return;
  // now we have an event; stop propagation
  evt.stopPropagation();
  // if selection, quit it
  // if (selectedNodes.length !== 0 && !shifting) {
  //   deselectAll();
  //   return;
  // }
  // else, create node, selected if holding shift
  var node = createNode(x, y, false);

  if (hasSelection()) {
    connectNodes(activeNode, node);
    clearSelection();
  }
});
// single pair connection
function connectNodes(nodeA, nodeB) {
  var a = d3.select(nodeA);
  var b = d3.select(nodeB);
  if (!graph.containsEdge(nodeA, nodeB)) {
    var line = lineGroup
      .append('line')
      .datum([nodeA, nodeB])
      .attr('x1', a.attr('cx'))
      .attr('y1', a.attr('cy'))
      .attr('x2', b.attr('cx'))
      .attr('y2', b.attr('cy'));
    var stroke = line.style('stroke-width');
    line.style('stroke-width', 0).transition().style('stroke-width', stroke).ease(EASING_CREATE);
    graph.addEdge(nodeA, nodeB, line.node());
  }
  console.log('done connecting');
}
// single pair remove
function disconnectNodes(nodeA, nodeB) {
  var edge = graph.getEdge(nodeA, nodeB);
  if (edge === null) return;
  var line = d3.select(edge);
  line.transition().style('stroke-width', 0).ease(EASING_REMOVE).remove();
  graph.removeEdge(nodeA, nodeB);
}
////// controls //////
d3.select('.controls-delete').on('click', function() {
  if (hasSelection()) {
    var toRemove = activeNode;
    activeNode = null;
    removeNode(toRemove);
  }
});
d3.select('.controls-delete-all').on('click', function() {
  removeAllNodes();
});
////// solver ///////
d3.select('.solver-start').on('click', function(){
  if (hasSelection()) {
    circleGroup.selectAll('circle').classed('start', false);
    d3.select(activeNode)
      .classed('goal', false)
      .classed('start', true);
    clearSelection();
  } else {
    alert("One node must be selected");
  }
});
d3.select('.solver-goal').on('click', function(){
  if (hasSelection()) {
    circleGroup.selectAll('circle').classed('goal', false);
    d3.select(activeNode)
      .classed('start', false)
      .classed('goal', true);
    clearSelection();
  } else {
    alert("One node must be selected");
  }
});
d3.select('.solver-solve').on('click', function(){
  var start = d3.select('circle.start');
  var goal = d3.select('circle.goal');
  if (start.length === 0 || goal.length === 0) {
    alert('You have to select start and goal nodes first!');
    return;
  } else {
    clearSolution();
    var solution = graph.searchDijkstra(start.node(), goal.node(), calculateCost);
    if (solution === null) {
      alert("This doesn't appear to be solveable :-(");
    } else {
      solution.path.forEach(function(item,i){
        setTimeout(function(){
          d3.select(item)
            .classed('path', true);
          animateSolve(item);
        }, i*25);
      });
    }
  }
});
d3.select('.solver-clear').on('click', clearSolution);
function clearSolution() {
  svg.selectAll('*').classed('path', false);
}
function calculateCost(nodeA, nodeB) {
  var a = d3.select(nodeA);
  var b = d3.select(nodeB);
  var ax = parseFloat(a.attr('cx'));
  var ay = parseFloat(a.attr('cy'));
  var bx = parseFloat(b.attr('cx'));
  var by = parseFloat(b.attr('cy'));
  var dx = bx - ax;
  var dy = by - ay;
  return Math.sqrt(dx*dx + dy*dy);
}
///// randomly generated presets /////
function getRandomInt(min, max) { // max is INCLUSIVE
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
d3.select('.presets-maze-dfs').on('click', generateMazeDFS);
function generateMazeDFS() {
  removeAllNodes();
  var gridSize = CIRCLE_RADIUS * 3;
  var canvasW = parseFloat(svg.style('width'))
  var canvasH = parseFloat(svg.style('height'))
  var mazeW = Math.floor(canvasW / gridSize);
  var mazeH = Math.floor(canvasH / gridSize);
  var nodePadding = (gridSize - CIRCLE_RADIUS*2.0)/2.0;
  var extraX = canvasW - (gridSize * mazeW);
  var extraY = canvasH - (gridSize * mazeH);
  var cells = [];
  var cellCount = 0;
  for (var x = 0; x < mazeW; x++) {
    for (var y = 0; y < mazeH; y++) {
      var offsetX = (gridSize*x) + nodePadding + CIRCLE_RADIUS + extraX/2.0;
      var offsetY = (gridSize*y) + nodePadding + CIRCLE_RADIUS + extraY/2.0;
      if (!cells[x]) cells[x] = [];
      cells[x][y] = createNode(offsetX, offsetY);
      cellCount++;
    }
  }
  var getCell = function(pt) { return cells[pt.x][pt.y] };
  var start = cells[0][mazeH-1];
  var goal = cells[mazeW-1][0];
  d3.select(start).classed('start', true);
  d3.select(goal).classed('goal', true);
  var current = {x: 0, y: mazeH-1};
  var visitedNodes = [getCell(current)];
  var stack = [];
  var iterations = 0;
  while (visitedNodes.length < cellCount) {
    iterations ++; if (iterations > 9999) { console.log('too many iterations!!!'); break; }
    var currentNeighbors = []
    for (var offX = -1; offX <= 1; offX++) {
      for (var offY = -1; offY <= 1; offY++) {
        if (Math.abs(offX) === Math.abs(offY)) continue;
        var next = {x: current.x + offX, y: current.y + offY};
        if (next.x < 0 || next.y < 0 || next.x >= mazeW || next.y >= mazeH) continue;
        currentNeighbors.push(next);
      }
    }
    var unvisitedNeighbors = [];
    currentNeighbors.forEach(function(c){
      var idx = visitedNodes.indexOf( getCell(c) );
      if (idx === -1) unvisitedNeighbors.push(c);
    });
    if (unvisitedNeighbors.length > 0) {
      var randIdx = getRandomInt(0, unvisitedNeighbors.length-1);
      var next = unvisitedNeighbors[randIdx];
      var nodeA = cells[current.x][current.y];
      var nodeB = cells[next.x][next.y];
      connectNodes(nodeA, nodeB);
      stack.push(current);
      visitedNodes.push(getCell(next));
      console.log(current.x + ',' + current.y + '->' + next.x + ',' + next.y);
      current = next;
    } else {
      if (stack.length > 0) {
        current = stack.pop();
      } else return;
    }
  }
  console.log(visitedNodes.length);
  console.log(iterations);
}