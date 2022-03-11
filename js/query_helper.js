var rcsb_url = "https://www.rcsb.org";
var current_list_pdb;
var custom_report_uniprot_only = false;
var cumulative_res = {
  "pdbs": null,
  "mols": null
};
//serialized is hardcoded
var cp_fiber_description = {};

//computation on server
var current_compute_index = 0;
var current_compute_node;
var stop_current_compute = false;
var query_illustrate = false;

//so we can use the mgl2 copy and put there some computed geometry
var opm_url = "https://opm-assets.storage.googleapis.com/pdb/"
var pmv_server = "cgi-bin/get_geom_dev.cgi"; //(local_host_dev)?"cgi-bin/get_geom_dev.cgi":
var sql_server = "cgi-bin/cellpack_db_dev.cgi"; //(local_host_dev)?"cgi-bin/cellpack_db_dev.cgi":
var cellpack_repo = "http://mgldev.scripps.edu/projects/autoPACK/data/cellPACK_data/cellPACK_database_1.1.0/";
cellpack_repo = "https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/";//"https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/";
//use mgl2
var local_host_dev = false;
if (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.hostname === "") {
  alert("It's a local server!");
  local_host_dev = false;
  var jscd = Util_ClientDetection(this);//setup windows.jscd
  alert(
    'OS: ' + jscd.os + ' ' + jscd.osVersion + '\n' +
    'Browser: ' + jscd.browser + ' ' + jscd.browserMajorVersion +
    ' (' + jscd.browserVersion + ')\n' +
    'Mobile: ' + jscd.mobile + '\n' +
    'Flash: ' + jscd.flashVersion + '\n' +
    'Cookies: ' + jscd.cookies + '\n' +
    'Screen Size: ' + jscd.screen + '\n\n' +
    'Full User Agent: ' + navigator.userAgent
  );
  if (jscd.os === "Windows") {
    pmv_server = "https://mesoscope.scripps.edu/beta/cgi-bin/get_geom_dev.cgi"; //(local_host_dev)?"cgi-bin/get_geom_dev.cgi":
    sql_server = "https://mesoscope.scripps.edu/beta/cgi-bin/cellpack_db_dev.cgi"; //(local_host_dev)?"cgi-bin/cellpack_db_dev.cgi":
  }
  //cellpack_repo = "https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/";
  cellpack_repo = "https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/";
}


function BuildQuery(textQuery) {
  var query = "<orgPdbQuery>";
  query += "<queryType>org.pdb.query.simple.AdvancedKeywordQuery</queryType>";
  query += "<description>Text Search for: " + textQuery + "</description>";
  query += "<keywords>" + textQuery + "</keywords>";
  query += "</orgPdbQuery>";
  return query;
}

function BuildSequenceQuery(sqceQuery) {
  var query = "<orgPdbQuery>";
  query += "<queryType>org.pdb.query.simple.SequenceQuery</queryType>";
  query += "<description>Sequence Search: Expectation Value = 10.0, Search Tool = BLAST</description>";
  query += "<sequence>" + sqceQuery + "</sequence>";
  query += "<eCutOff>10.0</eCutOff>";
  query += "<searchTool>blast</searchTool>";
  query += "<sequenceIdentityCutoff>30</sequenceIdentityCutoff>";
  query += "</orgPdbQuery>";
  return query;
}


function submitJson_form(query_uniprot){
  var query = {}
  query.type = "group";
  query.logical_operator = "and";
  var node1 = {"type": "terminal",
  "service": "text",
  "parameters": {
    "operator": "exact_match",
    "value": query_uniprot,
    "attribute": "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession"
  }}
  var node2={"type": "terminal",
  "service": "text",
  "parameters": {
    "operator": "exact_match",
    "value": "UniProt",
    "attribute": "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_name"
  }}
  query.nodes = [node1,node2];
  var url = "https://search.rcsb.org/rcsbsearch/v1/query?json=" + encodeURIComponent(JSON.stringify ({query:query,return_type : "polymer_entity"}));
  console.log(url);
  callAjax(url, reportResultcb, "");
}

function reportResultcb(results){
  console.log(results);
  var result = JSON.parse(results);
  var cdata = CreateDataColumnFromRCSBJson(result);
  console.log(cdata);
  var tabId = 4;
  if (gridArray.length <= 3) {
    //add a grid from the csv data test
    var options = CreateOptions();
    var parentId = "tabs-" + tabId;
    if (cdata.data.length > 0) cdata.data[0].picked = true;
    var g = CreateGrid("grid_pdb", parentId, cdata.data, cdata.column, options);
    //g.registerPlugin(checkboxSelector);
    //force redraw of the grid with resize?
  }
  else
  {
    if (cdata.data.length > 0) {
      cdata.data[0].picked = true;
      pdb_picked = 0;
    }
    pdb_picked = 0;
    cdata.column.push({
      id: "picked",
      name: "picked",
      field: "picked",
      formatter: Slick.Formatters.Checkmark,
      editor: Slick.Editors.Checkbox
    });
    //cdata.column.unshift(uniprot_detailView.getColumnDefinition());
    cdata.column.unshift({
      id: "preview",
      name: "preview",
      field: "preview",
      formatter: renderImageCell
    });
    UpdateGrid(cdata, 3);
    if (usesavedSession) {
      //var querytxt = document.getElementById("LoaderTxt").innerHTML.split(" : ")[1];
      //slice the data
      //only store 20
      //var rowsids = gridArray[0].getSelectedRows();
      //cdata.data.splice(20, cdata.data.length - 20);
      //sessionStorage.setItem("pdb_"+rowsids[0],JSON.stringify({"query":querytxt,"data":cdata}));
    }
    //update the recipe grid with first element
    if (cdata.data.length) {
      var rowsids = gridArray[0].getSelectedRows();
      if (rowsids && rowsids.length > 0) {
        var row = gridArray[0].dataView.getItem(rowsids[0]);
        //row.label = test[0]["Protein names"].split("(")[0];
        row.uniprot = cdata.data[0].uniprotAcc;
        row.label = cdata.data[0].uniprotRecommendedName;
        if (custom_report_uniprot_only === false) row.pdb = cdata.data[0].structureId;
        gridArray[0].dataView.beginUpdate();
        gridArray[0].invalidateRow(row.id);
        gridArray[0].dataView.updateItem(row.id, row);
        gridArray[0].dataView.endUpdate();
        gridArray[0].render();
        gridArray[0].dataView.refresh();
        //trigger cellchange?
        SyncTableGraphCell(row.id, "uniprot", "uniprot"); //update the graph
        SyncTableGraphCell(row.id, "label", "label"); //update the graph this overwrite any label
        SyncTableGraphCell(row.id, "pdb", "pdb"); //update the graph
        //SyncTableGraphCell(row.id,"pdb","pdb");//update the graph molecular weight
        //group by structureId
        groupByElem_cb(3, "structureId");
        gridArray[3].render();
        gridArray[3].dataView.refresh();
        UpdateUniPDBcomponent(row.uniprot);
        setupProVista(row.uniprot);
      }
    }
  }
  grid_tab_label[3].text ( cdata.data.length.toString() );
  current_list_pdb = "";
  cumulative_res = {
    "pdbs": null,
    "mols": null
  };
  custom_report_uniprot_only = false;  
}

