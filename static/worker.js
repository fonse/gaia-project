importScripts("honeycomb.min.js");

onmessage = function(e) {
  const Hex = Honeycomb.extendHex({
    size: 40,
    orientation: 'flat',
  });
  const Grid = Honeycomb.defineGrid(Hex);

  const startTime = performance.now();
  for (let i = 1; i <= 1000; i++) {
    const board = generateBoard(Grid);
    if (isBalancedClusters(board) && isBalancedHomePlanets(board)) {
      console.log(`Board generated in ${i} iterations.`);
      postMessage(board);
      break;
    }
  }
  
  const endTime = performance.now();
  console.log(`Execution time: ${endTime - startTime}ms`);
}

/**
 * -------------------------------------------------------
 * Balance Rules
 * -------------------------------------------------------
 */
const ruleHomePlanetMinReachability = 2;
const ruleHomePlanetMaxReachability = 3;
const ruleClusterMaxSize = 5;

/**
 * -------------------------------------------------------
 * Constants
 * -------------------------------------------------------
 */
const tileShiftX = {q: 5, r: -2, s: -3};
const tileShiftY = {q: 3, r: -5, s: 2};

const tileSpecs = [
  {
    number: 1,
    planets: [
      [-2,  0, 'desert'],
      [-1, -1, 'swamp'],
      [ 0,  2, 'oxide'],
      [ 1, -1, 'terra'],
      [ 1,  1, 'volcanic'],
      [ 2, -0, 'transdim'],
    ]
  },
  {
    number: 2,
    planets: [
      [-1, -2, 'volcanic'],
      [-1,  0, 'swamp'],
      [-1,  1, 'oxide'],
      [ 0, -2, 'titanium'],
      [ 1, -1, 'ice'],
      [ 1,  1, 'transdim'],
      [ 2,  0, 'desert'],
    ]
  },
  {
    number: 3,
    planets: [
      [-1, -1, 'gaia'],
      [-1,  1, 'terra'],
      [ 0, -2, 'transdim'],
      [ 0,  2, 'desert'],
      [ 1,  0, 'ice'],
      [ 2,  0, 'titanium'],
    ]
  },
  {
    number: 4,
    planets: [
      [-2,  0, 'ice'],
      [-1,  0, 'volcanic'],
      [ 0, -2, 'titanium'],
      [ 0, -1, 'oxide'],
      [ 1,  0, 'swamp'],
      [ 2,  1, 'terra'],
    ]
  },
  {
    number: 5,
    planets: [
      [-1, -1, 'gaia'],
      [-1,  1, 'volcanic'],
      [ 0, -2, 'ice'],
      [ 0,  2, 'desert'],
      [ 2, -1, 'transdim'],
      [ 2,  0, 'oxide'],
    ]
  },
  {
    number: 6,
    planets: [
      [-1, -1, 'swamp'],
      [ 0,  1, 'gaia'],
      [ 1, -2, 'transdim'],
      [ 1, -1, 'terra'],
      [ 1,  1, 'transdim'],
      [ 2,  1, 'desert'],
    ]
  },
  {
    number: 7,
    planets: [
      [-2, -1, 'transdim'],
      [-1,  0, 'gaia'],
      [ 0, -1, 'oxide'],
      [ 0,  2, 'titanium'],
      [ 1, -2, 'swamp'],
      [ 1,  0, 'gaia'],
    ]
  },
  {
    number: 8,
    planets: [
      [-1,  0, 'volcanic'],
      [-1,  1, 'transdim'],
      [ 0, -2, 'terra'],
      [ 0, -1, 'ice'],
      [ 1,  0, 'titanium'],
      [ 2, -1, 'transdim'],
    ]
  },
  {
    number: 9,
    planets: [
      [-2,  1, 'swamp'],
      [-1, -2, 'volcanic'],
      [-1,  0, 'titanium'],
      [ 1, -2, 'transdim'],
      [ 1,  0, 'gaia'],
      [ 2, -1, 'ice'],
    ]
  },
  {
    number: 10,
    planets: [
      [-2,  1, 'terra'],
      [-1, -1, 'desert'],
      [-1,  1, 'oxide'],
      [ 1, -2, 'transdim'],
      [ 1,  0, 'gaia'],
      [ 2, -1, 'transdim'],
    ]
  },
];

const tilePositions = [
  [0,1],
  [0,2],
  [1,0],
  [1,1],
  [1,2],
  [2,0],
  [2,1],
  [2,2],
  [3,0],
  [3,1],
];

const homePlanetTypes = ["terra", "desert", "swamp", "oxide", "volcanic", "ice", "titanium"];

