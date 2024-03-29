import * as L from 'leaflet'; 
// import neo4j from 'neo4j-driver';
import * as mapConfig from './mapConfig.js';
// import {} from "./vehicleConf.js";
import * as config from './configApis/config';
import { driver } from './mainServer.js';
import { showMessage, secondsToHours, convertTimeToSeconds, getIconClass, getSurfaceType, 
    checkIfmyNodeNameIsUnique, getNearestHighway, customAlert, isMarkerEqual } from "./tools.js";


// Function to create a Neo4j driver
// export const driver = neo4j.driver(
//     config.neo4jUrl,
//     neo4j.auth.basic(config.neo4jUsername, config.neo4jPassword)
// );

////////////////////////////////////////////////////////////////////////////////////////
// constants and variables
const apiKey = config.apiKey;

let typeStartArray=[];
let typeEndArray=[];

let currentRoute=[]; // Store the reference to the current route
let arrow=[];
export const nodesConf = {
endNodesAr :[],
startNodesAr :[],
};
export let availableNodes = [];
export const nodesMarkerConf = {
    nodeMarkers : [],
};
let specificLogOutput = '';     
export const sharedData = {
    deleteStartEnd: 0,
};

const map = L.map("map", { zoomControl: false }).setView([35.338735, 25.144213], 13);

L.control
    .zoom({
        position: "bottomright",
    })
    .addTo(map);

const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

////////////////////////////////////////////////////////////////////////////////////////


// Function to fetch nodes from the server
export async function loadNodesFromServer() {
    return new Promise((resolve, reject) => {
        // Make an AJAX GET request to load nodes from the server
        fetch('/neo4j/loadNodes')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load nodes');
                }
                return response.json();
            })
            .then(nodes => {
                // Process the nodes data
                resolve(nodes);
            })
            .catch(error => {
                reject(error);
            });
    });
    // try {
    //     const response = await fetch('/neo4j/loadNodes'); // Fetch data from server
    //     const nodes = await response.json(); // Extract JSON data
    //     // Process nodes and create Leaflet markers
    //     nodes.forEach(node => {
    //         // Create Leaflet marker using node data and mapConfig
    //         const marker = L.marker([node.latitude, node.longitude], {
    //             icon: mapConfig.getNodeIcon(node.nodeColor),
    //             // Set other marker properties
    //         }).addTo(map); // Assuming `map` is already defined
    //         // Add marker to some array or collection if needed
    //     });
    // } catch (error) {
    //     console.error("Error fetching nodes from server:", error);
    // }
}
// Function to load nodes as markers
export function loadNodesFromNeo4j() {
    // Clear existing node markers from the map
    nodesMarkerConf.nodeMarkers.forEach(marker => marker.remove());
    nodesMarkerConf.nodeMarkers.length = 0;

    loadNodesFromServer()
        .then(nodes => {
            console.log('Nodes loaded successfully:', nodes);

        }).catch(error => {
            console.error('Error loading nodes:', error);
        });

    // return new Promise((resolve, reject) => {
    //     session
    //         .run(fetchNodesQuery)
    //         .then(result => {
    //             const nodes = [];
    //             // Process the result and create markers for each node
    //             result.records.forEach(record => {
    //                 const streetName    = record.get("streetName");
    //                 const latitude      = record.get("latitude");
    //                 const longitude     = record.get("longitude");
    //                 const streetNumber  = record.get("streetNumber");
    //                 const name          = record.get("name");
    //                 const nodeColor     = record.get("nodeColor");
    //                 const startTime     = record.get("startTime");
    //                 const endTime       = record.get("endTime");
    //                 const arrivalTime   = record.get("arrivalTime");
    //                 const vehicleName   = record.get("vehicleName");

    //                 // Check if the latitude and longitude are valid numbers
    //                 if (!isNaN(latitude) && !isNaN(longitude)) {
    //                     let icon;

    //                     if (nodeColor === null) {
    //                         icon = mapConfig.redIcon; 
    //                     } else if (nodeColor === "yellow" ) {
    //                         icon = mapConfig.yellowIcon; 
    //                     } else if ( nodeColor === "green" ) {
    //                         icon = mapConfig.greenIcon; 
    //                     } else if ( nodeColor === "orange") {
    //                         icon = mapConfig.orangeIcon; 
    //                     } else {
    //                         // Default icon for any other case
    //                         icon = mapConfig.redIcon;
    //                     }

    //                     const formatValue = value => (value !== null && value !==""&& value !=="null" ? value : "-");
    //                     const marker = L.marker([latitude, longitude], {
    //                         icon:           icon,
    //                         name:           name,
    //                         streetName:     streetName,
    //                         streetNumber:   streetNumber,
    //                         nodeColor:      nodeColor,
    //                         startTime:      startTime,
    //                         endTime:        endTime,
    //                         arrivalTime:    arrivalTime, 
    //                         vehicleName:    vehicleName,
    //                     })
    //                     .addTo(map)
    //                     .bindPopup(name)
    //                     .bindTooltip(
    //                         `<strong>Stop Name:</strong> ${formatValue(name)}<br>` +
    //                         `<strong>Street Name:</strong> ${formatValue(streetName)}<br>` +
    //                         `<strong>Street Number:</strong> ${formatValue(streetNumber)}<br>` +
    //                         `<strong>Start Time:</strong> ${formatValue(startTime)}<br>` +
    //                         `<strong>End Time:</strong> ${formatValue(endTime)}<br>` +
    //                         `<strong>vehicle Name:</strong> ${formatValue(vehicleName)}<br>`+
    //                         `<strong>Arrival Time:</strong> ${formatValue(arrivalTime)}<br>`
    //                     );

    //                     if (!nodesMarkerConf.nodeMarkers.some(existingMarker => isMarkerEqual(existingMarker, marker))) {
    //                         nodesMarkerConf.nodeMarkers.push(marker);
    //                     }

    //                     // Push node data to nodes array
    //                     nodes.push({
    //                         streetName:     streetName,
    //                         latitude:       latitude,
    //                         longitude:      longitude,
    //                         streetNumber:   streetNumber,
    //                         name:           name,
    //                         nodeColor:      nodeColor,
    //                         startTime:      startTime,
    //                         endTime:        endTime,
    //                         arrivalTime:    arrivalTime,
    //                         vehicleName:    vehicleName,
    //                     });
    //                 }
    //             });
    //             // Resolve the promise with the nodes array
    //             resolve(nodes);
    //         })
    //         .catch(error => {
    //             // Reject the promise with the error
    //             reject(error);
    //         })
    //         .then(() => {
    //             session.close();
    //         });
    // });
}
