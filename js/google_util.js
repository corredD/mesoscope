// Client ID and API key from the Developer Console
//269053028247-9jg05qr3nr1neeff3q3lnv2dmdkjefa4.apps.googleusercontent.com
//pu02NEoyXsxz1ZhgWqQ87uXD
//AIzaSyCYxfUZ8J1-14pCgfcjNC9Qw2T92wCqoVM

//autopack
//var CLIENT_ID = '269053028247-9jg05qr3nr1neeff3q3lnv2dmdkjefa4.apps.googleusercontent.com';
//var API_KEY = 'AIzaSyCYxfUZ8J1-14pCgfcjNC9Qw2T92wCqoVM';
//mesoscope
var CLIENT_ID = '956173114200-knip5dvjdq22nrhp678v39js1ckrqoq1.apps.googleusercontent.com';
var API_KEY = 'AIzaSyADGusqrHMu-HCWXDINRn3DtUZAFlHQ8n0';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
// TODO: Authorize using one of the following scopes:
//   'https://www.googleapis.com/auth/drive'
//   'https://www.googleapis.com/auth/drive.file'
//   'https://www.googleapis.com/auth/spreadsheets'

var SCOPES = 'https://www.googleapis.com/auth/drive.file';//"https://www.googleapis.com/auth/spreadsheets.readonly";

var created_spreadsheet;
//local storage of our temp spreadShit.
//can use save as to create a new spreadShit
var cached_spreadshitId = localStorage.getItem('spreadshitId');

var authorizeButton = document.getElementById('authorize_button');
var signoutButton = document.getElementById('signout_button');
var createSpreadsheet = document.getElementById('new_spreadsheet');
//

function g_makeApiCall() {
  if (cached_spreadshitId!=="undefined" && typeof cached_spreadshitId!=="undefined" && cached_spreadshitId!== null) {
      console.log(cached_spreadshitId);
      g_printSpreadsheet(cached_spreadshitId);
      g_printSpreadsheetValues(cached_spreadshitId);
  }
  else {
    console.log("create a spreadShit in google");
    var spreadsheetBody = {
      // TODO: Add desired properties to the request body.
      //"title": "mesoscope"
    };
    //should setup the header
    var request = gapi.client.sheets.spreadsheets.create(
      {
        properties: {
          title: 'mesoscope_temp'
        },
        sheets: [ {
                    properties: {
                        title: 'recipe'
                      },
                    "data": [
                      {"startRow": 0,
                        "startColumn": 0,
                        "rowData": [
                          {
                            "values":[
                                {"userEnteredValue": {
                                  "stringValue":"name"
                                }},{"userEnteredValue": {
                                  "stringValue":"uniprot"
                                }},{"userEnteredValue": {
                                  "stringValue":"pdb"
                                }}
                            ]
                          },
                          {
                            "values":[
                              {"userEnteredValue": {
                                "stringValue":"name"
                              }},{"userEnteredValue": {
                                "stringValue":"uniprot"
                              }},{"userEnteredValue": {
                                "stringValue":"pdb"
                              }}
                              ]
                          }
                        ]}]
                    },
                  {
                    properties: {
                        title: 'interaction'
                    }
                  }
                ]
      });
    request.then(function(response) {
      // TODO: Change code below to process the `response` object:
      console.log(response.result);
      created_spreadsheet = response.result;
      localStorage.setItem('spreadshitId', created_spreadsheet.spreadsheetId);
      cached_spreadshitId = created_spreadsheet.spreadsheetId;
      var sid = response.result.spreadsheetId;
      var surl = response.result.spreadsheetUrl;
      var props = response.result.properties;
      g_updateLink(surl);
      console.log(sid);
      console.log(surl);
      console.log(props);
    }, function(reason) {
      console.error('error: ' + reason.result.error.message);
    });
  }
}


var DIALOG_DIMENSIONS = {
        width: 600,
        height: 425
    };
var g_pickerApiLoaded = false;

function g_onApiLoad() {
    gapi.load('picker', {
        'callback': function() {
            g_pickerApiLoaded = true;
        }
    });
    google.script.run.withSuccessHandler(g_createPicker)
        .withFailureHandler(showError).getOAuthToken();
}

