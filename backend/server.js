var app = require('express')();
var http = require('http');
var bodyParser = require('body-parser');
var HashMap = require('hashmap');

// dynamic port assignment for cloud platforms
var PORT = process.env.PORT || 12345; 
var httpServer = http.createServer(app);

httpServer.listen(PORT, function() {
    console.log('RFID Server is running on port: ' + PORT);
});

httpServer.keepAliveTimeout = 30 * 1000;

var tabTags = new HashMap();

// UNIVERSAL RFID TAG PARSER
function InsertTags(tags) {
    if (tags && tags.length > 0) {
        tags.forEach(tag => {
            // Find EPC / Tag ID (supports ep, epc, tag_id, id)
            var epc = tag.ep || tag.epc || tag.tag_id || tag.id;
            if (!epc) return;

            // Normalize fields from reader checkboxes dynamically
            var normalizedTag = {
                ep: epc,
                bd: tag.bd || tag.bank_data || tag.additional_data || tag.data || '',
                at: parseInt(tag.at || tag.antenna || tag.antenna_number || tag.antenna_id || 1),
                rc: parseInt(tag.rc || tag.read_count || tag.count || 1),
                fq: tag.fq || tag.frequency || '',
                pt: tag.pt || tag.protocol || 5, // default to GEN2
                ri: parseFloat(tag.ri || tag.rssi || -60),
                rv: tag.rv || tag.reserve_field || 0,
                ft: tag.ft || tag.firstseen_timestamp || tag.first_timestamp || new Date().toISOString(),
                lt: tag.lt || tag.lastseen_timestamp || tag.last_timestamp || new Date().toISOString()
            };

            // Save/Update in our tabTags HashMap
            if (tabTags.has(epc)) {
                var existingTag = tabTags.get(epc);
                existingTag.bd = normalizedTag.bd;
                existingTag.at = normalizedTag.at;
                existingTag.rc += normalizedTag.rc; // Accumulate reads
                existingTag.fq = normalizedTag.fq;
                existingTag.pt = normalizedTag.pt;
                existingTag.ri = normalizedTag.ri;
                existingTag.rv = normalizedTag.rv;
                existingTag.lt = normalizedTag.lt; // Update last seen timestamp
            } else {
                tabTags.set(epc, normalizedTag);
            }
        });
    }
}

var hbcount = 0;
var gpistates = '';
var devstate = '0';

// 1. DIAGNOSTIC LOGGER MIDDLEWARE
// This prints the exact headers and requests to Render logs so you can see exactly what the reader is sending!
app.use(function(req, res, next) {
    console.log(`>>> [${new Date().toISOString()}] Received ${req.method} on ${req.url}`);
    console.log(">>> Request Headers:", JSON.stringify(req.headers));
    next();
});

// 2. ROBUST BODY PARSERS
// Force Express to parse JSON even if the reader sends an incorrect Content-Type header (e.g. text/plain or missing)
app.use(bodyParser.json({ type: '*/*' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Enable CORS for all requests to ensure frontend can access backend
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Common handler for both / and /reader endpoints
function handleReaderUpload(req, res) {
    console.log(">>> Parsed Request Body:", JSON.stringify(req.body));

    if (!req.body || Object.keys(req.body).length === 0) {
        console.warn(">>> WARNING: Received empty body from reader! Body parsing might have failed.");
        return res.end();
    }

    // 1. Handle Time Sync Request from the Reader
    if (req.body.event_type === 'sync_time_req') {
        var timeSecond = Math.floor(Date.now());
        var sync_time = {
            command_type: "sync_time",
            command_data: timeSecond
        };
        console.log(">>> Responded to sync_time_req with:", JSON.stringify(sync_time));
        return res.json(sync_time);
    }

    // 2. Handle Tag Scans
    if (req.body.event_type == 'tag_read' || req.body.event_type == 'tag_coming') {
        InsertTags(req.body.event_data);
        console.log(`>>> Successfully processed ${req.body.event_data ? req.body.event_data.length : 0} tags.`);
    }
    // 3. Handle Heartbeats
    else if (req.body.event_type == 'heart_beat') {
        hbcount = req.body.event_data;
        console.log(">>> Heartbeat received:", hbcount);
    }
    // 4. Handle GPI Changes
    else if (req.body.event_type == 'gpi_changed') {
        if (req.body.event_data && req.body.event_data.gpi_states) {
            var tmpstr = '';
            req.body.event_data.gpi_states.forEach(function (gst) {
                tmpstr += gst.state;
            });
            gpistates = tmpstr;
            console.log(">>> GPI changed:", gpistates);
        }
    }
    // 5. Handle Exceptions
    else if (req.body.event_type == 'reader_exception') {
        if (req.body.event_data) {
            devstate = 'code:' + req.body.event_data.err_code + ' info:' + req.body.event_data.err_string;
            console.log(">>> Reader exception:", devstate);
        }
    }
    
    res.end();
}

// Accept hardware uploads on both the root / and /reader paths to support all hardware configurations
app.post('/reader', handleReaderUpload);
app.post('/', handleReaderUpload);

// Endpoint for frontend to fetch tag logs
app.get('/', function (req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8'
    });
    var evtobj = {};
    evtobj.hbcount = hbcount;
    evtobj.gpistates = gpistates;
    evtobj.devstate = devstate;
    evtobj.tags = tabTags.values();
    res.write(JSON.stringify(evtobj));
    res.end();
    tabTags.clear(); // clear memory cache after client consumes the data
});
