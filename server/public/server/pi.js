var ipmap = {};

$(document).on('change', '.btn-file :file', function() {
    var input = $(this),
        numFiles = input.get(0).files ? input.get(0).files.length : 1,
        label = input.val().replace(/\\/g, '/').replace(/.*\//, '');

    input.trigger('fileselect', [numFiles, label]);
});

$(document).ready(function() {
    // When a file is selected, display it in the text box
    $('.btn-file :file').on('fileselect', function(event, numFiles, label) {
        var input = $(this).parents('.input-group').find(':text');

        input.val(label);
    });

    $('#print-submit').click(function(e){
        if ($('#print-target').attr('value') === undefined) {
            // TODO: make a pretty error message
            console.log('Select a printer');
            e.preventDefault();
        }
    });

    // Register an onclick event to register a new printer from the modal
    $('#add-printer-submit').click(function(e){
        var pName = $('#add-printer-name')[0].value;
        var pIP = $('#add-printer-ip')[0].value;

        if (pName == '' || pIP == '') {
            // TODO: Make pretty error
            console.log('Must supply a name and IP address.');
            return;
        }

        $.ajax({
            url: '/api/regprinter',
            type: 'POST',
            data: JSON.stringify({printerName: pName, printerIP: pIP}),
            dataType: 'json',
            contentType: 'application/json'
        });

        dismissAddPrinterDialog();
        populatePrinterList();
    });
});

// Remove the Add Printer dialog and clear data
function dismissAddPrinterDialog() {
    $('#add-printer-modal').modal('hide');
    $('#add-printer-name')[0].value = '';
    $('#add-printer-ip')[0].value = '';
}

function setCurrentPrinter(name) {
    $('#printer-select-display')[0].innerHTML = name + '<span class="caret"></span>';
    $('#print-target')[0].value = name;
}

function populatePrinterList() {
    // Populate dropdown list
    $.get("/api/getprinters", function(data, status) {

        // Clear dropdown list to prepare it to be repopulated
        $('#printer-select')[0].innerHTML = '';

        for (var i=0; i<data.length; ++i) {
            var listEl = document.createElement('li');
            listEl.innerHTML = '<a style="padding-right:5px;" name="' + data[i].name + '">' + data[i].name + '<div class="btn-group btn-group-xs pull-right" role="group"><button type="button" class="btn btn-default"><span class="glyphicon glyphicon-pencil" aria-hidden="true"></span>Edit</button><button type="button" class="btn btn-default">&times</button></div></a>';
            $('#printer-select')[0].appendChild(listEl);

            // Keep track of the ip address of this ip

        }

        // Create and append the 'Add Printer' option
        var listSep = document.createElement('li');
        listSep.setAttribute('role', 'presentation');
        listSep.setAttribute('class', 'divider');
        $('#printer-select')[0].appendChild(listSep);

        var addPrinter = document.createElement('li');
        addPrinter.innerHTML = '<a id=\'add-printer\' data-toggle="modal" data-target="#add-printer-modal">Add Printer</a>';
        $('#printer-select')[0].appendChild(addPrinter);

        // If there is at least one printer, set it as the default
        var plist = $('#printer-select')[0];
        if (plist.children.length > 2) {
            setCurrentPrinter($('#printer-select')[0].children[0].children[0].attributes['name'].value);
        }
        // If there are no printers in the list current, default to 'Select Printer' (to allow the user to click 'Add Printer')
        else {
            $('#printer-select-display')[0].innerHTML = 'Select Printer<span class="caret"></span>';
        }

        // Register click events on the dropdown list items
        $('#printer-select li a').click(function(e){
            if (e.target.attributes['id'] != undefined && e.target.attributes['id'].value === 'add-printer') {
                console.log('add-printer');
            }
            else {
                setCurrentPrinter(e.target.attributes['name'].value);
            }
        });
    });
}

window.onload = function() {
    populatePrinterList();
}