//PDB text search
function submitForm(xmlText, querytxt) {
  console.log(xmlText);
  var queryXML = xmlText; //document.getElementById('xmlText').value;
  if (queryXML.length > 0) {
    console.log(queryXML);
    queryXML = checkComparator(queryXML);
    console.log(queryXML);
    var xmlText = encodeURIComponent(queryXML);
    var sorting = "rank Descending";
    //var restUrl="https://www.rcsb.org/pdb/rest/search/?sortfield=rank Descending";
    //var restUrl="/pdb/rest/search/"+(sorting?"?sortfield="+sorting:"")
    console.log(rcsb_url + "/pdb/rest/search/?req=browser" + (sorting ? "&sortfield=" + sorting : ""));
    $.post(rcsb_url + "/pdb/rest/search/?req=browser" + (sorting ? "&sortfield=" + sorting : ""), xmlText, //rcsb_url+"/pdb/rest/search/?sortfield=rank Descending?req=browser"
      function(data) {
        var spl = data.trim().split("\n");
        var rs = 0;
        var h = "<p>";
        var qrid = null;
        var onReportPage = "o";
        if (onReportPage == "n") {
          for (var spliti = 0; spliti < spl.length; spliti++) {
            var it = spl[spliti].replace(/[\n\t\r]/g, "");
            if (it.length < 4) {
              h += '<a href="' + rcsb_url + '/pdb/ligand/ligandsummary.do?hetId=' + it + '">' + it + '</a> '
              rs++;
            } else if (it.length == 4) {
              h += '<a href="' + rcsb_url + '/pdb/explore.do?structureId=' + it + '">' + it + '</a> ';
              rs++;
            } else if ((it.length > 4) && (it.indexOf(".") > 0)) {
              h += '<a href="' + rcsb_url + '/pdb/explore/remediatedSequence.do?structureId=' + it.substring(0, 4) + '&params.chainEntityStrategyStr=all&forcePageForChain=' + it.substring(5) + '">' + it + '</a> ';
              rs++;
            } else if ((it.length > 4) && (it.indexOf(":") > 0)) {
              h += '<a href="' + rcsb_url + '/pdb/explore/remediatedSequence.do?structureId=' + it.substring(0, 4) + '">' + it + '</a> ';
              rs++;
            } else if (it.length > 4 && spliti > 0 && rs > 0) {
              h += '<br/><br/><a href="' + rcsb_url + '/pdb/results/results.do?qrid=' + it + '">View results</a> ';
              qrid = it;
            }
          }
          h += "</p>";
          h = "<p>" + rs + " results</p>" + h;
        } else {
          h = "";
          for (var spliti = 0; spliti < spl.length; spliti++) {
            var it = spl[spliti].replace(/[\n\t\r]/g, "");
            if ((h.length > 0) && (it.length <= 4)) {
              h += ",";
            }
            if ((h.length > 0) && (it.length > 4) && ((it.indexOf(".") > 0) || (it.indexOf(":") > 0))) {
              h += ",";
            }
            if ((it.length == 4) || (it.indexOf(".") > 0) || (it.indexOf(":") > 0)) {
              h += it; //put more infor in it ?
            } else if (it.length > 4) {
              qrid = it;
            }
          }
        }
        //$('#restResults').html(h);
        current_list_pdb = h;
        cumulative_res = {
          "pdbs": null,
          "mols": null
        };
        //h = h.split(",");//this is a PDB list
        //http://www.rcsb.org/pdb/rest/describePDB?structureId=4hhb,1hhb
        //http://www.rcsb.org/pdb/rest/describeMol?structureId=4hhb,4hhb
        //http://www.rcsb.org/pdb/rest/customReport.csv?pdbids=*&reportName=Sequence&service=wsfile&format=csv
        //http://www.rcsb.org/pdb/rest/customReport.xml?pdbids=1stp,2jef,1cdg&customReportColumns=structureId,structureTitle,experimentalTechnique
        //feed the grid  as well
        //build a new grid if doesnt exist
        //describePDB();
        customReport(querytxt);
        /*h=h.split(",")
						var tabId = document.getElementById("grid_pdb");
						//if (!tabId) tabId = AddTab("Uniprot Search","grid_uniprot");
					  if (gridArray.length <= 3 ) {
					  	 //add a grid from the csv data test
					  	 var cdata = CreateDataColumnFromPDBList(h);
						   var options = CreateOptions();
						   var parentId = "tabs-"+tabId;
						   if (cdata.data.length > 0) cdata.data[0].picked = true;
						   var g = CreateGrid("grid_pdb",parentId,cdata.data,cdata.column,options);
						   //g.registerPlugin(checkboxSelector);
						   //force redraw of the grid with resize?
					  	}
					  else {
					  	var cdata = CreateDataColumnFromPDBList(h);
					  	if (cdata.data.length > 0) cdata.data[0].picked = true;
					  	UpdateGrid(cdata,3)
					  	}
					  pdb_picked = 0;
					  var toload = h.slice(0,5);
            NGLg_loadList(toload);//ngl
             //document.getElementById('qridHidden').value=qrid;
              */
      }
    );
  } else {
    alert("Please enter a query in the text box.");
  }
  return false;

}

function describeMolcb(response, txt) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(response, "text/xml");
  console.log(xmlDoc);
  cumulative_res.mols = xmlDoc;
  OnFinishPDB();
}

function describePDBcb(response, txt) {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(response, "text/xml");
  cumulative_res.pdbs = xmlDoc;
  console.log(xmlDoc);
  //once this is done, call the mol
  var url = "http://www.rcsb.org/pdb/rest/describeMol?structureId=" + current_list_pdb;
  console.log(url);
  callAjax(url, describeMolcb, "");

}

function describePDB() {
  var url = "http://www.rcsb.org/pdb/rest/describePDB?structureId=" + current_list_pdb;
  console.log(url);
  callAjax(url, describePDBcb, "");
}

function customReportCB(response, querytxt) {
  var data = d3v4.csvParse(response);
  console.log(data);
  //table from csv
  var tabId = 4;
  if (gridArray.length <= 3) {
    //add a grid from the csv data test
    var cdata = CreateDataColumnFromCVS(data);
    var options = CreateOptions();
    var parentId = "tabs-" + tabId;
    if (cdata.data.length > 0) cdata.data[0].picked = true;
    var g = CreateGrid("grid_pdb", parentId, cdata.data, cdata.column, options);
    //g.registerPlugin(checkboxSelector);
    //force redraw of the grid with resize?
  }
  else
  {
    var cdata = CreateDataColumnFromCVS(data);
    if (cdata.data.length > 0) {
      cdata.data[0].picked = true;
      pdb_picked = 0;
    }
    pdb_picked = 0;
    cdata.column.push({
      id: "picked",
      name: "picked",
      field: "picked",
      formatter: Slick.Formatters.Checkmark,
      editor: Slick.Editors.Checkbox
    });
    //cdata.column.unshift(uniprot_detailView.getColumnDefinition());
    cdata.column.unshift({
      id: "preview",
      name: "preview",
      field: "preview",
      formatter: renderImageCell
    });
    UpdateGrid(cdata, 3);
    if (usesavedSession) {
      //var querytxt = document.getElementById("LoaderTxt").innerHTML.split(" : ")[1];
      //slice the data
      //only store 20
      //var rowsids = gridArray[0].getSelectedRows();
      //cdata.data.splice(20, cdata.data.length - 20);
      //sessionStorage.setItem("pdb_"+rowsids[0],JSON.stringify({"query":querytxt,"data":cdata}));
    }
    //update the recipe grid with first element
    if (data.length) {
      var rowsids = gridArray[0].getSelectedRows();
      if (rowsids && rowsids.length > 0) {
        var row = gridArray[0].dataView.getItem(rowsids[0]);
        //row.label = test[0]["Protein names"].split("(")[0];
        row.uniprot = cdata.data[0].uniprotAcc;
        row.label = cdata.data[0].uniprotRecommendedName;
        if (custom_report_uniprot_only === false) row.pdb = cdata.data[0].structureId;
        gridArray[0].dataView.beginUpdate();
        gridArray[0].invalidateRow(row.id);
        gridArray[0].dataView.updateItem(row.id, row);
        gridArray[0].dataView.endUpdate();
        gridArray[0].render();
        gridArray[0].dataView.refresh();
        //trigger cellchange?
        SyncTableGraphCell(row.id, "uniprot", "uniprot"); //update the graph
        SyncTableGraphCell(row.id, "label", "label"); //update the graph this overwrite any label
        SyncTableGraphCell(row.id, "pdb", "pdb"); //update the graph
        //SyncTableGraphCell(row.id,"pdb","pdb");//update the graph molecular weight
        //group by structureId
        groupByElem_cb(3, "structureId");
        gridArray[3].render();
        gridArray[3].dataView.refresh();
        UpdateUniPDBcomponent(row.uniprot);
        setupProVista(row.uniprot);
      }
    }
  }
  grid_tab_label[3].text ( data.length.toString() );
  current_list_pdb = "";
  cumulative_res = {
    "pdbs": null,
    "mols": null
  };
  custom_report_uniprot_only = false;
}

//this return xml contents
function customReport(querytxt) {
  var url = "https://www.rcsb.org/pdb/rest/customReport.csv?pdbids=" + current_list_pdb;
  url += "&customReportColumns="
  url += "structureId,structureTitle,experimentalTechnique,uniprotRecommendedName,uniprotAcc,"
  url += "geneName,taxonomyId,taxonomy,structureMolecularWeight,molecularWeight"
  url += "&format=csv&service=wsfile";
  console.log(url);
  callAjax(url, customReportCB, querytxt);
}

function OnFinishPDB() {
  //check cumulative_res
  //return;
  //console.log(current_list_pdb.split(","));
  //console.log(current_list_pdb);
  var pdbs = [];
  var count = 0;
  console.log(cumulative_res);
  var alldesc = cumulative_res.pdbs.getElementsByTagName("PDB");
  console.log(alldesc);
  //getAttributeNode
  for (var i = 0; i < alldesc.length; i++) {
    var elem = alldesc[i];
    console.log(elem);
    console.log(elem.getAttributeNode("title"));
    pdbs.push({
      "pdb": elem.getAttributeNode("structureId").value,
      "title": elem.getAttributeNode("title").value,
      "id": i
    });
  }
  var allmol = cumulative_res.mols.getElementsByTagName("structureId");
  console.log(allmol);
  for (var i = 0; i < allmol.length; i++) {
    var elem = allmol[i];
    pdbs[i].polymer = elem;
    //pdbs[i].taxonomy = "";// polymer.getElementsByTagName("Taxonomy");//.getAttributeNode("name").value;
    pdbs[i].picked = false;
  }

  var tabId = document.getElementById("grid_pdb");
  //if (!tabId) tabId = AddTab("Uniprot Search","grid_uniprot");
  if (gridArray.length <= 3) {
    //add a grid from the csv data test
    //var cdata = CreateDataColumnFromPDBList(current_list_pdb.split(","));
    var cdata = CreateDataColumnFromPDBData(pdbs);
    var options = CreateOptions();
    var parentId = "tabs-" + tabId;
    if (cdata.data.length > 0) cdata.data[0].picked = true;
    var g = CreateGrid("grid_pdb", parentId, cdata.data, cdata.column, options);
    //g.registerPlugin(checkboxSelector);
    //force redraw of the grid with resize?
  } else {
    var cdata = CreateDataColumnFromPDBData(pdbs);
    //var cdata = CreateDataColumnFromPDBList(current_list_pdb.split(","));
    if (cdata.data.length > 0) cdata.data[0].picked = true;
    UpdateGrid(cdata, 3)
  }
  pdb_picked = 0;
  //var toload = h.slice(0,5);
  // NGLg_loadList(toload);//ngl
}

function checkComparator(queryXML) {
  while (queryXML.indexOf(".comparator=< ") > -1) {
    queryXML = queryXML.replace(".comparator=< ", ".comparator=<![CDATA[<]]>");
  }
  while (queryXML.indexOf(".comparator><<") > -1) {
    queryXML = queryXML.replace(".comparator><<", ".comparator><![CDATA[<]]><");
  }
  while (queryXML.indexOf(".comparator=> ") > -1) {
    queryXML = queryXML.replace(".comparator=> ", ".comparator=<![CDATA[>]]>");
  }
  while (queryXML.indexOf(".comparator>><") > -1) {
    queryXML = queryXML.replace(".comparator>><", ".comparator><![CDATA[>]]><");
  }
  return queryXML;
}

