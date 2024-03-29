
import { driver } from "./mainClient.js"
import * as config from './configApis/config.js';

export function convertTimeToSeconds(time) {
    console.log('time : ', time);
    const parts = time.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    console.log(hours * 3600 + minutes * 60);
    return hours * 3600 + minutes * 60;
}
    
export function secondsToHours(seconds) {
    if (typeof seconds !== 'number' || seconds < 0) {
        return 'Invalid input';
    }
    const hours = Math.floor(seconds / 3600);
    const remainingSeconds = seconds % 3600;
    const minutes = Math.floor(remainingSeconds / 60);
    const remainingSecondsAfterMinutes = remainingSeconds % 60;
    // Ensure leading zeros for single-digit hours, minutes, and seconds
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = remainingSecondsAfterMinutes.toString().padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

// Function to display a message in the message window
export function showMessage(message,durationInSeconds) {
    var popupModal = document.getElementById('popupModal');
    var popupMessageContent = document.getElementById('popupMessageContent');

    // Set the message content
    popupMessageContent.innerHTML = message;
    // Show the pop-up modal
    popupModal.style.display = 'block';
    // Automatically close the modal after the specified duration
    setTimeout(function () {
      popupModal.style.display = 'none';
    }, durationInSeconds * 1000); // Convert seconds to milliseconds
}

// Function to determine the icon class based on nodeColor
export function getIconClass(nodeColor) {
    if (nodeColor === 'yellow') {
        return 'icon-yellow';
    } else if (nodeColor === 'green') {
        return 'icon-green';
    } else if (nodeColor === 'orange') {
        return 'icon-orange';
    } else {
        return 'icon-red'; // Default icon class if color is null or other values
    }
}

// Function to get surface information using the Overpass API
export function getSurfaceType(latitude, longitude) {
    const overpassURL = `https://overpass-api.de/api/interpreter?data=[out:json];way(around:1,${latitude},${longitude})[highway][surface];out;`;
  
    return fetch(overpassURL)
        .then(response => response.json())
        .then(data => {
            if (data && data.elements.length > 0) {
                const way = data.elements[0];
                const surfaceType = way.tags.surface;
                const highwayType = way.tags.highway;

                if ((surfaceType && (surfaceType.toLowerCase().includes("asphalt") || surfaceType.toLowerCase().includes("paving_stones")||surfaceType.toLowerCase().includes("paving_stones")))||(highwayType)) {
                    return 1;
                } else  { return null; }
            } else      { return null; }
        }).catch(error => {
            console.error("Error fetching surface type:", error);
            return null;
        });
}

export function getNearestHighway(lat, lng) {
    const nominatimURL = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    return fetch(nominatimURL)
        .then(response => response.json())
        .then(data => {
        // Check if address details are available
        if (data && data.address) {
            const roadName = data.address.road || "";
            const roadNumber = data.address.house_number || "";
            // Combine road name and road number, if available
            const nearestHighway = roadNumber ? `${roadName} ${roadNumber}` : roadName;
            // Return the nearest highway
            return nearestHighway;
        } else {
            return null; // No data or address details found
        }
        }).catch(error => {
            console.error("Error fetching nearest highway:", error);
            return null;
        });
}

export function fetchNearestHighway() {
    return new Promise((resolve, reject) => {
        // Simulate an asynchronous request
        setTimeout(() => {
            // Replace this with your actual data fetching logic
            const nearestHighway1 = "Βενιζέλου Σοφ. Λ.";
            
            // Resolve the Promise with the fetched value
            resolve(nearestHighway1);
        }, 1000); // Simulate a 1-second delay
    });
}

export async function checkIfmyNodeNameIsUnique(name) {
    var session = driver.session({ database: config.neo4jDatabase });
    const checkQuery = `
        MATCH (n:Node {name: $name})
        RETURN COUNT(n) AS count
    `;
  
    try {
        const result = await session.run(checkQuery, { name: name });
        const count = result.records[0].get("count").toNumber();
        return count; // Return the count directly
    } catch (error) {
        console.error("Error checking name uniqueness:", error);
        return -1; // Return a value indicating an error
    } finally {
        session.close();
    }
}

export function isMarkerEqual(marker1, marker2) {
    // Compare markers based on your criteria
    return (
        marker1.options.name === marker2.options.name &&
        marker1.options.latitude === marker2.options.latitude &&
        marker1.options.longitude === marker2.options.longitude
        // Remove the trailing comma after the last condition
    );
}

// Function to check if at least one timeWindowStart or timeWindowEnd is selected for a vehicle
export function isBothTimeWindowSelected(vehicleIndex) {
    const timeWindowStartInput = document.querySelector(`#timeWindowStart${vehicleIndex}`);
    const timeWindowEndInput = document.querySelector(`#timeWindowEnd${vehicleIndex}`);

    if (timeWindowStartInput.value !== "" && timeWindowEndInput.value === ""  ){
        return 1;
    } else if (timeWindowStartInput.value === "" && timeWindowEndInput.value !== ""){
        return 2;
    } else return 0;
}
  
  
// Function to check if at least one startNode or endNode is selected
export function isAtLeastOneNodeSelected(vehicleIndex) {
    const endNodeSelect = document.querySelector(`select[name="endNode${vehicleIndex}"]`);
    const startNodeSelect = document.querySelector(`select[name="startNode${vehicleIndex}"]`);

    // Check if either endNode or startNode for the specified vehicle has a value
    return endNodeSelect.value !== "" || startNodeSelect.value !== "";
}

export function getTextColor(vehicleNumber) {
    switch (vehicleNumber) {
        case 1:
        return '#FFD700'; // yellow vehicle 1
        case 2:
        return 'green'; // Green text color for vehicle 2
        case 3:
        return 'orange'; // Orange text color for vehicle 3
        default:
        return ''; // Default text color for other values of i
    }
}

export function resetVehicleConfigForm() {
    // Reset the form to its initial state
    document.getElementById("vehicleConfigForm").reset();
    // Hide the input fields for capacity, time window, and end node selection
    document.getElementById("vehicleConfigs").style.display = "none";
}

export  function customAlert(message) {
    // Get the custom warning elements
    const customWarning = document.getElementById('customWarning');
    const customWarningMessage = document.getElementById('customWarningMessage');
    const customWarningCloseButton = document.getElementById('customWarningCloseButton');

    // Set the message
    customWarningMessage.innerText = message;
    // Display the custom warning
    customWarning.style.display = 'flex';
    // Close the warning when OK button is clicked
    customWarningCloseButton.addEventListener('click', function() {
        customWarning.style.display = 'none';
    });
}
