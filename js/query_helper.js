var rcsb_url = "https://www.rcsb.org";
var current_list_pdb;
var cumulative_res={"pdbs":null,"mols":null};

function BuildQuery(textQuery){
   var query ="<orgPdbQuery>";
   query+="<queryType>org.pdb.query.simple.AdvancedKeywordQuery</queryType>";
   query+="<description>Text Search for: "+textQuery+"</description>";
   query+="<keywords>"+textQuery+"</keywords>";
   query+="</orgPdbQuery>";
   return query;
}

function BuildSequenceQuery(sqceQuery)
{
	   var query ="<orgPdbQuery>";
   query+="<queryType>org.pdb.query.simple.SequenceQuery</queryType>";
   query+="<description>Sequence Search: Expectation Value = 10.0, Search Tool = BLAST</description>";
   query+="<sequence>"+sqceQuery+"</sequence>";
   query+="<eCutOff>10.0</eCutOff>";
   query+="<searchTool>blast</searchTool>";
   query+="<sequenceIdentityCutoff>30</sequenceIdentityCutoff>";
   query+="</orgPdbQuery>";
   return query;
}

//PDB text search
function submitForm(xmlText,querytxt){
	console.log(xmlText) ;
  var queryXML = xmlText;//document.getElementById('xmlText').value;
  if (queryXML.length > 0) {
      console.log(queryXML);
      queryXML = checkComparator(queryXML);
      console.log(queryXML);
      var xmlText = encodeURIComponent(queryXML);
      var sorting ="rank Descending";
      //var restUrl="https://www.rcsb.org/pdb/rest/search/?sortfield=rank Descending";
      //var restUrl="/pdb/rest/search/"+(sorting?"?sortfield="+sorting:"")
      console.log(rcsb_url+"/pdb/rest/search/?req=browser"+(sorting?"&sortfield="+sorting:""));
      $.post(rcsb_url+"/pdb/rest/search/?req=browser"+(sorting?"&sortfield="+sorting:""),xmlText,//rcsb_url+"/pdb/rest/search/?sortfield=rank Descending?req=browser"
         function (data){
             var spl = data.trim().split("\n");
             var rs=0;
             var h = "<p>";
             var qrid=null;
             var onReportPage = "o";
             if (onReportPage=="n") {
                           for (var spliti = 0; spliti < spl.length; spliti++){
                                          var it = spl[spliti].replace(/[\n\t\r]/g,"");
                                          if (it.length<4)
                                          {
                                              h+='<a href="'+rcsb_url+'/pdb/ligand/ligandsummary.do?hetId='+it+'">'+it+'</a> '
                                              rs++;
                                          } else if (it.length==4) {
                                              h+='<a href="'+rcsb_url+'/pdb/explore.do?structureId='+it+'">'+it+'</a> ';
                                              rs++;
                                          } else if ((it.length>4)&&(it.indexOf(".")>0))
                                          {
                                              h+='<a href="'+rcsb_url+'/pdb/explore/remediatedSequence.do?structureId='+it.substring(0,4)+'&params.chainEntityStrategyStr=all&forcePageForChain='+it.substring(5)+'">'+it+'</a> ';
                                              rs++;
                                          } else if ((it.length>4)&&(it.indexOf(":")>0))
                                          {
                                              h+='<a href="'+rcsb_url+'/pdb/explore/remediatedSequence.do?structureId='+it.substring(0,4)+'">'+it+'</a> ';
                                              rs++;
                                          }
                                          else if(it.length>4 && spliti>0 && rs>0) {
                                              h+='<br/><br/><a href="'+rcsb_url+'/pdb/results/results.do?qrid='+it+'">View results</a> ';
                                              qrid=it;
                                          }
                                      }
                                      h+="</p>";
                                      h="<p>"+rs+" results</p>"+h;
                                  }
             else {
                h="";
                for (var spliti = 0; spliti < spl.length; spliti++) {
                    var it = spl[spliti].replace(/[\n\t\r]/g,"");
                     if ((h.length > 0) && (it.length <= 4)) {
                         h+=",";
                      }
                     if ((h.length > 0) && (it.length > 4) && ((it.indexOf(".")>0)||(it.indexOf(":")>0))) {
                         h+=",";
                      }
                     if ((it.length == 4)||(it.indexOf(".")>0)||(it.indexOf(":")>0)) {
                        h+=it;//put more infor in it ?
                     }
                     else if (it.length > 4)
                     {
                       qrid=it;
                      }
                }
            }
            //$('#restResults').html(h);
            current_list_pdb = h;
            cumulative_res={"pdbs":null,"mols":null};
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
            NGL_loadList(toload);//ngl
             //document.getElementById('qridHidden').value=qrid;
              */
          }
        );
  }
  else
  {
      alert("Please enter a query in the text box.");
  }
  return false;

}