//uniprot query
//https://www.uniprot.org/uniprot/?query=insulin&sort=score&columns=id,entry,name,reviewed&format=tab
//https://github.com/calipho-sib/feature-viewer
//http://mgldev.scripps.edu/projects/prolist/extras/biovizJS/example/index.html
//http://mgldev.scripps.edu/projects/prolist/extras/pfv/minimal_compiled.html
//https://www.uniprot.org/uniprot/?query=HIV1+ENV+4nco+0+1+1&sort=score&columns=id,entry%20name,reviewed,protein%20names,genes,organism,length&format=tab
//query using the protein entry name or label in the spreadshit

function uniprotReadyCallBack(htmlResponse, querytxt) {
  //update pfv
  //update the spreadshit with uniprot Id
  //split the row and get the IDs
  var rowsids = gridArray[0].getSelectedRows();
  if (DEBUGLOG) {
    console.log("in callback");
    console.log(rowsids);
    console.log(htmlResponse);
  }
  //localStorage.getItem( 'savedState' );
  var test = d3v4.tsvParse(htmlResponse);
  //var names = [];
  //var entrys = [];
  //for (var i=0;i<test.length;i++) {
  //	names.push(test[i]["Protein names"].split("(")[0]);
  //	entrys.push(test[i].Entry);
  //	}

  if (test.length) {
    var row = gridArray[current_grid].dataView.getItem(rowsids[0]);
    row.label = test[0]["Protein names"].split("(")[0];
    row.uniprot = test[0].Entry;
    gridArray[0].dataView.beginUpdate();
    gridArray[0].invalidateRow(row.id);
    gridArray[0].dataView.updateItem(row.id, row);
    gridArray[0].dataView.endUpdate();
    gridArray[0].render();
    gridArray[0].dataView.refresh();
    //trigger cellchange?
    SyncTableGraphCell(row.id, "label", "label"); //update the graph
  }
  //build a new grid if doesnt exist
  var tabId = 3; //document.getElementById("grid_uniprot");
  if (!tabId) tabId = AddTab("Uniprot Search", "grid_uniprot");
  if (gridArray.length <= 2) {
    //add a grid from the csv data test
    var cdata = CreateDataColumnFromCVS(test);
    var options = CreateOptions();
    var parentId = "tabs-" + tabId;
    if (cdata.data.length > 0) cdata.data[0].picked = true;
    var g = CreateGrid("grid_uniprot", parentId, cdata.data, cdata.column, options);
    //g.registerPlugin(checkboxSelector);
    //force redraw of the grid with resize?
  } else {
    var cdata = CreateDataColumnFromCVS(test);
    if (cdata.data.length > 0) {
      cdata.data[0].picked = true;
      uni_picked = 0;
    }
    cdata.column.push({
      id: "picked",
      name: "picked",
      field: "picked",
      formatter: Slick.Formatters.Checkmark,
      editor: Slick.Editors.Checkbox
    });
    //nee to update the column
    cdata.column.unshift(uniprot_detailView.getColumnDefinition());
    UpdateGrid(cdata, 2);
    if (usesavedSession) {
      //var querytxt = document.getElementById("LoaderTxt").innerHTML.split(" : ")[1];
      //cdata.data = cdata.data.slice(0,20);
      //cdata.data.splice(20, cdata.data.length - 20);
      //sessionStorage.setItem("uni_"+rowsids[0],JSON.stringify({"query":querytxt,"data":cdata}));
    }
    //update tabs
    grid_tab_label[2].text(cdata.data.length.toString());
  }
  uni_picked = 0;
  //sessionStorage - key is the row id

  //CreateGridFromD3Links(links,"grid_interaction",2,"Interaction");
}

//https://www.uniprot.org/uniprot/?query=mpn391&sort=score&columns=id%2Centry%20name%2Creviewed%2Cprotein%20names%2Cgenes%2Corganism%2Clength%2Csequence%2Ccomment(FUNCTION)%2Ccomment(SUBUNIT%20STRUCTURE)%2Cgo(molecular%20function)%2Cgo(cellular%20component)%2Ccomment(SUBCELLULAR%20LOCATION)%2Cfeature(TOPOLOGICAL%20DOMAIN)%2Cfeature(TRANSMEMBRANE)%2Cfeature(INTRAMEMBRANE)%2Cfeature(MODIFIED%20RESIDUE)%2Cfeature(SIGNAL)%2C3d%2Cdatabase(PDB)%2Cdatabase(ProteinModelPortal)%2Cdatabase(Pfam)
function queryUniportKBfromName(aname) {
  grid_tab_label[2].text( "" );
  console.log("query");
  document.getElementById("LoaderTxt").innerHTML = "query uniprot : " + aname.split("_").join("+");
  var querytxt = aname.split("_").join("+");
  var dosearch = true;
  if (usesavedSession) {

    var rowsids = gridArray[0].getSelectedRows();
    var savedData = sessionStorage.getItem("uni_" + rowsids[0]); //,{"query":querytxt,"data":cdata}
    //if (savedData !== null) console.log("found ",savedData.query,querytxt,savedData.query === querytxt);
    if (savedData !== null) {
      var d = JSON.parse(savedData);
      if (d.query === querytxt) {
        d.data.column.forEach(function(c) {
          c.editor = Slick.Editors.Text;
        });
        d.data.column.push({
          id: "picked",
          name: "picked",
          field: "picked",
          formatter: Slick.Formatters.Checkmark,
          editor: Slick.Editors.Checkbox
        });
        d.data.column.unshift(uniprot_detailView.getColumnDefinition());
        UpdateGrid(d.data, 2);
        dosearch = false;
      }
    }
  }
// /https://www.uniprot.org/uniprot/?query=Platelet%20glycoprotein%204&columns=id%2Centry%20name%2Creviewed%2Cprotein%20names%2Cgenes%2Corganism%2Clength%2C3d&sort=score
  if (dosearch) {
    var uni_column = "id%2Centry%20name%2Creviewed%2Cprotein%20names%2Cgenes%2Corganism%2Clength%2Csequence%2C3d%2Ccomment(FUNCTION)%2Ccomment(SUBUNIT%20STRUCTURE)%2Cgo(molecular%20function)%2Cgo(cellular%20component)%2Ccomment(SUBCELLULAR%20LOCATION)%2Cfeature(TOPOLOGICAL%20DOMAIN)%2Cfeature(TRANSMEMBRANE)%2Cfeature(INTRAMEMBRANE)%2Cfeature(MODIFIED%20RESIDUE)%2Cfeature(SIGNAL)%2C3d%2Cdatabase(PDB)%2Cdatabase(ProteinModelPortal)%2Cdatabase(Pfam)"
    //uni_column = "id,protein%20names";
    //var url = "https://www.uniprot.org/uniprot/?query="+aname.split("_").join("+")+"&sort=score&columns=id,entry%20name,reviewed,protein%20names,genes,organism,length&format=tab";
    var url = "https://www.uniprot.org/uniprot/?query=" + aname.split("_").join("+") +
      "&sort=score&columns=" + uni_column + "&format=tab";
    console.log(url);
    //var url = "https://www.uniprot.org/uniprot/?query="+aname.split("_").join("+")+"&sort=score&columns=id,entry,name,reviewed&format=tab";
    callAjax(url, uniprotReadyCallBack, querytxt);
    //pureAjax(url,uniprotReadyCallBack,"txt");
  }
}

//should build a table per results
//result_pdb - gridArra[2]
//result_uniprot- gridArra[3]

//https://www.rcsb.org/pdb/results/grid_reports/gridReport.do?
//reportTitle=Custom%20Report&customReportColumns=
//dimEntity.structureId,dimEntity.chainId,dimEntity.taxonomyId,dimEntity.cellularComponent,dimEntity.db_id,dimEntity.db_name,dimEntity.molecularWeight,dimEntity.entityMacromoleculeType&format=csv
//all possible field interesting
//structureId,chainId,structureTitle,experimentalTechnique,depositionDate,releaseDate,
//revisionDate,ndbId,resolution,classification,structureMolecularWeight,macromoleculeType,
//structureAuthor,residueCount,atomSiteCount,pdbDoi,entityId,sequence,chainLength,db_id,db_name,
//molecularWeight,secondaryStructure,entityMacromoleculeType,compound,plasmid,source,
//taxonomyId,biologicalProcess,cellularComponent,molecularFunction,ecNo,expressionHost
function queryPDBfromName(aname) {
  grid_tab_label[3].text( "" );
  document.getElementById("LoaderTxt").innerHTML = "query PDB : " + aname.split("_").join(" ");
  var querytxt = aname.split("_").join(" ");
  var dosearch = true;
  if (usesavedSession) {

    var rowsids = gridArray[0].getSelectedRows();
    var savedData = sessionStorage.getItem("pdb_" + rowsids[0]); //,{"query":querytxt,"data":cdata}
    //if (savedData !== null) console.log("found ",savedData.query,querytxt,savedData.query === querytxt);
    if (savedData !== null) {
      var d = JSON.parse(savedData);
      if (d.query === querytxt) {
        d.data.column.forEach(function(c) {
          c.editor = Slick.Editors.Text;
        });
        d.data.column.push({
          id: "picked",
          name: "picked",
          field: "picked",
          formatter: Slick.Formatters.Checkmark,
          editor: Slick.Editors.Checkbox
        });
        //d.data.column.unshift(uniprot_detailView.getColumnDefinition());
        UpdateGrid(d.data, 3);
        dosearch = false;
      }
    }
  }
  if (dosearch) {
    var query = BuildQuery(aname.split("_").join(" "));
    submitForm(query, querytxt);//submitJson_form
  }
}

