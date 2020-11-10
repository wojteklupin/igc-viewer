let svgMarkup = 
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" width="32" height="32" viewBox="0 0 263.335 263.335" style="enable-background:new 0 0 263.335 263.335;" xml:space="preserve">' +
    '<g>' +
    '<g xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M40.479,159.021c21.032,39.992,49.879,74.22,85.732,101.756c0.656,0.747,1.473,1.382,2.394,1.839   c0.838-0.396,1.57-0.962,2.178-1.647c80.218-61.433,95.861-125.824,96.44-128.34c2.366-9.017,3.57-18.055,3.57-26.864    C237.389,47.429,189.957,0,131.665,0C73.369,0,25.946,47.424,25.946,105.723c0,8.636,1.148,17.469,3.412,26.28" fill="{COLOR}"/>' +
    '</g>' +
    '</g></svg>';

function showData(igcContent, map) {
    igcContent = igcContent.split("\r\n");
    let firstBVisited = false;

    let startTime;
    let endTime;
    let totalDist = 0;
    let maxSpeed = 0;

    let maxAlt = 0;
    let minAlt;
    let startAlt;
    let endAlt;

    let startLat, startLon;
    let prevLat, prevLon, currLat, currLon;
    let lineString = new H.geo.LineString();
    
    for (let i = 0; i < igcContent.length; i++) {
        let line = igcContent[i];
        switch (line[0]) {
            case "H":
                let value;
                switch (line.slice(2, 5)) {
                    case "PLT":
                        value = line.slice(5);
                        value = value.split(":")[1].trim();
                        document.getElementById("personName").innerHTML = value !== "" ? value : "Anonim";
                        break;
                    
                    case "DTE":
                        value = line.slice(5);
                        let arr = value.split(":");

                        value = arr[arr.length - 1]
                                .trim()
                                .slice(0,6);

                        let date = String(+value.slice(0, 2)) + "." + value.slice(2,4) + ".20" + value.slice(4);
                        document.getElementById("date").innerHTML = date;
                }
                break;

            case "B":
                endTime = line.slice(1, 7);

                let alt = +line.slice(30, 35);
                endAlt = alt;
                if (alt > maxAlt) maxAlt = alt;
                if (alt < minAlt) minAlt = alt;
    
                prevLat = currLat;
                prevLon = currLon;

                if (line[14] == "N")
                    currLat = Number(line.slice(7, 9)) + (line.slice(9, 14) / 60000);
                else
                    currLat = -( Number(line.slice(7, 9)) + (line.slice(9, 14) / 60000) );
                if (line[23] == "E")
                    currLon = Number(line.slice(15, 18)) + (line.slice(18, 23) / 60000);
                else
                    currLon = -( Number(line.slice(15, 18)) + (line.slice(18, 23) / 60000) );

                lineString.pushPoint({lat: currLat, lng: currLon});

                if (prevLat !== undefined) {
                    let dist = getDist(prevLat, prevLon, currLat, currLon);
                    totalDist += dist;

                    let speed = dist*3600;
                    if (speed > maxSpeed) {
                        maxSpeed = speed;
                    }
                }

                if (!firstBVisited) {
                    startTime = line.slice(1, 7);
                    startTime = startTime.slice(0, 2) + ":" + startTime.slice(2,4) + ":" + startTime.slice(4, 6);
                    startAlt = +line.slice(30, 35);
                    minAlt = startAlt;
                    
                    startLat = currLat;
                    startLon = currLon;

                    firstBVisited = true;
                }
        }
    }

    document.getElementById("altDiff").innerHTML = (maxAlt - minAlt) + "m";
    document.getElementById("maxAlt").innerHTML = maxAlt + "m";
    document.getElementById("minAlt").innerHTML = minAlt + "m";
    document.getElementById("startAlt").innerHTML = startAlt + "m";
    document.getElementById("landAlt").innerHTML = endAlt + "m";

    endTime = endTime.slice(0, 2) + ":" + endTime.slice(2,4) + ":" + endTime.slice(4, 6);
    let timeDiff = getTimeDiff(startTime, endTime);
    let timeInHours = +timeDiff.slice(0, 2) + timeDiff.slice(3, 5) / 60 + timeDiff.slice(6) / 3600;

    document.getElementById("trackLen").innerHTML = Math.round(totalDist * 100) / 100 + "km";
    document.getElementById("avgSpeed").innerHTML = Math.round(totalDist / timeInHours * 100) / 100 + "km/h";
    document.getElementById("maxSpeed").innerHTML = Math.round(maxSpeed * 100) / 100 + "km/h";

    if (timeDiff[0] == "0") {
        timeDiff = timeDiff.slice(1);
    }
    document.getElementById("duration").innerHTML = timeDiff;
    document.getElementById("startTime").innerHTML = startTime;
    document.getElementById("endTime").innerHTML = endTime;

    let polyline = new H.map.Polyline(
        lineString, { style: { lineWidth: 4 }}
    );
    
    map.addObject(polyline);

    let startIcon = new H.map.Icon(
        svgMarkup.replace('{COLOR}', 'green'));
    let startMarker = new H.map.Marker({lat: startLat, lng: startLon },
        {icon: startIcon});
    map.addObject(startMarker);

    let endIcon = new H.map.Icon(
        svgMarkup.replace('{COLOR}', 'red'));
    let endMarker = new H.map.Marker({lat: currLat, lng: currLon },
        {icon: endIcon});
    map.addObject(endMarker);

    map.getViewModel().setLookAtData({bounds: polyline.getBoundingBox()});
}