/**
 * -------------------------------------------------------
 * Grid Functions
 * -------------------------------------------------------
 */

// Build one of the 10 tiles given the coordinates of each planet
function buildTile(Grid, number, rotation, tilePosition) {
  const tileSpec = tileSpecs.find(spec => spec.number === number);

  // Convert coordinates to cube
  const planets = tileSpec.planets.map(([x, y, planet]) => {
    let coordinates = Grid.Hex().toCube({x, y});

    // Rotate the coordinates {rotation} times clockwise
    for (let i = 1; i <= rotation; i++) {
      const {q, r, s} = coordinates;
      coordinates = {q:-r, r:-s, s:-q};
    }

    return {
      type: planet,
      coordinates,
    };
  });

  // Translate tile position to cube coordinates
  let translation = {q: 0, r: 0, s: 0};
  let [tilePositionX, tilePositionY] = tilePosition;
  for (let i = 0; i < tilePositionX; i++) {
    translation = {q: translation.q + tileShiftX.q, r: translation.r + tileShiftX.r, s: translation.s + tileShiftX.s};
  }
  for (let i = 0; i < tilePositionY; i++) {
    translation = {q: translation.q + tileShiftY.q, r: translation.r + tileShiftY.r, s: translation.s + tileShiftY.s};
  }
  
  const hexes = [];
  Grid.hexagon({
    radius: 2,
    onCreate: (hex => {
      const planet = planets.find(({coordinates}) => hex.q === coordinates.q && hex.r === coordinates.r && hex.s === coordinates.s);
      hexes.push({
        q: hex.q + translation.q,
        r: hex.r + translation.r,
        s: hex.s + translation.s,
        planet: planet ? planet.type : 'empty',
        isCenter: hex.q === 0 && hex.r === 0 && hex.s === 0,
        tileNumber: number,
        tilePositionX,
        tilePositionY,
        rotation,
      })
    }),
  });

  return hexes;
}

// Calcualte the distance between two hexes
function getDistance(hexFrom, hexTo) {
  return Math.max(Math.abs(hexFrom.q - hexTo.q), Math.abs(hexFrom.r - hexTo.r), Math.abs(hexFrom.s - hexTo.s));
}

// Unique identifier for each hex
function tileId(hex) {
  return `${hex.q},${hex.r},${hex.s}`;
}

/**
 * -------------------------------------------------------
 * Generation Logic
 * -------------------------------------------------------
 */

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Randomly place and rotate all 10 tiles
function generateBoard(Grid) {
  shuffleArray(tilePositions);
  return Grid([...Array(10).keys()].flatMap((tileNumber, index) => {
    const rotation = Math.floor(Math.random() * 6);
    return buildTile(Grid, tileNumber + 1, rotation, tilePositions[index]);
  }));
}

// Check reachability of other home planets for each type
function isBalancedHomePlanets(board) {
  const minDistances = {};
  homePlanetTypes.forEach(type => {
    minDistances[type] = 99;
  });
  
  // Calculate minimum distance between home planets for each type
  board.filter((hex) => homePlanetTypes.includes(hex.planet)).forEach(hex => {
    board.filter((hex2) => hex2.planet === hex.planet && tileId(hex) < tileId(hex2))
      .forEach(hex2 => {
        const distance = getDistance(hex, hex2);
        if (distance < minDistances[hex.planet]) {
          minDistances[hex.planet] = distance;
        }
      });
  });

  // Apply reachability rules
  const distancesList = Object.values(minDistances);
  return Math.max(...distancesList) <= ruleHomePlanetMaxReachability && Math.min(...distancesList) >= ruleHomePlanetMinReachability;
}

// Check the size of planet clusters
function isBalancedClusters(board) {
  const clusterSizes = [];
  const visitedHexes = [];

  // Calculate the size of each cluster of planets
  board.filter((hex) => hex.planet !== "empty").forEach(hex => {
    if (visitedHexes.includes(hex)) {
      return;
    }

    // Each new planet is the start of a new cluster
    const cluster = [hex]
    let fringe = [hex];

    // Use bfs to obtain the rest of the cluster
    while (fringe.length > 0) {
      const newFringe = [];
      fringe.forEach(fringeHex => {
        board.neighborsOf(fringeHex).filter(neighbor => neighbor && neighbor.planet !== 'empty' && !cluster.includes(neighbor))
          .forEach(neighbor => {
            cluster.push(neighbor);
            newFringe.push(neighbor);
          });
      });

      fringe = newFringe;
    }

    visitedHexes.push(...cluster);
    clusterSizes.push(cluster.length);
  });

  // Apply cluster size rules
  return Math.max(...clusterSizes) <= ruleClusterMaxSize;
}