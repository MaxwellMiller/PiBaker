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
    'locked'    : 'false',
    'log'       : 'true'
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

function forwardModelToPi(filepath, ipaddr) {
    var formData = {
        model: fs.createReadStream(filepath)
    }

    ipaddr = 'http://' + ipaddr + '/api/modelupload';

    request.post({
        url: ipaddr,
        formData: formData
    }, function(err, resp, body) {
        if (err == null) {
            console.log('G-code sent to ' + ipaddr);
        }
        else {
            console.log('Error sending G-code to ' + ipaddr);
            console.log(err);
        }
    });
}

function kickoffPrint() {
    console.log('Start print job here');
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
        var pName = req.body.printerName.trim(),
            pIP = req.body.printerIP.trim();

        if (settings['locked'] == 'true') {

            res.status(400)
            res.end('Cannot add printer record. The server list is locked.');
            return;
        }

        // TODO: These should be validating IP address and name more
        if (pName === undefined || pName.trim() === '' ||
            pIP   === undefined || pIP.trim()   === '') {

            res.status(400);
            res.end('Must provide a name and IP address when adding a printer record.');
            return;
        }

        pName = pName.trim();
        pIP = pIP.trim();

        if (settings['log'] == 'true') {
            console.log('Registering printer {name: ' + pName + ', ip: ' + pIP + '}');
        }

        // Check to see if this printer conflicts with any printers already registered
        for (var i in connectedPrinters) {
            if (connectedPrinters[i].name == pName) {

                if (settings['log'] == 'true') {
                    console.log('Printer name already in use {name: ' + pName + ', ip: ' + pIP + '}');
                }

                res.status(400);
                res.end('Printer name already in use.');
                return;
            }

            if (connectedPrinters[i].ip == pIP) {

                if (settings['log'] == 'true') {
                    console.log('IP address already registered {name: ' + pName + ', ip: ' + pIP + '}');
                }

                res.status(400);
                res.end('Printer is already registered, but is named ' + connectedPrinters[i].name + '.');
                return;
            }
        }

        connectedPrinters.push({name: pName, ip: pIP});
        writeConnectedPrinters();

        if (settings['log'] == 'true') {
            console.log('Successfully registered printer {name: ' + pName + ', ip: ' + pIP + '}');
        }

        res.end();
    });

app.route('/api/editprinter')
    .post(function(req, res, next) {
        var npName = req.body.newPrinterName,
            opName = req.body.oldPrinterName,
            pIP = req.body.printerIP;

        if (settings['locked'] == 'true') {
            res.status(400);
            res.end('Cannot edit printer record. The server list is locked.');
            return;
        }

        // TODO: More validation checking here
        if (npName === undefined || npName.trim() === '' ||
            opName === undefined || opName.trim() === '' ||
            pIP    === undefined || pIP.trim()    === '') {

            res.status(400);
            res.end('Must provide an original name, new name, and new IP address when changing a printer record.');
            return;
        }

        npName = npName.trim();
        opName = opName.trim();
        pIP = pIP.trim();

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
        res.status(400);
        res.end("Can't edit a printer that doesn't exist!");
        return;
    });


