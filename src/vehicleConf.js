
import { 
    resetVehicleConfigForm, isBothTimeWindowSelected, isAtLeastOneNodeSelected, getTextColor,
    showMessage, convertTimeToSeconds, customAlert } 
    from "./tools.js"
// import { routingOpenService, resetNodes, sharedData, nodesConf, availableNodes } from "./mainClient.js"

let originalFieldValues = {}; // Object to store original field values
let confNumVeh=0;


// Function to generate input fields for capacity, time window, and end node selection
// function generateVehicleConfigFields(numVehicles, availableNodes) {
  
//     // Clear any previous vehicle configuration form elements
//     document.getElementById("vehicleConfigs").innerHTML = "";

//     // Create input fields for each vehicle
//     for (let i = 1; i <= numVehicles; i++) {
//         const vehicleConfigDiv = document.createElement("div");

//         vehicleConfigDiv.className = "vehicle-config"; 

//         // Retrieve the original values or initialize them if not in edit mode
//         const originalCapacity = originalFieldValues[`capacity${i}`];
//         const capacityValue = originalCapacity !== undefined ? originalCapacity : 1; // Set default capacity to 0
//         const originalTimeWindowStart = originalFieldValues[`timeWindowStart${i}`] || "";
//         const originalTimeWindowEnd = originalFieldValues[`timeWindowEnd${i}`] || "";
//         const originalEndNode = originalFieldValues[`endNode${i}`] || ""; // Store the selected end node ID
//         const originalStartNode = originalFieldValues[`startNode${i}`] || ""; // Store the selected start node ID

//         vehicleConfigDiv.innerHTML = `
//             <div class="label" style="color: ${getTextColor(i)}">Vehicle ${i} Configuration:</div>
//             <div class="form-group">
//                 <label for="capacity${i}">Total amount to handle:</label>
//                 <input type="number" id="capacity${i}" name="capacity${i}" required min="0" value="${capacityValue}">
//             </div>

//             <label for="timeWindowStart${i}">Time Window</label>
//             <div class="form-group time-window-group">
//                 <div class="time-label">Start:</div>
//                 <input type="time" id="timeWindowStart${i}" name="timeWindowStart${i}" value="${originalTimeWindowStart}">
//                 <div class="time-label">End:</div>
//                 <input type="time" id="timeWindowEnd${i}" name="timeWindowEnd${i}" value="${originalTimeWindowEnd}">
//             </div>
//             <div class="form-group node-group">
//                 <div class="node-label">Select Start Stop:</div>
//                 <select id="startNode${i}" name="startNode${i}">
//                     <option value="" ${originalStartNode ? "" : "selected"}>Choose a start stop</option>
//                     ${availableNodes
//                         .map(
//                         (node) =>
//                             `<option value="${node.name}" ${
//                             node.name === originalStartNode ? "selected" : ""
//                             }>${node.name}</option>`
//                         )
//                         .join("")}
//                 </select>
//             </div>
//             <div class="form-group node-group">
//                 <div class="node-label">Select End Stop:</div>
//                 <select id="endNode${i}" name="endNode${i}">
//                     <option value="" ${originalEndNode ? "" : "selected"}>Choose an end stop</option>
//                     ${availableNodes
//                         .map(
//                         (node) =>
//                             `<option value="${node.name}" ${
//                             node.name === originalEndNode ? "selected" : ""
//                             }>${node.name}</option>`
//                         )
//                         .join("")}
//                 </select>
//             </div>
//         `;

//         // Add CSS styles to align all input fields to the left
//         vehicleConfigDiv.style.textAlign = "left";

//         document.getElementById("vehicleConfigs").appendChild(vehicleConfigDiv);
//     }
// }


// opening the vehicle configuration modal
// document.getElementById("openConfigButton").addEventListener("click", function () {
//     const modal = document.getElementById("vehicleConfigModal");
//     modal.style.display = "block";

//     // Initially, show the input fields for capacity and time window as editable
//     document.getElementById("vehicleConfigs").style.display = "block";

//     // Store the original field values
//     storeOriginalFieldValues();

//     // Retrieve the number of vehicles
//     const numVehiclesInput = document.getElementById("numVehicles");
//     const numVehicles = parseInt(numVehiclesInput.value);

//     // Generate the input fields based on the number of vehicles and available nodes
//     generateVehicleConfigFields(numVehicles, availableNodes);
// });

// Function to store original field values
function storeOriginalFieldValues() {
    originalFieldValues = {};
    // Loop through the fields and store their values
    const numVehiclesInput = document.getElementById("numVehicles");
    const numVehicles = parseInt(numVehiclesInput.value);
    for (let i = 1; i <= numVehicles; i++) {
        originalFieldValues[`capacity${i}`] = document.getElementById(`capacity${i}`).value;
        originalFieldValues[`timeWindowStart${i}`] = document.getElementById(`timeWindowStart${i}`).value;
        originalFieldValues[`timeWindowEnd${i}`] = document.getElementById(`timeWindowEnd${i}`).value;
        originalFieldValues[`endNode${i}`] = document.getElementById(`endNode${i}`).value;
        originalFieldValues[`startNode${i}`] = document.getElementById(`startNode${i}`).value;
    }
}