function describeMolcb(response,txt) {
	var parser = new DOMParser();
	var xmlDoc = parser.parseFromString(response,"text/xml");
	console.log(xmlDoc);
	cumulative_res.mols = xmlDoc;
	OnFinishPDB();
	}

function describePDBcb(response,txt) {
	var parser = new DOMParser();
	var xmlDoc = parser.parseFromString(response,"text/xml");
	cumulative_res.pdbs = xmlDoc;
	console.log(xmlDoc);
	//once this is done, call the mol
	var url = "http://www.rcsb.org/pdb/rest/describeMol?structureId="+current_list_pdb;
	console.log(url);
	callAjax(url, describeMolcb,"");

	}

function describePDB() {
	var url = "http://www.rcsb.org/pdb/rest/describePDB?structureId="+current_list_pdb;
	console.log(url);
	callAjax(url, describePDBcb,"");
}

function customReportCB(response,querytxt){
	var data = d3v4.csvParse(response);
	console.log(data);
	//table from csv
	var tabId = 4;
	if (gridArray.length <= 3 ) {
  	//add a grid from the csv data test
  	 var cdata = CreateDataColumnFromCVS(data);
	   var options = CreateOptions();
	   var parentId = "tabs-"+tabId;
	   if (cdata.data.length > 0) cdata.data[0].picked = true;
	   var g = CreateGrid("grid_pdb",parentId,cdata.data,cdata.column,options);
	   //g.registerPlugin(checkboxSelector);
	   //force redraw of the grid with resize?
  	}
  else {
  	var cdata = CreateDataColumnFromCVS(data);
  	if (cdata.data.length > 0) {
  		cdata.data[0].picked = true;
  		pdb_picked = 0;
  	}
  	pdb_picked=0;
	  cdata.column.push({id: "picked", name:"picked", field:"picked",formatter: Slick.Formatters.Checkmark, editor: Slick.Editors.Checkbox});
		//cdata.column.unshift(uniprot_detailView.getColumnDefinition());
		cdata.column.unshift({id:"preview",name:"preview",field:"preview",formatter:renderImageCell});
  	UpdateGrid(cdata,3);
  	if (usesavedSession) {
	  	//var querytxt = document.getElementById("LoaderTxt").innerHTML.split(" : ")[1];
	  	//slice the data
	  	//only store 20
	  	//var rowsids = gridArray[0].getSelectedRows();
	  	//cdata.data.splice(20, cdata.data.length - 20);
	  	//sessionStorage.setItem("pdb_"+rowsids[0],JSON.stringify({"query":querytxt,"data":cdata}));
	  }
	  //update the recipe grid with first element
	  if (data.length)
	  {
	  	var rowsids = gridArray[0].getSelectedRows();
	  	if (rowsids && rowsids.length > 0) {
	  	var row = gridArray[0].dataView.getItem(rowsids[0]);
			//row.label = test[0]["Protein names"].split("(")[0];
			row.uniprot = cdata.data[0].uniprotAcc;
			row.label = cdata.data[0].uniprotRecommendedName;
			row.pdb = cdata.data[0].structureId;
			gridArray[0].dataView.beginUpdate();
			gridArray[0].invalidateRow(row.id);
		  gridArray[0].dataView.updateItem(row.id, row);
		  gridArray[0].dataView.endUpdate();
		  gridArray[0].render();
		  gridArray[0].dataView.refresh();
		  //trigger cellchange?
		  SyncTableGraphCell(row.id,"uniprot","uniprot");//update the graph
		  SyncTableGraphCell(row.id,"label","label");//update the graph
		  SyncTableGraphCell(row.id,"pdb","pdb");//update the graph
		  //SyncTableGraphCell(row.id,"pdb","pdb");//update the graph molecular weight
		  //group by structureId
		  groupByElem_cb(3,"structureId");
		  gridArray[3].render();
		  gridArray[3].dataView.refresh();
		}
		}
  }
  current_list_pdb = "";
  cumulative_res={"pdbs":null,"mols":null};

}

function customReport(querytxt){
	var url = "http://www.rcsb.org/pdb/rest/customReport.csv?pdbids="+current_list_pdb;
	url += "&customReportColumns="
	url += "structureId,structureTitle,experimentalTechnique,uniprotRecommendedName,uniprotAcc,"
	url += "geneName,taxonomyId,taxonomy,structureMolecularWeight,molecularWeight"
	url += "&format=csv&service=wsfile";
	console.log(url);
	callAjax(url, customReportCB,querytxt);
}