// Removes a printer with the name sent
app.route('/api/delprinter')
    .post(function(req, res, next) {
        var pName = req.body.printerName;

        if (settings['locked'] == 'true') {

            res.status(400);
            res.end('Cannot remove printer record. The server list is locked.');
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
        res.status(400);
        res.end("Can't delete a printer that doesn't exist!");
        return;
    });

// Handle uploading posted models, or routing g-code
app.route('/api/modelupload')
    .post(function(req, res, next) {

        if (settings['log'] == 'true') {
            console.log('/api/modelupload is being posted to.');
        }

        var form = new formidable.IncomingForm();
        form.uploadDir = __dirname + '/models';

        form.parse(req, function(err, fields, files) {

            // Verify a file was actually uploaded
            if (files.model == undefined || files.model.path == undefined) {

                if (settings['log'] == 'true') {
                    console.log('No file uploaded.');
                }

                res.status(400);
                res.end('No file provided.');
            }

            var filepath = files.model.path,
                filename = files.model.path,
                pIP = lookupIP(fields.target);


            if (settings['is_server'] == 'true' && pIP == undefined) {

                if (settings['log'] == 'true') {
                    console.log('IP address is undefined {target: ' + fields.target + ', file: ' + filepath + '}');
                }

                fs.unlinkSync(filepath);

                res.status(400);
                res.end('Printer is not registered with the server');
                return;
            }

            // Currently filename is a full path, remove the path (need to cover windows and unix style paths)
            if (filename.lastIndexOf('/') != -1) {
                filename = filename.substring(filename.lastIndexOf('/') + 1);
            }
            if (filename.lastIndexOf('\\') != -1) {
                filename = filename.substring(filename.lastIndexOf('\\') + 1);
            }

            // Make sure the original file had an extension
            if (files.model.name.indexOf('.') == -1 || files.model.name.length <= 4) {

                if (settings['log'] == 'true') {
                    console.log('No file extension found {target: ' + fields.target + ', ip: ' + pIP + ', filename: ' + files.model.name + '}');
                }

                fs.unlinkSync(filepath);

                res.status(400);
                res.end('Invalid filename. Either too short or no extension');
                return;
            }

            // It is guaranteed that there is at least one instance of '.'
            var filext = files.model.name.substring(files.model.name.lastIndexOf(".")).toLowerCase(),
                typeCheck = 0;

            // Can only upload models to the intermediate server, not to the client
            if (settings['is_server'] == 'true') {
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

                fs.unlinkSync(filepath);

                res.status(400);
                res.end('The uploaded file is not a supported type.');
                return;
            }

            if (settings['is_server'] == 'true') {
                console.log('Uploaded file to server {target:' + fields.target + ', ip: ' + pIP + ', name: ' + files.model.name + ', renamed: ' + filename + ', type: ' + typeCheck + '}');
            }
            else {
                console.log('Uploaded file to printer {target: '+ fields.target + ', name: ' + files.model.name + ', renamed: ' + filename + ', type: ' + typeCheck + '}')
            }


            // filename = filename.replace(/[^a-z0-9_\-\.]/gi, '_').toLowerCase();

            // Rename the file to some a little nicer
            fs.renameSync(files.model.path, __dirname + '/models/' + filename + filext);
            filepath = __dirname + '/models/' + filename + filext;

            // TODO: This process is not necessarilly fast. It may take longer
            // than the timeout period for the http response. Current idea: open
            // a websocket with the client here, register a callback for when the slicing
            // process finishes to send the result (success/failure) to the client

            // If the file is a 3D model, slice it
            if (typeCheck == 1) {

                if (settings['is_server'] == 'true') {
                    console.log('Slicing model {target:' + fields.target + ', ip: ' + pIP + ', name: ' + files.model.name + ', renamed: ' + filename + '}');
                }

                // Execute slic3r with the model as an arguement
                // Register a callback to forward the model to the client
                exec('/bin/slic3r/bin/slic3r ' + __dirname + '/models/' + filename + filext,
                function(error, stdout, stderr) {

                    // If the process terminated properly, forward
                    if (error == null) {

                        if (settings['is_server'] == 'true') {
                            console.log('Successfully sliced model {target:' + fields.target + ', ip: ' + pIP + ', name: ' + files.model.name + ', renamed: ' + filename + '}');
                        }

                        fs.unlinkSync(filepath);

                        filepath = __dirname + '/models/' + filename + '.gcode';
                        forwardModelToPi(filepath, pIP);
                    }
                    else {

                        if (settings['is_server'] == 'true') {
                            console.log('Error slicing uploaded model {target:' + fields.target + ', ip: ' + pIP + ', name: ' + files.model.name + ', renamed: ' + filename + '}');
                        }

                        fs.unlinkSync(filepath);
                    }
                });
            }
            else if (typeCheck == 2) {

                if (settings['is_server'] == 'true') {
                    forwardModelToPi(filepath, pIP);
                }
                else {
                    kickoffPrint();
                }
            }
            else {

                res.status(400);
                res.end('Error: typeCheck == ' + typeCheck + '. Do not know how to handle.');
                return;
            }

            res.end();
            return;
        });


        // if (settings["is_server"]) {
        //     socket = new ws(clientip);
        //     socket.on('open', function(){
        //         socket.send("I AM MESSAGE");
        //     });
        // }

        // res.redirect('back');
        // return();
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
