// with the esm module, we can now have import and require at the same file!
// import { driver } from './mainClient';
import * as config from './configApis/config';
import neo4j from 'neo4j-driver';
import express from 'express';
import path from 'path';


const app = express();
const port = process.env.PORT || 3000;

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

router.get('/loadNodes', async (req, res) => {
    // Call loadNodesFromNeo4j and handle the promise
    try {
        // await loadNodesFromNeo4j();
        var session = driver.session({ database: config.neo4jDatabase });

        const fetchNodesQuery = `
            MATCH (n:Node)
            RETURN n.streetName AS streetName, n.latitude AS latitude, n.longitude AS longitude, n.streetNumber AS streetNumber, n.name AS name ,  n.nodeColor AS nodeColor ,n.startTime AS startTime,n.endTime AS endTime,n.vehicleName AS  vehicleName ,  n.arrivalTime AS arrivalTime
        `;

        session.run(fetchNodesQuery)
        .then(result => {
            const nodes = result.records.map(record => ({
                streetName: record.get("streetName"),
                latitude: record.get("latitude"),
                longitude: record.get("longitude"),
                streetNumber: record.get("streetNumber"),
                name: record.get("name"),
                nodeColor: record.get("nodeColor"),
                startTime: record.get("startTime"),
                endTime: record.get("endTime"),
                arrivalTime: record.get("arrivalTime"),
                vehicleName: record.get("vehicleName"),
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


////////////////////////////////////////////////////////////////////////////////////////
// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
