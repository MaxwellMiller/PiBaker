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
    'is_server' : 'false'
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

// Returns, as JSON, the list of possible print targets
app.route('/api/getprinters')
    .get(function(req, res, next) {
        res.json(connectedPrinters);
        next();
    });

// Accepts a new printer name/IP pair as JSON and manipulates it.
app.route('/api/regprinter')
    .post(function(req, res, next) {
        var pName = req.body.printerName,
            pIP = req.body.printerIP;

        var err = 0;

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
    });

// Handle uploading posted models, or routing g-code
app.route('/api/modelupload')
    .post(function(req, res, next) {
        var fstream;

        var form = new formidable.IncomingForm();
        form.uploadDir = __dirname + '/models';

        form.parse(req, function(err, fields, files) {
            ///console.log(util.inspect({fields: fields, files: files}))
            console.log(fields.target);
            console.log(files.model.name);

            var filename = files.model.name;

            if (filename.indexOf('.') == -1 || filename.length <= 4) {
                console.log('Invalid filename. Either too short or no extension');
                return;
            }

            var filext = filename.lastIndexOf(".");

            var typeCheck = 0;

            // Can only upload models to the intermediate server, not to the client
            if (settings['is_server'] === 'true') {
                for (var format in validModelFormats) {
                    if (filename.indexOf('.' + validModelFormats[format], filename.length - (validModelFormats[format].length + 1)) != -1) {
                        typeCheck = 1;
                    }
                }
            }

            if (filename.indexOf('.gcode', this.length - '.gcode'.length) != -1) {
                typeCheck = 2;
            }

            // If it's not a valid model format or a gcode file, ignore it
            if (typeCheck == 0) {
                console.log('The uploaded file is not a supported type.');
                return;
            }

            // TODO: Should the auto-generated, safe, upload names be used? Or sanitized versions of their original names?
                // Sanitize filename
                // filename = filename.replace(/[^a-z0-9_\-\.]/gi, '_').toLowerCase();

                // Move the file to the model directory from the user's tmp dir
                // console.log(fs.renameSync(files.model.path, __dirname + '/models/' + filename));

            // // If the file is a 3D model, slice it
            // if (typeCheck == 1) {
            //     // Execute slic3r with the model as an arguement
            //     // Register a callback to forward the model to the client
            //     exec('/bin/slic3r/bin/slic3r ' + __dirname + '/models/' + filename,
            //     function(error, stdout, stderr) {
            //
            //         // If the process terminated properly, forward
            //         if (error != null) {
            //             // TODO: Test this
            //             var formData = {
            //                 file: fs.createReadStream(__dirname + '/models/' + filename + '.gcode')
            //             }
            //
            //             request.post({url: clientip, formData: formData}, function(err, resp, body) {
            //                 console.log('G-code sent to ' + clientip);
            //             });
            //         }
            //         else {
            //             console.log('Error slicing the uploaded model');
            //         }
            //     });
            //
            //     return;
            // }
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