document.getElementById("submitButton")
.addEventListener("click", () => {
    let errorInfo = document.getElementById("errorInfo");
    if (errorInfo) errorInfo.remove();

    const proxyURL = "http://localhost:3000/dl?url=";
    let url = document.getElementById('urlField').value;

    if (url.slice(-4).toLowerCase() != ".igc") {
        let errorInfo = document.createElement("div");
        errorInfo.id = "errorInfo";
        errorInfo.innerHTML = "To musi być plik .igc";
        document.getElementById("frame").appendChild(errorInfo);
        return;
    }

    let loading = document.createElement("div");
    loading.id = "loading";
    loading.innerHTML = `
    <div id="spinner">
        <div id="mask">
            <div id="maskedCircle"></div>
        </div>
    </div>`;

    document.getElementById("frame").appendChild(loading);

    // if lacks protocol prefix:
    if (!url.startsWith("http://") && !url.startsWith("https://"))
        url = "http://" + url;

    fetch(proxyURL + url)
    .then(response => response.text())
    .then(text => {
        if (text == "Invalid URL") {
            document.getElementById("loading").remove();

            let errorInfo = document.createElement("div");
            errorInfo.id = "errorInfo";
            errorInfo.innerHTML = "Nieprawidłowy adres";
            document.getElementById("frame").appendChild(errorInfo);
        }
        else { // remove everything from site and show data:
            document.getElementById("frame").remove();
            document.body.style.margin = "0px";

            const igcViewerHTML = `
            <div id="flexHeader">
                <div id="headerLeft">
                    <div id="personName"></div>
                    <div id="date"></div>
                </div>
                <div id="headerRight">
                    <input type="text" placeholder="Adres URL pliku IGC..." id="urlField2" class="url"><br />
                    <input type="button" value="Otwórz" id="submitButton2" class="submit">
                </div>
            </div>

            <div id="mapContainer"></div>

            <div id="altitude">
                Różnica wysokości: <span id="altDiff"></span><br />
                Maks. wysokość: <span id="maxAlt"></span><br />
                Min. wysokość: <span id="minAlt"></span><br />
                Wysokość startu: <span id="startAlt"></span><br />
                Wysokość lądowania: <span id="landAlt"></span></div>
            <div id="lengthAndSpeed">
                Długość trasy: <span id="trackLen"></span><br />
                Prędkość średnia: <span id="avgSpeed"></span><br />
                Prędkość maksymalna: <span id="maxSpeed"></span>
            </div>
            <div id="time">
                Długość trwania lotu: <span id="duration"></span><br />
                Godzina rozpoczęcia: <span id="startTime"></span><br />
                Godzina zakończenia: <span id="endTime"></span>
            </div>`;

            document.body.innerHTML = igcViewerHTML + document.body.innerHTML;

            // Initialize the platform object:
            let platform = new H.service.Platform({
            'apikey': 'NOnmxeKzXgA5tMPX_y6bMubsILCBmb1phdvJftQbh6g'
            });
            
            // Obtain the default map types from the platform object
            let defaultLayers = platform.createDefaultLayers();
            
            // Instantiate (and display) a map object:
            let map = new H.Map(
            document.getElementById('mapContainer'),
            defaultLayers.vector.normal.map);
            
            window.addEventListener('resize', () => map.getViewPort().resize());
            
            let behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
            let ui = H.ui.UI.createDefault(map, defaultLayers, "pl-PL");
    
            showData(text, map);

            document.getElementById("submitButton2")
            .addEventListener("click", () => {
                let errorInfo2 = document.getElementById("errorInfo2");
                if (errorInfo2) errorInfo2.remove();

                url = document.getElementById("urlField2").value;

                if (url.slice(-4).toLowerCase() != ".igc") {
                    let errorInfo2 = document.createElement("div");
                    errorInfo2.id = "errorInfo2";
                    errorInfo2.innerHTML = "To musi być plik .igc";
                    document.getElementById("headerRight").appendChild(errorInfo2);
                    return;
                }

                let loading = document.createElement("div");
                loading.id = "loading";
                loading.innerHTML = `
                <div id="spinner">
                    <div id="mask">
                        <div id="maskedCircle"></div>
                    </div>
                </div>`;
            
                document.getElementById("headerRight").appendChild(loading);

                if (!url.startsWith("http://") && !url.startsWith("https://"))
                    url = "http://" + url;

                fetch(proxyURL + url)
                .then(response => response.text())
                .then(text => {
                    document.getElementById("loading").remove();

                    if (text == "Invalid URL") {
                        let errorInfo2 = document.createElement("div");
                        errorInfo2.id = "errorInfo2";
                        errorInfo2.innerHTML = "Nieprawidłowy adres";
                        document.getElementById("headerRight").appendChild(errorInfo2);
                    }
                    else { // update data on screen:
                        map.removeObjects(map.getObjects());
                        showData(text, map);
                    }
                });
            });

            document.getElementById("urlField2")
            .addEventListener("keyup", e => {
                if (e.code === "Enter") {
                    // Cancel the default action, if needed
                    e.preventDefault();
                    // Trigger the button element with a click
                    document.getElementById("submitButton2").click();
                }
            });
        }
    });
});