function g_createPicker() {
    var ga = gapi.auth2.getAuthInstance();
    if (g_pickerApiLoaded && ga.isSignedIn.get()) {
        var user = ga.currentUser.get();
        var aresponse = user.getAuthResponse(true);
        var token = aresponse.access_token;
        console.log(aresponse);
        //var view = new google.picker.View(google.picker.ViewId.SPREADSHEETS)

        var docsView = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
            .setIncludeFolders(false)
            //.setMimeTypes('application/vnd.google-apps.folder')
            .setOwnedByMe(true)
            .setSelectFolderEnabled(false);

        var picker = new google.picker.PickerBuilder()
            .addView(docsView)
            //.enableFeature(google.picker.Feature.NAV_HIDDEN)
            .hideTitleBar()
            .setSize(DIALOG_DIMENSIONS.width - 2, DIALOG_DIMENSIONS.height - 2)
            .setOAuthToken(token)
            .setDeveloperKey(API_KEY)
            .setCallback(g_pickerCallback)
            .setOrigin('http://localhost:8000')//https://docs.google.com')
            .build();

        picker.setVisible(true);

    } else {
        g_showError('Unable to load the file picker.');
    }
}

/**
 * Download a file's content.
 *
 * @param {File} file Drive File instance.
 * @param {Function} callback Function to call when the request is complete.
 */
function downloadFile(file, callback) {
  if (file.downloadUrl) {
    var accessToken = gapi.auth.getToken().access_token;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', file.downloadUrl);
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.onload = function() {
      callback(xhr.responseText);
    };
    xhr.onerror = function() {
      callback(null);
    };
    xhr.send();
  } else {
    callback(null);
  }
}

/**
 * Print a file's metadata.
 *
 * @param {String} fileId ID of the file to print metadata for.
 */
function printFile(fileId) {
  var request = gapi.client.drive.files.get({
    'fileId': fileId
  });
  request.execute(function(resp) {
    console.log('Title: ' + resp.title);
    console.log('Description: ' + resp.description);
    console.log('MIME type: ' + resp.mimeType);
  });
}

/**
 * A callback function that extracts the chosen document's metadata from the
 * response object. For details on the response object, see
 * https://developers.google.com/picker/docs/result
 *
 * @param {object} data The response object.
 */
function g_pickerCallback(data) {
    var url = 'nothing';
    var id = 0;
    var action = data[google.picker.Response.ACTION];
    if (action == google.picker.Action.PICKED) {
        var doc = data[google.picker.Response.DOCUMENTS][0];
        id = doc[google.picker.Document.ID];
        url = doc[google.picker.Document.URL];
        // Show the ID of the Google Drive folder
        console.log("id is ",cached_spreadshitId,id, typeof id, typeof cached_spreadshitId);
        cached_spreadshitId = id;
        console.log(doc);
        printFile(id);
        //g_printSpreadsheet(cached_spreadshitId);
        //g_printSpreadsheetValues(cached_spreadshitId);
        localStorage.setItem('spreadshitId', cached_spreadshitId);
    } else if (action == google.picker.Action.CANCEL) {
        google.script.host.close();
    }
    message = 'You picked: ' + url;
    document.getElementById('result').innerHTML = id+" "+message;
}

function g_showError(message) {
    document.getElementById('result').innerHTML = 'Error: ' + message;
}

function g_onPickerApiLoad() {
  g_pickerApiLoaded = true;
  //g_createPicker();
}

/**
 *  On load, called to load the auth2 library and API client library.
 */
function g_handleClientLoad() {
  gapi.load('client:auth2', g_initClient);
  gapi.load('picker', g_onPickerApiLoad);
}


/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function g_initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(g_updateSigninStatus);

    // Handle the initial sign-in state.
    g_updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    authorizeButton.onclick = g_handleAuthClick;
    signoutButton.onclick = g_handleSignoutClick;
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function g_updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    authorizeButton.style.display = 'none';
    signoutButton.style.display = 'block';
    createSpreadsheet.style.display = 'block';
    //listMajors();
    //makeApiCall();
    g_makeApiCall();
  } else {
    authorizeButton.style.display = 'block';
    signoutButton.style.display = 'none';
    createSpreadsheet.style.display = 'none';
  }
}

/**
 *  Sign in the user upon button click.
 */
function g_handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function g_handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}


