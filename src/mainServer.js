// with the esm module, we can now have import and require at the same file!
// import { driver } from './mainClient';
import * as config from './configApis/config';
import neo4j from 'neo4j-driver';
import express from 'express';
import path from 'path';
import https from 'https';

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
// Define routes
const router = express.Router();
app.use('/neo4j', router);

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

const simplifyRouteData = (data) => {
    const vehicles = {};

    data.forEach(entry => {
        if (entry.relationshipType === "START_TO_ROUTE" || entry.relationshipType === "ROUTE_TO_END") return;

        const vehicleName = entry.nodeA.vehicleName;

        if (!vehicles[vehicleName]) {
            vehicles[vehicleName] = [];
        }
        // check if a stop with the same name already exists
        const stopExists = (vehicle, stopName) => {
            return vehicle.some(stop => stop.name === stopName);
        };
        // Add nodeA if it doesn't already exist
        if (!stopExists(vehicles[vehicleName], entry.nodeA.name)) {
            vehicles[vehicleName].push({
                name: entry.nodeA.name,
                arrivalTime: entry.nodeA.arrivalTime,
                // relationshipType: entry.relationshipType
            });
        }
        // Add nodeB if it doesn't already exist and is different from nodeA
        if (entry.nodeA.name !== entry.nodeB.name && !stopExists(vehicles[vehicleName], entry.nodeB.name)) {
            vehicles[vehicleName].push({
                name: entry.nodeB.name,
                arrivalTime: entry.nodeB.arrivalTime,
                // relationshipType: entry.relationshipType
            });
        }
    });

    return Object.keys(vehicles).map(vehicleName => ({
        vehicleName,
        stops: vehicles[vehicleName]
    }));
};

router.get('/getRoutes', async (req, res) => {
    try {
        var session = driver.session({ database: config.neo4jDatabase });

        const retrieveAllNodeRelationships = `
            MATCH (a)-[r]->(b)
            RETURN a, type(r), b
        `;

        const relationships = [];

        session.run(retrieveAllNodeRelationships)
        .then(result => {
            const relationships = [];

            result.records.map(record => {
                // Extract properties from the record fields
                const a = record.get("a");
                const b = record.get("b");
                var relationshipType = record.get("type(r)");

                // Extract properties from node 'a' and 'b'
                const nodeAProperties = {
                    name: a.properties.name,
                    arrivalTime: a.properties.arrivalTime,
                    vehicleName: a.properties.vehicleName,
                    // Add more properties as needed
                };
                const nodeBProperties = {
                    name: b.properties.name,
                    arrivalTime: b.properties.arrivalTime,
                    vehicleName: b.properties.vehicleName,
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
            
            res.json(simplifiedData);
        }).catch(error => {
            console.error("Error fetching all node relationships from Neo4j:", error);
            res.status(500).send('Failed to load all node relationships.');
        }).then(() => {
            session.close();
        })
    } catch (error) {
        console.log('Error loading all node relationships:', error);
        res.status(500).send('Failed to load all node relationships.');
    }
});

router.get('/getMatrix', async (req, res) => {
    var durationsString = '';
    const nenaApiKey = config.nenaORSkey;
    const stopNames = ['stop1', 'stop2', 'stop3', 'stop4', 'stop6'];
    const postData = JSON.stringify({
        locations: [    // [longitude, latitude]
            [25.136901140213, 35.3326149286569],    // stop1 - Nταλιάνη
            [25.1362144947052, 35.3309956674026],   // stop2 - Παπανδρέου Γεωρ. 39
            [25.1352274417877, 35.3317659146393],   // stop3 - Κνωσσού Λ. 2
            [25.1352488994598, 35.3325011437906],   // stop4 - Ζερβουδάκη
            [25.1376092433929, 35.3324223695586]    // stop6 - Δρακοντοπούλου
        ]
    });

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
                console.log(durations);
                console.log('--- Number of nodes: ',numOfNodes);
                let startNode = '', endNode = '';
                for (let i=0; i<durations.length; i++) {
                    startNode = stopNames[i];
                    for (let j=0; j<durations[i].length; j++) {
                        endNode = stopNames[j];
                        let minutes = Math.ceil(durations[i][j] / 60);
                        // if (minutes === '0.00') minutes = '0';
                        console.log('row: ', i, ', col:', j, "\t", durations[i][j], "\tmin: ",minutes, "\tfrom: ",startNode, ", to: ",endNode);
                        durationsString += ('distance('+startNode+', '+endNode+', '+minutes+').');
                    }
                }
                console.log(durationsString);
                res.json({durations,durationsString});
            } else {
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
