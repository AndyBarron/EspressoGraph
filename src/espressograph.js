/*!
 *  EspressoGraph - v1.0.1
 *  github.com/AndyBarron/EspressoGraph
 *  Copyright (c) 2014, Andy Barron
 *  www.andybarron.net
 * 
 *  EspressoGraph is released under the MIT License.
 *  http://opensource.org/licenses/MIT
 */

(function(){
  'use strict';
  var root = this;
  var namespace = 'EspressoGraph';

  // helpers

  var arrayContains = function(a,o) {
    return a.indexOf(o) !== -1;
  };

  var exists = function(o) {
    return (o !== null) && (typeof o !== 'undefined');
  };

  var getDefault = function(a,b) {
    return exists(a) ? a : b;
  };

  var updateObject = function(oldObj, newObj) {
    for (var prop in newObj) {
      if (newObj.hasOwnProperty(prop)) {
        oldObj[prop] = newObj[prop]
      }
    }
  };

  var reconstructPath = function(cameFrom, current) {
    if (current in cameFrom) {
      var path = reconstructPath(cameFrom, cameFrom[current]); path.push(current);
      return path;
    } else {
      return [current];
    }
  };

  var zero = function() { return 0; };

  // graph class
  var Graph = function(directed) {
    this._directed = getDefault(directed, false);
    this._nodes = [];
    this._edges = [];
  };

  Graph.prototype = {

    get nodes() {
      return this._nodes.slice();
    },

    get directed() {
      return this._directed;
    },

    containsNode: function(node) {
      return arrayContains(this._nodes, node);
    },

    addNode: function(node) {
      if (!exists(node))
        throw new Error("Graph.addNode: Null/undefined nodes not allowed");
      if (!this.containsNode(node)) {
        this._nodes.push(node);
        this._edges.push({});
        return true;
      } else {
        return false;
      }
    },

    removeNode: function(node) {
      var idx = this._nodes.indexOf(node);
      if (idx === -1) return false;
      // first, remove this node from internal containers
      this._nodes.splice(idx,1);
      this._edges.splice(idx,1);
      // then, remove references to this node from edges
      for (var i in this._edges) {
        if (idx in this._edges[i]) {
          delete this._edges[i][idx];
        }
      }
      // finally, fix new indices
      for (var idxNew = idx; idxNew < this._nodes.length; idxNew++) {
        var idxOld = idxNew + 1;
        for (var k = 0; k < this._nodes.length; k++) {
          var edgeList = this._edges[k];
          if (idxOld in edgeList) {
            edgeList[idxNew] = edgeList[idxOld];
            delete edgeList[idxOld];
          }
        }
      }
      return true;
    },

    addNodeArray: function(array) {
      var ret = [];
      var graph = this;
      array.forEach(function(node, i){
        ret[i] = graph.addNode(node);
      });
      return ret;
    },

    addNodes: function() {
      var argArray = Array.prototype.slice.call(arguments);
      return this.addNodeArray(argArray);
    },

    containsEdge: function(a, b) {
      return exists(this.getEdge(a, b));
    },

    addEdge: function(a, b, data) {
      var idxA = this._nodes.indexOf(a);
      var idxB = this._nodes.indexOf(b);
      if (idxA === -1 || idxB === -1 || this.containsEdge(a, b) || idxA === idxB) {
        return false;
      }
      this._edges[idxA][idxB] = getDefault(data, {});
      return true;
    },

    getEdge: function(a, b) {
      var idxA = this._nodes.indexOf(a);
      var idxB = this._nodes.indexOf(b);
      if (idxB in this._edges[idxA]) {
        return this._edges[idxA][idxB];
      } else if (!this._directed && idxA in this._edges[idxB]) {
        return this._edges[idxB][idxA];
      } else {
        return null;
      }
    },

    getEdges: function(node) {
      var idx = this._nodes.indexOf(node);
      if (idx === -1) return null;
      var edges = [];
      var graph = this;
      this._nodes.forEach(function(neighbor, i){
        if (i in graph._edges[idx]) {
          edges.push(graph._edges[idx][i]);
        } else if (!graph._directed && idx in graph._edges[i]) {
          edges.push(graph._edges[i][idx]);
        }
      });
      return edges;
    },

    removeEdge: function(a, b) {
      var idxA = this._nodes.indexOf(a);
      var idxB = this._nodes.indexOf(b);
      if (idxA === -1 || idxB === -1) return false;
      if (idxB in this._edges[idxA]) {
        delete this._edges[idxA][idxB];
        return true;
      } else if (!this._directed && idxA in this._edges[idxB]) {
        delete this._edges[idxB][idxA];
        return true;
      } else {
        return false;
      }
    },

    _getNeighborsIndex: function(idx) {
      if (idx === -1) return null;
      var neighbors = [];
      var graph = this;
      this._nodes.forEach(function(neighbor, i){
        if ( i in graph._edges[idx] || (!graph._directed && idx in graph._edges[i]) ) {
          neighbors.push(i);
        }
      });
      return neighbors;
    },

    getNeighbors: function(node) {
      var idx = this._nodes.indexOf(node);
      if (idx === -1) return null;
      var neighbors = [];
      var graph = this;
      this._nodes.forEach(function(neighbor, i){
        if ( i in graph._edges[idx] || (!graph._directed && idx in graph._edges[i]) ) {
          neighbors.push(neighbor);
        }
      });
      return neighbors;
    },

    searchAStar: function(begin, end, heuristicFunction, costFunction) {
      // set up, abort if nodes not in graph
      var start = this._nodes.indexOf(begin);
      var goal = this._nodes.indexOf(end);
      if (start === -1 || goal === -1) return null;
      var f = getDefault(costFunction, this.getEdge).bind(this);
      var h = heuristicFunction.bind(this);
      // begin algorithm
      // adapted from Wikipedia pseudocode :-)
      var closedSet = {};
      var openSet = {}; openSet[start] = true;
      var cameFrom = {};
      var gScore = {}; gScore[start] = 0;
      var fScore = {}; fScore[start] = gScore[start] + h(start, goal);
      while (Object.keys(openSet).length != 0) {
        var current = Object.keys(openSet).sort(function(a, b) {return fScore[a] - fScore[b];})[0];
        if (current == goal) {
          var path = reconstructPath(cameFrom, current);
          // var nodePath = [];
          // var _nodes = this._nodes;
          // path.forEach(function(idx){nodePath.push(_nodes[idx])});
          // return nodePath
          var _nodes = this._nodes;
          var fullPath = [begin];
          for (var i = 1; i < path.length; i++) {
            var prevNode = _nodes[path[i-1]];
            var nextNode = _nodes[path[i]];
            fullPath.push(this.getEdge(prevNode, nextNode));
            fullPath.push(nextNode);
          }
          var nodePath = fullPath.filter(function(v, i){ return i%2 == 0; });
          var edgePath = fullPath.filter(function(v, i){ return i%2 != 0; });
          return {
            path: fullPath,
            nodes: nodePath,
            edges: edgePath,
          };
        }
        delete openSet[current];
        closedSet[current] = true;
        var neighbors = this._getNeighborsIndex(current);
        for (var i = 0; i < neighbors.length; i++) {
          var neighbor = neighbors[i];
          if (neighbor in closedSet) continue;
          var gScoreTentative = gScore[current] + f(this._nodes[current], this._nodes[neighbor]);
          if ( !(neighbor in openSet) || gScoreTentative < gScore[neighbor] ) {
            cameFrom[neighbor] = current;
            gScore[neighbor] = gScoreTentative;
            fScore[neighbor] = gScore[neighbor] + h(this._nodes[neighbor], this._nodes[goal]);
            if ( !(neighbor in openSet) ) openSet[neighbor] = true;
          }
        }
      }
      return null;
    },

    searchDijkstra: function(begin, end, costFunction) {
      return this.searchAStar(begin, end, zero, costFunction);
    },

  };

  var mod = {
    Graph: Graph,
  };

  var useCommon = (typeof require === 'function') &&
    (typeof module === 'object') &&
    (typeof exports === 'object');
  var useRequire = !useCommon &&
    (typeof require === 'function') &&
    (typeof define === 'function');

  if (useCommon) {
    updateObject(exports, mod);
  } else if (useRequire) {
    define(mod);
  } else {
    root[namespace] = mod;
  }
}).call(this);