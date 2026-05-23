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
function InsertTags(tags) {
    if (tags.length > 0) {
        tags.forEach(tag => {
            if (tag.hasOwnProperty('ep')) {
                if (tabTags.has(tag.ep)) {
                    var tag_ = tabTags.get(tag.ep);
                    if (tag.hasOwnProperty('bd')) tag_.bd = tag.bd;
                    if (tag.hasOwnProperty('at')) tag_.at = tag.at;
                    if (tag.hasOwnProperty('rc')) tag_.rc += tag.rc;
                    if (tag.hasOwnProperty('fq')) tag_.fq = tag.fq;
                    if (tag.hasOwnProperty('pt')) tag_.pt = tag.pt;
                    if (tag.hasOwnProperty('ri')) tag_.ri = tag.ri;
                    if (tag.hasOwnProperty('rv')) tag_.rv = tag.rv;
                    if (tag.hasOwnProperty('ft')) tag_.ft = tag.ft;
                    if (tag.hasOwnProperty('lt')) tag_.lt = tag.lt;
                } else
                    tabTags.set(tag.ep, tag);
            }
            else if (tag.hasOwnProperty('epc')) {
                if (tabTags.has(tag.epc)) {
                    var tag_ = tabTags.get(tag.epc);
                    tag_.bd = tag.bank_data;
                    tag_.at = tag.antenna;
                    tag_.rc += tag.read_count;
                    tag_.pt = tag.protocol;
                    tag_.ri = tag.rssi;
                    tag_.ft = tag.firstseen_timestamp;
                    tag_.lt = tag.lastseen_timestamp;
                } else {
                    var tag_ofm = {};
                    tag_ofm.ep = tag.epc;
                    tag_ofm.bd = tag.bank_data;
                    tag_ofm.at = tag.antenna;
                    tag_ofm.rc = tag.read_count;
                    tag_ofm.pt = tag.protocol;
                    tag_ofm.ri = tag.rssi;
                    tag_ofm.ft = tag.firstseen_timestamp;
                    tag_ofm.lt = tag.lastseen_timestamp;
                    tag_ofm.rv = 0;
                    tag_ofm.fq = '';
                    tabTags.set(tag.epc, tag_ofm);
                }                   
            }
        });
    }
}

var hbcount = 0;
var gpistates = '';
var devstate = '0';

app.use(bodyParser.json());

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

// Endpoint to receive data from RFID board (SDL1010/E710)
app.post('/reader', function(req, res) {
    console.log("Data from Reader:", req.body);

    if (req.body.event_type == 'tag_read' || req.body.event_type == 'tag_coming') {
        InsertTags(req.body.event_data);
    }
    else if (req.body.event_type == 'heart_beat')
        hbcount = req.body.event_data;
    else if (req.body.event_type == 'gpi_changed') {
        var tmpstr = '';
        req.body.event_data.gpi_states.forEach(function (gst) {
            tmpstr += gst.state;
        });
        gpistates = tmpstr;
    }
    else if (req.body.event_type == 'reader_exception') {
        devstate = 'code:' + req.body.event_data.err_code + ' info:' + req.body.event_data.err_string;
    }
    res.end();
});

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
