// with the esm module, we can now have import and require at the same file!
import express from 'express';
import path from 'path';
// import neo4jRoutes from './src/routes/neo4jRoutes'; // Import your Neo4j routes module

const app = express();
const port = process.env.PORT || 3000;

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

// Define routes
// app.use('/neo4j', neo4jRoutes); // Mount your Neo4j routes under the '/neo4j' prefix

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
