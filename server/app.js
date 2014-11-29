var express = require('express');
var busboy = require('connect-busboy');
var fs = require('fs-extra');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;

var app = express();
app.use(busboy());
app.use(express.static(__dirname + '/public'));


//
app.route('/piconnected')
    .get(function(req, res, next) {
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
    });

// Handle uploading posted models, or routing g-code
app.route('/modelupload')
    .post(function(req, res, next) {
        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {

            // if it's not an stl file, ignore it
            if(filename.indexOf(".stl", this.length - ".stl".length) == -1) {
                res.redirect('back');
                return;
            }

            // sanitize filename
            filename = filename.replace(/[^a-z0-9_\-.]/gi, '_').toLowerCase();

            fstream = fs.createWriteStream(__dirname + '/models/' + filename);
            file.pipe(fstream);
            fstream.on('close', function() {
                spawn('/bin/slic3r/bin/slic3r',[__dirname + '/models/' + filename]);
                res.redirect('back');
            });
        });
    });

app.listen(process.env.PORT || 8080);
