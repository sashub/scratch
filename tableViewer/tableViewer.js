"use strict";
$(document).ready(function(){
  
  /* set up an instance of the adapter */
  window.adapter = new h54s();
  
  getLibs();

  $("#selLIB").change(function(){
    pickTable($(this).val());
  });
  
});

function getLibs(){  
  /* visual so that user knows something is happening */
  $('#selLIB').addClass('spin-overlay');
  
  /* no param required, but shown here for demo purposes */
  var myJsParams = {};
  myJsParams.STP_ACTION='PICKLIBRARY';
  var h54TablesObject = new h54s.Tables([myJsParams],'BrowserParams');
  
  adapter.call('/Web/test',h54TablesObject, function(err, res) {
    $.each(res.fromSAS, function(index, obj) {
      var option = $('<option />').val(obj.LIBRARYREF);
      option.text(obj.LIBRARYNAME);
      $("#selLIB").append(option);
    });
    $('#selLIB').removeClass('spin-overlay');
  }); 
}


function pickTable(obj){
  $('#selDS').addClass('spin-overlay');
  // ensure no click event on submit buttons (dropdown not loaded yet)
  $("#btnDisplay").unbind('click');

  // clear existing tables drop down
  $('#selDS').find('option').remove();
  
  /* prepare parameters */
  var myJsParams = {};
  myJsParams.STP_ACTION='PICKTABLE';
  myJsParams.STP_LIBRARY=obj;
  var h54TablesObject = new h54s.Tables([myJsParams],'BrowserParams');

  adapter.call('/Web/test',h54TablesObject, function(err, res) {
    $.each(res.fromSAS, function(index, obj) {
      var option = $('<option />').val(obj.NAME);
      option.text(obj.NAME);
      $("#selDS").append(option);
    });   
    
    // enable button click event
    $("#btnDisplay").on('click',function(){
      showTable( $("#selLIB").val() + '.' + $("#selDS").val() )
    });
    $('#selDS').removeClass('spin-overlay');
  });
}

function showTable(table){
  $("#Screen1").hide();
  $('#Screen2').show();
  
  var container = document.getElementById('Hot'),hot;
  
  /* prepare parameters */
  var myJsParams = {};
  myJsParams.STP_ACTION='STREAMTABLE';
  myJsParams.LIBDS=table;
  var h54TablesObject = new h54s.Tables([myJsParams],'BrowserParams');
  window.adapter.call('/Web/test',h54TablesObject, function(err, res) {

    var dataFromSAS=res.dataFromSAS;

    var hot2 = new Handsontable(container, {
      data: dataFromSAS
      ,colHeaders: JSON.parse("[" + res.paramsFromSAS[0].VARLIST + "]")
      ,contextMenu: true
      ,stretchH:"all"
      ,outsideClickDeselects : false
      ,manualColumnResize: true
      ,manualRowResize: true
      ,rowHeaders: true
    });

  });
}


/*  Once you have got the above working (can select and view tables in your
  browser) try the following exercises:

1 - insert a header in the main screen showing the libname.datasetname of the 
    table
    
2 - insert a back button, which allows you to go back to the selection screen

3 - ensure step 2 will let you load a new table

4 - insert a FAVICON in your page  
  
5 - add a property in HANDSONTABLE to make the cells readonly
*/
