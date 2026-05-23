// XP RFID INDUSTRIAL APPLICATION LOGIC

// Live Backend URL from Render
const BACKEND_URL = "https://rfid-live-tag.onrender.com/";
const POLL_INTERVAL = 500; // Poll backend every 500ms
const ACTIVE_TIMEOUT_MS = 3500; // Tag is considered "Left" if not seen for 3.5 seconds

// State Management
let tagLogs = []; // Stores historical stream of all tags
let activeTagsByBay = {}; // Maps Bay ID (1 to 7) to currently active tag metadata
let pollingTimer = null;
let clockTimer = null;

// Mock Data EPC Generator (for Test Tag feature)
const mockEPCs = [
    "E2801191200073D4D1A0512A",
    "E2801191200073D4D1A0512B",
    "E2801191200073D4D1A0512C",
    "E2801130200056F2D4C13401",
    "E2801130200056F2D4C13402",
    "E20034120130020000003A4B",
    "E20034120130020000003B5C"
];

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
    initClock();
    startPolling();
    setupEventListeners();
});

// Setup Button Listeners
function setupEventListeners() {
    document.getElementById("btnClear").addEventListener("click", clearSystem);
    document.getElementById("btnTest").addEventListener("click", injectTestTag);
    document.getElementById("btnExport").addEventListener("click", exportCSV);
    document.getElementById("btnRefresh").addEventListener("click", () => {
        fetchTagData(true);
    });
}

// 1. Ticking Clock
function initClock() {
    const clockEl = document.getElementById("clock");
    const updateTime = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    updateTime();
    clockTimer = setInterval(updateTime, 1000);
}

// 2. Poll Backend
function startPolling() {
    fetchTagData();
    pollingTimer = setInterval(fetchTagData, POLL_INTERVAL);
}

// 3. Main Data Fetch and Processing
async function fetchTagData(isManual = false) {
    const statusEl = document.getElementById("connectionStatus");
    try {
        const response = await fetch(BACKEND_URL);
        if (!response.ok) throw new Error("HTTP error " + response.status);
        
        const data = await response.json();
        
        // Update connection status UI
        statusEl.className = "connection-status online";
        statusEl.querySelector(".status-text").textContent = "SERVER CONNECTED [ONLINE]";
        
        if (data.tags && data.tags.length > 0) {
            processTags(data.tags);
        }
        
    } catch (error) {
        console.warn("Backend poll failed:", error);
        // Update connection status to Offline
        statusEl.className = "connection-status offline";
        statusEl.querySelector(".status-text").textContent = "SERVER DISCONNECTED [OFFLINE]";
    }

    // Always update the Active Durations and timeouts on every tick
    tickActiveDurations();
    renderUI();
}

// 4. Process Scan Data
function processTags(tags) {
    const now = Date.now();
    const timestampStr = new Date().toLocaleTimeString([], { hour12: false });
    
    tags.forEach(tag => {
        const epc = tag.ep || tag.epc;
        const antenna = parseInt(tag.at || tag.antenna || 1); // fallback to Antenna 1
        const rssi = tag.ri || tag.rssi || -60;
        const reads = tag.rc || tag.read_count || 1;
        
        if (!epc) return;

        // Determine if this tag already exists in active logs
        let activeTag = tagLogs.find(t => t.epc === epc && t.status === "ACTIVE");
        
        if (activeTag) {
            // Update existing active tag
            activeTag.reads += reads;
            activeTag.rssi = rssi;
            activeTag.lastSeen = now;
            activeTag.exitTime = timestampStr;
            activeTag.antenna = antenna; // Update antenna in case it moved
        } else {
            // Create a new active tag row
            activeTag = {
                epc: epc,
                antenna: antenna,
                reads: reads,
                rssi: rssi,
                entryTime: timestampStr,
                exitTime: timestampStr,
                firstSeen: now,
                lastSeen: now,
                status: "ACTIVE"
            };
            tagLogs.unshift(activeTag); // Add to the top of the history list
        }

        // Map it as the active tag for its specific bay
        if (antenna >= 1 && antenna <= 7) {
            activeTagsByBay[antenna] = activeTag;
        }
    });
}

