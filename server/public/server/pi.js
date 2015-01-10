var ipmap = {};

var dialog = '<div class="modal fade">' +
                '<div class="modal-dialog">' +
                    '<div class="modal-content">' +
                        '<div class="modal-header">' +
                            '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
                            '<h4 class="modal-title">Modal title</h4>' +
                        '</div>' +
                        '<div class="modal-body">' +
                            '<p>One fine body&hellip;</p>' +
                        '</div>' +
                    '<div class="modal-footer">' +
                        '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
                        '<button type="button" class="btn btn-primary">Save changes</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

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
});

function setCurrentPrinter(name) {
    $('#printer-select-display')[0].innerHTML = name + '<span class="caret"></span>';
    $('#print-target')[0].value = name;
}

window.onload = function() {

    // Populate dropdown list
    $.get("/api/getprinters", function(data, status) {
        for (var i=0; i<data.length; ++i) {
            var listEl = document.createElement('li');
            listEl.innerHTML = '<a>' + data[i].name + '</a>';
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
            setCurrentPrinter(plist.children[0].children[0].text);
        }
        // If there are no printers in the list current, default to 'Select Printer' (to allow the user to click 'Add Printer')
        else {
            $('#printer-select-display')[0].innerHTML = name + 'Select Printer<span class="caret"></span>';
        }

        // Register click events on the dropdown list items
        $('#printer-select li a').click(function(e){
            if (e.target.attributes['id'] != undefined && e.target.attributes['id'].value === 'add-printer') {
                console.log('add-printer');
            }
            else {
                setCurrentPrinter(e.target.innerText);
            }
        });
    });

}