function OnFinishPDB(){
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
	  				for (var i=0;i<alldesc.length;i++) {
	  					var elem = alldesc[i];
	  					console.log(elem);
	  					console.log(elem.getAttributeNode("title"));
	  					pdbs.push({"pdb":elem.getAttributeNode("structureId").value,"title":elem.getAttributeNode("title").value,"id":i});
	  					}
	  				var allmol = cumulative_res.mols.getElementsByTagName("structureId");
	  				console.log(allmol);
	  				for (var i=0;i<allmol.length;i++) {
	  					var elem = allmol[i];
	  					pdbs[i].polymer = elem;
	  					//pdbs[i].taxonomy = "";// polymer.getElementsByTagName("Taxonomy");//.getAttributeNode("name").value;
	  					pdbs[i].picked = false;
	  					}

						var tabId = document.getElementById("grid_pdb");
						//if (!tabId) tabId = AddTab("Uniprot Search","grid_uniprot");
					  if (gridArray.length <= 3 ) {
					  	 //add a grid from the csv data test
					  	 //var cdata = CreateDataColumnFromPDBList(current_list_pdb.split(","));
					  	 var cdata = CreateDataColumnFromPDBData(pdbs);
						   var options = CreateOptions();
						   var parentId = "tabs-"+tabId;
						   if (cdata.data.length > 0) cdata.data[0].picked = true;
						   var g = CreateGrid("grid_pdb",parentId,cdata.data,cdata.column,options);
						   //g.registerPlugin(checkboxSelector);
						   //force redraw of the grid with resize?
					  	}
					  else {
					  	var cdata = CreateDataColumnFromPDBData(pdbs);
					  	//var cdata = CreateDataColumnFromPDBList(current_list_pdb.split(","));
					  	if (cdata.data.length > 0) cdata.data[0].picked = true;
					  	UpdateGrid(cdata,3)
					  	}
					  pdb_picked = 0;
					  //var toload = h.slice(0,5);
            // NGL_loadList(toload);//ngl
	}