// 5. Update Bay Durations and timeouts
function tickActiveDurations() {
    const now = Date.now();

    // Check timeouts for all active tags in the bays
    for (let bayId = 1; bayId <= 7; bayId++) {
        const tag = activeTagsByBay[bayId];
        if (tag) {
            if (now - tag.lastSeen > ACTIVE_TIMEOUT_MS) {
                // Tag has left this bay
                tag.status = "LEFT";
                activeTagsByBay[bayId] = null; // Free up the bay
            } else {
                // Calculate elapsed active duration
                tag.durationSeconds = Math.floor((now - tag.firstSeen) / 1000);
            }
        }
    }
}

// 6. Render elements to DOM
function renderUI() {
    // 6a. Render Grid Bays
    for (let bayId = 1; bayId <= 7; bayId++) {
        const card = document.getElementById(`bay-${bayId}`);
        const statusVal = card.querySelector(".bay-status");
        const durationVal = card.querySelector(".duration-val");
        const tagVal = card.querySelector(".tag-val");
        
        const activeTag = activeTagsByBay[bayId];

        if (activeTag && activeTag.status === "ACTIVE") {
            card.classList.add("active-bay");
            statusVal.className = "bay-status status-active";
            statusVal.textContent = "STATUS: ACTIVE";
            durationVal.textContent = `${activeTag.durationSeconds}s`;
            tagVal.textContent = activeTag.epc;
        } else {
            card.classList.remove("active-bay");
            statusVal.className = "bay-status status-ready";
            statusVal.textContent = "STATUS: READY";
            durationVal.textContent = "0s";
            tagVal.textContent = "--";
        }
    }

    // 6b. Render Tag Stream Table
    const tableBody = document.getElementById("tagStreamBody");
    const noDataMessage = document.getElementById("noDataMessage");
    
    if (tagLogs.length === 0) {
        tableBody.innerHTML = "";
        noDataMessage.style.display = "block";
    } else {
        noDataMessage.style.display = "none";
        
        // Render rows
        tableBody.innerHTML = tagLogs.map(tag => {
            const statusClass = tag.status === "ACTIVE" ? "table-status-active" : "table-status-left";
            return `
                <tr>
                    <td class="tag-id-cell">${tag.epc}</td>
                    <td>B${tag.antenna}</td>
                    <td>${tag.reads}</td>
                    <td>${tag.rssi} dBm</td>
                    <td>${tag.entryTime}</td>
                    <td>${tag.status === "ACTIVE" ? "--" : tag.exitTime}</td>
                    <td class="${statusClass}">${tag.status}</td>
                </tr>
            `;
        }).join("");
    }
}

// 7. Inject Test Tag (Demo Trigger)
function injectTestTag() {
    // Generate Random Scan parameters
    const randomEpc = mockEPCs[Math.floor(Math.random() * mockEPCs.length)];
    const randomBay = Math.floor(Math.random() * 7) + 1; // Bay 1 to 7
    const randomRssi = -Math.floor(Math.random() * 30) - 50; // -50 to -80
    const randomReads = Math.floor(Math.random() * 5) + 1;

    console.log(`Injecting Mock tag: EPC=${randomEpc} at Bay ${randomBay}`);

    // Form mock tag payload
    const mockTag = {
        epc: randomEpc,
        antenna: randomBay,
        rssi: randomRssi,
        read_count: randomReads
    };

    // Feed it to the tag log processor
    processTags([mockTag]);
    renderUI();
}

// 8. Clear Dashboard System
function clearSystem() {
    tagLogs = [];
    activeTagsByBay = {};
    renderUI();
}

// 9. Export Log History as CSV
function exportCSV() {
    if (tagLogs.length === 0) {
        alert("No RFID scan logs available to export.");
        return;
    }

    // Compose CSV Headers and content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Tag ID (EPC),Antenna,Reads,RSSI,Entry Timestamp,Exit Timestamp,Status\r\n";
    
    tagLogs.forEach(tag => {
        csvContent += `"${tag.epc}","B${tag.antenna}",${tag.reads},${tag.rssi},"${tag.entryTime}","${tag.exitTime}","${tag.status}"\r\n`;
    });

    // Create browser download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const timestamp = new Date().toISOString().slice(0,10);
    link.setAttribute("download", `XP_RFID_Report_${timestamp}.csv`);
    
    document.body.appendChild(link);
    link.click(); // trigger download
    document.body.removeChild(link); // clean up
}
