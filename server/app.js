var express = require('express'),
    busboy = require('connect-busboy'),
    fs = require('fs-extra'),
    exec = require('child_process').exec,
    spawn = require('child_process').spawn,
    ws = require('ws'),
    http = require('http'),
    request = require('request');

// Populate with default settings
// If a config file exists, it will override these
var settings = {
    "is_server" : "false"
}

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
app.use(busboy());

if (settings["is_server"] === "true") {
    app.use(express.static(__dirname + '/public/server'));
}
else {
    app.use(express.static(__dirname + '/public/client'));
}


var validModelFormats = ['stl', 'obj', 'amf']

// Returns, as json, the list of possible print targets
app.route('/piconnected')
    .get(function(req, res, next) {

        fs.exists('data/connectedpi', function(exists) {

            // If the file exists, read it's contents
            // If it doesn't exist, there's no need to do anything
            if (exists) {
                fs.readFile('data/connectedpi', 'utf8', function(err, data) {
                    var tok = data.split(/\s+/);

                    // If there was trailing whitespace, remove the empty element
                    if(tok.length > 0 && tok[tok.length-1] == '')
                        tok.pop();

                    var ret = [];

                    if(tok.length < 2) return;

                    for(var i=0; i<tok.length; i+=2) {
                        ret.push({name: tok[i], ip: tok[i+1]});
                    }

                    res.json(ret);

                });
            }

        });
    });

// Handle uploading posted models, or routing g-code
app.route('/modelupload')
    .post(function(req, res, next) {
        var fstream;
        req.pipe(req.busboy);

        var clientip = "ws://localhost:8080";

        req.busboy.on('file', function (fieldname, file, filename) {
            var typeCheck = 0;

            // Can only upload models to the intermediate server, not to the client
            if (settings["is_server"] === "true") {
                for (var format in validModelFormats) {
                    if (filename.indexOf("." + format, this.length - (format.length + 1)) != -1) {
                        typeCheck = 1;
                    }
                }
            }

            if (filename.indexOf(".gcode", this.length - ".gcode".length) != -1) {
                typeCheck = 2;
            }

            // If it's not a valid model format or a gcode file, ignore it
            if (typeCheck == 0) {
                res.redirect('back');
                return;
            }

            // Sanitize filename
            filename = filename.replace(/[^a-z0-9_\-.]/gi, '_').toLowerCase();

            // Write the file to disk
            fstream = fs.createWriteStream(__dirname + '/models/' + filename);
            file.pipe(fstream);

            // If the file is a 3D model, slice it
            if (typeCheck == 1) {
                fstream.on('close', function() {

                    // Execute slic3r with the model as an arguement
                    // Register a callback to forward the model to the client
                    exec('/bin/slic3r/bin/slic3r ' + __dirname + '/models/' + filename,
                    function(error, stdout, stderr) {

                        // If the process terminated properly, forward
                        if (error != null) {
                            // TODO: Test this
                            var formData = {
                                file: fs.createReadStream(__dirname + '/models/' + filenameR + '.gcode')
                            }

                            request.post({url: clientip, formData: formData}, function(err, res, body) {
                                console.log('G-code sent to ' + clientip);
                            });
                        }
                    });
                    res.redirect('back');
                });
            }
        });

        if (settings["is_server"]) {
            socket = new ws(clientip);
            socket.on('open', function(){
                socket.send("I AM MESSAGE");
            });
        }

        res.redirect('back');
    });

var server = http.createServer(app);
server.listen(8080);
//app.listen(process.env.PORT || 8080);

var wss = new ws.Server({server: server});
wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        console.log(message);
    });
});