// window.addEventListener("load", function () {
//     resetNodes();
//     resetVehicleConfigForm();
//     originalFieldValues = {};
// });

// const numVehiclesInput = document.getElementById("numVehicles");
const maxVehicles = 3; // Set the maximum number of vehicles

// numVehiclesInput.addEventListener("input", function () {
//     let numVehicles = parseInt(this.value);

//     // Check if the number of vehicles exceeds the maximum
//     if (numVehicles < 0) {
//         numVehicles = 0; // Set to 0 if the value is negative
//         this.value = numVehicles; // Update the input field value
//     } else if (numVehicles > maxVehicles) {
//         numVehicles = maxVehicles; // Limit the number of vehicles to the maximum
//         this.value = numVehicles; // Update the input field value
//     }

//     if (numVehicles > 0) {
//         // Show the input fields for capacity, time window, and end node selection
//         document.getElementById("vehicleConfigs").style.display = "block";
//         // Generate the input fields based on the number of vehicles and available nodes
//         generateVehicleConfigFields(numVehicles, availableNodes);
//     } else {
//         // Hide the input fields if the number of vehicles is not valid
//         document.getElementById("vehicleConfigs").style.display = "none";
//     }
// });

let goRoute=0;
let vehicleConfigurations = [];

//for handling the form submission
// document.getElementById("vehicleConfigForm").addEventListener("submit", function (e) {
//     nodesConf.startNodesAr=[];
//     nodesConf.endNodesAr=[];
//     e.preventDefault();
//     const numVehicles = document.getElementById("numVehicles").value;

//     if (numVehicles<=0){
//         confNumVeh=1;
//     } else {
//         confNumVeh=0;
//     }
//     vehicleConfigurations = [];
//     let check=0;

//     // Retrieve and process vehicle configuration data from the form
//     for (let i = 1; i <= numVehicles; i++) {
//         if (!isAtLeastOneNodeSelected(i)  ) {
//             customAlert(`Please select at least one stop (start or end) for Vehicle ${i} before proceeding.`);
//             check=1;
//         } else if(isBothTimeWindowSelected(i)===1){
//             customAlert(`Please provide a value for Time Window End for Vehicle ${i}.`);
//             check=1;
//         } else if(isBothTimeWindowSelected(i)===2){
//             customAlert(`Please provide a value for Time Window Start for Vehicle ${i}.`);
//             check=1;
//         } else {
//             goRoute=1;
//             sharedData.deleteStartEnd=0;
//             check=0;

//             const id= i;
//             const capacity = parseInt(document.getElementById(`capacity${i}`).value);
//             const timeWindowStart = document.getElementById(`timeWindowStart${i}`).value;
//             const timeWindowEnd = document.getElementById(`timeWindowEnd${i}`).value;
//             const endNode = document.getElementById(`endNode${i}`).value;
//             const startNode = document.getElementById(`startNode${i}`).value;

//             nodesConf.startNodesAr.push(startNode);
//             nodesConf.endNodesAr.push(endNode);

//             // Check if both timeWindowStart and timeWindowEnd are specified
//             let  hasTimeWindow ;

//             if ((convertTimeToSeconds(timeWindowStart)<=convertTimeToSeconds(timeWindowEnd))){
//                 hasTimeWindow = timeWindowStart && timeWindowEnd;
//             } else if (!timeWindowStart && !timeWindowEnd){
//                 hasTimeWindow=null;
//             } else{
//                 customAlert("The time Window start must be earlier than time Window end.");
//                 return;
//             }
//             // Create the vehicle configuration object
//             const config = { capacity, id, };
//             if (endNode && startNode){
//                 config.start_node = startNode; 
//                 config.end_node = endNode;
//             } else if (startNode ){
//                 config.start_node = startNode;
//             } else {
//                 config.end_node = endNode;
//             }
//             // Push time_window if both start and end are specified
//             if (hasTimeWindow) {
//                 config.time_window = [
//                 convertTimeToSeconds(timeWindowStart),
//                 convertTimeToSeconds(timeWindowEnd),
//                 ];
//             }
//             // Push each vehicle configuration to the array
//             vehicleConfigurations.push(config);
//         }
//     }

//     if(check ===0 && numVehicles>0){
//         // Close the modal
//         const modal = document.getElementById("vehicleConfigModal");
//         modal.style.display = "none";
//     } else {
//         resetNodes();
//     }
  
// });

// Event listener for the "Calculate Route" button
// document.getElementById("findroutes").addEventListener("click", function () {
//     if (sharedData.deleteStartEnd===1){
//         showMessage("You have deleted Start or End stop .Please complete the Vehicle Configuration again",3);
//     } else if (confNumVeh===1){
//         showMessage("Please complete the Vehicle Configuration for Routing",2);
//     } else if (goRoute===1){
//         routingOpenService(vehicleConfigurations);
//     } else {
//         showMessage("Please complete the Vehicle Configuration for Routing",2);
//     }
// });
