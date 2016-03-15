$(document).ready(function(){
  
  /* set up a global instance of the Boemska h54s adaptor.
      this is used for sending / receiving data from sas.
      source:  https://github.com/Boemska/h54s
  */
  window.adapter = new h54s({maxXhrRetries: 3, ajaxTimeout: 300000});
  
  /* check if we are editing a table by testing for existence of LIBDS param */
  var libds=getUrlParameter('LIBDS');
  
  /* if not editing then show dropdowns, else go to edit screen */
  if (libds===undefined){
    $('#Screen1_rkAdvice').show().delay(7000).fadeOut();
    getLibs();
  } else {getData(libds)};
  
  $("#selLIB").change(function(){
    replaceFilterSection();
    pickTable($(this).val());
  });
  
  $('#selDS').change(function(){
     replaceFilterSection();
  });

  $("#fltrClear").on('click',function(){
    replaceFilterSection();
  });

  $("#Scr3a4").on('click',function(){
    $('#Screen3').hide();
    $('#Screen2').show();
  });
});

function replaceFilterSection(){
  //replace filter section with new filter section (removing attributes)
  $('#Screen1_fltr').replaceWith(function () {
    return $('<div id="Screen1_fltr" class="filtrBox">');        
  }); 
  // initialise params
  $('#Screen1_fltr').data('fltrCount', 0);
  $('#Screen1_fltr').data('VARLIST','');
  $('#Screen1_fltr').data('LIBDS', 
    $("#selLIB").val() + '.' + $("#selDS").val()
  );
  $('#Screen1_fltr').data('FILTER_RK','NOT_SET');
  // reset button text
  $("#fltrDisplay").show();
  $("#fltrDisplay").text('Filter Table');
  $('#fltrClear').hide();
};

function getLibs(){  
  $('#selLIB').addClass('spin-overlay');
  var myParams = {};
  myParams.ACTION='GETLIBS';
  var jsTablesObject = new h54s.Tables([myParams],'SASControlTable');
  
  adapter.call('/Web/editor',jsTablesObject, function(err, res) {
    $.each(res.saslibs, function(index, obj) {
      var option = $('<option />').val(obj.LIBREF);
      option.text(obj.LIBREF);
      $("#selLIB").append(option);
    });
    $('#selLIB').removeClass('spin-overlay');
  }); 
};

function pickTable(obj){
  $('#selDS').addClass('spin-overlay');

  // ensure no click event on submit buttons (dropdown not loaded yet)
  $("#btnDisplay").unbind('click');
  $("#fltrDisplay").unbind('click');
  // clear existing tables drop down
  $('#selDS').find('option').remove();
  var myParams = {};
  myParams.ACTION='PICKTABLE';
  myParams.LIBDS=obj;
  var jsTablesObject = new h54s.Tables([myParams],'SASControlTable');

  adapter.call('/Web/editor',jsTablesObject, function(err, res) {
    $.each(res.sasdatasets, function(index, obj) {
      var option = $('<option />').val(obj.DSN);
      option.text(obj.DSN);
      $("#selDS").append(option);
    });   
    // show the buttons
    $("#fltrDisplay").on('click',function(){
      $("#fltrDisplay").text('Add Filter');
      $("#Screen1_fltr").show();
      showNextFilterCol();
    });
    $("#btnDisplay").on('click',function(){
      var url="/web/editor.html?LIBDS=" 
        + $("#selLIB").val() + '.' + $("#selDS").val()
        + '&FILTER_RK=' + $('#Screen1_fltr').data('FILTER_RK');
      window.open(url, '_blank');
    });
    // add .change to trigger change event on load
    $('#selDS').removeClass('spin-overlay').change();
  });
};

