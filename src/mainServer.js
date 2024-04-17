// with the esm module, we can now have import and require at the same file!
// import { driver } from './mainClient';
import * as config from './configApis/config';
import neo4j from 'neo4j-driver';
import express from 'express';
import path from 'path';


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

router.get('/createNode', async (req, res) => {
    res.send('Create Node');
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