function pickDriveSpreadSheet(){
  g_createPicker();
}
/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function g_appendPre(message) {
  var pre = document.getElementById('content');
  var textContent = document.createTextNode(message + '\n');
  pre.appendChild(textContent);
}
//g_updateLink(surl);

function g_updateLink(url){
  document.getElementById('temp_spreadsheet').innerHTML = '<a href="'+url+'" target="_blank">temporary spreasheet</a>';
}

function g_updateSpreadsheetValues(spreadsheetId, range, valueInputOption, _values, callback) {
  // [START updateValues]
  var values = [
    [
      // Cell values ...
    ],
    // Additional rows ...
  ];
  // [START_EXCLUDE silent]
  values = _values;
  // [END_EXCLUDE]
  var body = {
    values: values
  };
  gapi.client.sheets.spreadsheets.values.update({
     spreadsheetId: spreadsheetId,
     range: range,
     valueInputOption: valueInputOption,
     resource: body
  }).then((response) => {
    var result = response.result;
    console.log(`${result.updatedCells} cells updated.`);
    // [START_EXCLUDE silent]
    callback(response);
    // [END_EXCLUDE]
  });
}

/*function g_updateCellSpreadsheet(spreadsheetId)
{
  var params = {
    "rows":[{
      "values": [
          {
            "userEnteredValue": {
              "numberValue": number // "stringValue": string,"boolValue": boolean,"formulaValue": string,
            },
            "effectiveValue": {
              "numberValue": number
            },
            "formattedValue": string,
            "userEnteredFormat": {//https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#CellFormat
              object(CellFormat)
            },
            "effectiveFormat": {
              object(CellFormat)
            },
            "hyperlink": string,
            "note": string,
            "textFormatRuns": [
              {
                object(TextFormatRun)
              }
            ],
            "dataValidation": {
              object(DataValidationRule)
            },
            "pivotTable": {
              object(PivotTable)
            }
          }
        ]
    }],
    "start" : {
      "sheetId": number,
      "rowIndex": number,
      "columnIndex": number
    }
    "range":{
      "sheetId": number,
      "startRowIndex": number,
      "endRowIndex": number,
      "startColumnIndex": number,
      "endColumnIndex": number
    }
  };
}
*/
function g_printSpreadsheet(spreadsheetId){
  var params = {
          // The spreadsheet to request.
          spreadsheetId: spreadsheetId,

          // The ranges to retrieve from the spreadsheet.
          ranges: [],

          // True if grid data should be returned.
          // This parameter is ignored if a field mask was set in the request.
          includeGridData: true,  // TODO: Update placeholder value.
        };

        var request = gapi.client.sheets.spreadsheets.get(params);
        request.then(function(response) {
          // TODO: Change code below to process the `response` object:
          console.log('response: ' ,response.result);
          var sid = response.result.spreadsheetId;
          var surl = response.result.spreadsheetUrl;
          var props = response.result.properties;
          g_updateLink(surl);
          created_spreadsheet = response.result;
        }, function(reason) {
          console.log(reason);
          console.error('error: ' + reason.result.error.message);
        });
}

function g_printSpreadsheetValues(spreadsheetId){
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'A1:C2',
  }).then(function(response) {
    var range = response.result;
    console.log('response Values: ' ,range);
    if (range.values.length > 0) {
      g_appendPre('data :');
      for (i = 0; i < range.values.length; i++) {
        var row = range.values[i];
        // Print columns A and E, which correspond to indices 0 and 4.
        var astr=i+" ";
        for (j=0;j<row.length;j++) astr+=row[j]+" ";
        g_appendPre(astr);
      }
    } else {
      g_appendPre('No data found.');
    }
  }, function(response) {
    g_appendPre('Error: ' + response.result.error.message);
  });
}
/**
 * Print the names and majors of students in a sample spreadsheet:
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 */
function g_listMajors() {
  gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    range: 'Class Data!A2:E',
  }).then(function(response) {
    var range = response.result;
    if (range.values.length > 0) {
      g_appendPre('Name, Major:');
      for (i = 0; i < range.values.length; i++) {
        var row = range.values[i];
        // Print columns A and E, which correspond to indices 0 and 4.
        g_appendPre(row[0] + ', ' + row[4]);
      }
    } else {
      g_appendPre('No data found.');
    }
  }, function(response) {
    g_appendPre('Error: ' + response.result.error.message);
  });
}
