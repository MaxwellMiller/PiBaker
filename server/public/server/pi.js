var ipmap = {};

$(document).on('change', '.btn-file :file', function() {
    var input = $(this),
        numFiles = input.get(0).files ? input.get(0).files.length : 1,
        label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    
    input.trigger('fileselect', [numFiles, label]);
});

$(document).ready(function() {
    $('.btn-file :file').on('fileselect', function(event, numFiles, label) {
        var input = $(this).parents('.input-group').find(':text');
        
        input.val(label);
    });
});

function setCurrentPrinter(name) {
    $('#printer-select-display')[0].innerHTML = name + '<span class="caret"></span>';
    $('#print-target')[0].value = name;
}

window.onload = function() {

    // Populate dropdown list
    $.get("/PiConnected", function(data, status) {
        for (var i=0; i<data.length; ++i) {
            var list_el = document.createElement('li');
            list_el.innerHTML = '<a href=\'#\'>' + data[i].name + '</a>';
            $('#printer-select')[0].appendChild(list_el);

            // Keep track of the ip address of this ip

        }
        
        // Switch to the default printer
        var plist = $('#printer-select')[0];
    
        if (plist.children.length > 0) {
            setCurrentPrinter(plist.children[0].children[0].text);
        }
    });

}