function showNextFilterCol(){
  $("#fltrDisplay").hide();
  $("#fltrClear").show();
  
  var filtrCnt=$('#Screen1_fltr').data('fltrCount');
  
  /* replace previous filter val dropdown as harcoded div */
  if (filtrCnt>0){
    var filtVal=$("#selVal"+filtrCnt+' option:selected').text();
    // convert selectbox to harcoded value
    $("#selVal"+filtrCnt).replaceWith(function () {
      return $('<div id="divVal'+filtrCnt+ '" class="filterBoxes" >'
        + filtVal + '</div>');        
    });
  }
  
  filtrCnt=filtrCnt+1;
  // set data attributes
  $('#Screen1_fltr').data('fltrCount',filtrCnt);
  $('#Screen1_fltr').data('ACTION','GETFILTERVARS');
  
  $("#Screen1_fltr").append("<section id='sec" + filtrCnt + "'></div>" );
  $('#sec'+filtrCnt).append('<select id="sel' + filtrCnt + '">');
  // add spin to new selectbox
  $("#sel"+filtrCnt).addClass('spin-overlay');
  // now populate the dropdown with column names
  var jsTablesObject = new h54s.Tables(
       jQuery.makeArray($('#Screen1_fltr').data()),'SASControlTable'
      );

  adapter.call('/Web/editor',jsTablesObject, function(err, res) {
    $.each(res.sascols, function(index, obj) {
      var option = $('<option />').val(obj.NAME);
      option.text(obj.NAME);
      $("#sel"+filtrCnt).append(option);
    });
    $("#sel"+filtrCnt).removeClass('spin-overlay');
    $('#sec'+filtrCnt).append('<button id="btnGetVals" type="button">'
      + 'GET VALUES</button>');
    $("#btnGetVals").on('click',function(){
      getFilterValues(filtrCnt); 
    });
  });
};

function getFilterValues(filtrCnt){
  // remove GET VALUES button
  $("#btnGetVals").remove();
  
  // get filtercol value
  var filterCol=$("#sel"+filtrCnt).val();
  /**
   *  set parameter values
   */
  // add filtercol to filtercol list
  $('#Screen1_fltr').data(
    'VARLIST',$('#Screen1_fltr').data('VARLIST') + ' ' + filterCol
  );
  $('#Screen1_fltr').data('ACTION','GETFILTERVALUES');
  
  // convert selectbox to harcoded column name value
  $("#sel"+filtrCnt).replaceWith(function () {
    return $('<div id="div'+filtrCnt+ '" class="filterBoxes" >'
      + filterCol + '</div> <div style="display:inline"> = </div>');        
  });

  // create values dropdown
  $('#sec'+filtrCnt).append('<select id="selVal' + filtrCnt + '">');
  // add spin to new selectbox
  $("#selVal"+filtrCnt).addClass('spin-overlay');
  $("#selVal"+filtrCnt).addClass('filterDropdowy');
  // now populate the dropdown with column names
  var jsTablesObject = new h54s.Tables(
       jQuery.makeArray($('#Screen1_fltr').data()),'SASControlTable'
      );
   
  adapter.call('/Web/editor',jsTablesObject, function(err, res) {
    $.each(res.sasvals, function(index, obj) {
      var option = $('<option />').val(obj.FILTER_RK);
      option.text(obj.FILTER_VAL);
      $("#selVal"+filtrCnt).append(option);
    });
    
    // remove spin
    $("#selVal"+filtrCnt).removeClass('spin-overlay');

    //initialise FILTER_RK in data store
    $('#Screen1_fltr').data('FILTER_RK',$("#selVal"+filtrCnt).val() );
    // update FILTER_RK on selectbox change
    $("#selVal"+filtrCnt).change(function(){
      $('#Screen1_fltr').data('FILTER_RK',$("#selVal"+filtrCnt).val() );
    });
    
    // SAS may have restricted the values..
    // if so, display an alert to the user
    if (res.sasparams[0].SASOBS > res.sasparams[0].SASLIMIT){
      $('#sec'+filtrCnt).append('<div id=fwarn'+filtrCnt+' style="fwarn">');
      $('#fwarn'+filtrCnt).text('<br>The number of values retrieved for column '
        + filterCol + ' exceeds ' + res.sasparams[0].SASLIMIT 
        +'. If your desired value is not listed, try beginning your filter '
        + 'on a different column to reduce the number of values returned.');
      $('#fwarn'+filtrCnt).show();
    }
    $("#fltrDisplay").show();
  });
}

