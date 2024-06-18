// with the esm module, we can now have import and require at the same file!
// import { driver } from './mainClient';
import * as config from './configApis/config';
import neo4j from 'neo4j-driver';
import express from 'express';
import path from 'path';
import https from 'https';
import fs from 'fs';

const { PythonShell } = require('python-shell');

const app = express();
const port = process.env.PORT || 80;

// Function to create a Neo4j driver
export const driver = neo4j.driver(
    config.neo4jUrl,
    neo4j.auth.basic(config.neo4jUsername, config.neo4jPassword)
);

// Middleware setup
const publicPath = path.join(__dirname, '..', 'public');

app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static(publicPath));

// Define route to serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'frontend', 'homePage.html'));
});
// Define route to serve the main page
app.get('/mainPage.html', (req, res) => {
    res.sendFile(path.join(publicPath, 'frontend', 'mainPage.html'));
});

////////////////////////////////////////////////////////////////////////////////////////
// Helper Functions

// Convert 'HH:MM' to minutes
function timeToMinutes(time) {
    if (!time) return null;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
const simplifyRouteData = (data) => {
    const vehicles = {};
    const vehiclesStartEnd = {};

    console.log('-------------------------------------\nBEFORE DATA SIMPLIFICATION:\n',data);

    data.forEach(entry => {
        // if (entry.relationshipType === "START_TO_ROUTE" || entry.relationshipType === "ROUTE_TO_END") return;

        const vehicleName = entry.nodeA.vehicleName;

        if (!vehicles[vehicleName]) {
            vehicles[vehicleName] = [];
        }
        if (!vehiclesStartEnd[vehicleName]) {
            vehiclesStartEnd[vehicleName] = {};
        }
        if (entry.relationshipType === "START_TO_ROUTE") {
            vehiclesStartEnd[entry.nodeB.vehicleName] =  {...vehiclesStartEnd[entry.nodeB.vehicleName], 'routeStart': entry.nodeA.name};
        } else if (entry.relationshipType === "ROUTE_TO_END") {
            vehiclesStartEnd[entry.nodeA.vehicleName] =  {...vehiclesStartEnd[entry.nodeA.vehicleName], 'routeEnd': entry.nodeB.name} ;
        } else {
            // check if a stop with the same name already exists
            const stopExists = (vehicle, stopName) => {
                return vehicle.some(stop => stop.name === stopName);
            };
            // Add nodeA if it doesn't already exist
            if (!stopExists(vehicles[vehicleName], entry.nodeA.name)) {
                vehicles[vehicleName].push({
                    name:           entry.nodeA.name,
                    arrivalTime:    entry.nodeA.arrivalTime,
                    startTime:      entry.nodeA.startTime,
                    endTime:        entry.nodeA.endTime,
                    streetName:     entry.nodeA.streetName,
                    streetNumber:   entry.nodeA.streetNumber,
                    latitude:       entry.nodeA.latitude,
                    longitude:      entry.nodeA.longitude
                });
            }
            // Add nodeB if it doesn't already exist and is different from nodeA
            if (entry.nodeA.name !== entry.nodeB.name && !stopExists(vehicles[vehicleName], entry.nodeB.name)) {
                vehicles[vehicleName].push({
                    name:           entry.nodeB.name,
                    arrivalTime:    entry.nodeB.arrivalTime,
                    startTime:      entry.nodeB.startTime,
                    endTime:        entry.nodeB.endTime,
                    streetName:     entry.nodeB.streetName,
                    streetNumber:   entry.nodeB.streetNumber,
                    latitude:       entry.nodeB.latitude,
                    longitude:      entry.nodeB.longitude
                });
            }
        }
    });

    return Object.keys(vehicles).map(vehicleName => ({
        vehicleName,
        stops:      vehicles[vehicleName],
        routeStart: vehiclesStartEnd[vehicleName].routeStart,
        routeEnd:   vehiclesStartEnd[vehicleName].routeEnd
    }));
};
const logRouteName = (req, res, next) => {
    if (req.path !== '/favicon.ico')    // avoid double logging
        console.log(`-----------------------------------------------------------------------------------------------------------------\n-------> ROUTE: ${req.path}\t\t${new Date().toString()}`);
    next();
}

////////////////////////////////////////////////////////////////////////////////////////
// Define routes
const router = express.Router();
app.use('/neo4j', router);
// Use the logging middleware for all routes
router.use(logRouteName);

// load nodes from neo4j and return them as a simple json object
router.get('/loadNodes', async (req, res) => {
    try {
        var session = driver.session({ database: config.neo4jDatabase });

        const fetchNodesQuery = `
            MATCH (n:Node)
            RETURN n.streetName AS streetName, n.latitude AS latitude, n.longitude AS longitude, n.streetNumber AS streetNumber, n.name AS name, n.nodeColor AS nodeColor, n.startTime AS startTime, n.endTime AS endTime, n.vehicleName AS vehicleName, n.arrivalTime AS arrivalTime
        `;

        session.run(fetchNodesQuery)
        .then(result => {
            const nodes = result.records.map(record => ({
                streetName:     record.get("streetName"),
                latitude:       record.get("latitude"),
                longitude:      record.get("longitude"),
                streetNumber:   record.get("streetNumber"),
                name:           record.get("name"),
                nodeColor:      record.get("nodeColor"),
                startTime:      record.get("startTime"),
                endTime:        record.get("endTime"),
                arrivalTime:    record.get("arrivalTime"),
                vehicleName:    record.get("vehicleName"),
            }));
            res.json(nodes);
        }).catch(error => {
            console.error("Error fetching nodes from Neo4j:", error);
            res.status(500).send('Failed to load nodes.');
        }).then(() => {
            session.close();
        })

    } catch (error) {
        console.error('Error loading nodes:', error);
        res.status(500).send('Failed to load nodes.');
    }
});

// load vehicles from neo4j and return them as a simple json object
router.get('/loadVehicles', async (req, res) => {
    try {
        var session = driver.session({ database: config.neo4jDatabase });

        const fetchVehiclesQuery = `
            MATCH (v:Vehicle)
            RETURN v.vehicleID AS vehicleID, v.capacity AS capacity, v.startNode AS startNode, v.endNode AS endNode, v.startTime AS startTime, v.endTime AS endTime
        `;

        session.run(fetchVehiclesQuery)
        .then(result => {
            const vehicles = result.records.map(record => ({
                vehicleID:  record.get("vehicleID"),
                capacity:   record.get("capacity"),
                startNode:  record.get("startNode"),
                endNode:    record.get("endNode"),
                startTime:  record.get("startTime"),
                endTime:    record.get("endTime"),
            }));
            res.json(vehicles);
        }).catch(error => {
            console.error("Error fetching vehicles from Neo4j:", error);
            res.status(500).send('Failed to load vehicles.');
        }).then(() => {
            session.close();
        })
    } catch (error) {
        console.error('Error loading vehicles:', error);
        res.status(500).send('Failed to load vehicles.');
    }
});

// load relationships between nodes from the Neo4j db
// to retrieve the routes
// as created by the openrouting service from the UI
router.get('/getRoutes', async (req, res) => {
    let nodeNames = [];
    async function loadNodeNames() {
        try {
            var session = driver.session({ database: config.neo4jDatabase });

            const fetchNodeNamesQuery = `
                MATCH (n:Node)
                RETURN n.name AS name, n.startTime AS startTime, n.endTime AS endTime, n.latitude AS latitude, n.longitude AS longitude, n.streetName AS streetName, n.streetNumber AS streetNumber
            `;
            const result = await session.run(fetchNodeNamesQuery);
            nodeNames = result.records.map(record => {
                return {
                    name:        record.get("name"), 
                    startTime:   (record.get("startTime") ? record.get("startTime") : null),                    
                    endTime:     (record.get("endTime")   ? record.get("endTime")   : null),
                    latitude:    record.get("latitude"),
                    longitude:   record.get("longitude"),
                    streetName:  record.get("streetName"),
                    streetNumber:(record.get("streetNumber") ? record.get("streetNumber") : "")
                }
            });
            await session.close();
        } catch (error) {
            console.error('Error loading nodes:', error);
            res.status(500).send('Failed to load nodes.');
        }
    }

    try {
        await loadNodeNames();

        var session = driver.session({ database: config.neo4jDatabase });
        const retrieveAllNodeRelationships = `
            MATCH (a)-[r]->(b)
            RETURN a, type(r), b
        `;
        const relationships = [];

        const result = await session.run(retrieveAllNodeRelationships);
        result.records.map(record => {
            // Extract properties from the record fields
            const a = record.get("a");
            const b = record.get("b");
            var relationshipType = record.get("type(r)");

            // Extract properties from node 'a' and 'b'
            const nodeAProperties = {
                name:        a.properties.name,
                startTime:   a.properties.startTime || null,    // set to null if not available
                endTime:     a.properties.endTime || null,
                arrivalTime: a.properties.arrivalTime,
                vehicleName: a.properties.vehicleName,
                streetName:  a.properties.streetName,
                streetNumber:a.properties.streetNumber || "",
                latitude:    a.properties.latitude,
                longitude:   a.properties.longitude,
            };
            const nodeBProperties = {
                name:        b.properties.name,
                startTime:   b.properties.startTime || null,
                endTime:     b.properties.endTime || null,
                arrivalTime: b.properties.arrivalTime,
                vehicleName: b.properties.vehicleName,
                streetName:  b.properties.streetName,
                streetNumber:b.properties.streetNumber || "",
                latitude:    b.properties.latitude,
                longitude:   b.properties.longitude,
            };
            // Construct relationship object
            const relationship = {
                nodeA: nodeAProperties,
                nodeB: nodeBProperties,
                relationshipType: relationshipType,
            };
            // Push the relationship object to the array
            relationships.push(relationship);
        });

        // Let's simplify the json - GROUP BY vehicleName
        const simplifiedData = simplifyRouteData(relationships);
        // extract all stops that are currently assigned to vehicles
        const assignedStops = new Set();
        simplifiedData.forEach(vehicle => {
            vehicle.stops.forEach(stop => {
                assignedStops.add(stop.name);
            });
        });
        // filter nodeNames to find those not included into any route
        const missingNodes = nodeNames.filter(node => !assignedStops.has(node.name));

        console.log('non assigned stops: ', missingNodes);
        
        // create new object for all the unassigned stops
        const unassignedVehicle = {
            "vehicleName": "unassigned",
            "stops": missingNodes
        };
        simplifiedData.push(unassignedVehicle);
        res.json(simplifiedData);
        await session.close();
    } catch (error) {
        console.log('Error loading all node relationships from Neo4j:', error);
        res.status(500).send('Failed to load all node relationships.');
    }
});

router.get('/getRoutesFromORS', async (req, res) => {

});

// load nodes and vehicles from neo4j & convert their info into ASP rules 
// using a matrix of each node's [longitude, latitude], find distances between all nodes & convert each distance into an ASP rule
// return all the ASP rules in the form of a REALLY big string
router.get('/retrieveASPrules', async (req, res) => {
    let locations, stopNames, postData, storedNodes;
    let durationsString = '', nodeVehicleDeclarations = '', nodesInfoString = '', vehiclesInfoString = '';
    let earliestTime = Infinity;

    // load the nodes first and append to nodesString
    async function loadNodes() {
        try {
            var session = driver.session({ database: config.neo4jDatabase });

            const fetchNodesQuery = `
                MATCH (n:Node)
                RETURN n.streetName AS streetName, n.latitude AS latitude, n.longitude AS longitude, n.streetNumber AS streetNumber, n.name AS name, n.nodeColor AS nodeColor, n.startTime AS startTime, n.endTime AS endTime, n.vehicleName AS vehicleName, n.arrivalTime AS arrivalTime
            `;
            const result = await session.run(fetchNodesQuery);
            const nodes = result.records.map(record => {
                const startTimeMinutes = timeToMinutes(record.get("startTime"));
                const endTimeMinutes   = timeToMinutes(record.get("endTime"));
                // Check and update the earliest time (only if not null)
                console.log(`TIMES (${record.get('name')})\t start:${startTimeMinutes}\t end:${endTimeMinutes}`);
                if (startTimeMinutes === null && endTimeMinutes !== null)  
                    earliestTime = Math.min(earliestTime, endTimeMinutes);
                else if (startTimeMinutes !== null && endTimeMinutes === null)
                    earliestTime = Math.min(earliestTime, startTimeMinutes);
                else if (startTimeMinutes !== null && endTimeMinutes !== null)
                    earliestTime = Math.min(earliestTime, startTimeMinutes, endTimeMinutes);

                return {
                    streetName:     record.get("streetName"),
                    latitude:       record.get("latitude"),
                    longitude:      record.get("longitude"),
                    streetNumber:   record.get("streetNumber"),
                    name:           record.get("name"),
                    startTime:      record.get("startTime"),
                    endTime:        record.get("endTime"),
                    startTimeMinutes,
                    endTimeMinutes,
                }
            });
            // Adjust all times relative to the earliest time
            storedNodes = nodes.map(node => ({
                ...node,
                startTimeMinutes:      node.startTimeMinutes - earliestTime,
                endTimeMinutes:        node.endTimeMinutes - earliestTime,
            }));

            locations = storedNodes.map(node => [node.longitude, node.latitude]);
            stopNames = storedNodes.map(node => node.name); // Extract node names
            postData = JSON.stringify({ locations });

            storedNodes.map(node => {
                nodeVehicleDeclarations += ('node('+node.name+').');
                if (node.startTime) {
                    console.log("--> node: ",node.name,"\tstart:\t ",node.startTime,"(",node.startTimeMinutes,")");
                    nodesInfoString += ('startTimeNode('+node.name+', '+node.startTimeMinutes+').');
                }
                if (node.endTime) { 
                    console.log("--> node: ",node.name,"\tendTime: ",node.endTime,"(",node.endTimeMinutes,")");
                    nodesInfoString += ('endTimeNode('+node.name+', '+node.endTimeMinutes+').');
                }
            })            
            await session.close();
        } catch (error) {
            console.error('Error loading nodes:', error);
            res.status(500).send('Failed to load nodes.');
        }
    }
    await loadNodes();

    console.log('Earliest Time (in minutes):', earliestTime); // Earliest time in minutes from midnight

    // load the vehicles next and append to vehiclesString
    async function loadVehicles() {
        try {
            var session = driver.session({ database: config.neo4jDatabase });

            const fetchVehiclesQuery = `
                MATCH (v:Vehicle)
                RETURN v.vehicleID AS vehicleID, v.capacity AS capacity, v.startNode AS startNode, v.endNode AS endNode, v.startTime AS startTime, v.endTime AS endTime
            `;
            const result = await session.run(fetchVehiclesQuery);
            const vehicles = result.records.map(record => ({
                vehicleID:  record.get("vehicleID"),
                capacity:   record.get("capacity"),
                startNode:  record.get("startNode"),
                endNode:    record.get("endNode"),
                startTime:  record.get("startTime"),
                endTime:    record.get("endTime"),
            }));
            vehicles.map(vehicle => {
                nodeVehicleDeclarations += ('vehicle(v'+vehicle.vehicleID+').');
                vehiclesInfoString += ('capacity(v'+vehicle.vehicleID+', '+vehicle.capacity+').');
                console.log("--> vehicle: v",vehicle.vehicleID,"\tcapacity: ",vehicle.capacity);
                if (vehicle.startNode && vehicle.startNode != "null") {
                    vehiclesInfoString += ('startNode(v'+vehicle.vehicleID+', '+vehicle.startNode+').');
                }
                if (vehicle.endNode && vehicle.endNode != "null") {
                    vehiclesInfoString += ('endNode(v'+vehicle.vehicleID+', '+vehicle.endNode+').');
                }
            })
        } catch (error) {
            console.error('Error loading vehicles:', error);
            res.status(500).send('Failed to load vehicles.');
        }
    }
    await loadVehicles();

    const nenaApiKey = config.nenaORSkey;
    const options = {
        hostname: 'api.openrouteservice.org',
        path: '/v2/matrix/driving-car',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
            'Authorization': nenaApiKey
        }
    };
    const request = https.request(options, (response) => {
        let data = '';

        // A chunk of data has been received.
        response.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received.
        response.on('end', () => {
            if (response.statusCode === 200) {
                const jsondata   = JSON.parse(data);
                const durations  = jsondata.durations;
                const numOfNodes = JSON.parse(postData).locations.length;
                console.log('---> Number of nodes: ',numOfNodes);
                let startNode = '', endNode = '';
                for (let i=0; i<durations.length; i++) {
                    startNode = stopNames[i];
                    for (let j=0; j<durations[i].length; j++) {
                        endNode = stopNames[j];
                        let minutes = Math.ceil(durations[i][j] / 60);
                        // console.log('row: ', i, ', col:', j, "\t", durations[i][j], "\tmin: ",minutes, "\tfrom: ",startNode, ", to: ",endNode);
                        durationsString += ('distance('+startNode+', '+endNode+', '+minutes+').');
                    }
                }
                res.json({durations,rulesString: (nodeVehicleDeclarations+nodesInfoString+vehiclesInfoString+durationsString)});
            } else {
                console.log(response.statusCode,"\n",postData);
                res.status(response.statusCode).send('Failed to load matrix with distances between nodes, from OpenRouting Service.');
            }
        });
    });

    request.on('error', (error) => {
        console.error('Error loading distances matrix from OpenRouting Service:', error);
        res.status(500).send('Failed to load matrix with distances between nodes, from OpenRouting Service.');
    });

    // Write the data to the request body
    request.write(postData);
    request.end();
});

