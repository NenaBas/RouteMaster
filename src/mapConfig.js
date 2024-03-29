/* if you want to set View by the location

const map = L.map("map", { zoomControl: false });

// Check if the user's browser supports geolocation
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function (position) {
    const userLocation = [position.coords.latitude, position.coords.longitude];
    map.setView(userLocation, 13);

    // Add a marker at the user's location if desired
    // L.marker(userLocation).addTo(map);
    });
} else {
    // Fallback in case geolocation is not supported
    map.setView([35.338735, 25.144213], 13);
}

L.control
    .zoom({
    position: "bottomright",
    })
    .addTo(map);*/

export const redIcon = new L.Icon({
    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
export const yellowIcon = new L.Icon({
    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
export const greenIcon = new L.Icon({
    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
export  const orangeIcon = new L.Icon({
    iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});