function getData(obj){
  $('#spinMe').addClass('spin-overlay');
  $('#Screen1').hide();
  $('#Screen2').show();

  // load params js dataset
  var container = document.getElementById('Hot'),hot;
  var myParams = {};
  myParams.ACTION='EDIT';
  myParams.LIBDS=obj;
  myParams.FILTER_RK=getUrlParameter('FILTER_RK');
  
  // set title
  if (myParams.FILTER_RK==='NOT_SET'){
    var urlSuffix='STP_OBJECT='+myParams.LIBDS;
  } else {
    var urlSuffix='filter='+ myParams.FILTER_RK;
  };
  $('#screen2Title').append('<a href="/SASStoredProcess/do?'
    + '_PROGRAM=/Web/TableViewer&STP_TYPE=DATASET&' + urlSuffix + '">' 
    + myParams.LIBDS + '</a>')
    
  var jsTablesObject = new h54s.Tables([myParams],'SASControlTable');
  // get raw data (plus parameters)

  adapter.call('/Web/editor',jsTablesObject, function(err, res) {
    var sasdata=res.sasdata;
    var numRows=res.sasdata.length;
    var arrayColHeaders=res.sasparams[0].COLHEADERS.split(",");
    arrayColHeaders[0]="Delete?";
    var pkCnt=res.sasparams[0].PKCNT;
    var columns="[" + decodeURIComponent(res.sasparams[0].COLTYPE) + "]";
    console.log(arrayColHeaders);
    /* create the actual table */
    hot2 = new Handsontable(container, {
      data: res.sasdata
      ,colHeaders: arrayColHeaders
      // set PK cells as read only 
      ,cells: function (row, col, prop) {
                var cellProperties = {}
                if (row < numRows  && col <= pkCnt  && col >0) {
                  cellProperties.readOnly = true;
                }
                return cellProperties;
              }
      ,minSpareRows: 1
      ,columns: JSON.parse(columns)
      ,rowHeaders: true
      ,contextMenu: ['alignment', 'remove_row']
      ,stretchH:"all"
      ,outsideClickDeselects : false
      ,manualColumnResize: true
      ,manualRowResize: true
      /*
      // highlight on change
      ,afterChange: function (changes, source) {
        if (source=== 'loadData') {
            return; //don't do anything as this is called when table is loaded
        } else if (!changes) {return;}
        var instance = this;
        changes.forEach(function (change) {
          alert(change);
          var rowIndex = change[0];
          var columnIndex = change[1];
          var newValue = change[3];
          var cellProperties, options;
          instance.render();
          var cell = instance.getCell(rowIndex, 2);
          var backgroundColor = '#ff00dd';
          cell.style.background =  backgroundColor;
        });
        
      */
      // highlight current row
      ,currentRowClassName: 'currentRow'
    });
    
    /* dynamically assign the number of rows which are readonly (PK) to
        account for rows being removed */
     Handsontable.hooks.add('afterRemoveRow', function() {
       pkCnt=pkCnt-1;
     });
    
    /* set container width (need extra space on right to allow datepicker to
      display properly when the last column is a datetime */
    $('#Screen2').css('width',$(container).width()+300 + 'px');
    
    // populate the approvers drop down 
    $.each(res.approvers, function(index, obj) {
      var option = $('<option />').val(obj.USERID);
      option.text(obj.USERID);
      $("#selApprover").append(option);
    });
    // bind  SUBMIT buttons
    $('.btnSubmit').bind('click',function(){submitData(obj,res.sasdata)})
  
    $('#spinMe').removeClass('spin-overlay');
    $('#imgEditor').height(50);
  });
};



function submitData(obj,data){
  $('#Screen2').hide();

  /* add changed data */
  var h54sTABLE = new h54s.Tables(data, 'jsdata');
  /* create parameters table */
  var myParams = {};
  myParams.ACTION='LOAD';
  myParams.MESSAGE=document.getElementById("editMessage").value 
  myParams.APPROVER=document.getElementById("selApprover").value ;
  myParams.LIBDS=obj;
  h54sTABLE.add([myParams], 'SASControlTable');
  console.log(h54sTABLE);
  adapter.call('/Web/editor',h54sTABLE, function(err, res) {   
    if (res.sasparams[0].STATUS != 'SUCCESS'){
      // display log if not a success
      $('body').append(err);
    } else {
      var libds=getUrlParameter('LIBDS');
      $('#Screen3').show();
      $('#Scr3Header').html('Dataset ' + libds + ' uploaded!');
      $("#Scr3a1").prop("href", "/SASStoredProcess/do?_PROGRAM=/Web/approvals"
        + '&stp_action=DISPLAY_TABLE&stp_table=' + res.sasparams[0].DSID);
      $("#Scr3a2").prop("href","/SASStoredProcess/do?_PROGRAM=/Web/TableViewer"
          + '&STP_TYPE=DATASET&STP_OBJECT=' + libds);
      $("#Scr3a3").prop("href","/SASStoredProcess/do?_PROGRAM=/Web/approvals"
          + '&TABLEID=' + res.sasparams[0].DSID );
    };
  });
};


function getUrlParameter(sParam) {
  //http://stackoverflow.com/questions/19491336/get-url-parameter-jquery
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