function queryPDBfromUniprot(uniprot) {
  grid_tab_label[3].text( "" );
  document.getElementById("LoaderTxt").innerHTML = "query Uniprot : " + uniprot;
  submitJson_form(uniprot);
}

function queryPDBfromSequence(sequence) {
  grid_tab_label[3].text( "" );
  document.getElementById("LoaderTxt").innerHTML = "query sequence : " + sequence;;
  var querytxt = sequence;
  if (usesavedSession) {

    var rowsids = gridArray[0].getSelectedRows();
    var savedData = sessionStorage.getItem("pdb_" + rowsids[0]); //,{"query":querytxt,"data":cdata}
    //if (savedData !== null) console.log("found ",savedData.query,querytxt,savedData.query === querytxt);
    if (savedData !== null) {
      var d = JSON.parse(savedData);
      if (d.query === querytxt) {
        d.data.column.forEach(function(c) {
          c.editor = Slick.Editors.Text;
        });
        d.data.column.push({
          id: "picked",
          name: "picked",
          field: "picked",
          formatter: Slick.Formatters.Checkmark,
          editor: Slick.Editors.Checkbox
        });
        //d.data.column.unshift(uniprot_detailView.getColumnDefinition());
        UpdateGrid(d.data, 3);
        dosearch = false;
      }
    }
  }
  var query = BuildSequenceQuery(sequence);
  submitForm(query, sequence);
}

//should replace with the ePDB Rest
function SetSequenceMapping(xmldata){
  //node_selected.data.xmldata = xmldata;//for debug
  //set up the obect that will hold the seq mapping.
  //the server should actually return the mapping directly in json
  var entity = xmldata.getElementsByTagName("entity");
  var mapping = [];//entity number = {"topdb":{},"touni":{}}
  var umapping = {};
  //mapping uniacces: entity-chain , res-res
  //should have the same entity number in ngl_structure
  var ngl_entity_mapping = {};
  var nEntity = ngl_current_structure.structure.entityList.length;
  for (var i=0;i<nEntity;i++){
    ngl_entity_mapping[(i+1).toString()]="";
  }
  for (var i =0;i<entity.length;i++) {
    var entity_mapping = {"entityId":entity[i].getAttribute("entityId"),"uniId":"","chainId":"","mapping":{}};//chain
    var residues = entity[i].getElementsByTagName("residue");
    for (var j =0;j<residues.length;j++) {
      //actual number from protvista
      var dbResNum = residues[j].getAttribute("dbResNum");//what this number correspond to ?
      var crossRefDb = residues[j].getElementsByTagName("crossRefDb");//first two child
      var pdbResNum;
      var uniResNum;
      var uniaccess;
      var chainId;
      var found1 = false;
      var found2 = false;
      for (var k =0;k<crossRefDb.length;k++) {
          if (crossRefDb[k].getAttribute("dbSource") === "PDB") {
            pdbResNum = parseInt(crossRefDb[k].getAttribute("dbResNum"));
            chainId = crossRefDb[k].getAttribute("dbChainId");
            //entity_mapping[dbResNum] = pdbResNum;
            found1 = true;
          }
          if (crossRefDb[k].getAttribute("dbSource") === "UniProt") {
            uniResNum = parseInt(crossRefDb[k].getAttribute("dbResNum"));
            uniaccess = crossRefDb[k].getAttribute("dbAccessionId");
            //entity_mapping[dbResNum] = pdbResNum;
            if (!(uniaccess in umapping)) umapping[uniaccess] = {chainId:{"umapping":{},"mapping":{}}};
            if (!(chainId in umapping[uniaccess])) umapping[uniaccess][chainId] = {"umapping":{},"mapping":{}};
            found2 = true;
          }
      }
      if ((found1&&found2)&&(uniResNum && pdbResNum && uniaccess && chainId)){
        //if (entity_mapping.uniId === "") entity_mapping.uniId = uniaccess;
        //if (entity_mapping.chainId === "") entity_mapping.chainId = chainId;
        //entity_mapping.mapping[uniResNum]=pdbResNum;
        if (!(uniaccess in umapping)) umapping[uniaccess] = {chainId:{"umapping":{},"mapping":{}}};
        if (!(chainId in umapping[uniaccess])) umapping[uniaccess][chainId] = {"umapping":{},"mapping":{}};
        umapping[uniaccess][chainId].umapping[uniResNum]=pdbResNum;//to use with PDB component ?
        umapping[uniaccess][chainId].mapping[dbResNum]=pdbResNum;//to use with protvista
      }
      if (uniaccess){
        if (ngl_entity_mapping[(i+1).toString()]==="") ngl_entity_mapping[(i+1).toString()] = uniaccess;
      }
      //umapping[uniaccess].mapping[dbResNum]=pdbResNum;//to use with protvista
      //entity_mapping.mapping[dbResNum]=pdbResNum;
    }
    //mapping.push(entity_mapping);
  }
  umapping.unimap = ngl_entity_mapping;
  //console.log(mapping);
  return umapping;
}

function GetSequenceMappingP(pdbres){//return resnumber in uni from resnumber in pdb
}

function GetSequenceMappingU(unires){//return resnumber in pdb from resnumber in uni
}

function querySequenceMapping(pdbid) {
  //need a 4 letter code
  if (node_selected)
    if ("mapping" in node_selected.data)
        return;//= mapping;
  if (pdbid.length !== 4 ) {
    pdbid = CleanEntryPDB(pdbid);
    var asplit = pdbid.split("_");
    console.log(asplit);
    if (pdbid === "" ) return;
  }
  var formData = new FormData();
  formData.append("mapping", "true");//array of x,y,z
  formData.append("pdbId", pdbid.toLowerCase());
  console.log("querySequenceMapping");
  console.log(formData);
  //should check if not already done...
  //or just check if begin-end is different between upr and pdb ?
  document.getElementById('stopbeads').setAttribute("class", "spinner");
  document.getElementById("stopbeads_lbl").setAttribute("class", "show");
  $.ajax({
        type: "POST",
        //url: "http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",
        url: sql_server,
        success: function(data) {
          console.log("##MappingFileData###");
          console.log( typeof data);
          console.log( data );
          //var rdata = Util_gunzip(Util_stringToArray(data));
          //console.log(rdata);
          var parsed_data = data;//Util_parseXML(data);
          //console.log(parsed_data);
          var mapping = SetSequenceMapping(parsed_data);
          console.log(mapping);
          if (node_selected)
              node_selected.data.mapping = mapping;
              document.getElementById('stopbeads').setAttribute("class", "spinner hidden");
              document.getElementById("stopbeads_lbl").setAttribute("class", "hidden");
        },
        error: function(error) {
          console.log("ERROR",error);
        },
        async: true,
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        timeout: 60000
      });
}