// run the python script that gets the results for each route from clingo
// the python script calls the "retrieveASPrules" service (below) to get its input
router.get('/runPythonScript', async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, 'clingoFiles');
        const lpFilePath = path.join(scriptPath, 'nemoRouting4AdoXX.lp');

        console.log('Script Path:', scriptPath);

        // Check if the .lp file exists
        if (!fs.existsSync(lpFilePath)) {
            console.error(`Error: File ${lpFilePath} does not exist.`);
            return res.status(500).send(`Error: File ${lpFilePath} does not exist.`);
        }

        let options = {
            scriptPath: scriptPath, // Specify the path to your script
            args: [lpFilePath]
        };
        PythonShell.run("nemoClingoRouting.py", options, function (err, results) {
            if (err) {
                console.error('Error:', err);
                res.status(500).send(err);
            } else {
                // Log the output from the Python script
                console.log('Python script output:', results.join('\n'));
                res.json({ output: results });
            }
        });
    } catch (error) {
        console.error('Error in runPythonScript:', error);
        res.status(500).send('Error in runPythonScript');
    }
});

// delete all nodes from db
router.delete('/deleteAllNodes', async (req, res) => {
    try {
        var session = driver.session({ database: config.neo4jDatabase });

        const deleteAllNodesQuery = "MATCH (n:Node) DETACH DELETE n";

        const result = await session.run(deleteAllNodesQuery);
        await session.close();
        res.status(200).json({ message: 'All nodes deleted successfully' });
    } catch (error) {
        console.error('Error deleting nodes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// delete all vehicles from db
router.delete('/deleteAllVehicles', async (req, res) => {
    try {
        const session = driver.session({ database: config.neo4jDatabase });

        const deleteAllVehiclesQuery = "MATCH (v:Vehicle) DETACH DELETE v";

        const result = await session.run(deleteAllVehiclesQuery);
        await session.close();
        res.status(200).json({ message: 'All vehicles deleted successfully' });
    } catch (error) {
        console.error('Error deleting nodes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


////////////////////////////////////////////////////////////////////////////////////////
// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