document.getElementById("urlField")
.addEventListener("keyup", e => {
    if (e.code === "Enter") {
        // Cancel the default action, if needed
        e.preventDefault();
        // Trigger the button element with a click
        document.getElementById("submitButton").click();
    }
});

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

function getDist(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    let dLat = deg2rad(lat2-lat1);
    let dLon = deg2rad(lon2-lon1); 

    let a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 

    let c = 2 * Math.asin(Math.sqrt(a)); 
    let d = R * c; // Distance in km
    return d;
}

function getTimeDiff(time1, time2) {
    let hours, mins, secs;

    secs = Number(time2.slice(6)) - Number(time1.slice(6));
    mins = Number(time2.slice(3, 5)) - Number(time1.slice(3, 5));
    hours = Number(time2.slice(0, 2)) - Number(time1.slice(0, 2));

    if (secs < 0) {
        mins--;
        secs += 60;
    }
    if (mins < 0) {
        hours--;
        mins += 60;
    }
    if (hours < 0) { //through 2 days
        hours += 24;
    }

    hours = String(hours);
    mins = String(mins);
    secs = String(secs);

    if (hours.length == 1) hours = "0" + hours;
    if (mins.length == 1) mins = "0" + mins;
    if (secs.length == 1) secs = "0" + secs;

    return hours + ":" + mins + ":" + secs;
}