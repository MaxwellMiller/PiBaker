var express = require('express'),
    fs = require('fs-extra'),
    bodyParser = require('body-parser'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    ws = require('ws'),
    http = require('http'),
    request = require('request'),
    formidable = require('formidable')
    util = require('util');

// Populate with default settings
// If a config file exists, it will override these
var settings = {
    'is_server' : 'false',
    'locked'    : 'false'
}

// Contains an in-memory list of the connected printers
// The data file should be written whenever this is updated
var connectedPrinters = [];

// Load the inital printer list
loadPrinterList();

// Read in the config file synchronously, so that it's guaranteed to finish
// before the server is created.
if (fs.existsSync('data/config')) {

    // If the file exists, read it's contents
    // If it doesn't exist, there's no need to do anything
    data = fs.readFileSync('data/config', 'utf8')

    var tok = data.split(/\s+/);

    // If there was trailing whitespace, remove the empty element
    if(tok.length > 0 && tok[tok.length-1] == '')
        tok.pop();

    var ret = [];

    if(tok.length < 2) return;

    for(var i=0; i<tok.length; i+=2) {
        settings[tok[i]] = tok[i+1];
    }
}


var app = express();
app.use(bodyParser.json());

if (settings['is_server'] === 'true') {
    app.use(express.static(__dirname + '/public/server/'));
}
else {
    app.use(express.static(__dirname + '/public/client/'));
}


var validModelFormats = ['stl', 'obj', 'amf']

function loadPrinterList() {
    fs.exists('data/printers', function(exists) {
        // If the file exists, read it's contents
        // If it doesn't exist, there's no need to do anything
        if (exists) {
            fs.readFile('data/printers', 'utf8', function(err, data) {
                var tok = data.split(/\s+/);

                // If there was trailing whitespace, remove the empty element
                if (tok.length > 0 && tok[tok.length-1] == '') {
                    tok.pop();
                }

                connectedPrinters = [];

                if (tok.length < 2) {
                    return;
                }

                for (var i = 0; i < tok.length; i += 2) {
                    connectedPrinters.push({name: tok[i], ip: tok[i+1]});
                }
            });
        }
    });
}

// Write the connectedPrinters array to disk
// TODO: Do I need to create a lock to ensure the file isn't written multiple times at the same time?
function writeConnectedPrinters() {
    var toWrite = '';

    for (var i in connectedPrinters) {
        toWrite += connectedPrinters[i].name + ' ' + connectedPrinters[i].ip + '\n';
    }

    fs.writeFile('data/printers', toWrite);
}

// Given a printer name, return the corresponding IP address, or undefined if it is not registered
function lookupIP(name) {
    for (var i in connectedPrinters) {
        if (name === connectedPrinters[i].name) {
            return connectedPrinters[i].ip;
        }
    }

    return undefined;
}

// Returns, as JSON, the list of possible print targets and whether editing is currently locked.
app.route('/api/getprinters')
    .get(function(req, res, next) {
        res.json({printers : connectedPrinters, locked : settings['locked']});
        next();
    });

// Accepts a new printer name/IP pair as JSON and adds it to the internal list
app.route('/api/regprinter')
    .post(function(req, res, next) {
        var pName = req.body.printerName,
            pIP = req.body.printerIP;

        if (settings['locked'] == 'true') {
            console.log('Cannot add printer record. The server list is locked.');

            res.end();
            return;
        }

        if (pName === undefined || pName === '' ||
            pIP   === undefined || pIP   === '') {

            // TODO: Pretty Dialog
            console.log('Must provide a name and IP address when adding a printer record.');

            res.end();
            return;
        }

        // Check to see if this printer conflicts with any printers already registered
        for (var i in connectedPrinters) {
            if (connectedPrinters[i].name == pName) {
                console.log('Error: Printer name already in use.');
                return;
            }

            if (connectedPrinters[i].ip == pIP) {
                console.log('Error: Printer is already registered.');
                return;
            }
        }

        connectedPrinters.push({name: pName, ip: pIP});
        writeConnectedPrinters();

        res.end();
    });

app.route('/api/editprinter')
    .post(function(req, res, next) {
        var npName = req.body.newPrinterName,
            opName = req.body.oldPrinterName,
            pIP = req.body.printerIP;

        if (settings['locked'] == 'true') {
            console.log('Cannot edit printer record. The server list is locked.');

            res.end();
            return;
        }

        if (npName === undefined || npName === '' ||
            opName === undefined || opName === '' ||
            pIP    === undefined || pIP    === '') {

            // TODO: Pretty Dialog
            console.log('Must provide an original name, new name, and new IP address when changing a printer record.');

            res.end();
            return;
        }

        // Check to see if this printer conflicts with any printers already registered
        for (var i in connectedPrinters) {
            if (connectedPrinters[i].name === opName) {

                connectedPrinters[i].name = npName;
                connectedPrinters[i].ip = pIP;

                writeConnectedPrinters();
                res.end();
                return;
            }

        }

        // We should only get here if a printer that didn't exist were trying to be edited
        // TODO: Return a message for a nice dialog
        console.log("Can't edit a printer that doesn't exist!");

        res.end();
    });


// Removes a printer with the name sent
app.route('/api/delprinter')
    .post(function(req, res, next) {
        var pName = req.body.printerName;

        if (settings['locked'] == 'true') {
            console.log('Cannot remove printer record. The server list is locked.');

            res.end();
            return;
        }

        // Find this printer name in the internal list. It is guaranteed to be unique, if it exists.
        for (var i in connectedPrinters) {
            if (connectedPrinters[i].name === pName) {
                // Remove this element from the list
                connectedPrinters.splice(i, 1);

                // Write the file to disk and close the connection
                writeConnectedPrinters();
                res.end();
                return;
            }
        }

        // If we got here, there printer deleted does not exist
        // TODO: Send message back to show pretty error message
        console.log("Can't delete a printer that doesn't exist!");

        res.end();
    });

// Handle uploading posted models, or routing g-code
app.route('/api/modelupload')
    .post(function(req, res, next) {
        var fstream;

        var form = new formidable.IncomingForm();
        form.uploadDir = __dirname + '/models';

        form.parse(req, function(err, fields, files) {
            var filename = files.model.name,
                pName = fields.target,
                pIP = lookupIP(fields.target);

            if (pIP === undefined) {
                console.log('Printer is not registered with the server');
            }

            console.log('Initiating print to ' + pName + ' at ' + pIP);

            if (filename.indexOf('.') == -1 || filename.length <= 4) {
                console.log('Invalid filename. Either too short or no extension');

                res.end();
                return;
            }

            // It is guaranteed that there is at least one instance of '.'
            var filext = filename.substring(filename.lastIndexOf("."));

            var typeCheck = 0;

            // Can only upload models to the intermediate server, not to the client
            if (settings['is_server'] === 'true') {
                for (var i in validModelFormats) {
                    if (('.' + validModelFormats[i]) === filext) {
                        typeCheck = 1;
                    }
                }
            }

            if ('.gcode' === filext) {
                typeCheck = 2;
            }

            // If it's not a valid model format or a gcode file, ignore it
            if (typeCheck == 0) {
                console.log('The uploaded file is not a supported type.');

                res.end();
                return;
            }


            // TODO: Should the auto-generated, safe, upload names be used? Or sanitized versions of their original names?
            // This has the unfortunate downside of potentially colliding with other files. Maybe probe the directory and generate
            // my own name if there is a collision.
            // Sanitize filename
            filename = filename.replace(/[^a-z0-9_\-\.]/gi, '_').toLowerCase();

            // Rename the file to some a little nicer
            fs.renameSync(files.model.path, __dirname + '/models/' + filename);

            // If the file is a 3D model, slice it
            if (typeCheck == 1) {
                // Execute slic3r with the model as an arguement
                // Register a callback to forward the model to the client
                exec('/bin/slic3r/bin/slic3r ' + __dirname + '/models/' + filename,
                function(error, stdout, stderr) {

                    // If the process terminated properly, forward
                    if (error == null) {
                        // TODO: Test this
                        var formData = {
                            file: fs.createReadStream(__dirname + '/models/' + filename + '.gcode')
                        }

                        request.post({url: pIP, formData: formData}, function(err, resp, body) {
                            console.log('G-code sent to ' + clientip);
                        });
                    }
                    else {
                        console.log('Error slicing the uploaded model');
                    }
                });

                return;
            }
        });


        // if (settings["is_server"]) {
        //     socket = new ws(clientip);
        //     socket.on('open', function(){
        //         socket.send("I AM MESSAGE");
        //     });
        // }

        res.redirect('back');
        next();
    });

// var server = http.createServer(app);
// server.listen(8080);
app.listen(process.env.PORT || 8080);

// var wss = new ws.Server({server: server});
// wss.on('connection', function(ws) {
//     ws.on('message', function(message) {
//         console.log(message);
//     });
// });