function checkComparator(queryXML) {
    while (queryXML.indexOf(".comparator=< ")>-1) {
        queryXML = queryXML.replace(".comparator=< ", ".comparator=<![CDATA[<]]>");
    }
    while (queryXML.indexOf(".comparator><<")>-1) {
        queryXML = queryXML.replace(".comparator><<", ".comparator><![CDATA[<]]><");
    }
    while (queryXML.indexOf(".comparator=> ")>-1) {
        queryXML = queryXML.replace(".comparator=> ", ".comparator=<![CDATA[>]]>");
    }
    while (queryXML.indexOf(".comparator>><")>-1) {
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

function uniprotReadyCallBack(htmlResponse,querytxt){
	//update pfv
	//update the spreadshit with uniprot Id
	//split the row and get the IDs
	var rowsids = gridArray[0].getSelectedRows();
	console.log("in callbvack");
	console.log(rowsids);
	console.log(htmlResponse);
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
	  SyncTableGraphCell(row.id,"label","label");//update the graph
  }
	//build a new grid if doesnt exist
	var tabId = 3;//document.getElementById("grid_uniprot");
	if (!tabId) tabId = AddTab("Uniprot Search","grid_uniprot");
  if (gridArray.length <= 2 ) {
  	//add a grid from the csv data test
  	 var cdata = CreateDataColumnFromCVS(test);
	   var options = CreateOptions();
	   var parentId = "tabs-"+tabId;
	   if (cdata.data.length > 0) cdata.data[0].picked = true;
	   var g = CreateGrid("grid_uniprot",parentId,cdata.data,cdata.column,options);
	   //g.registerPlugin(checkboxSelector);
	   //force redraw of the grid with resize?
  	}
  else {
  	var cdata = CreateDataColumnFromCVS(test);
  	if (cdata.data.length > 0) {
  		cdata.data[0].picked = true;
  		uni_picked=0;
  	}
	  cdata.column.push({id: "picked", name:"picked", field:"picked",formatter: Slick.Formatters.Checkmark, editor: Slick.Editors.Checkbox});
  	//nee to update the column
  	cdata.column.unshift(uniprot_detailView.getColumnDefinition());
  	UpdateGrid(cdata,2);
 	  if (usesavedSession) {
	  	//var querytxt = document.getElementById("LoaderTxt").innerHTML.split(" : ")[1];
	  	//cdata.data = cdata.data.slice(0,20);
	  	//cdata.data.splice(20, cdata.data.length - 20);
	  	//sessionStorage.setItem("uni_"+rowsids[0],JSON.stringify({"query":querytxt,"data":cdata}));
	  }
  	}
  uni_picked = 0;
  //sessionStorage - key is the row id

  //CreateGridFromD3Links(links,"grid_interaction",2,"Interaction");
}

//https://www.uniprot.org/uniprot/?query=mpn391&sort=score&columns=id%2Centry%20name%2Creviewed%2Cprotein%20names%2Cgenes%2Corganism%2Clength%2Csequence%2Ccomment(FUNCTION)%2Ccomment(SUBUNIT%20STRUCTURE)%2Cgo(molecular%20function)%2Cgo(cellular%20component)%2Ccomment(SUBCELLULAR%20LOCATION)%2Cfeature(TOPOLOGICAL%20DOMAIN)%2Cfeature(TRANSMEMBRANE)%2Cfeature(INTRAMEMBRANE)%2Cfeature(MODIFIED%20RESIDUE)%2Cfeature(SIGNAL)%2C3d%2Cdatabase(PDB)%2Cdatabase(ProteinModelPortal)%2Cdatabase(Pfam)
function queryUniportKBfromName(aname){
	console.log("query");
	document.getElementById("LoaderTxt").innerHTML = "query uniprot : "+aname.split("_").join("+");
	var querytxt = aname.split("_").join("+");
	var dosearch = true;
	if (usesavedSession) {

		var rowsids = gridArray[0].getSelectedRows();
		var savedData = sessionStorage.getItem("uni_"+rowsids[0]);//,{"query":querytxt,"data":cdata}
		//if (savedData !== null) console.log("found ",savedData.query,querytxt,savedData.query === querytxt);
		if (savedData !== null ){
		      var d = JSON.parse( savedData );
		      if (d.query === querytxt) {
		      	d.data.column.forEach(function(c){c.editor = Slick.Editors.Text;});
		      	d.data.column.push({id: "picked", name:"picked", field:"picked",formatter: Slick.Formatters.Checkmark, editor: Slick.Editors.Checkbox});
		      	d.data.column.unshift(uniprot_detailView.getColumnDefinition());
						UpdateGrid(d.data,2);
						dosearch = false;
				}
			}
		}

	if (dosearch) {
		var uni_column = "id%2Centry%20name%2Creviewed%2Cprotein%20names%2Cgenes%2Corganism%2Clength%2Csequence%2Ccomment(FUNCTION)%2Ccomment(SUBUNIT%20STRUCTURE)%2Cgo(molecular%20function)%2Cgo(cellular%20component)%2Ccomment(SUBCELLULAR%20LOCATION)%2Cfeature(TOPOLOGICAL%20DOMAIN)%2Cfeature(TRANSMEMBRANE)%2Cfeature(INTRAMEMBRANE)%2Cfeature(MODIFIED%20RESIDUE)%2Cfeature(SIGNAL)%2C3d%2Cdatabase(PDB)%2Cdatabase(ProteinModelPortal)%2Cdatabase(Pfam)"
		//uni_column = "id,protein%20names";
		//var url = "https://www.uniprot.org/uniprot/?query="+aname.split("_").join("+")+"&sort=score&columns=id,entry%20name,reviewed,protein%20names,genes,organism,length&format=tab";
		var url = "https://www.uniprot.org/uniprot/?query="+aname.split("_").join("+")
								+"&sort=score&columns="+uni_column+"&format=tab";
		console.log(url);
		//var url = "https://www.uniprot.org/uniprot/?query="+aname.split("_").join("+")+"&sort=score&columns=id,entry,name,reviewed&format=tab";
		callAjax(url, uniprotReadyCallBack,querytxt);
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
	document.getElementById("LoaderTxt").innerHTML = "query PDB : "+aname.split("_").join(" ");
	var querytxt = aname.split("_").join(" ");
	var dosearch = true;
	if (usesavedSession) {

		var rowsids = gridArray[0].getSelectedRows();
		var savedData = sessionStorage.getItem("pdb_"+rowsids[0]);//,{"query":querytxt,"data":cdata}
		//if (savedData !== null) console.log("found ",savedData.query,querytxt,savedData.query === querytxt);
		if (savedData !== null ){
		      var d = JSON.parse( savedData );
		      if (d.query === querytxt) {
		      	d.data.column.forEach(function(c){c.editor = Slick.Editors.Text;});
		      	d.data.column.push({id: "picked", name:"picked", field:"picked",formatter: Slick.Formatters.Checkmark, editor: Slick.Editors.Checkbox});
		      	//d.data.column.unshift(uniprot_detailView.getColumnDefinition());
						UpdateGrid(d.data,3);
						dosearch = false;
				}
			}
	}
	if (dosearch) {
		var query = BuildQuery(aname.split("_").join(" "));
		submitForm(query,querytxt);
	}
}

function queryPDBfromSequence(sequence) {
	document.getElementById("LoaderTxt").innerHTML = "query sequence : "+sequence;;
	var querytxt = sequence;
	if (usesavedSession) {

		var rowsids = gridArray[0].getSelectedRows();
		var savedData = sessionStorage.getItem("pdb_"+rowsids[0]);//,{"query":querytxt,"data":cdata}
		//if (savedData !== null) console.log("found ",savedData.query,querytxt,savedData.query === querytxt);
		if (savedData !== null ){
		      var d = JSON.parse( savedData );
		      if (d.query === querytxt) {
		      	d.data.column.forEach(function(c){c.editor = Slick.Editors.Text;});
		      	d.data.column.push({id: "picked", name:"picked", field:"picked",formatter: Slick.Formatters.Checkmark, editor: Slick.Editors.Checkbox});
		      	//d.data.column.unshift(uniprot_detailView.getColumnDefinition());
						UpdateGrid(d.data,3);
						dosearch = false;
				}
		}
	}
	var query = BuildSequenceQuery(sequence);
	submitForm(query,sequence);
}

//<img width="910" height="496" class="img-responsive" id="chainImageA"
//style="border: 0px; border-image: none;"
//src="http://www.rcsb.org/pdb/explore/remediatedChain.do?structureId=1A00&amp;params.annotationsStr=SCOP,Site%20Record,DSSP&amp;chainId=A" usemap="#chainAmap_">
function saveCurrentCSV(grid){
//	$("#exporticon").click(function() {
		console.log("saveCurrentCSV");
    var processRow = function (row) {
        var finalVal = '';
        for (var j = 0; j < row.length; j++) {
            var innerValue = row[j] === null ? '' : row[j].toString();
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
    var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, "filename.csv");
    } else {
        var link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "filename.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

//current Data to JSON and then Recipe ?
//current recipe format
//options/cytoplasme/compartmnes/recipe/ingredients

function saveCurrentXLS(){}
function saveCurrentD3JSON(){}
//save as a recipe that can be ued ?
//need additional fiedl : sphereTree.pcpAlVector.offset
//need to compute thenm ? server or client ?
//color
function OneCPIngredient(node,surface) {
	  var aing_dic = {};
	  aing_dic["encapsulatingRadius"] = node.data.size;
	  aing_dic["name"] = node.data.name;
	  //console.log(node.data);
	  if (node.data.uniprot)
	  		node.data.source.uniprot = node.data.uniprot;
	 	if (!node.data.source) {
	 		node.data.source = {"pdb":""};
	 	}
    //add the selection and the bu in the source
    node.data.source.selection = (node.data.selection)?node.data.selection:"";
    node.data.source.bu = (node.data.bu)?node.data.bu:"";
    node.data.source.model = (node.data.model)?node.data.model:"";

	  aing_dic["source"] = node.data.source;//var source = ("pdb" in ing_dic)? ing_dic["pdb"] : "None";
	  aing_dic["nbMol"] = node.data.count;
	  aing_dic["molarity"] = node.data.molarity;
    //need meshname meshName
	  aing_dic["meshFile"] = node.data.geom;//meshfile or v,f,n?
    aing_dic["meshType"] = node.data.geom_type;//meshfile or v,f,n?
	  aing_dic["principalVector"] = node.data.pcpalAxis;
	  aing_dic["offset"] = node.data.offset;
	  aing_dic["uniprot"] = node.data.uniprot;
	  aing_dic["label"] = node.data.label;
	  aing_dic["Type"] = "MultiSphere";
	  if (node.data.pos && node.data.radii) {
	  	aing_dic["positions"] = node.data.pos;
	  	aing_dic["radii"] = node.data.radii;
	  }
	  //description=label,organism,score,
	  return aing_dic;
	}

function AddPartner(ingdic,node,some_links) {
		ingdic["partners_name"]=[];
		for (var i=0;i< some_links.length;i++) {
		//partner_name from the link table/graph_links
	  		if (some_links[i].source === node )
	  		    if (ingdic["partners_name"].indexOf(some_links[i].target.data.name)==-1)
	  				//if (!(some_links[i].target.data.name in ingdic["partners_name"]))
	  						ingdic["partners_name"].push(some_links[i].target.data.name);
				if (some_links[i].target === node )
						if (ingdic["partners_name"].indexOf(some_links[i].source.data.name)==-1)
								ingdic["partners_name"].push(some_links[i].source.data.name);
		}
		return ingdic;
	}

  function NGLtoPMVselection(asele) {
      //translate-
      let new_sele = "";
  }

  function buildCMS(){
    var d = node_selected;//or node_selected.data.bu
    var pdb = d.data.source.pdb;//document.getElementById("pdb_str");
    var bu = (d.data.bu)?d.data.bu:"";//document.getElementById("bu_str");
    //selection need to be pmv string
    var sele = (d.data.selection)?d.data.selection:"";//document.getElementById("sel_str");
    sele = sele.replace(":","");
    //selection is in NGL format. Need to go in pmv format
    //every :C is a chainNameScheme
    var model = model_elem.selectedOptions[0].value;
    if ( model.startsWith("S") || model.startsWith("a") ) model = "";
    if ( sele.startsWith("/") ) sele = "";
    //depending on the pdb we will have a file or not
    var thefile = null;
    if ( d.data.source.pdb.length !== 4 ){
      pdb="";
      if (folder_elem && folder_elem.files.length !=""){
        thefile = pathList_[d.data.source.pdb];
      }
      else {
        pdb = d.data.source.pdb;
        //its a blob we want ?
      }
    }
    var formData = new FormData();
    //console.log(thefile)
    // add assoc key values, this will be posts values
      if (thefile !== null) {
        console.log("use input file",thefile);
        formData.append("inputfile", thefile, thefile.name);
        formData.append("upload_file", true);
      }
      else if (pdb && pdb!=="") formData.append("pdbId", pdb);
      if (bu && bu!=="") formData.append("bu", bu);
      if (sele && sele!=="") formData.append("selection", sele);
      if (model && model!=="") formData.append("modelId", model);
      //formData.append(name, value);
      console.log([pdb,bu,sele,model,thefile]);
      console.log(formData);
          $.ajax({
              type: "POST",
              url: "http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",//"cgi-bin/get_geom_dev.cgi",//"http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",
              success: function (data) {
                  console.log(data);
                  var data_parsed = JSON.parse(data.replace(/[\x00-\x1F\x7F-\x9F]/g, " "));
                  var mesh = data_parsed.results;//verts, faces,normals
                  NGL_ShowMeshVFN(mesh);
                  if (node_selected) {
                    node_selected.data.geom = mesh;//v,f,n directly
                    node_selected.data.geom_type = "raw";//mean that it provide the v,f,n directly
                  }
                  //update the slicktable ? especially if none were specified
                  //just ignore it in the table ? like the offset and pcp. they should be hidden in the table.
                  //more room  for molecular weight and other information
              },
              error: function (error) {
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

function NextComputeIgredient(){
    //filter is geom for now
  	var icurrent = current_compute_index;
  	//find previous
  	var found = false;
  	var i=(icurrent)? icurrent : 0;
    while (!found){
       i=i+1;
       var d = graph.nodes[i];
       if (i===graph.nodes.length) { break;}
       if ( !d.children && "data" in d && "geom" in d.data
            && (!d.data.geom || d.data.geom === "None"
            || d.data.geom === "null" || d.data.geom === "") ){
       //if (!graph.nodes[i].children){
       	found = true;
       	current_compute_index = i;
       	current_compute_node = graph.nodes[i];
       }
    }
    return found;
  }

function buildLoopAsync(){
    var d = current_compute_node;//or node_selected.data.bu
    var pdb = d.data.source.pdb;//document.getElementById("pdb_str");
    var bu = (d.data.bu)?d.data.bu:"";//document.getElementById("bu_str");
    //selection need to be pmv string
    if (bu===-1) bu="";
    var sele = (d.data.selection)?d.data.selection:"";//document.getElementById("sel_str");
    sele = sele.replace(":","");
    //selection is in NGL format. Need to go in pmv format
    //every :C is a chainNameScheme
    var model = (d.data.model)?d.data.model:"";
    if   ( model.startsWith("S") || model.startsWith("a") ) model = "";
    if ( sele.startsWith("/") ) sele = "";
    //depending on the pdb we will have a file or not
    var thefile = null;
    if ( d.data.source.pdb.length !== 4 ){
      pdb="";
      if (folder_elem && folder_elem.files.length !=""){
        thefile = pathList_[d.data.source.pdb];
      }
      else {
        pdb = d.data.source.pdb;
        //its a blob we want ?
      }
    }
    var formData = new FormData();
    //console.log(thefile)
    // add assoc key values, this will be posts values
      if (thefile !== null) {
        //console.log("use input file",thefile);
        formData.append("inputfile", thefile, thefile.name);
        formData.append("upload_file", true);
      }
      else if (pdb && pdb!=="") formData.append("pdbId", pdb);
      if (bu && bu!=="") formData.append("bu", bu);
      if (sele && sele!=="") formData.append("selection", sele);
      if (model && model!=="") formData.append("modelId", model);
      //formData.append(name, value);
      console.log("query geom with ",[pdb,bu,sele,model,thefile]);
      //console.log(formData);
          $.ajax({
              type: "POST",
              url: "http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",//"cgi-bin/get_geom_dev.cgi",//"http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",
              success: function (data) {
                  console.log(data);
                  var data_parsed = JSON.parse(data.replace(/[\x00-\x1F\x7F-\x9F]/g, " "));
                  var mesh = data_parsed.results;
                  current_compute_node.data.geom = mesh;//v,f,n directly
                  current_compute_node.data.geom_type = "raw";//mean that it provide the v,f,n directly
                  document.getElementById("stopbeads_lbl").innerHTML = "building "+ current_compute_index + " / " + graph.nodes.length;
                  if (NextComputeIgredient() && (!(stop_current_compute))) {
                      //update label_elem
                      buildLoopAsync();
                  }
                  else {
                    document.getElementById("stopbeads_lbl").innerHTML = "finished "+current_compute_index + " / " + graph.nodes.length;
                    stopBeads();
                  }
              },
              error: function (error) {
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


function buildCMS1(e){
    //query the server for a cms given a PDB - see template.html for example and the cgi-bin
    //need afile or PDB id, bu, sele, model
    var d = ngl_current_node;
    var pdb = d.data.source.pdb;//document.getElementById("pdb_str");
    var bu = (d.data.source.bu)?d.data.source.bu:"";//document.getElementById("bu_str");
    var sele = (d.data.source.selection)?d.data.source.selection:"";//document.getElementById("sel_str");
    var model = ""//document.getElementById("mo_str");
    //depending on the pdb we will have a file or not
    var thefile = null;
    if ( d.data.source.pdb.length !== 4 ){
      pdb="";
      if (folder_elem && folder_elem.files.length !=""){
        thefile = pathList_[d.data.source.pdb];
      }
      else pdb = d.data.source.pdb;
    }
    var formData = new FormData();
    // add assoc key values, this will be posts values
      if (thefile!== null) {
        formData.append("file", thefile, thefile.name);
        formData.append("upload_file", true);
      }
      if (pdb!=="") formData.append("pdbId", pdb);
      if (bu!=="") formData.append("bu", bu);
      if (sele!=="") formData.append("selection", sele);
      if (model!=="") formData.append("modelId", model);
      console.log(pdb,bu,sele,model,thefile);
      //formData.append(name, value);
          $.ajax({
              type: "POST",
              url: "http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py",
              success: function (data) {
                  console.log(data);
                  var data_parsed = JSON.parse(data);
                  var mesh = data_parsed.results;//verts, faces,normals
                  NGL_ShowMeshVFN(mesh);
                  if (node_selected) {
                    node_selected.data.geom = mesh;//v,f,n directly
                    node_selected.data.geom_type = "raw";//mean that it provide the v,f,n directly
                  }
                  //var e = document.getElementById("server_result");
                  //e.innerHTML = data;
                  //console.log(e);
              },
              error: function (error) {
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

function getCurrentNodesAsCP_JSON(some_data,some_links){
	//convert some_data to recipe.json
	jsondic = {"recipe": {
    "paths":[
       [
        "autoPACKserver",
        "https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0"
       ]
      ],
    "name": "",
    "version": "1.0"}};
  //options dictionary
  jsondic["options"]=
  {
  "cancelDialog":false,
  "_hackFreepts":false,
  "windowsSize":50,
  "use_gradient":false,
  "placeMethod":"jitter",
  "saveResult":false,
  "runTimeDisplay":false,
  "overwritePlaceMethod":true,
  "innerGridMethod":"jordan3",
  "boundingBox":[
   [
    -800,
    -1272,
    -1734
   ],
   [
    881.659,
    1272,
    1734
   ]
  ],
  "gradients":[],
  "smallestProteinSize":0,
  "computeGridParams":true,
  "freePtsUpdateThrehod":0.0,
  "pickWeightedIngr":true,
  "_timer":false,
  "ingrLookForNeighbours":false,
  "pickRandPt":true,
  "largestProteinSize":0,
  "resultfile":"",
  "use_periodicity":false,
  "EnviroOnly":false
  }
	//cytoplasme
	//for all nodes that don't have parent !== from root
	jsondic["cytoplasme"] ={"ingredients":{}};
	jsondic["compartments"] = {};//compartmentname:{"geom":g,"name":n}
	var aroot;
	for (var i=0;i<some_data.length;i++)
	{
      var  node = some_data[i];
      if (!node.parent) //root
      {
      	aroot = node;
      	jsondic.recipe.name = node.data.name;
      	continue;
      }
      if (node.children && node !== root) //compartment
      {
      	  var cname = node.data.name;
          if (cname === "cytoplasm") cname = "cytoplasme";//outside ?
      	  if (!(cname in jsondic["compartments"])) {
            var gtype = (node.data.geom_type)? node.data.geom_type : "None";
            var gname = (node.data.geom)? node.data.geom : "";
            //if metaball geom should be array of xyzr/
      	  	jsondic["compartments"][cname] = {"geom_type":gtype,"geom":gname,"name":cname,"surface":{"ingredients":{}},"interior":{"ingredients":{}}};
      	  }
      	  continue;
      }
      if (!node.children) //ingredient
      {
      	var cname = node.parent.data.name;
        if (cname === "cytoplasm") cname = "cytoplasme";//outside ?
        if (!(cname in jsondic["compartments"]) && (node.parent!==aroot)) {
          var gtype = (node.data.geom_type)? node.data.geom_type : "None";
          var gname = (node.data.geom)? node.data.geom : "";
          //if metaball geom should be array of xyzr/
          jsondic["compartments"][cname] = {"geom_type":gtype,"geom":gname,"name":cname,"surface":{"ingredients":{}},"interior":{"ingredients":{}}};
        }
      	var ingdic = OneCPIngredient(node);
      	if (some_links.length) {
      		console.log("check links",some_links.length)
      		ingdic = AddPartner(ingdic,node,some_links);
      		}
        //console.log(node.data.name,node.parent.data.name,jsondic.recipe.name,cname, (node.parent.data.name === jsondic.recipe.name ));
      	if( (node.parent.data.name === jsondic.recipe.name )|| (cname === "cytoplasme") ) jsondic["cytoplasme"].ingredients[node.data.name] = ingdic;
      	else if (node.data.surface) jsondic["compartments"][cname].surface.ingredients[node.data.name] = ingdic;
      	else jsondic["compartments"][cname].interior.ingredients[node.data.name] = ingdic;
      }
	}
	return jsondic;
}

function getCurrentNodesAsCP_SER_JSON(some_data){
	//convert some_data to recipe.json
	jsondic = {};//"recipe": {"name": "", "version": "1.0"}};
	//cytoplasme
	//for all nodes that don't have parent !== from root
	jsondic["cytoplasme"] ={"ingredients":[]};
	jsondic["compartments"] = {};//compartmentname:{"geom":g,"name":n}
	var aroot;
	for (var i=0;i<some_data.length;i++)
	{
      var  node = some_data[i];
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
      	  	jsondic["compartments"][cname] = {"geom":cname+"_geom","name":cname,"surface":{"ingredients":{}},"interior":{"ingredients":{}}};
      	  }
      	  continue;
      }
      if (!node.children) //ingredient
      {
      	var cname = node.parent.data.name;
      	var ingdic = OneCPIngredient(node);
      	if (node.parent === aroot) jsondic["cytoplasme"].ingredients[node.data.name] = ingdic;
      	else if (node.data.surface) jsondic["compartments"][cname].surface.ingredients[node.data.name] = ingdic;
      	else jsondic["compartments"][cname].interior.ingredients[node.data.name] = ingdic;
      }
		}
		return jsondic;
}

function saveCurrentCVJSON(){}

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    saveAs(file, fileName);
    //a.href = URL.createObjectURL(file);
    //a.download = fileName;
    //console.log(a);
    //a.click().click();
    //a.trigger('click');
    //window.open(a.href );
}

function SaveRecipeCellPACK(){
	console.log("save recipe");
  //current score?
  if (current_ready_state === 0) {
    alert( " this is recipe is incomplete, can't export\n missing ??\n"+JSON.stringify(current_ready_state_value) );
    return;
  }
	var jdata = getCurrentNodesAsCP_JSON(graph.nodes,graph.links);
  console.log(jsondic.recipe.name);
  console.log (JSON.stringify(jdata));
  download(JSON.stringify(jdata), jsondic.recipe.name+'.json', 'text/plain');
  console.log("saved");
}

function SaveRecipeCellPACK_serialized()
{
	console.log("save recipe serialized");
  if (current_ready_state === 0) {
    alert( " this is recipe is incomplete, can't export\n missing ??\n"+JSON.stringify(current_ready_state_value) );
    return;
  }
	var jdata = serializedRecipe(graph.nodes,graph.links);
  console.log(jdata);
  console.log (JSON.stringify(jdata));
  download(JSON.stringify(jdata), jdata.name+'_serialized.json', 'text/plain');
  console.log("saved");
	}
