/*
  STP for Table Viewer

*/

/* get Boemska data connector macros */
%inc "SASEnvironment\SASCode\Programs\h54short.sas";

/* load javascript dataset */
%hfsGetDataset(BrowserParams, newSASparams);

data _null_;
  set newSASparams;
  call symputx('STP_ACTION',STP_ACTION);
run;

%macro x;
%if &STP_ACTION=PICKLIBRARY %then %do;
  /* get list of libraries */
  %get_libraries(outds=work.sasdata);
  /* send to browser */
  %hfsHeader;
  %hfsOutDataset(fromSAS,WORK, sasdata);
  %hfsFooter;
%end;
%else %if &STP_ACTION=PICKTABLE %then %do;
  /* find out which library to send tables from */
  data _null_;
    set newSASparams;
    call symputx('STP_LIBRARY',STP_LIBRARY);
  run;

  /* assign library */
  %assign_lib(libref=%scan(&STP_LIBRARY,1,.) )
  
  /* get listing of relevant tables */
  ods output "Library Members" = work.sasdata(where=(memtype='DATA'));
  proc datasets lib = &STP_LIBRARY ; quit;
  ods output close;

  /* send to browser */
  %hfsHeader;
  %hfsOutDataset(fromSAS,WORK, sasdata);
  %hfsFooter;

%end;
%else %if &STP_ACTION=STREAMTABLE %then %do;
  /* find out which table to send */
  data _null_;
    set newSASparams;
    call symputx('LIBDS',LIBDS);
  run;
  
  /* assign library */
  %assign_lib(libref=%scan(&libds,1,.) )
  
  /* chop it (as could be mahoosive) */
  options obs=2000;
  data work.sasdata;
    set &libds;
  run;
  
  /* get list of variables */
  proc sql noprint;
  select quote(trim(name)) into: varlist separated by ","
    from dictionary.columns
    where libname='WORK' and memname='SASDATA';
  
  data sasparams;
    length varlist $32000;
    varlist=symget('varlist');
    LIBDS="&libds";
  run;
  
  /* send it */
  %hfsHeader;
  %hfsOutDataset(dataFromSAS,WORK, sasdata);
  %hfsOutDataset(paramsFromSAS,WORK, sasparams);
  %hfsFooter;
  
%end;

%mend; %x;



/***
  
  Macro to create a list of all the libraries a user has access to.

  @author Allan Bowe @@
  @version 9.2 @@


  
***/
%macro get_libraries(outds=work.libraries /* name of output ds */
  );

/*
  
  flags:

  OMI_SUCCINCT     (2048) Do not return attributes with null values.
  OMI_GET_METADATA (256)  Executes a GetMetadata call for each object that
                          is returned by the GetMetadataObjects method.
  OMI_ALL_SIMPLE   (8)    Gets all of the attributes of the requested object.  
*/
data _null_;
  flags=2048+256+8;
  call symputx('flags',flags,'l');
run;

* use a temporary fileref to hold the response;
filename response temp;
/* get list of libraries */
proc metadata in=
 '<GetMetadataObjects>
  <Reposid>$METAREPOSITORY</Reposid>
  <Type>SASLibrary</Type>
  <Objects/>
  <NS>SAS</NS>
  <Flags>&flags</Flags>
  <Options/>
  </GetMetadataObjects>'
  out=response;
run;

/* write the response to the log for debugging */
data _null_;
  infile response lrecl=32767;
  input;
  put _infile_;
run;

/* create an XML map to read the response */
filename sxlemap temp;
data _null_;
  file sxlemap;
  put '<SXLEMAP version="1.2" name="SASLibrary">';
  put '<TABLE name="SASLibrary">';
  put '<TABLE-PATH syntax="XPath">//Objects/SASLibrary</TABLE-PATH>';
  put '<COLUMN name="LibraryId">><LENGTH>17</LENGTH>';
  put '<PATH syntax="XPath">//Objects/SASLibrary/@Id</PATH></COLUMN>';
  put '<COLUMN name="LibraryName"><LENGTH>256</LENGTH>>';
  put '<PATH syntax="XPath">//Objects/SASLibrary/@Name</PATH></COLUMN>';
  put '<COLUMN name="LibraryRef"><LENGTH>8</LENGTH>';
  put '<PATH syntax="XPath">//Objects/SASLibrary/@Libref</PATH></COLUMN>';
  put '<COLUMN name="Engine">><LENGTH>12</LENGTH>';
  put '<PATH syntax="XPath">//Objects/SASLibrary/@Engine</PATH></COLUMN>';
  put '</TABLE></SXLEMAP>';
run;
libname _XML_ xml xmlfileref=response xmlmap=sxlemap;

/* sort the response by library name */
proc sort data=_XML_.saslibrary out=&outds;
  by libraryname;
run;


/* clear references */
filename sxlemap clear;
filename response clear;
libname _XML_ clear;

%mend;


%macro assign_lib(
    libref=  /* libref that needs to be assigned */
  );
/* assigns a library using meta engine with just a libref */
%if %sysfunc(libref(&libref)) %then %do;
  data _null_;
    length lib_uri LibName $200;
    call missing(of _all_);
    nobj=metadata_getnobj("omsobj:SASLibrary?@Libref='&libref'",1,lib_uri);
    if nobj=1 then do;
       rc=metadata_getattr(lib_uri,"Name",LibName);
       call symputx('LIB',libname,'L');
    end;
    else if nobj>1 then do;
      putlog "ERROR: More than one library registered with libref &libref";
    end;
    else do;
      putlog "ERROR: Library &libref not found in metadata";
    end;
  run;
  libname &libref meta library="&lib";
  %if %sysfunc(libref(&libref)) %then %do;
    %put WARNING: Library &libref not assigned!;
  %end;
%end;
%else %put NOTE: Library &libref is already assigned;
%mend;