var processRow = function(row) {
  var finalVal = '';
  for (var j = 0; j < row.length; j++) {
    var innerValue = (row[j] && row[j] !== null) ? row[j].toString() : '';
    //if (innerValue.split("object").length > 1) innerValue = "";
    if (innerValue === "[object Object]") innerValue = "";
    if (row[j] instanceof Date) {
      innerValue = row[j].toLocaleString();
    };
    var result = innerValue.replace(/"/g, '""');
    if (result.search(/("|,|;|\n)/g) >= 0)
      result = '"' + result + '"';
    if (j > 0)
      finalVal += ',';
    finalVal += result;
  }
  return finalVal + '\n';
};

//<img width="910" height="496" class="img-responsive" id="chainImageA"
//style="border: 0px; border-image: none;"
//src="http://www.rcsb.org/pdb/explore/remediatedChain.do?structureId=1A00&amp;params.annotationsStr=SCOP,Site%20Record,DSSP&amp;chainId=A" usemap="#chainAmap_">
function saveCurrentCSVgrid(grid) {
  //	$("#exporticon").click(function() {
  if (totalNbInclude === 0 ) {
    alert(" this is recipe is incomplete, can't export "+totalNbInclude.toString()+" selected entity\n"
            //+ JSON.stringify(current_ready_state_value)
  //          + "\nmissing beads " + JSON.stringify(list_missing_beads)
  //          + "\nmissing geoms " + JSON.stringify(list_missing_geom)
  //          + "\nmissing pdb " + JSON.stringify(list_missing_pdb)
          );
    return;
  }
  console.log("saveCurrentCSV");

  //console.log(grid);
  var csvFile = '';
  var rows = [];
  var colname = [];
  for (var j = 0, len = grid.getColumns().length; j < len; j++) {
    colname.push(grid.getColumns()[j].name);
  }
  rows.push(colname);
  var singlerow = [];
  for (var i = 0, l = grid.dataView.getLength(); i < l; i++) {
    for (var j = 0, len = grid.getColumns().length; j < len; j++) {
      singlerow.push(grid.getDataItem(i)[grid.getColumns()[j].field]);
    }
    rows.push(singlerow);
    singlerow = [];
  }

  for (var i = 0; i < rows.length; i++) {
    console.log(rows[i]);
    csvFile += processRow(rows[i]);
  }
  console.log(csvFile);
  var rname = graph.nodes[0].data.name;
  var blob = new Blob([csvFile], {
    type: 'text/csv;charset=utf-8;'
  });
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, rname+".csv");
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", rname+".csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  recipe_changed = false;
  grid_tab_label[0].text ( "" );
}


function saveCurrentXLS() {}

function saveCurrentD3JSON() {}

function helper_setupFibersDictionary(){
  var url = "data/Fibers.json";
  console.log(url);
  d3v4.json(url, function (error,json) {
    cp_fiber_description = json;
    console.log("cp_fiber_description",cp_fiber_description);
  });
}

function helper_getFiberIngredientDescription(ingrdic){
    //read in on the server ?
    console.log("cp_fiber_description",cp_fiber_description);
    if (cp_fiber_description===null) return ingrdic;
    var query = ingrdic.name.toLowerCase();
    for (var key in cp_fiber_description) {
      comon = findLongestCommonSubstring(key,query);
      console.log(key,query,comon);
      if (comon && comon!=="" && comon.length > 2) {//comon!=="" &&
          var newDic = Object.assign(cp_fiber_description[key],ingrdic);
          console.log(newDic);
          return newDic;
      }
    }
    return ingrdic;
}
//save as a recipe that can be ued ?
//need additional fiedl : sphereTree.pcpAlVector.offset
//need to compute thenm ? server or client ?
//color
function OneCPIngredient(node, surface) {
  var aing_dic = {};
  aing_dic["encapsulatingRadius"] = node.data.size;
  aing_dic["name"] = node.data.name;
  //console.log(node.data);
  if (node.data.uniprot)
    node.data.source.uniprot = node.data.uniprot;
  if (!node.data.source) {
    node.data.source = {
      "pdb": ""
    };
  }
  //add the selection and the bu in the source
  //node.data.source.selection = (node.data.selection) ? node.data.selection : "";
  //node.data.source.bu = (node.data.bu) ? node.data.bu : "";
  //node.data.source.model = (node.data.model) ? node.data.model : "";
  if (!(node.data.source.selection) || node.data.source.selection === '')
    node.data.source.selection =  (node.data.selection) ? node.data.selection : '';
  if (!(node.data.source.bu) || node.data.source.bu === '')
    node.data.source.bu = (node.data.bu) ? node.data.bu : '';
  if (!(node.data.source.model) || node.data.source.model === '')
    node.data.source.model = (node.data.model) ? node.data.model : '';
    
  aing_dic["source"] = node.data.source; //var source = ("pdb" in ing_dic)? ing_dic["pdb"] : "None";
  aing_dic["nbMol"] = (node.data.count!=="")? parseInt(node.data.count):0;//shouldnt be a string
  aing_dic["molarity"] = node.data.molarity;
  aing_dic["molecularweight"] = node.data.molecularweight;
  //need meshname meshName
  aing_dic["meshFile"] = node.data.geom; //meshfile or v,f,n?
  aing_dic["meshType"] = node.data.geom_type; //meshfile or v,f,n?
  aing_dic["principalVector"] = node.data.pcpalAxis;
  aing_dic["offset"] = node.data.offset;
  aing_dic["uniprot"] = node.data.uniprot;
  aing_dic["label"] = node.data.label;
  aing_dic["Type"] = (node.data.ingtype === "fiber") ? "Grow" : "MultiSphere";
  if (node.data.pos && node.data.radii) {
    aing_dic["positions"] = node.data.pos;
    aing_dic["radii"] = node.data.radii;
  }
  aing_dic["packingMode"] = node.data.buildtype; //random, file etc...
  aing_dic["comments"] = node.data.comments;
  if (node.data.color) aing_dic["color"] = node.data.color;

  if (node.data.ingtype === "fiber"){
    //support dna, rna peptide, actine etc...
    //this should be available in the ingredient properties panel
    aing_dic = helper_getFiberIngredientDescription(aing_dic);
    console.log(aing_dic);
  }
  aing_dic["source"] = node.data.source; 
  aing_dic["ingtype"] = node.data.ingtype;
  aing_dic["uniprot"] = node.data.uniprot;
  aing_dic["confidence"] = node.data.confidence;
  aing_dic["sprite"] = node.data.sprite;
  //description=label,organism,score,
  //add the custom data
  aing_dic["custom_data"] = []
  if (additional_data.length !== 0) {
    for (var i=0;i<additional_data.length;i++){
      var key = additional_data[i];
      aing_dic[key] = node.data[key];
      aing_dic["custom_data"].push(key);
    }
  }
  return aing_dic;
}

//what about properties
function AddPartner(ingdic, node, some_links) {
  ingdic["partners_name"] = [];
  for (var i = 0; i < some_links.length; i++) {
    //partner_name from the link table/graph_links
    if (some_links[i].source === node)
    {
      if (ingdic["partners_name"].indexOf(some_links[i].target.data.name) == -1)
      {
        ingdic["partners_name"].push(some_links[i].target.data.name);
        //pairing ? source Protein; target Fiber
        ingdic["properties"]={}
        ingdic["properties"]["beads1"] = some_links[i].beads1;
        ingdic["properties"]["beads2"] = some_links[i].beads2;
        ingdic["properties"]["sel1"] = some_links[i].sel1;
        ingdic["properties"]["sel2"] = some_links[i].sel2;
        ingdic["properties"]["pdb1"] = some_links[i].pdb1;
      }
    }
    if (some_links[i].target === node)
    {
      if (ingdic["partners_name"].indexOf(some_links[i].source.data.name) == -1)
      {
        ingdic["partners_name"].push(some_links[i].source.data.name);
        ingdic["properties"]={}
        ingdic["properties"]["beads1"] = some_links[i].beads2;
        ingdic["properties"]["beads2"] = some_links[i].beads1;  
        ingdic["properties"]["sel1"] = some_links[i].beads2;
        ingdic["properties"]["sel2"] = some_links[i].beads1;
        ingdic["properties"]["pdb1"] = some_links[i].pdb1;              
      }
    }
  }
  return ingdic;
}

function NGLtoPMVselection(asele) {
  //translate-
  let new_sele = "";
}

/*
use
ngl_current_structure = o;
ngl_current_structure.sele = sele;
ngl_current_structure.assembly = assembly;
*/
function buildFromServer(pdb,cms,beads,astructure){
    var lod = beads_elem.selectedOptions[0].value;
    var dataset = NGL_GetAtomDataSet(pdb,astructure);
    var formData = new FormData();
    //BU problem here
    formData.append("atomsCoords", JSON.stringify(dataset));//array of x,y,z
    if (cms) {
      //add form for cms
      formData.append("cms", true);
      //bu?selection?
    }
    if (beads) {
      //add form for beads
      formData.append("beads", true);
      formData.append("nbeads", slidercluster_elem.value)
    }
    document.getElementById('stopbuildgeom').setAttribute("class", "spinner");
    document.getElementById("stopbuildgeom_lbl").setAttribute("class", "show");

    //console.log([pdb, bu, sele, model, thefile]);
    console.log(formData);

    $.ajax({
      type: "POST",
      //url: "http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",
      url: pmv_server,
      success: function(data) {
        console.log("##BuildFromCoords###");
        console.log(data);
        var data_parsed = JSON.parse(data.replace(/[\x00-\x1F\x7F-\x9F]/g, " "));
        var results = data_parsed.results; //verts, faces,normals
        console.log("results:", results);
        if ("verts" in results) {
          NGL_ShowMeshVFN(results);
          if (node_selected) {
              node_selected.data.geom = {
              "verts": results.verts,
              "faces": results.faces,
              "normals": results.normals
              }; //v,f,n directly
              node_selected.data.geom_type = "raw"; //mean that it provide the v,f,n directly
          }
        }
        if ("centers" in results) {
          //deal with bu
          if (astructure.assembly !== "AU" && astructure.object.biomolDict[astructure.assembly]) {
             results = NGL_applyBUtoResultsBeads(astructure,results,[0,0,0]);
           }
          NGL_ShowBeadsCR(results,lod);
          if (node_selected) {
            node_selected.data.pos = [{
            "coords": results.centers
          }];
          node_selected.data.radii = [{
            "radii": results.radii
          }];
        }
        }
        document.getElementById('stopbuildgeom').setAttribute("class", "spinner hidden");
        document.getElementById("stopbuildgeom_lbl").setAttribute("class", "hidden");
      },
      error: function(error) {
        console.log(error);
      },
      async: true,
      data: formData,
      cache: false,
      contentType: false,
      processData: false,
      timeout: 60000
    });
}

function buildFromServerPDB(pdb){
  var d = node_selected; //or node_selected.data.bu
  var pdb = pdb; //document.getElementById("pdb_str");
  var bu = "";
  var sele = "";
  var model = "";
  var thefile = null;
  if (pdb.length !== 4) {
    if (folder_elem && folder_elem.files.length != "") {
      thefile = pathList_[pdb];
    }
  }
  var formData = new FormData();
  formData.append("cms", true);
  //console.log(thefile)
  // add assoc key values, this will be posts values
  if (thefile !== null) {
    formData.append("inputfile", thefile, thefile.name);
    formData.append("upload_file", true);
  } else if (pdb && pdb !== "") formData.append("pdbId", pdb);
  if (bu && bu !== "") formData.append("bu", bu);
  if (sele && sele !== "") formData.append("selection", sele);
  if (model && model !== "") formData.append("model", (parseInt(model)+1).toString());
  //formData.append(name, value);
  console.log([pdb, bu, sele, model, thefile]);
  console.log(formData);
  document.getElementById('stopbuildgeom').setAttribute("class", "spinner");
  document.getElementById("stopbuildgeom_lbl").setAttribute("class", "show");
  $.ajax({
    type: "POST",
    //url: "http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",
    url: pmv_server,
    success: function(data) {
      console.log("##CMS###");
      console.log(data);
      var data_parsed = JSON.parse(data.replace(/[\x00-\x1F\x7F-\x9F]/g, " "));
      var mesh = data_parsed.results; //verts, faces,normals
      console.log("MESH:", mesh);
      NGL_ShowMeshVFN(mesh);
      if (node_selected) {
        node_selected.data.geom = mesh; //v,f,n directly
        node_selected.data.geom_type = "raw"; //mean that it provide the v,f,n directly
      }
      document.getElementById('stopbuildgeom').setAttribute("class", "spinner hidden");
      document.getElementById("stopbuildgeom_lbl").setAttribute("class", "hidden");
      //update the slicktable ? especially if none were specified
      //just ignore it in the table ? like the offset and pcp. they should be hidden in the table.
      //more room  for molecular weight and other information
    },
    error: function(error) {
      console.log(error);
    },
    async: true,
    data: formData,
    cache: false,
    contentType: false,
    processData: false,
    timeout: 60000
  });
}

function buildCMS()
{
    //build from coordinates
    //buildFromServer("",true,false,null);
    //build from PDB ids
    var rep = stage.getRepresentationsByName("cms_surface");
    if (rep.list.length > 0) {
      var mesh = NGL_getRawMesh("cms_surface");
      console.log("MESH:", mesh);
      NGL_ShowMeshVFN(mesh);
      if (node_selected) {
        node_selected.data.geom = mesh; //v,f,n directly
        node_selected.data.geom_type = "raw"; //mean that it provide the v,f,n directly
      }
    }
    else {
      var pdb = node_selected.data.source.pdb;
      buildFromServer(pdb,true,false,ngl_current_structure);
      //buildCMS2();
    }
}

function buildCMS2() {
  var d = node_selected; //or node_selected.data.bu
  var pdb = d.data.source.pdb; //document.getElementById("pdb_str");
  var bu = (d.data.source.bu) ? d.data.source.bu : ""; //document.getElementById("bu_str");
  //selection need to be pmv string
  var sele = (d.data.source.selection) ? d.data.source.selection : ""; //document.getElementById("sel_str");
  sele = sele.replace(":", "");
  //selection is in NGL format. Need to go in pmv format
  //every :C is a chainNameScheme
  var model = (d.data.source.model) ? d.data.source.model : ""; //model_elem.selectedOptions[0].value;
  if ((!model) || model.startsWith("S") || model.startsWith("a")) model = "";
  if (sele.startsWith("/")) sele = "";
  //depending on the pdb we will have a file or not
  var thefile = null;
  if (d.data.source.pdb.length !== 4) {
    pdb = "";
    if (folder_elem && folder_elem.files.length != "") {
      thefile = pathList_[d.data.source.pdb];
    } else {
      pdb = d.data.source.pdb;
      //its a blob we want ?
    }
  }
  var formData = new FormData();
  formData.append("cms", true);
  //console.log(thefile)
  // add assoc key values, this will be posts values
  if (thefile !== null) {
    console.log("use input file", thefile);
    formData.append("inputfile", thefile, thefile.name);
    formData.append("upload_file", true);
  } else if (pdb && pdb !== "") formData.append("pdbId", pdb);
  if (bu && bu !== "") formData.append("bu", bu);
  if (sele && sele !== "") formData.append("selection", sele);
  if (model && model !== "") formData.append("model", (parseInt(model)+1).toString());
  //formData.append(name, value);
  console.log([pdb, bu, sele, model, thefile]);
  console.log(formData);
  document.getElementById('stopbuildgeom').setAttribute("class", "spinner");
  document.getElementById("stopbuildgeom_lbl").setAttribute("class", "show");
  $.ajax({
    type: "POST",
    //url: "http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",
    url: pmv_server,
    success: function(data) {
      console.log("##CMS###");
      console.log(data);
      var data_parsed = JSON.parse(data.replace(/[\x00-\x1F\x7F-\x9F]/g, " "));
      var mesh = data_parsed.results; //verts, faces,normals
      console.log("MESH:", mesh);
      NGL_ShowMeshVFN(mesh);
      if (node_selected) {
        node_selected.data.geom = mesh; //v,f,n directly
        node_selected.data.geom_type = "raw"; //mean that it provide the v,f,n directly
      }
      document.getElementById('stopbuildgeom').setAttribute("class", "spinner hidden");
      document.getElementById("stopbuildgeom_lbl").setAttribute("class", "hidden");
      //update the slicktable ? especially if none were specified
      //just ignore it in the table ? like the offset and pcp. they should be hidden in the table.
      //more room  for molecular weight and other information
    },
    error: function(error) {
      console.log(error);
    },
    async: true,
    data: formData,
    cache: false,
    contentType: false,
    processData: false,
    timeout: 60000
  });
}

function NextComputeIgredient() {
  //filter is geom for now
  var icurrent = current_compute_index;
  //find previous
  var found = false;
  var i = (icurrent) ? icurrent : 0;
  while (!found) {
    i = i + 1;
    if (i === graph.nodes.length) {
      found = false;
      break;
    }
    var d = graph.nodes[i];
    console.log(i, graph.nodes.length, d);
    if (!d) {
      found = false;
      break;
    }
    var lod = parseInt(beads_elem.selectedOptions[0].value);
    if ((!d.children && "data" in d &&
        (!d.data.geom || d.data.geom === "None" ||
          d.data.geom === "null" || d.data.geom === "")) || (!d.children && "data" in d &&
        (!d.data.pos || d.data.pos === "None" ||
          d.data.pos === "null" || d.data.pos.length <= lod ||
          d.data.pos === ""))) {
      //if (!graph.nodes[i].children){
        if ("pdb" in d.data.source && d.data.source.pdb !== null & d.data.source.pdb !== "") {
          var fileExt = d.data.source.pdb.split('.').pop();
          if (fileExt !== "map") {
            found = true;
            current_compute_index = i;
            current_compute_node = graph.nodes[i];
          }
          else {
            d.data.geom_type = "file";
            d.data.geom = d.data.source.pdb;
          }
      }
    }
  }
  console.log("return found ", found, current_compute_index, current_compute_node);
  return found;
}

function buildLoopAsync() {
  var d = current_compute_node; //or node_selected.data.bu
  console.log("d is ", d);
  var pdb = d.data.source.pdb; //document.getElementById("pdb_str");
  var bu = (d.data.bu) ? d.data.bu : ""; //document.getElementById("bu_str");
  //selection need to be pmv string
  if (bu === -1) bu = "";
  var sele = (d.data.selection) ? d.data.selection : ""; //document.getElementById("sel_str");
  sele = sele.replace(":", "");
  //selection is in NGL format. Need to go in pmv format
  //every :C is a chainNameScheme
  var model = (d.data.model) ? d.data.model : "";
  if (model.startsWith("S") || model.startsWith("a")) model = "";
  if (sele.startsWith("/")) sele = "";
  //depending on the pdb we will have a file or not
  var thefile = null;
  if (pdb && d.data.source.pdb.length !== 4) {
    pdb = "";
    if (folder_elem && folder_elem.files.length != "") {
      thefile = pathList_[d.data.source.pdb];
    } else {
      pdb = d.data.source.pdb;
      //its a blob we want ?
    }
  }
  if (!pdb || pdb === "") {
    if (NextComputeIgredient() && (!(stop_current_compute))) {
      //update label_elem
      buildLoopAsync();
    } else {
      document.getElementById("stopbeads_lbl").innerHTML = "finished " + current_compute_index + " / " + graph.nodes.length;
      stopBeads();
    }
    return;
  }
  var formData = new FormData();

  var d = current_compute_node;
  if (!d.children && "data" in d &&
    (!d.data.geom || d.data.geom === "None" ||
      d.data.geom === "null" || d.data.geom === "")) {
    formData.append("cms", true);
  }

  if (!d.children && "data" in d &&
    (!d.data.pos || d.data.pos === "None" ||
      d.data.pos === "null" || d.data.pos.length === 0 ||
      d.data.pos === "")) {
    formData.append("beads", true);
    formData.append("nbeads", 10); //default is 5 beads // should we calculate a number of beads autoamatically
  }
  //console.log(thefile)
  // add assoc key values, this will be posts values
  if (thefile !== null) {
    //console.log("use input file",thefile);
    formData.append("inputfile", thefile, thefile.name);
    formData.append("upload_file", true);
  } else if (pdb && pdb !== "") formData.append("pdbId", pdb);
  if (bu && bu !== "") formData.append("bu", bu);
  if (sele && sele !== "") formData.append("selection", sele);
  if (model && model !== "") formData.append("model", (parseInt(model)+1).toString() );
  //formData.append(name, value);
  console.log("query geom with ", [pdb, bu, sele, model, thefile]);
  //console.log(formData);
  $.ajax({
    type: "POST",
    url: pmv_server, //"cgi-bin/get_geom_dev.cgi",//"http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",
    success: function(data) {
      //console.log(data);
      var data_parsed = JSON.parse(data.replace(/[\x00-\x1F\x7F-\x9F]/g, " "));
      var results = data_parsed.results;
      if ("verts" in results) {
        current_compute_node.data.geom = {
          "verts": results.verts,
          "faces": results.faces,
          "normals": results.normals
        }; //v,f,n directly
        current_compute_node.data.geom_type = "raw"; //mean that it provide the v,f,n directly
      }
      if ("centers" in results) {
        current_compute_node.data.pos = [{
          "coords": results.centers
        }];
        current_compute_node.data.radii = [{
          "radii": results.radii
        }];
      }
      document.getElementById("stopbeads_lbl").innerHTML = "building " + current_compute_index + " / " + graph.nodes.length;
      if (NextComputeIgredient() && (!(stop_current_compute))) {
        //update label_elem
        buildLoopAsync();
      } else {
        document.getElementById("stopbeads_lbl").innerHTML = "finished " + current_compute_index + " / " + graph.nodes.length;
        stopBeads();
      }
    },
    error: function(error) {
      console.log(error);
    },
    async: true,
    data: formData,
    cache: false,
    contentType: false,
    processData: false,
    timeout: 60000
  });
}

function buildCMS1(e) {
  //query the server for a cms given a PDB - see template.html for example and the cgi-bin
  //need afile or PDB id, bu, sele, model
  var d = ngl_current_node;
  var pdb = d.data.source.pdb; //document.getElementById("pdb_str");
  var bu = (d.data.source.bu) ? d.data.source.bu : ""; //document.getElementById("bu_str");
  var sele = (d.data.source.selection) ? d.data.source.selection : ""; //document.getElementById("sel_str");
  var model = "" //document.getElementById("mo_str");
  //depending on the pdb we will have a file or not
  var thefile = null;
  if (d.data.source.pdb.length !== 4) {
    pdb = "";
    if (folder_elem && folder_elem.files.length != "") {
      thefile = pathList_[d.data.source.pdb];
    } else pdb = d.data.source.pdb;
  }
  var formData = new FormData();
  // add assoc key values, this will be posts values
  if (thefile !== null) {
    formData.append("file", thefile, thefile.name);
    formData.append("upload_file", true);
  }
  if (pdb !== "") formData.append("pdbId", pdb);
  if (bu !== "") formData.append("bu", bu);
  if (sele !== "") formData.append("selection", sele);
  if (model !== "") formData.append("model", (parseInt(model)+1).toString());
  console.log(pdb, bu, sele, model, thefile);
  //formData.append(name, value);
  $.ajax({
    type: "POST",
    url: pmv_server,
    success: function(data) {
      console.log(data);
      var data_parsed = JSON.parse(data);
      var mesh = data_parsed.results; //verts, faces,normals
      NGL_ShowMeshVFN(mesh);
      if (node_selected) {
        node_selected.data.geom = mesh; //v,f,n directly
        node_selected.data.geom_type = "raw"; //mean that it provide the v,f,n directly
      }
      //var e = document.getElementById("server_result");
      //e.innerHTML = data;
      //console.log(e);
    },
    error: function(error) {
      console.log(error);
    },
    async: true,
    data: formData,
    cache: false,
    contentType: false,
    processData: false,
    timeout: 60000
  });

}

function BuildDefaultCompartmentsRep() {
  console.log("build default compartment", graph.nodes.length);
  for (var i = 0; i < graph.nodes.length; i++) { //.forEach(function(d){
    var d = graph.nodes[i];
    if (d.data.nodetype !== "compartment") continue;
    var comptype = ("geom_type" in d.data) ? d.data.geom_type : "None";
    var geom = ("geom" in d.data) ? d.data.geom : "None";
    if (!comptype || comptype === "None" || !geom || geom === "None") {
      var name = d.data.name + "_geom";
      var radius = 500.0;
      d.data.geom = {
        "name": name,
        "radius": radius
      };
      d.data.geom_type = "sphere";
    }
    console.log("comp geom ", comptype, geom, d.data.name, d.data.geom, d.data.geom_type);
  }
  console.log
}


//need a function to build only beads or only geometry.
//if only beeds : automatic size vs automtic number fixed number of beads etc...
//
function query_BuildAll(cms) {
  //show the stop button
  force_do_cms = cms;
  query_illustrate = false;
  force_do_beads = true;
  stop_current_compute = false;
  document.getElementById('stopbeads').setAttribute("class", "spinner");
  document.getElementById("stopbeads_lbl").setAttribute("class", "show");
  document.getElementById("stopbeads_lbl").innerHTML = "building " + current_compute_index + " / " + graph.nodes.length;
  //use getItem(index)
  //for all compartment get a geom. default sphere of 500A
  BuildDefaultCompartmentsRep();
  current_compute_index = -1;
  NextComputeIgredient();
  NGL_buildLoopAsync();
  //build geom for compartment by default
  //build beads
}

function query_ResizeAll() {
  //show the stop button
  force_do_cms = false;
  query_illustrate = false;
  force_do_beads = false;
  stop_current_compute = false;
  resize_nodes = true;
  document.getElementById('stopbeads').setAttribute("class", "spinner");
  document.getElementById("stopbeads_lbl").setAttribute("class", "show");
  document.getElementById("stopbeads_lbl").innerHTML = "building " + current_compute_index + " / " + graph.nodes.length;
  //use getItem(index)
  //for all compartment get a geom. default sphere of 500A
  //BuildDefaultCompartmentsRep();
  current_compute_index = -1;
  NextComputeIgredient();
  NGL_buildLoopAsync();
  //build geom for compartment by default
  //build beads
}

function query_ResizeFromNbBeadsLvl(){
  //use current level
  var cutoff = 100000;
  var lod = parseInt(beads_elem.selectedOptions[0].value);
  graph.nodes.forEach(function(d){
    if (!d.children) {
       var nbeads =( lod in d.data.radii )?d.data.radii[lod].radii.length:0;
       d.data.size = Math.cbrt ( (nbeads < cutoff) ? nbeads : cutoff );
       updateCellValue(gridArray[0],"size",d.data.id,parseFloat(d.data.size));
    }
  });
}

function query_IllustrateAll() {
  //query NGL_illustrate for all nodes
  stop_current_compute = false;
  query_illustrate = true;
  force_do_beads = false;
  force_do_cms = false;
  document.getElementById('stopbeads').setAttribute("class", "spinner");
  document.getElementById("stopbeads_lbl").setAttribute("class", "show");
  document.getElementById("stopbeads_lbl").innerHTML = "building " + current_compute_index + " / " + graph.nodes.length;
  current_compute_index = -1;
  NextComputeIgredient();
  NGL_buildLoopAsync();
}

function as_clearNode(anode){
    if (anode.data.ingtype !== "compartment")
    {
      anode.data.pos=[];
      anode.data.radii=[]
      anode.data.geom_type = null;
      anode.data.geom = null;
      //console.log(anode);
    }
}

async function as_clearNodes(){
  const promises = graph.nodes.map(as_clearNode);
  await Promise.all(promises);
  console.log('Done');
}

function sync_clearAll(){
  graph.nodes.forEach(function(d){
    if (d.data.ingtype !== "compartment")
    {
      d.data.pos=[];
      d.data.radii=[]
      console.log(d);
    }
  });
}

function query_ClearAll() {
  //show the stop button
  as_clearNodes();
  //remove the current one in the viewer
  if (ngl_current_structure) {
    stage.getRepresentationsByName("geom_surface").dispose();
    for (var i = 0; i < 3; i++) {
      stage.getRepresentationsByName("beads_" + i).dispose();
    }
  }
}

function getCurrentNodesAsCP_JSON(some_data, some_links) {
  //convert some_data to recipe.json
  jsondic = {
    "recipe": {
      "paths": [
        [
          "autoPACKserver",
          "https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/"
        ]
      ],
      "name": some_data[0].data.name,//root
      "version": "1.0"
    }
  };
  //options dictionary
  //get the bounding box from the different compartment bb
  var rootnode = graph.nodes[0];
  if (!(rootnode.data.boundingBox)||!(rootnode.data.boundingBox.min)){
      drawCompRec(rootnode);
  }

  jsondic["options"] = {
    "cancelDialog": false,
    "_hackFreepts": false,
    "windowsSize": 50,
    "use_gradient": false,
    "placeMethod": "jitter",
    "saveResult": false,
    "runTimeDisplay": false,
    "overwritePlaceMethod": true,
    "innerGridMethod": "jordan",
    "boundingBox": [
      [rootnode.data.boundingBox.min.x,rootnode.data.boundingBox.min.y,rootnode.data.boundingBox.min.z],
      [rootnode.data.boundingBox.max.x,rootnode.data.boundingBox.max.y,rootnode.data.boundingBox.max.z]
    ],
    "gradients": [],
    "smallestProteinSize": 0,
    "computeGridParams": true,
    "freePtsUpdateThrehod": 0.0,
    "pickWeightedIngr": true,
    "_timer": false,
    "ingrLookForNeighbours": false,
    "pickRandPt": true,
    "largestProteinSize": 0,
    "resultfile": "",
    "use_periodicity": false,
    "EnviroOnly": false
  }
  //cytoplasme
  //for all nodes that don't have parent !== from root
  jsondic["cytoplasme"] = {
    "ingredients": {}
  };
  jsondic["compartments"] = {}; //compartmentname:{"geom":g,"name":n}
  var aroot;
  for (var i = 0; i < some_data.length; i++) {
    var node = some_data[i];
    if (!node.parent) //root
    {
      aroot = node;
      jsondic.recipe.name = node.data.name;
      continue;
    }
    if (node.children && node !== root) //compartment
    {
      var cname = node.data.name;
      if (cname === "cytoplasm") cname = "cytoplasme"; //outside ?
      if (!(cname in jsondic["compartments"])) {
        var gtype = (node.data.geom_type) ? node.data.geom_type : "None";
        var gname = (node.data.geom) ? node.data.geom : "";
        if ((gtype === "file")&&(!(typeof gname === 'string'))) gname = gname.name;//in case it is a blob
        var thickness = (node.data.thickness) ? node.data.thickness : 7.5;
        //if metaball geom should be array of xyzr/
        jsondic["compartments"][cname] = {
          "geom_type": gtype,
          "geom": gname,
          "name": cname,
          "thickness": thickness,
          "surface": {
            "ingredients": {}
          },
          "interior": {
            "ingredients": {}
          }
        };
        if (gtype === "mb") {
            if (node.data.pos && node.data.radii) {
              jsondic["compartments"][cname]["mb"]={"positions":{},"radii":{}};
              jsondic["compartments"][cname]["mb"].positions = node.data.pos[0].coords;
              jsondic["compartments"][cname]["mb"].radii = node.data.radii[0].radii;
            }
          }
      }
      continue;
    }
    if (!node.children && node.data.nodetype !== "compartment") //ingredient
    {
      //check if include else continue
      if ("include" in node.data && node.data.include === false) continue;
      var cname = node.parent.data.name;
      if (cname === "cytoplasm") cname = "cytoplasme"; //outside ?
      if (!(cname in jsondic["compartments"]) && (node.parent !== aroot)) {
        var gtype = (node.data.geom_type) ? node.data.geom_type : "None";
        var gname = (node.data.geom) ? node.data.geom : "";
        var thickness = (node.data.thickness) ? node.data.thickness : 7.5;
        //if metaball geom should be array of xyzr/
        jsondic["compartments"][cname] = {
          "geom_type": gtype,
          "geom": gname,
          "name": cname,
          "thickness": thickness,
          "surface": {
            "ingredients": {}
          },
          "interior": {
            "ingredients": {}
          }
        };
      }
      var ingdic = OneCPIngredient(node);
      if (some_links.length) {
        console.log("check links", some_links.length)
        ingdic = AddPartner(ingdic, node, some_links);
      }
      //console.log(node.data.name,node.parent.data.name,jsondic.recipe.name,cname, (node.parent.data.name === jsondic.recipe.name ));
      if ((node.parent.data.name === jsondic.recipe.name) || (cname === "cytoplasme")) jsondic["cytoplasme"].ingredients[node.data.name] = ingdic;
      else if (node.data.surface) jsondic["compartments"][cname].surface.ingredients[node.data.name] = ingdic;
      else jsondic["compartments"][cname].interior.ingredients[node.data.name] = ingdic;
    }
  }
  return jsondic;
}

function getCurrentNodesAsCP_SER_JSON(some_data) {
  //convert some_data to recipe.json
  jsondic = {}; //"recipe": {"name": "", "version": "1.0"}};
  //cytoplasme
  //for all nodes that don't have parent !== from root
  jsondic["cytoplasme"] = {
    "ingredients": []
  };
  jsondic["compartments"] = {}; //compartmentname:{"geom":g,"name":n}
  var aroot;
  for (var i = 0; i < some_data.length; i++) {
    var node = some_data[i];
    if (!node.parent) //root
    {
      aroot = node;
      jsondic.recipe.name = node.data.name;
      continue;
    }
    if (node.children && node !== root) //compartment
    {
      var cname = node.data.name;
      if (!(cname in jsondic["compartments"])) {
        jsondic["compartments"][cname] = {
          "geom": cname + "_geom",
          "name": cname,
          "surface": {
            "ingredients": {}
          },
          "interior": {
            "ingredients": {}
          }
        };
      }
      continue;
    }
    if (!node.children) //ingredient
    {
      var cname = node.parent.data.name;
      var ingdic = OneCPIngredient(node);
      if (some_links.length) {
        console.log("check links", some_links.length)
        ingdic = AddPartner(ingdic, node, some_links);
      }
      if (node.parent === aroot) jsondic["cytoplasme"].ingredients[node.data.name] = ingdic;
      else if (node.data.surface) jsondic["compartments"][cname].surface.ingredients[node.data.name] = ingdic;
      else jsondic["compartments"][cname].interior.ingredients[node.data.name] = ingdic;
    }
  }
  return jsondic;
}

function ProcessRow(row) {
  var finalVal = '';
  for (var j = 0; j < row.length; j++) {
    var innerValue = (row[j] && row[j] !== null) ? row[j].toString() : '';
    //if (innerValue.split("object").length > 1) innerValue = "";
    if (innerValue === "[object Object]") innerValue = "";
    if (row[j] instanceof Date) {
      innerValue = row[j].toLocaleString();
    };
    var result = innerValue.replace(/"/g, '""');
    if (result.search(/("|,|;|\n)/g) >= 0)
      result = '"' + result + '"';
    if (j > 0)
      finalVal += ',';
    finalVal += result;
  }
  return finalVal + '\n';
};


function saveCurrentCSV(){//saveCurrentCVJSON() {
  //var nodes ;graph.nodes, graph.links
  var agrid = gridArray[0]; //gridArray[0].dataView
  var csvFile = '';
  var rows = [];
  var colname = [];
  //need first object
  var first = parseInt(gridArray[0].dataView.getItem(0).id.split("_")[1]);
  var k = Object.keys(graph.nodes[first].data);
  for (var j = 0, len = k.length; j < len; j++) {
    if ((k[j]!="visited") && (k[j]!="nodetype") && (k[j]!="compartment")) {
      if (k[j]==="source" ){
        colname.push("pdb");
        colname.push("model");
        colname.push("selection");
        colname.push("bu");
      }
      else  colname.push(k[j]);
    }
  }
  colname.push("compartment");
  rows.push(colname);
  //var cname = n.ancestors().reverse().map(function(d) {return (d.children)?d.data.name:""; }).join('/').slice(0,-1);
  for (var i = 0; i < graph.nodes.length; i++) {//graph.nodes.length
    var node = graph.nodes[i];
    console.log(i,node);
    if (!node.children && node.data.nodetype!=="compartment") {
      var singlerow = [];
      for (var j = 0; j < k.length; j++) {
        if ((k[j]!="visited") && (k[j]!="nodetype") && (k[j]!="compartment") )
        {
          if (k[j]==="source" ){
            singlerow.push(node.data.source.pdb);
            singlerow.push(node.data.source.model);
            singlerow.push(node.data.source.selection);
            singlerow.push(node.data.source.bu);
          }
          else singlerow.push(node.data[k[j]]);
        }
      }
      var cname = node.ancestors().reverse().map(function(d) {return (d.children)?d.data.name:""; }).join('.').slice(0,-1);
      singlerow.push(cname);
      //console.log(singlerow);
      rows.push(singlerow);
    }
  }
  console.log( rows.length,rows);
  //return;
  for (var i = 0; i < rows.length; i++) {
    csvFile += ProcessRow(rows[i]);
  }
  console.log(csvFile);
  var filename = graph.nodes[0].data.name + ".csv";
  var blob = new Blob([csvFile], {
    type: 'text/csv;charset=utf-8;'
  });

  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  recipe_changed = false;
  grid_tab_label[0].text ( "" );
}

function fs_download(url, name, opts) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.responseType = 'blob';

  xhr.onload = function () {
    saveAs(xhr.response, name, opts);
  };

  xhr.onerror = function () {
    console.error('could not download file');
  };

  xhr.send();
}

function download(content, fileName, contentType) {
  var a = document.createElement("a");
  var file = new Blob([content], {
    type: contentType
  });
  saveAs(file, fileName);
  //a.href = URL.createObjectURL(file);
  //a.download = fileName;
  //console.log(a);
  //a.click().click();
  //a.trigger('click');
  //window.open(a.href );
  return file;
}

function SaveRecipeCellPACK() {
  console.log("save recipe");
  //current score?
  console.log(current_ready_state);
  console.log(current_ready_state_value);

  /*if (current_ready_state === 0 || totalNbInclude === 0 ) {
    alert(" this is recipe is incomplete, can't export "+totalNbInclude.toString()+" selected entity\n"
            //+ JSON.stringify(current_ready_state_value)
            + "\nmissing beads " + JSON.stringify(list_missing_beads)
            + "\nmissing geoms " + JSON.stringify(list_missing_geom)
            + "\nmissing pdb " + JSON.stringify(list_missing_pdb));
    return;
  }*/
  var jdata = getCurrentNodesAsCP_JSON(graph.nodes, graph.links);
  console.log(jsondic.recipe.name);
  console.log(JSON.stringify(jdata));
  recipe_file = download(JSON.stringify(jdata), jsondic.recipe.name + '.json', 'text/plain');
  console.log("saved");
  recipe_changed = false;
  grid_tab_label[0].text ( "" );
}


function SaveRecipeCellPACK_serialized() {
  console.log("save recipe serialized",current_ready_state,totalNbInclude,
          current_ready_state_details.beads,current_ready_state_details.sources);
  //only check for beads ?
  /*
  if ( current_ready_state_details.beads < 1 || current_ready_state_details.sources < 1)
  {
    //if (current_ready_state === 0 || totalNbInclude === 0 ) {
    alert(" this is recipe is incomplete, can't export "+totalNbInclude.toString()+" selected entity\n"
            //+ JSON.stringify(current_ready_state_value)
            + "\nmissing beads " + JSON.stringify(list_missing_beads)
            //+ "\nmissing geoms " + JSON.stringify(list_missing_geom)
            + "\nmissing pdb " + JSON.stringify(list_missing_pdb));
    return;
  }
  */
  var jdata = serializedRecipe(graph.nodes, graph.links);//[0].descendants()
  //var jdata = serializedRecipe(graph.nodes, graph.links);
  console.log(jdata);
  console.log(JSON.stringify(jdata));
  download(JSON.stringify(jdata), jdata.name + '_serialized.json', 'text/plain');
  console.log("saved");
  recipe_changed = false;
  grid_tab_label[0].text ( "" );
}


function SaveAllSprites(){
  //go through all sprites and add them to a zip file
  var zip = new JSZip();
  zip.file("README.txt", "Load the recipe into cellpaint\n");
  //add the recipe
  var jdata = getCurrentNodesAsCP_JSON(graph.nodes, graph.links);
  zip.file(jsondic.recipe.name + '.json',JSON.stringify(jdata));
  graph.nodes.forEach(function(d){
    if (!d.children && ( d.data.image !=null || d.data.thumbnail !==null) ) {
        var value = d.data.sprite.image;
        var imgData = pathList_[value];
        zip.file(value, imgData);//, {base64: true});
    }
  });  
  zip.generateAsync({type:"blob"})
    .then(function(content) {
    // see FileSaver.js
    saveAs(content, "sprites.zip");
  });
}
//var jdata = serializedRecipe(graph.nodes, graph.links);download(JSON.stringify(jdata), jdata.name + '_serialized.json', 'text/plain');
