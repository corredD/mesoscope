//main debug flag for console print
//TOO MANY Global variable...
var DEBUGLOG = false;
var DEBUGGPU = true;
var MERGE = false;
var recipe_file;
var recipe_changed = false; //toggle when change occurs, and autosave/save occurs.
//how to efficiently save work ?
var current_mode = 0;//0-view/curate mode, 1-create mode
var sql_data;
var start_drag = {"x": 0, "y": 0};
var mousexy = {"x": 0, "y": 0};
var mousein = false;
var draw_debug_mouse = false;
var comp_column = false;
var comp_column_names = [];//index,name
var comp_count = 0;
var csv_mapping = false; //if true, the column index is the column name
var additional_data = []
var canvas_label = document.getElementById("canvas_label");
var canvas_label_options = ["name", "None", "pdb", "uniprot", "label"];

var canvas_color = document.getElementById("canvas_color");
var default_options = ["none","pdb", "pcpalAxis", "offset", "count_molarity", "Beads",
"geom", "interaction", "confidence", "color", "viewed", "size", "count",
  "molarity", "molecularweight","default"];

var canvas_color_options = ["pdb", "pcpalAxis", "offset", "count_molarity", "Beads",
                            "geom", "interaction", "confidence", "color", "viewed", "size", "count",
                            "molarity", "molecularweight","default","automatic"];
var canvas_node_clusters = ["none","pdb", "pcpalAxis", "offset", "count_molarity", "Beads",
                          "geom", "interaction", "confidence", "color", "viewed", "size", "count",
                            "molarity", "molecularweight","default"];
var canvas_mincolor="hsl(0, 100%, 50%)";
var canvas_maxcolor="hsl(165, 100%, 50%)";
var property_mapping = {};
property_mapping.default = {"min": 999999, "max": 0,"cmin":"hsl(0, 100%, 50%)","cmax":"hsl(165, 100%, 50%)","colors":[]};
property_mapping.size = {"min": 999999, "max": 0,"cmin":"hsl(0, 100%, 50%)","cmax":"hsl(165, 100%, 50%)","colors":[]};
property_mapping.molecularweight = {"min": 999999, "max": 0,"cmin":"hsl(0, 100%, 50%)","cmax":"hsl(165, 100%, 50%)","colors":[]};
property_mapping.radius_molecularweight = {"min": 999999, "max": 0,"cmin":"hsl(0, 100%, 50%)","cmax":"hsl(165, 100%, 50%)","colors":[]};
property_mapping.molarity = {"min": 999999, "max": 0,"cmin":"hsl(0, 100%, 50%)","cmax":"hsl(165, 100%, 50%)","colors":[]};
property_mapping.count = {"min": 999999, "max": 0,"cmin":"hsl(0, 100%, 50%)","cmax":"hsl(165, 100%, 50%)","colors":[]};
property_mapping.confidence = {"min": 999999, "max": 0,"cmin":"hsl(0, 100%, 50%)","cmax":"hsl(165, 100%, 50%)","colors":[]};
property_mapping.interaction = {"min": 999999, "max": 0,"cmin":"hsl(0, 100%, 50%)","cmax":"hsl(165, 100%, 50%)","colors":[]};
property_mapping.automatic = {"min": 999999, "max": 0,"cmin":"hsl(0, 100%, 50%)","cmax":"hsl(165, 100%, 50%)","colors":[]};
var current_color_mapping;
var use_color_mapping = true;
var unique_array;
var use_unique_array = false;
var show_last_legends = false;
var legends = {w:100,h:40,ypad:5,f:30};
var latest_colorby;
var color_palette = {};
var comp_colors = {};
var current_scale = 1;
//extracellular
var localisation_tag = ["cytosol", "periplasm", "inner_membrane", "outer_membrane", "membrane", "cytoplasm", "lumen"];
var surface_tag = ["membrane", "x", "surface", "tm", "true"];
var current_ready_state = 0;//0-1-2
var current_ready_state_value;//0-1-2
var current_ready_state_details;
var list_missing_beads = [];
var list_missing_geom = [];
var list_missing_pdb = [];
var totalNbInclude = 0;
var stroke_line_width = 1;
var radius_scale = 1.0;
var sheet_name = [];
var current_data_header,
    current_jsondic,
    current_rootName;

var create_when_merge = true;
//eukaryote type
var comp_template_cell = {
  nodetype: "compartment",
  name: "periplasm",
  size: 150,
  children: [{
    nodetype: "compartment",
    name: "cytosol",
    size: 150,
    children: []
  }]
};

var periplasm = comp_template_cell;
var cytosol = comp_template_cell.children[0];

var lumen = {
  nodetype: "compartment",
  name: "lumen",
  size: 150,
  children: []};

var comp_template = {
  "periplasm": periplasm,
  "cytosol": cytosol
};
/*
Definitions of inner and outer membrane sides in OPM

Plasma membrane: IN � cytoplasmic, OUT � extracellular;
Endoplasmic reticulum, Golgi, nuclear, peroxisome, endosome, vacuole, and vesicle membranes: IN � cytoplasmic, OUT � luminal;
Outer mitochondrial, chloroplast or nuclear membrane: IN � cytoplasmic, OUT � intermembrane space;
Inner nuclear membrane: IN � lumen, OUT � perinuclear space;
Inner mitochondrial or chloroplast membrane: IN � matrix/stroma, OUT �intermembrane space;
Chloroplast thylakoid membrane: IN- stromal, OUT � thylakoid space.
Inner bacterial membrane: IN � cytoplasmic, OUT � periplasmic or extracellular space;
Outer bacterial membrane: IN � periplasmic space, OUT � extracellular;
*/

var temp_link;
var debug_data;

var header_index;
var start_index;


var comp_highligh;
var comp_highligh_surface;

var draggin_d_node = false;

var cDg;
var mouse_mooving = false;

var mainTextColor = [74, 74, 74],//"#4A4A4A",
    titleFont = "Oswald",
    bodyFont = "Merriweather Sans";

//currently node over
var node_over;
var node_over_to_use;

//currenlty selected
var node_selected;
var node_selected_indice;
var line_selected;
//if ctrlKey down, multiple selection
var nodes_selections = [];
var ctrlKey = false;

var canvas,
	main_canvasResizer,
    context,
    transform,
    thumbnail = new Image(),
    searchRadius = 140;

var container,
    width,
    height;

//depth color
var color = d3v4.scaleLinear()
    .domain([-1, 6])
    .range(["hsl(360,100%,100%)", "hsl(228,30%,40%)"])
    .interpolate(d3v4.interpolateHcl);

var centerX = 0,//width/2,
    centerY = 0;// height/2;

var root;
var gp_nodes;


var offx;
var offy;

var clusterBy=0;
var clusterByForce = 0.01;
var ParentForce = 0.01;
var SurfaceForce = 2;
var link_force = 0.1;

var AllForces = {
		"ParentForce":0.01,
		"SurfaceForce":0.5,
		"LinkForce":0.1,
		"clusterByForce":0.01,
		"collisionForce":1.0
	};

var current_clusters = {};
var graph = {};
var users;
var simulation;


var pack;
var HQ = false;

function EvaluateCurrentReadyState() {
	//check number of names != of default name out of all ingr
	//check number of sources out of all ingr
	//check number of beads setup
	//check number of geometry setup
	//check number of ingredient actually viewed by the user so far
	//need 100% for name, sources, beads, geometry for cellPack
	//rest is optional and can go in onrange states
	//else go to red
	var names_state=0;
	var sources_state=0;
	var beads_state=0;
	var geom_state=0;
	var count_molarity_state=0;
	var node_view_state=0;
	var comp_geom_state=0;
	var ningr=0;
	var ncomp=0;
	list_missing_beads=[];
	list_missing_geom=[];
	list_missing_pdb=[];
	totalNbInclude = 0;
	for (var i=0;i<graph.nodes.length;i++){
			var d = graph.nodes[i];
			if (!d.children && d.data.include)
			{
				ningr++;
				if  ( !d.data.name || d.data.name === "" || d.data.name === "protein_name")  names_state++;
				if  ( "data" in d && "source" in d.data
							&& "pdb" in d.data.source
							&& (!d.data.source.pdb || d.data.source.pdb === "None"
						|| d.data.source.pdb === "null" || d.data.source.pdb === ""))  {sources_state++;list_missing_pdb.push(d.data.name);}
				//if ( "data" in d && "source" in d.data
				//			&& "pos" in d.data
				if (!d.data.pos || d.data.pos === "None"
							|| d.data.pos === "null" || d.data.pos.length === 0
							|| d.data.pos === "")  {beads_state++;list_missing_beads.push(d.data.name);}
				if ("data" in d && "count" in d.data && "molarity" in d.data
							&& d.data.count === 0 && d.data.molarity === 0.0) count_molarity_state++;
				//if ( "data" in d && "geom" in d.data
				if (!d.data.geom || d.data.geom === "None"
						|| d.data.geom === "null" || d.data.geom === "")  {geom_state++;list_missing_geom.push(d.data.name);}
				if ( "data" in d && "visited" in d.data
									&& !d.data.visited ) node_view_state++;
				if ("data" in d && "include" in d.data && d.data.include) totalNbInclude+=1;

			}
			else {
				//compartments
				if (d.parent && d.data.nodetype === "compartment") {
					ncomp++;
					if( "data" in d && "geom" in d.data
								&& (!d.data.geom || d.data.geom === "None"
							|| d.data.geom === "null" || d.data.geom === ""))  comp_geom_state++;
				}
			}
	}
	if (ncomp === 0) ncomp = 1;
	//sumarize
	var res = {"names": (ningr-names_state)/ningr,"sources":(ningr-sources_state)/ningr,
 							"beads" : (ningr-beads_state)/ningr,"geom":(ningr-geom_state)/ningr,
						"count":(ningr-count_molarity_state)/ningr,"visited":(ningr-node_view_state)/ningr,
						"compgeom":(ncomp-comp_geom_state)/ncomp
					}
	current_ready_state_details = res;
	//need either the beads or the geom
	var score_critical = (res.geom+res.beads+res.compgeom)/3;//critical part need to yellow
	var perfect_score =  0;
	for (var key in res) {
		//console.log(key,res[key]);
    perfect_score += res[key];
	};
	perfect_score/=7;
	//console.log(score_critical);
	//console.log(perfect_score,perfect_score/7);
	current_ready_state = 0;
	if (score_critical === 1) current_ready_state = 1;
	else if (perfect_score === 1) current_ready_state = 2;
	current_ready_state_value = res;
	//console.log(list_missing_geom);
	//console.log(list_missing_beads);
	//console.log(list_missing_pdb);
}

function switchMode(e){
	if (current_mode ===1 ){
		current_mode = 0;
		document.getElementById("addingr").setAttribute("class", "hidden");
		document.getElementById("addcomp").setAttribute("class", "hidden");
		document.getElementById("addlink").setAttribute("class", "hidden");
		}
	else {
		current_mode = 1;
		document.getElementById("addingr").setAttribute("class", "show");
		document.getElementById("addcomp").setAttribute("class", "show");
		document.getElementById("addlink").setAttribute("class", "show");
		}
	}

function CreateNew(){
	var r = confirm("Create a new blank recipe and loose your change ?");
	if (!r) return;
	//reset everything
	current_mode = 1;
	document.getElementById("editmode").checked = true;
	document.getElementById("addingr").setAttribute("class", "show");
	document.getElementById("addcomp").setAttribute("class", "show");
	document.getElementById("addlink").setAttribute("class", "show");
	//toggel visible the addIngredient/addCompartment button ?
	//or use drag/drop
	update_graph([],[]);
	graph.nodes=[];
	//add the master parent
	root = {"name":"root","children":[]};
	var aroot = d3v4.hierarchy(root);
	var nodes = pack(aroot).descendants();
	nodes[0].children=[];
	graph.nodes=nodes;
	graph.links=[];
	//clear selection
	node_selected = null;
	node_selected_indice = -1;
	nodes_selections=[];
	//clear highligh
	clearHighLight();
	//clear NGL
	if (stage) {
		NGL_Clear();
	}
	//clear PDB component widget
	setupProVista(null);
	UpdatePDBcomponent(null);
	MS_Clear();
}

//we need Stoichiometry=>change of molarity
//need to add
//geom name field
//molecularweight
//confidence - score
var allfield={
	name_index:-1,
	source_index:-1,
	count_index:-1,
	compartment_index:-1,
	biological_unit_index:-1,
	string_selection_index:-1,
	location_index:-1,
	model_index:-1,
	molarity_index:-1,
	uniprot_index:-1,
	offset_index:-1,
	pcpalvector_index:-1,
	molecularweight_index:-1,
	confidence_index:-1,
	include_index:-1,
	color_index:-1,
	comment_index:-1,
	label_index:-1,
	image_index:-1,//filnename?
	offsety_index:-1,
	scale2d_index:-1,
	compartments:-1//special case where one column per comnpartment
	};
//key in graph.nodes
var allfield_key={
	name_index:"name",
	source_index:"source",
	count_index:"count",
	compartment_index:"compartment",
	biological_unit_index:"bu",
	string_selection_index:"selection",
	location_index:"surface",
	model_index:"model",
	molarity_index:"molarity",
	uniprot_index:"uniprot",
	offset_index:"offset",
	pcpalvector_index:"pcpalAxis",
	molecularweight_index:"molecularweight",
	confidence_index:"confidence",
	include_index:"include",
	color_index:"color",
	comment_index:"comment",
	label_index:"label",
	image_index:"thumbnail",
	offsety_index:"offsety",
	scale2d_index:"scale2d",
	compartments:"compartments"//special case where one column per comnpartment
};

var allfield_labels={
	name_index:"protein name",
	source_index:"protein structure (PDB,EMD)",
	count_index:"protein copy number",
	compartment_index:"protein compartment",
	biological_unit_index:"protein biological unit / assembly",
	string_selection_index:"protein selection (chain name)",
	location_index:"protein localisation in the compartment (look for keyword : surface, membrane, x, tm)",
	model_index:"protein model number in structure file",
	molarity_index:"protein contentration",
	uniprot_index:"uniprot mapping",
	offset_index:"protein offset along the principal vector",
	pcpalvector_index:"protein principal axis which will be align to the compartment surface",
	molecularweight_index:"protein molecular weight",
	confidence_index:"overall confidence score",
	include_index:"include the ingredient (x,null,true,false)",
	color_index:"predefined color for ingredient (r,g,b)",
	comment_index:"notes and comments for the ingredient",
	label_index:"label for the ingredient",
	image_index:"filename for thumbnail/image",
	offsety_index:"2d surface protein membrane offset",
	scale2d_index:"2d surface protein scale (px/A)",
	compartments:""//special case where one column per comnpartment
	};

var allfield_query={
	name_index:["protein","name"],
	source_index:["structure","source","pdb"],
	count_index:["copy","number","count"],
	compartment_index:["compartment"],
	biological_unit_index:["biological","bu","assembly","stoichiometry"],
	string_selection_index:["selection","chain"],
	location_index:["membrane", "localisation","localization","location","surface"],
	model_index:["model"],
	molarity_index:["contentration","molarity"],
	uniprot_index:["uniprot"],
	offset_index:["offset"],
	pcpalvector_index:["pcpalVector","principalvector","principalaxis","axis","vector"],
	molecularweight_index:["mw","weight","molecularweight","molecular"],
	confidence_index:["confidence","score"],
	include_index:["include"],
	color_index:["color","rgb"],
	comment_index:["note","comment"],
	label_index:["label","description"],
	image_index:["image","thumbnail","sprite"],
	offsety_index:["2dy"],
	scale2d_index:["scale2d"],
	compartments:""//special case where one column per comnpartment
};

//need type, editable, min,max, callback
//default callback take key name, and replace with value
var allattributes_type={
  "name": {"type":"string","editable":true},
  "size": {"type":"number","editable":true,"min":1,"max":500},
  "molecularweight": {"type":"number","editable":true,"min":0.0,"max":500000.0},
  "confidence":{"type":"number","editable":true,"min":0.0,"max":1.0,"step":0.01},
  "source": {"type":"object","editable":true},
  "count": {"type":"number","editable":true,"min":0,"max":100000},
  "molarity": {"type":"number","editable":true,"min":0,"max":0.1,"step":0.0001},
  "surface": {"type":"bool","editable":true},
  "geom": {"type":"button","editable":false},//use build geom input button
  "geom_type": {"type":"string","editable":false},
  "label": {"type":"string","editable":true},
  "uniprot":{"type":"string","editable":true},
  "pcpalAxis": {"type":"vector3","editable":false},
  "offset": {"type":"vector3","editable":false},
  "pos": {"type":"object","editable":false},
  "radii": {"type":"object","editable":false},
  "ingtype": {"type":"select","editable":true,"options":["protein","fiber","ligand"]},
  "buildtype": {"type":"select","editable":true,"options":["random","file","supercell"],"callback":"switchBuildType_cb"},
  "buildfilename":{"type":"string","editable":true},
  "comments":{"type":"string","editable":true},
  "color": {"type":"color","editable":true},
  "nodetype":  {"type":"select","editable":true,"options":["ingredient","compartment"]},
  "visited": {"type":"bool","editable":false},
  "include": {"type":"bool","editable":true},
  "opm": {"type":"number","editable":true,"min":-1,"max":1,"step":1},
  "angle": {"type":"number","editable":true,"min":0.0,"max":360.0,"step":0.1 },
  "ulength": {"type":"number","editable":true,"min":0,"max":250},
  "tlength": {"type":"number","editable":true,"min":0,"max":100000},
  "id": {"type":"number","editable":false},
  "curves" : {"type":"object","editable":false},
  "sprite":{"type":"object","editable":true},
  "image":{"type":"string","editable":true},
  "offsety":{"type":"number","editable":true,"min":-50.0,"max":50.0,"step":0.1},//px
  "scale2d":{"type":"number","editable":true,"min":0.0,"max":500.0,"step":0.01},//px
  "thumbnail":{"type":"string","editable":false},
}

//ordered liste
var attribute_list_order=[
  "include","id","name","size","molecularweight","source","confidence","count","molarity","label",
  "uniprot","geom","geom_type","surface","opm","pcpalAxis","offset","pos","radii","ingtype",
  "buildtype","buildfilename","comments","color","nodetype","visited","angle","ulength","tlength",
  "curves","sprite","thumbnail"
];
//should use csv->SQL->json
function changeColumnMapping(aselect) {
	  //console.log(aselect);
		//console.log(aselect.value,aselect.text,aselect.id);
		//console.log(aselect.options[aselect.selectedIndex].text);
		var txt = aselect.options[aselect.selectedIndex].text;
		//if (!csv_mapping) allfield[aselect.id] = (txt === "Absent")? -1 : parseInt(aselect.value);
		//else allfield[aselect.id] = txt;
		allfield[aselect.id] = (txt === "Absent")? -1 : parseInt(aselect.value);
		console.log("change selection to ",aselect.id);
		console.log(allfield[aselect.id]);
		if (aselect.id === "location_index" || aselect.id === "compartment_index" ) {
			//update the parsing
			if (!(comp_column)) {
				var loc_comp = guessCompartmentList(current_data_header, current_jsondic, current_rootName);
				UpdateCompartmentModalCanvas(loc_comp);
			}
		}
		//recheck compartment settings ?
	}

function sharedStart(array){
    var A= array.concat().sort(),
    a1= A[0], a2= A[A.length-1], L= a1.length, i= 0;
    while(i<L && a1.charAt(i)=== a2.charAt(i)) i++;
    return a1.substring(0, i);
}
//http://www.technicaladvices.com/2015/04/25/javascript-quiz-finding-longest-common-substrings-of-strings/
function findLongestCommonSubstring (string1, string2) {
	var comparsions = []; //2D array for the char comparsions ...
	var maxSubStrLength = 0;
	var lastMaxSubStrIndex = -1, i, j, char1, char2, startIndex;

	for (i = 0; i < string1.length; ++i) {
		comparsions[i] = new Array();

		for (j = 0; j < string2.length; ++j) {
			char1 = string1.charAt(i);
			char2 = string2.charAt(j);

			if (char1 === char2) {
				if (i > 0 && j > 0) {
					comparsions[i][j] = comparsions[i - 1][j - 1] + 1;
				} else {
					comparsions[i][j] = 1;
				}
			} else {
				comparsions[i][j] = 0;
			}

			if (comparsions[i][j] > maxSubStrLength) {
				maxSubStrLength = comparsions[i][j];
				lastMaxSubStrIndex = i;
			}
		}
	}

	if (maxSubStrLength > 0) {
		startIndex = lastMaxSubStrIndex - maxSubStrLength + 1;

		return string1.substr(startIndex, maxSubStrLength);
	}

	return null;
}

function GuessColumn(field1name,allfield2){
	console.log("GuessColumn "+field1name+" "+allfield_query[field1name]);
	 var tocompare = allfield_query[field1name];//this is an array
	 var comon;
	 var aindex=-1;
	 for (var i=0;i<allfield2.length;i++){
	 		//comon = sharedStart([tocompare,allfield2[i].toLowerCase().replace(" ","")]);
			for (var j=0;j<tocompare.length;j++) {
				if (!allfield2[i] || allfield2[i]==="") continue;
				comon = findLongestCommonSubstring(tocompare[j],allfield2[i].toLowerCase().replace(" ",""))
		 		console.log(tocompare[j],allfield2[i].toLowerCase(),comon);
		 		if (comon && comon!=="" ) {//comon!=="" &&
		 			if (tocompare === "pdb" && comon.length >= 3) {aindex=i;console.log(comon,aindex);return aindex;}//break;}
		 			else if ( comon.length >= tocompare[j].length ){aindex=i;console.log(comon,aindex);return aindex;}//;break;}
		 		}
			}
	 	}
	 	console.log(comon,aindex);
	 	return aindex;
}

function GuessColumnSingle(field1name,allfield2){
	 var tocompare = (field1name!=="source_index")?field1name.split("_")[0]:"pdb";
	 if (tocompare==="string") tocompare = "selectionchain";
	 var comon;
	 var aindex=-1;
	 for (var i=0;i<allfield2.length;i++){
	 		//comon = sharedStart([tocompare,allfield2[i].toLowerCase().replace(" ","")]);
	 		comon = findLongestCommonSubstring(tocompare,allfield2[i].toLowerCase().replace(" ",""))
	 		console.log(tocompare,allfield2[i].toLowerCase(),comon);
	 		if (comon && comon!=="" ) {//comon!=="" &&
	 			if (tocompare === "pdb" && comon.length >= 3) {aindex=i;break;}
	 			else if ( comon.length >= tocompare.length ){aindex=i;break;}
	 		}
	 	}
	 	console.log(comon);
	 	return aindex;
	}

function createOneColumnSelect(field1name,allfield2,divparent) {
		//Create and append select list
	console.log("createOneColumnSelect "+field1name);
    var elem = grid_addToModalDiv( divparent, 'modal-content-elem', allfield_labels[field1name]);
    if (MERGE){
		var checkbox = document.createElement('input');
		checkbox.type = "checkbox";
		checkbox.name = field1name;
		//checkbox.value = true;
		checkbox.checked = true;
		checkbox.id = field1name+"_include";
		elem.prepend(checkbox);
		merge_field[field1name] = checkbox;
    }
    var selectList = document.createElement("select");
	//onchange="myCallback();" onfocus="this.selectedIndex=-1;this.blur();"
	selectList.id = field1name;
	elem.appendChild(selectList);
	//Create and append the options
	var aind = GuessColumn(field1name,allfield2);
    var sopt;
	for (var i = 0; i < allfield2.length; i++) {
		var option = document.createElement("option");
		option.value = i;
		option.text = allfield2[i];
		selectList.appendChild(option);
		if (aind===i) sopt = option;
	}
	var noption = document.createElement("option");
	noption.value = allfield2.length;
	noption.text = "Absent";
	selectList.appendChild(noption);
	if (aind!==-1) {
		selectList.options.selectedIndex = aind;
		sopt.setAttribute("selected", "selected");
		//if (!csv_mapping) allfield[field1name] = aind;
		//else allfield[field1name] = sopt.text;
		allfield[field1name] = aind;
	}
	else {
		selectList.options.selectedIndex =  allfield2.length;
		noption.setAttribute("selected", "selected");
		allfield[field1name] =  -1;
	}
	selectList.setAttribute("onchange","changeColumnMapping(this)");
}


//cytoplasm is a keyword and mean no compartment->outside
/*var some_data = {
	nodetype: "compartment",
	name: "newCompartment",
	size: 150,
	children: []
};*/
function guessCompartmentFromColumn(data, rootName) {
	var loc_name=[];
	rootName = "root";
	var rootComp = {
		nodetype: "compartment",
		name: "root",
		size: 10,
		surface : false,
		children: []
	};
	var comp_dic_hierarchy=rootComp;
	var comp_name=[rootName];
	var comp_dic={rootName:rootComp};
	//var comp_dic_hierarchy={
	//};

	//when to use root ?
	console.log("indexes ", allfield.location_index, allfield.compartment_index);//-1, undefined ?
	if ( (!allfield.location_index || allfield.location_index ===-1) && (!allfield.compartment_index || allfield.compartment_index ===-1) ) return comp_dic;
	console.log("indexes ", allfield.location_index, allfield.compartment_index,start_index,data.length);
  	for (var i=start_index;i<data.length;i++)
	{
		if ((data[i][0]) && (data[i][0].toLowerCase()==="end")) break;
		var loc = (allfield.location_index && allfield.location_index !==-1)? data[i][allfield.location_index]:null;
		var comp = (allfield.compartment_index && allfield.compartment_index !==-1)? data[i][allfield.compartment_index]:null;
		if (!loc) //meaning empty cell and not cytoplasme
		{
			loc = rootName;
		}
		//console.log("loc and comp",loc,comp);
		if (loc||comp) {
			//if (loc_name.indexOf(loc) === -1) {
			//	loc_name.push(loc);
			//	//comp_dic[comp]={};
			//	console.log("loc is ",loc);
			//}
			if (comp) {
					//check if can split with "." or "/"
					var csplit = comp.split(".");
					if (csplit.length > 1) comp = csplit[csplit.length-1];
					csplit = comp.split("/");
					if (csplit.length > 1) comp = csplit[csplit.length-1];
					//what about nesting, can visualy fix it
					if (comp_name.indexOf(comp) === -1) {
						comp_name.push(comp);
						var cdata = {
							nodetype: "compartment",
							name: comp,
							size: 10,
							surface : false,
							children: []
						};
						comp_dic[comp]=cdata;
						comp_dic_hierarchy.children.push(comp_dic[comp]);//rootComp.children.push(comp_dic[comp]);
						//comp_dic[comp]= comp_dic_hierarchy.children[comp_dic_hierarchy.children.length-1];
						console.log("comp is ",comp);
					}
					if (loc && loc_name.indexOf(loc) === -1 && comp_name.indexOf(loc) === -1) {
						loc_name.push(loc);
						var cdata = {
							nodetype: "compartment",
							name: loc,
							size: 10,
							surface : IsSurface(loc),
							children: []
						};
						//if (IsSurface(loc)) cdata.surface = true;
						console.log("1IsSurface(loc)",loc,cdata.surface);
						//rootComp.children[rootComp.children.length-1].children.push(cdata);
						comp_dic_hierarchy.children[comp_dic_hierarchy.children.length-1].children.push(cdata);
						//check if surface ?
					}
			}
			else {//no comp assume only one big vesicle
				if (loc && loc_name.indexOf(loc) === -1) {
					loc_name.push(loc);
					var cdata = {
						nodetype: "compartment",
						name: loc,
						size: 10,
						surface : IsSurface(loc),
						children: []
					};
					//if (IsSurface(loc)) cdata.surface = true;
					console.log("2IsSurface(loc)",loc,cdata.surface);
					comp_dic_hierarchy.children.push(cdata);//rootComp.children.push(cdata);
				}
		}
		}
	}
	//comp_dic_hierarchy.children.push(rootComp);
	return comp_dic_hierarchy;
}

function guessCompartmentList(data_header, jsondic, rootName){
	var data = getDataFromDic(jsondic);
	var loc_comp = guessCompartmentFromColumn(data,rootName);
	return loc_comp;
}


function getModalMapping(data_header,jsondic,rootName) {
	if (!MERGE){
		additional_data=[];//reset
	}
	var modal_cont = document.getElementById("slickdetail");
  	var item_cont = document.getElementById("modalform");//"slickitems");//modalform
		item_cont.innerHTML = "";
	var canvas_cont = document.getElementById("modalcanvas");//"slickitems");
  	var span = document.getElementById("closeslickdetail");
  	var btn1 = document.getElementById("saveDetail");
  	var btn2 = document.getElementById("cancelDetail");
	//is it brett format with column per compartments
	var comp_column_graph ={
		nodetype: "compartment",
		name: rootName,//"root",
		size: 10,
		children: []
	};
	var comp_column_graph_key = {};
	comp_column_names = [];
	comp_column = false;
	for (var i = 0; i < data_header.length; i++) {
		var h = data_header[i];
		//use the slice ?
		if ((!h)||(h==="")) continue;
		if (h.slice(0,2)==="I_"){ //interior
			comp_column =true;
			var cname = data_header[i].slice(2,data_header[i].length);
			//if (!csv_mapping)comp_column_names.push({"id":i,"name":data_header[i].slice(2,data_header[i].length),"surface":false});
			//else comp_column_names.push({"id":data_header[i],"name":data_header[i].slice(2,data_header[i].length),"surface":false});
			comp_column_names.push({"id":i,"name":data_header[i].slice(2,data_header[i].length),"surface":false});
			if (!(cname in comp_column_graph_key) ) {
				var cdata = {
					nodetype: "compartment",
					name: cname,
					size: 10,
					children: []
				};
				comp_column_graph.children.push(cdata);
				comp_column_graph_key[cname] = comp_column_graph.children[comp_column_graph.children.length-1];
			}
		}
		if (h.slice(0,2)==="S_"){ //surface
			comp_column =true;
			var cname = data_header[i].slice(2,data_header[i].length);
			//if (!csv_mapping) comp_column_names.push({"id":i,"name":data_header[i].slice(2,data_header[i].length),"surface":true});
			//else comp_column_names.push({"id":data_header[i],"name":data_header[i].slice(2,data_header[i].length),"surface":true});
			comp_column_names.push({"id":i,"name":data_header[i].slice(2,data_header[i].length),"surface":true});
			if (!(cname in comp_column_graph_key) ) {
				var cdata = {
					nodetype: "compartment",
					name: cname,
					size: 10,
					children: []
				};
				comp_column_graph.children.push(cdata);
				comp_column_graph_key[cname] = comp_column_graph.children[comp_column_graph.children.length-1];
			}
		}
	}
	console.log("found "+comp_column_names.length+" compartments");

  	var astr = "found "+comp_column_names.length+" compartments";
	for (var c=0;c < comp_column_names.length;c++) 
	{
  		astr +="<br>"+comp_column_names[c].name+" surface "+comp_column_names[c].surface;
	}

    if (MERGE){
		var acheckbox = document.createElement('input');
		acheckbox.type = "checkbox";
		acheckbox.name = "allfieldtoggle";
		acheckbox.checked = true;
		acheckbox.id = "allfieldtoggle_include";
		acheckbox.onclick = function(cb){
			for(var k in allfield) {
				if (k==="compartments") continue;
				merge_field[k].checked = !merge_field[k].checked;
			}
		}
		var celem =  grid_addToModalDiv( item_cont, 'modal-content-elem', "select all");
		celem.prepend(acheckbox);
    }
	for(var k in allfield) 
	{
		if (k==="compartments") continue;
		createOneColumnSelect(k,data_header,item_cont)
	}
	//gave the option to add one column from the spread shit
	//button that will create one new line
	var add_data = document.createElement('button');
	add_data.id = "add_data_table";
	add_data.innerHTML = "add a custom column";
	
	//var belem =  grid_addToModalDiv( item_cont, 'modal-content-elem', "custom user data");
	//belem.append(add_data);
	add_data.onclick = function(cb){
		var n = additional_data.length;
		var name = "custom_"+n.toString();
		allfield[name]=-1;
		allfield_key[name]=name;
		allfield_labels[name]="custom user data from spreadsheet";
		allfield_query[name]=[""]
		additional_data.push(name);
		createOneColumnSelect(name,data_header,item_cont);
	}

	//field1name,allfield2,divparent
	current_data_header = data_header;
	current_jsondic = jsondic;
	current_rootName = rootName;
	var loc_comp;
	if (!(comp_column))
		loc_comp = guessCompartmentList(data_header, jsondic,rootName);
	else
		loc_comp = comp_column_graph;
	console.log("guessed "+Object.keys(loc_comp).length+" compartments");
	console.log(loc_comp);
	astr += "<br>guessed "+Object.keys(loc_comp).length+" compartments";
	//for (var co in loc_comp) {
	//	astr +="<br>"+co+" "+loc_comp[co];
	//}
	var textelem =  grid_addToModalDiv( item_cont, 'modal-content-elem', astr);
	
	item_cont.append(add_data);

		//textelem.innerHTML+=astr;
    if (MERGE){
      var new_elem =  grid_addToModalDiv( item_cont, 'modal-content-elem', "Create new ingredient upon merge / Only Update");
      var mergecheckbox = document.createElement('input');
      mergecheckbox.type = "checkbox";
      mergecheckbox.name = "create_when_merge";
      mergecheckbox.checked = true;
      mergecheckbox.id = "create_when_merge";
      mergecheckbox.onclick = function(cb){
          create_when_merge = cb.checked;
      }
      new_elem.prepend(mergecheckbox);
    }
    modal_cont.style.display = "block";

	SetupCompartmentModalCanvas(canvas_cont,loc_comp);

  	span.onclick = function() {
      modal_cont.style.display = "none";
      //$modal.remove();
		}

  	btn1.onclick = function() {
      modal_cont.style.display = "none";
      //$modal.remove();
      //continue to parse
      parseSpreadSheetRecipe(data_header,jsondic,rootName);
		}

		btn2.onclick = function() {
      modal_cont.style.display = "none";
      //$modal.remove();
		}
	}

function mainParsingSpreadshit(jsondic,rootName){
	//why the key are not working properly?
	console.log(jsondic);
	//console.log(JSON.parse(jsondic));
	//parse for getting the headr position
	sheet_name=[];
	for ( var k in jsondic){
		sheet_name.push(k);
	}

	//var sheet_name = Object.keys(jsondic);
	var nSheet = sheet_name.length;
	//sheet 1 -> ingredient list
	//sheet 2 -> interaction list
	console.log(sheet_name);
	console.log(sheet_name[0]);
	var data = jsondic[sheet_name[0]];
	console.log(data);
	var data_header = data[0];
	console.log("data header");
	console.log(data_header);
	getModalMapping(data_header,jsondic,rootName);
	}

function isFloat(n) {
    return n === +n && n !== (n|0);
}

function isInteger(n) {
    return n === +n && n === (n|0);
}

function IsSurface(cellValue) {
	console.log("IsSurface(cellValue)",cellValue);
	if (!cellValue) return false;//undefined
	if (cellValue === true) return true;
	for (var j=0;j<surface_tag.length;j++) {
		let comon = findLongestCommonSubstring(surface_tag[j].toLowerCase(),cellValue.toLowerCase().replace(" ",""))
		//console.log(surface_tag[j],cellValue.toLowerCase(),comon);
		if (comon && comon!=="" ) {
			if ( comon.length >= surface_tag[j].length ) return true;
		}
	}
	return false;
}
//comp_template
function GetCompFromLocalisation(cellvalue) {
	for (var j=0;j<localisation_tag.length;j++) {
		let comon = findLongestCommonSubstring(localisation_tag[j],cellvalue.toLowerCase().replace(" ",""))
		//console.log(localisation_tag[j],cellvalue.toLowerCase(),comon);
		if (comon && comon!=="" ) {
			if ( comon.length >= localisation_tag[j].length ) {
			if (localisation_tag[j]==="inner_membrane")
			{
				return "cytosol";
			}
			else if (localisation_tag[j]==="outer_membrane")
			{
				return "periplasm";
			}
			else if (localisation_tag[j]==="membrane")
			{
				return "lumen";//
			}
			else
			{
				return localisation_tag[j];
			}
		}
		}
	}
	return "root";
}

function ParseBU(cellvalue)
{
		//can start by B,BU,BA
		//can be a numbers
		//cab a string:number
		//has to be a numbers
		if (!cellvalue || cellvalue ==="") return "BU1";
		let elem = cellvalue.toString().split(":");
		if (elem.length===1) {
			//is it with //
			if (elem[0].startsWith("BA")) return elem[0].split("BA")[1];
			else if (elem[0].startsWith("BU")) return elem[0].split("BU")[1];
			else if (elem[0].startsWith("B")) return elem[0].split("B")[1];
			else return elem[0];
		}
		else return elem[1];
}

function getDataFromDic(jsondic) {
	var data;
	if (!csv_mapping){
		sheet_name=[];
		for ( var k in jsondic){
			sheet_name.push(k);
		}

		//var sheet_name = Object.keys(jsondic);
		var nSheet = sheet_name.length;
		//sheet 1 -> ingredient list
		//sheet 2 -> interaction list
		console.log("sheeetname",sheet_name);
		console.log("sheeetname",sheet_name[0]);
		data = jsondic[sheet_name[0]];
		//console.log("all ",data);
		data_header = data[0];
	}
	else {
		data = jsondic;
		}
	return data;
}

function getCompartmentDefault(idata,elem){
	var loc_comp = (location_index!==-1)?idata[location_index]:"";
	var comp =  (allfield.compartment_index!==-1) ? idata[allfield.compartment_index]: "";

	var comp_elem = null;
	if (!comp_column) {
		//not the multicolumn compartment definition
		if (comp!==""){
				// a column compartment was set by user
				//use the modal mapping
				if (comp in compartments){
					comp_elem = compartments[comp];
					}
				else {
					compartments[comp]={"name":comp,"children":[],"nodetype":"compartment"};
					comp_elem = compartments[comp];
					graph["children"].push(comp_elem);
					}
		}
		else {
				//use the loc_comp to get the compartment
				let acomp_elem = GetCompFromLocalisation(loc_comp);
				if (acomp_elem in compartments) comp_elem = compartments[acomp_elem];
				else {
					compartments[acomp_elem]={"name":acomp_elem,"children":[],"nodetype":"compartment"};
					comp_elem = compartments[acomp_elem];
					graph["children"].push(comp_elem);
				}
		}
	 }
	else {
			//console.log("check "+comp_column_names.length);
			//look at all the comp_column, adn the one with a concentration define the compartments
			for (var c=0;c < comp_column_names.length;c++) {
				var values = idata[comp_column_names[c].id];//can be a count or a molarity
				//console.log("comp is "+c+" "+comp_column_names[c].id+" "+values);
				if (values && values!==null && values!=="" && values!==0) {
						if (isInteger(values)) elem.count = values;
						else if (isFloat(values)) elem.molarity = values;
						else if (molarity_index ===-1) elem.molarity = values;
						elem.surface = comp_column_names[c].surface;
						comp = comp_column_names[c].name;
						if (comp in compartments){
							comp_elem = compartments[comp];
							}
						else {
							compartments[comp]={"name":comp,"children":[],"nodetype":"compartment"};
							comp_elem = compartments[comp];
							graph["children"].push(comp_elem);
						}
					 // console.log(isInteger(values));
					 // console.log(isFloat(values))
						//undefined ?>
					//  console.log("comp for "+name+" "+values+" "+comp_column_names[c].name+" "+ comp_column_names[c].surface+" "+comp_column_names[c].id+" "+elem.surface);
				}
			}
		}
	if (comp_elem===null) {
		if (loc_comp==="cytoplasm"){
				comp_elem=graph;
		}
		else {
		 comp = rootName+"_compartment";
		//no compartment provided, use the recipe name as a compartments?
			if (comp in compartments){
				comp_elem = compartments[comp];
				}
			else {
				compartments[comp]={"name":comp,"children":[]};
				comp_elem = compartments[comp];
				graph["children"].push(comp_elem);
				}
		}
	}

	//alert(comp_elem.name);
	elem.surface = IsSurface(loc_comp)
	//console.log("checkforsurface for "+elem.name+" "+loc_comp+" "+elem.surface);
	comp_elem["children"].push(elem);
}

function parseSpreadSheetRecipe(data_header,jsondic,rootName)
{
  	var data = getDataFromDic(jsondic);
	//why the key are not working properly?
	console.log(rootName);
	//console.log(JSON.parse(jsondic));
	//parse for getting the headr position
	var name_index=allfield.name_index,
		source_index=allfield.source_index,
		count_index=allfield.count_index,
		//compartment_index=allfield[compartment_index],
		biological_unit_index=allfield.biological_unit_index,
		string_selection_index=allfield.string_selection_index,
		location_index=allfield.location_index,
		model_index=allfield.model_index,
		molarity_index=allfield.molarity_index,
		uniprot_index=allfield.uniprot_index,
		offset_index=allfield.offset_index,
		pcpalvector_index=allfield.pcpalvector_index,
		molecularweight_index=allfield.molecularweight_index,
		confidence_index=allfield.confidence_index,
    	compartments_index=allfield.compartment_index;
  	console.log("mapping for "+rootName+" is ");
	console.log(allfield);
	rootName = "root"; //should always be root  
	var compartments={};
	var compgraph = getModalCompGraph(rootName) ;//the main graph
	var newgraph = compgraph.graph ;//the main graph
	var float_compartments = compgraph.flat;

	var ingr_names=[];///so we can check for duplicate->compartments ?
  	//graph["name"] = rootName;
  	//graph["children"]=[];
  	//graph["nodetype"]="compartment";

	//setup the graph using the modal
	/*if ((!comp_column) && (compartments_index==-1)){
		//need to find out the compartment from localisation
		graph["children"].push(comp_template_cell);//root->periplasm->cytosol
		compartments["cytosol"] = cytosol;
		compartments["periplasm"] = periplasm;
		compartments["root"] = graph;
	}
	*/
	//how many compartment ?
	//cytoplasme, lumen, membrane
	console.log("parse start at ",start_index);
	console.log("parse this many ",data.length);

	for (var i=start_index;i<data.length;i++)
	{
		var idata = data[i];
		if (!idata ) continue;//|| idata.length < data_header.length
		if ((idata[0]) && (idata[0].toLowerCase()==="end"))
		{
			console.log(idata);
			break;
		}
		//console.log(idata);
        var name =  (name_index!==-1)?idata[name_index]:"";
				if (name === "") name = "protein_"+i;
				//console.log("parse name ",name);

        //allow duplicate ?
        //if (ingr_names.indexOf(name)!==-1) {console.log("duplicate ",name); continue;}
				//else 	ingr_names.push(name);

        //console.log(name_index);
        //console.log(name_index===0);
        //console.log(idata[0]);
        //console.log(idata["0"]);
        //console.log(idata[8]);
        //console.log(idata[name_index]);
        //console.log(name);
        var source = (source_index!==-1)?idata[source_index]:"";
	      var geom = ((source ) & (source!==""))?source.replace(".pdb","")+"_cms.dae":""; //default to check if its on the server
        //if (source && source.length!=4){
        //    if (source.slice(-4,source.length) !== ".pdb" ) source = source+".pdb";
        // }
        //console.log(source);
        var acount = (count_index!==-1)?idata[count_index]:0;
        if (!acount ) acount = 0;
        var molarity = (molarity_index!==-1)?idata[molarity_index]:0.0;
				if (!molarity || molarity ==="") molarity = 0.0;

        var bu = (biological_unit_index!==-1)? ParseBU(idata[biological_unit_index]):"BU1";//get bu
        var sele = (string_selection_index!==-1)?idata[string_selection_index]:"";//chain:residues?
		var uniprot = (uniprot_index!==-1) ? idata[uniprot_index]:"";

		var mw =  (molecularweight_index!==-1) ? idata[molecularweight_index]:0.0;
		var confidence = (confidence_index!==-1) ? idata[confidence_index]:0.0;//overall confidence
		var axis = [0,0,1];
		if (pcpalvector_index!==-1) {
			if (idata[pcpalvector_index]) axis = idata[pcpalvector_index].split(',').map(Number);//chain:residues?
		}
		var offset =[0,0,0];
		if (offset_index!==-1){
			if (idata[offset_index]) offset = idata[offset_index].split(',').map(Number);//chain:residues?
		}
        if ((!axis) || axis === 0||axis === "") axis = [0,0,1];
        if ((!offset) || offset === 0||offset === "") offset = [0,0,0];
        var model = "";
        if (model_index!==-1){
        	if (idata[model_index]!=="")
        	   model = idata[model_index];
        }
		var include = true;
		if (allfield.include_index!==-1) {
			var tmp = idata[allfield.include_index];
			console.log("include is ",include);
			if (tmp === "x") include = true;
			if (tmp === "" || tmp === 'undefined' || tmp === null) include = false;
			if (tmp === true) include = true;
			if (tmp === false) include = false;
		}
		var color=[1,0,0];
		if (allfield.color_index !==-1) {
			if (idata[allfield.color_index]) color = idata[allfield.color_index].split(',').map(Number);//chain:residues?
		}
		var label = (allfield.label_index!==-1)?idata[allfield.label_index]:"";
		var comments = (allfield.comment_index!==-1)?idata[allfield.comment_index]:"";
        if (sele && sele !== null && sele !== "") sele = NGL_GetSelection(sele,model);
        var image = (allfield.image_index!==-1)?idata[allfield.image_index]:"";
        var offsety= (allfield.offsety_index!==-1)?idata[allfield.offsety_index]:0;
        var scale2d= (allfield.scale2d_index!==-1)?idata[allfield.scale2d_index]:0;
		var sprite = {"image":image,"offsety":offsety,"scale2d":scale2d,"lengthy":0};
        var elem = {
					"name":name,"size":25,"molecularweight":mw,"confidence":confidence,"color":color,
        	"source":{"pdb":source,"bu":bu,"selection":sele,"model":model},"count":acount,
        	"molarity":molarity, "surface":false,"label":label,"geom":geom,"geom_type":"file","include":include,
        	"uniprot":uniprot,"pcpalAxis":axis,"offset":offset,  "nodetype":"ingredient","comments":comments,
          "sprite":sprite};
        //alert(elem.name);
		var loc_comp = (location_index!==-1)?idata[location_index]:"";
		var surface = IsSurface(loc_comp);
		var comp =  (allfield.compartment_index!==-1) ? idata[allfield.compartment_index]: "";
		var comp_elem = null;
		if (!comp_column) {
			//not the multicolumn compartment definition from Brett with I_ and S_
			if (comp!==""){
					var csplit = comp.split(".")
					if (csplit.length >1) comp = csplit[csplit.length-1];
					csplit = comp.split("/")
					if (csplit.length >1) comp = csplit[csplit.length-1];
					// a column compartment was set by user
					//use the modal mapping
					comp_elem = float_compartments[comp];
			}
			else {
					//use location
					//use the loc_comp to get the compartment
					if (!loc_comp) comp_elem = float_compartments[rootName];
					else comp_elem = float_compartments[loc_comp];
				}
			}
		else {
				//console.log("check "+comp_column_names.length);
				//look at all the comp_column, adn the one with a concentration define the compartments
				for (var c=0;c < comp_column_names.length;c++) {
					var values = idata[comp_column_names[c].id];//can be a count or a molarity
					//console.log("comp is "+c+" "+comp_column_names[c].id+" "+values);
					if (values && values!==null && values!=="" && values!==0) {
							var avalue = parseFloat(values);
							if (avalue < 1) elem.molarity = avalue;
							else elem.count = avalue;
							//if (isInteger(values)) elem.count = values;
							//else if (isFloat(values)) elem.molarity = values;
							if (molarity_index ===-1) elem.molarity = values;
							elem.surface = comp_column_names[c].surface;
							comp = comp_column_names[c].name;
							comp_elem = float_compartments[comp];
							/*if (comp in compartments){
								comp_elem = compartments[comp];
								}
							else {
								compartments[comp]={"name":comp,"children":[],"nodetype":"compartment"};
								comp_elem = compartments[comp];
								graph["children"].push(comp_elem);
							}*/
							// console.log(isInteger(values));
							// console.log(isFloat(values))
							//undefined ?>
						//  console.log("comp for "+name+" "+values+" "+comp_column_names[c].name+" "+ comp_column_names[c].surface+" "+comp_column_names[c].id+" "+elem.surface);
					}
		else {
		//column define but not value specified
		//elem.surface = comp_column_names[c].surface;
		comp = comp_column_names[c].name;
		comp_elem = float_compartments[comp];
		}
				}
			}
		if (comp_elem===null) {
			if (loc_comp==="cytoplasm"){
					comp_elem=newgraph;
			}
			else {
				comp = rootName;//+"_compartment";
			//no compartment provided, use the recipe name as a compartments?
				if (comp in compartments){
					comp_elem = compartments[comp];
					}
				else {
					compartments[comp]={"name":comp,"children":[]};
					comp_elem = compartments[comp];
					newgraph["children"].push(comp_elem);
					}
			}
		}

		//alert(comp_elem.name);
		elem.surface = IsSurface(loc_comp)
		console.log("checkforsurface for "+elem.name+" "+loc_comp+" "+elem.surface+" "+comp_elem);
		//add any additional data
		if (additional_data.length !==0) {
			$.each(additional_data, function (i, e) {
				var custom_data = (allfield[e]!==-1)?idata[allfield[e]]:null;	
				elem[e] = custom_data;				
			});
		}
		comp_elem["children"].push(elem);
	}

	var agraph_links=[];// { source: 0, target: 1, graph: 0 },
	//need to check how d3v4.csvParse deal with different sheet
	if (!csv_mapping){
		if (sheet_name.length==2){
		   var data_interact = 	jsondic[sheet_name[1]];
		   //console.log(JSON.stringify(data_interact));
		   for (var i=0;i<data_interact.length;i++){
		   	   //need index of each item
		   	   var idata = data_interact[i];
	         var name1 = idata[0];//find the node id ?
	         var name2 = idata[1];
	         var pdb1 = idata[2];
	         //var pdb2 = idata[3];
	         var sel1 = idata[3];
	         var sel2 = idata[4];
			 var alink = {"source":name1,
							"target":name2,
							"name1":name1,
							"name2":name2,
							"pdb1":pdb1,
							"sel1":sel1,
							"sel2":sel2,
							"coords1":[],
							"coords2":[],
							"beads1":[],
							"beads2":[],
							"id":i};
					 //console.log(alink);
		   	   agraph_links.push(alink);
		   }
		}
	}
	//console.log("afterModal");
	//console.log(graph);
	//console.log(agraph_links);
	if (MERGE) merge_graph(newgraph,agraph_links);
  else update_graph(newgraph,agraph_links);
  //return {"graph":graph,"link":graph_links};
}

//var HTMLOUT = document.getElementById('grid');
//var GRIDHTMLOUT = document.getElementById('gridhtml');

var to_json = function to_json(workbook) {

			var result = {};

			workbook.SheetNames.forEach(function(sheetName) {

			var roa = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,range:header_index});// {raw: true});
      //alert(sheetName);
      console.log (JSON.stringify(roa));
			if(roa.length) result[sheetName] = roa;

		});

		return JSON.stringify(result, 2, 2);

	};

function displayAsTable(){}

function process_wb(wb) {
    header_index = prompt("Please enter the Header row number", "0");
    //start_index = prompt("Please enter the Data first row number", "1");
    header_index = parseInt(header_index);
    start_index = 1;
    //start_index = parseInt(start_index);
    var jsdata = to_json(wb);//stringified json ?
		if(typeof console !== 'undefined') console.log("output", new Date());
		var result = mainParsingSpreadshit(JSON.parse(jsdata),"root");//wb.Props.Title);//parseSpreadSheetRecipe(JSON.parse(jsdata),wb.Props.Title);
		return result;
	}

function selectCompFile (e) {
	var theFiles = e.target.files;
	//alert(theFiles.length);
	//alert(theFiles[0].size);
	var thefile = theFiles[0];
	node_selected.data.geom = thefile;
	node_selected.data.geom_type = "file";
	document.getElementById("label_comp_source_file").innerHTML = thefile.name;
	stage.removeAllComponents();
	NGL_LoadShapeFile(thefile);
	stage.autoView();
}

function forceSelect(e) {
	e.value = '';
}


//first/second sheet is the current graph/link, next is the original data -> up to 4 Grid
function selectFile(e){
	if (!MERGE) additional_data = []
	document.getElementById("addingr").setAttribute("class", "hidden");
	document.getElementById("addcomp").setAttribute("class", "hidden");
	document.getElementById("addlink").setAttribute("class", "hidden");
	if (stage) stage.removeAllComponents();
	csv_mapping= false;
	comp_column = false;
    var theFiles = e.target.files;
    //alert(theFiles.length);
    //alert(theFiles[0].size);
    var thefile = theFiles[0];

    if (window.FileReader) {
      // FileReader is supported.
    } else {
      alert('FileReader is not supported in this browser.');
    }
    //check extension
    var ext = thefile.name.split('.').pop();
    //alert(thefile.name+" "+ext);
    var reader = new FileReader();

    if (ext === "json"){
		//alert("json");
		//console.log("json file");
		var comon = findLongestCommonSubstring(thefile.name,"serialized");
		//console.log("serialzized ?",comon);
		if (comon.length >= 9) {//full string found
			//console.log("serialized recipe type",thefile.name,comon);
			reader.onload = function(event) {
				var data = reader.result;
				console.log(data);
				data = data.replace(/\\n\\r/gm,'newChar');
				console.log("BEFORE JSON PARSE");
				console.log(data);
				var ad = JSON.parse(data);
				console.log("AFTER JSON PARSE");
				console.log(ad);
				//debug_data = ad;
				var adata = parseCellPackRecipeSerialized(ad);
				//debug_data = adata;
				console.log("AFTER CellPack PARSE");
				console.log(adata);
				merge_data = JSON.parse(JSON.stringify(adata));
				if (MERGE) {
					merge_getModal(adata.nodes,adata.links)
					//merge_graph(adata.nodes,adata.links);
				}
				else {
					update_graph(adata.nodes,adata.links);
				}
				var jdata = getCurrentNodesAsCP_JSON(graph.nodes, graph.links);
				let blob = new Blob([JSON.stringify(jdata)], {type: 'text/plain'});
				recipe_file = blob;
			}
  	  	}
    	  else {
			recipe_file = thefile;
			reader.onload = function(event) {
				var data = reader.result;
				data = data.replace(/\\n\\r/gm,'newChar');
				var ad = JSON.parse(data);
				var adata = parseCellPackRecipe(ad)
				if (MERGE) merge_getModal(adata.nodes,adata.links)
				else update_graph(adata.nodes,adata.links);
				//if there is results data in the files load in molstar
				for (var i=0;i<graph.nodes.length;i++){
					if (!graph.nodes[i].children) {
						if (graph.nodes[i].data.results && graph.nodes[i].data.results.length ){
							MS_LoadModel(recipe_file,null);
							break;
						}
					}
				}
			}
    	}
    }
    else if (ext === "xlsx"){
    	    //alert("xlsx");
    	    reader.onload = function(event) {
    	    	var data = reader.result;
    	    	//data = new Uint8Array(data);
				var workbook = XLSX.read(data, {type:  'binary'});
				if(!workbook.Props) workbook.Props = {};
            	workbook.Props.Title = thefile.name;
				var adata = process_wb(workbook);
				//alert(JSON.stringify(adata));
    	    }
    }
    else if (ext==="csv"){
    	reader.onload = function(event) {
    		var data = reader.result;
		    header_index = prompt("Please enter the Header row number", "0");
		    //start_index = prompt("Please enter the Data first row number", "1");
		    header_index = parseInt(header_index);
		    start_index = header_index+1;
    		var book =  d3v4.csvParseRows(data);//this is not working with tab
    		csv_mapping=true;
    		var data_header = book[header_index];//first raw
    		console.log(data_header);
    		getModalMapping(data_header,book,thefile.name.split(".")[0]);
    		}
    	}
    else if (ext==="pdb"){
      //special DAVID GOODSELL format
      reader.onload = function(event) {
          var data = reader.result;
          var adata = cp_LoadGoodsellPDBModel(data);
          update_graph(adata.nodes,adata.links);
      }
    }
    else if (ext==="xml"){
      reader.onload = function(event) {
        var data = reader.result;
        data = data.replace(/\\n\\r/gm,'newChar');
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(data,"text/xml");
        var adata = parseCellPackRecipeXML(xmlDoc);
        if (MERGE) merge_getModal(adata.nodes,adata.links)
        else update_graph(adata.nodes,adata.links);
      }
	}
	else if (ext==="zip"){
		//open the zip loop through file
		//store them in pathList_
		unzipAndLoad( thefile );
	}
    else {
      alert('Extension not supported '+ext);
    }
	if (ext === "xlsx") reader.readAsBinaryString(thefile);
	else if (ext === "zip") {}
    else reader.readAsText(thefile, 'UTF-8');
	}

async function unzipAndLoad( zipFile ) {
	var zip = await JSZip.loadAsync(zipFile);
	var recipe_data = null;
	var recipe_data_serialized = null;
	var recipe_model = null;
	// you now have every files contained in the loaded zip
	console.log(zip.files);
	for(filename in zip.files) {
		var ext = filename.split('.').pop();
		//remove folder name ?
		if (ext === "json"){
			var comon = findLongestCommonSubstring(filename,"serialized");
			var blob = await zip.files[filename].async('blob');
			if (comon.length <= 9) {
				recipe_file = blob;
				recipe_data = await blob.text();;
			}
			else {
				recipe_data_serialized = await blob.text();;
			}
			//await zip.files[filename].async('string').then(function (fileData) {
			//	if (comon.length >= 9) recipe_data_serialized = fileData; // These are your file contents 
			//	else recipe_data = fileData;
			//  })
		}
		else if (ext === "bin") {
			recipe_model = await zip.files[filename].async('blob');
			//await zip.files[filename].async('uint8array').then(function (fileData) {
			//	recipe_model = fileData; // These are your file contents      
			//  })
		}
		else {
			var blob = await zip.files[filename].async("blob");
			var fname = filename.split('/').pop()
			if (fname !== "" )
				pathList_[fname] = new File([blob], fname, { type: blob.type });
		}
	}
	if (recipe_data != null) {
		var data = recipe_data.replace(/\\n\\r/gm,'newChar');
		var ad = JSON.parse(data);
		debug_data = ad;
		var adata = parseCellPackRecipe(ad)
		if (MERGE) merge_getModal(adata.nodes,adata.links)
		else update_graph(adata.nodes,adata.links);	
		for (var i=0;i<graph.nodes.length;i++){
			if (!graph.nodes[i].children) {
				if (graph.nodes[i].data.results && graph.nodes[i].data.results.length ){
					MS_LoadModel(recipe_file,null);
					break;
				}
			}
		}									
	}
	if (recipe_data_serialized != null) {
		var data = recipe_data_serialized.replace(/\\n\\r/gm,'newChar');
		var ad = JSON.parse(data);
		debug_data = ad;
		var adata = parseCellPackRecipeSerialized(ad);
		//debug_data = adata;
		if (MERGE) {
		  merge_getModal(adata.nodes,adata.links)
		  //merge_graph(adata.nodes,adata.links);
		}
		else update_graph(adata.nodes,adata.links);
		var jdata = getCurrentNodesAsCP_JSON(graph.nodes, graph.links);
		let blob = new Blob([JSON.stringify(jdata)], {type: 'text/plain'});
		recipe_file = blob;					
	}
	if (recipe_model != null) {
		MS_LoadModel(recipe_file,recipe_model);
	}
}


function selectMergeFile(e){
    MERGE = true;
    selectFile(e);
}

function selectDBcallback (response,query) {
	var adata = JSON.parse(response);
	//
	//alert(adata.length);
	//alert(data);
	root = d3v4.hierarchy(adata)
	.sum(function(d) { return d.size; })//this is 10
	.sort(function(a, b) { return b.value - a.value; });
	gp_nodes = pack(root).descendants();//this pack and flatten the data
	gp_nodes = checkAttributes(gp_nodes);
	var links = [];
	//UpdateGridFromD3Nodes(nodes,"slickGrid","tabs-1");//create or update ?
	//alert(nodes.length);
	update_graph(adata,links);
}

function selectDB(){
		//alert("SQLDB");
		//pyRequestSQL(update_graph);
		stage.removeAllComponents();
		callAjax(sql_server+'?key="sqldb"', selectDBcallback,"sqldb");
		/*
		var result = syncpyRequestSQL(update_graph);

    var adata = JSON.parse(result);
    //
    //alert(adata.length);
    //alert(data);
    root = d3v4.hierarchy(adata)
    .sum(function(d) { return d.size; })//this is 10
    .sort(function(a, b) { return b.value - a.value; });
    nodes = pack(root).descendants();//this pack and flatten the data
    nodes = checkAttributes(nodes);
    var links = [];
    //UpdateGridFromD3Nodes(nodes,"slickGrid","tabs-1");//create or update ?
    //alert(nodes.length);
    update_graph(adata,links);
		*/
}

function LoadSaveState(ajson){
		if (stage)stage.removeAllComponents();
	  csv_mapping= false;
	  comp_column = false;
    //var adata = parseCellPackRecipe(ajson);
		var adata = parseCellPackRecipeSerialized(ajson)
    update_graph(adata.nodes,adata.links);
	}

function LoadExampleMpn(){
	  stage.removeAllComponents();
	  var url = "data/Mpn_1.0_2.json";
	  csv_mapping= false;
	  comp_column = false;
    d3v4.json(url, function (json) {
    	      if (DEBUGLOG) console.log(json);
			      var adata = parseCellPackRecipe(json)
			      //var alink =[]
			      //alert("worked??");
			      //alert(JSON.stringify(adata));
			      update_graph(adata.nodes,adata.links);
			})
		MS_LoadExample('MycoplasmaModel.json');
		//MS_applyAllColors();
	}

  function LoadExampleExosome(){
		stage.removeAllComponents();
		var url = "data/exosome_catalase.json";
		csv_mapping= false;
		comp_column = false;
		d3v4.json(url, function (json) {
				if (DEBUGLOG) console.log(json);
					var adata = parseCellPackRecipe(json)
					//var alink =[]
					//alert("worked??");
					//alert(JSON.stringify(adata));
					update_graph(adata.nodes,adata.links);
				})
		MS_LoadExample('ExosomeModel.json');
  	}

function LoadExampleHIV(){
		stage.removeAllComponents();
		var url ="data/HIV_serialized.json";
		csv_mapping= false;
		comp_column = false;
	    d3v4.json(url, function (json) {
				  if (DEBUGLOG) console.log(json);
				  var adata = parseCellPackRecipeSerialized(json)
			      update_graph(adata.nodes,adata.links);
	            })
		MS_LoadExample('HIV-1_0.1.6-8_mixed_radii_pdb.json');
}

function LoadExampleInfluenza_envelope(){
	stage.removeAllComponents();
	var url = "data/InfluenzaA.json";
	csv_mapping= false;
	comp_column = false;

	d3v4.json(url, function (json) {
			if (DEBUGLOG) console.log(json);
				var adata = parseCellPackRecipe(json)
				//var alink =[]
				//alert("worked??");
				//alert(JSON.stringify(adata));
				update_graph(adata.nodes,adata.links);
		})
	MS_LoadExample('influenza_model1.json');
}

function LoadExampleInfluenza_complete(){
	stage.removeAllComponents();
	var url = "data/InfluenzaFull.json";//InfluenzaFull.json";
	csv_mapping= false;
	comp_column = false;

	d3v4.json(url, function (json) {
			if (DEBUGLOG) console.log(json);
				var adata = parseCellPackRecipe(json)
				//var alink =[]
				//alert("worked??");
				//alert(JSON.stringify(adata));
				update_graph(adata.nodes,adata.links);
		})
	MS_LoadExample('InfluenzaModel2.json');
}

function LoadExampleHIVimmatureBlood(){
	stage.removeAllComponents();
	var url = "data/HIV_immature_blood.json";
	csv_mapping= false;
	comp_column = false;

	d3v4.json(url, function (json) {
			if (DEBUGLOG) console.log(json);
				var adata = parseCellPackRecipe(json)
				//var alink =[]
				//alert("worked??");
				//alert(JSON.stringify(adata));
				update_graph(adata.nodes,adata.links);
		})
	MS_LoadExample('blood_hiv_immature_inside.json');
}
	
function LoadExampleHIVimmature(){
	stage.removeAllComponents();
	var url = "data/HIV_immature.json";
	csv_mapping= false;
	comp_column = false;

	d3v4.json(url, function (json) {
			if (DEBUGLOG) console.log(json);
			var adata = parseCellPackRecipe(json)
			update_graph(adata.nodes,adata.links);
		})
	MS_LoadExample('HIV_immature_model.json');
}
	
function LoadExampleBlood(){
		stage.removeAllComponents();
	  	var url = "data/BloodPlasma_serialized.json";
	  	csv_mapping= false;
	  	comp_column = false;
    	d3v4.json(url, function (json) {
						if (DEBUGLOG) {
							console.log("json",json);
						}
						var adata = parseCellPackRecipeSerialized(json)
			      update_graph(adata.nodes,adata.links);
			})
		//MS_LoadExample('BloodHIV1.0_mixed_fixed_nc1.cpr');
		//MS_applyAllColors();		
}

function LoadExampleBloodHIV(){
		//file is in data
		//https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/recipes/BloodPlasmaHIV_serialized.json
		stage.removeAllComponents();
		var url = "data/BloodPlasmaHIV_serialized.json";//cellpack_repo+"recipes/BloodPlasmaHIV_serialized.json";//"https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/recipes/BloodPlasmaHIV_serialized.json";
		//var url = "./data/BloodPlasmaHIV_serialzed.json";
		csv_mapping= false;
		comp_column = false;
		console.log(url);
		d3v4.json(url, function (error,json) {
						if (DEBUGLOG) {
							console.log("error",error)
							console.log("json",json);
						}
						var adata = parseCellPackRecipeSerialized(json)
						//var alink =[]
						//alert("worked??");
						//alert(JSON.stringify(adata));
						update_graph(adata.nodes,adata.links);
						})
		MS_LoadExample('BloodHIV1.0_mixed_fixed_nc1.cpr');
}

/*var xhr = new XMLHttpRequest();
xhr.open("GET", requestUrl);
xhr.responseType = "blob";

xhr.onload = function () {
    onDownloaded(this);
};
xhr.send();
*/

function LoadExampleMycoplasmaGenitaliumAuto(){
	stage.removeAllComponents();
	var url = "data/MG_auto_149.zip";//repo MG
	fetch(url)
    .then(res => res.blob())
    .then(data => {
        //code to handle the response
		alert("The full model will be loaded in the molstar window, the loading can take serveral minutes, membrane loading is " + ms_membrane.checked.toString());
		unzipAndLoad( data );
    }).catch(err => {
        console.error('Error: ', err);
    });	
}

function LoadExampleMycoplasmaGenitaliumCurated(){
	stage.removeAllComponents();
	var url = "data/MG_curated_149.zip";//repo MG
	fetch(url)
    .then(res => res.blob())
    .then(data => {
        //code to handle the response
		alert("The full model will be loaded in the molstar window, the loading can take serveral minutes, membrane loading is " + ms_membrane.checked.toString());
		unzipAndLoad( data );
    }).catch(err => {
        console.error('Error: ', err);
    });	
}

/* YASARA PET WORLD EXAMPLE */
// directly in molstar
// https://molstar.org/viewer/?structure-url=https%3A%2F%2Fmesoscope.scripps.edu%2Fbeta%2Fdata%2Fyasara_petworld%2Fsarscov2_atom_instances.cif&structure-url-format=mmcif
function LoadExampleYasaraSARSCOV2(){
	stage.removeAllComponents();
	var url = "data/yasara_petworld/sarscov2.zip";//repo MG
	fetch(url)
	.then(res => res.blob())
	.then(data => {
		//code to handle the response
		alert("The full model will be loaded in the molstar window, the loading can take serveral minutes, membrane loading is " + ms_membrane.checked.toString());
		unzipAndLoad( data );
	}).catch(err => {
		console.error('Error: ', err);
	});	
}

function LoadExampleYasaraHIV(){
	stage.removeAllComponents();
	var url = "data/yasara_petworld/hiv.zip";//repo MG
	fetch(url)
	.then(res => res.blob())
	.then(data => {
		//code to handle the response
		alert("The full model will be loaded in the molstar window, the loading can take serveral minutes, membrane loading is " + ms_membrane.checked.toString());
		unzipAndLoad( data );
	}).catch(err => {
		console.error('Error: ', err);
	});	
}

function LoadExampleYasaraSynapse(){
	stage.removeAllComponents();
	var url = "data/yasara_petworld/synvesicle.zip";//repo MG
	fetch(url)
	.then(res => res.blob())
	.then(data => {
		//code to handle the response
		alert("The full model will be loaded in the molstar window, the loading can take serveral minutes, membrane loading is " + ms_membrane.checked.toString());
		unzipAndLoad( data );
	}).catch(err => {
		console.error('Error: ', err);
	});	
}

function LoadExampleYasaraPreSynapse(){
	stage.removeAllComponents();
	var url = "data/yasara_petworld/presynapse.zip";//repo MG
	fetch(url)
	.then(res => res.blob())
	.then(data => {
		//code to handle the response
		alert("The full model will be loaded in the molstar window, the loading can take serveral minutes, membrane loading is " + ms_membrane.checked.toString());
		unzipAndLoad( data );
	}).catch(err => {
		console.error('Error: ', err);
	});	
}

function MergeExampleBlood(){
  stage.removeAllComponents();
  var url = "data/BloodPlasma_serialized.json";
  csv_mapping= false;
  comp_column = false;
  d3v4.json(url, function (json) {
          if (DEBUGLOG) {
            console.log("json",json);
          }
          var adata = parseCellPackRecipeSerialized(json)
          merge_getModal(adata.nodes,adata.links);
          })
}

function MergeExampleMpn(){
  stage.removeAllComponents();
  var url = "data/Mpn_1.0_2.json";
  csv_mapping= false;
  comp_column = false;
  d3v4.json(url, function (json) {
          if (DEBUGLOG) console.log(json);
          var adata = parseCellPackRecipe(json)
          //var alink =[]
          //alert("worked??");
          //alert(JSON.stringify(adata));
          merge_getModal(adata.nodes,adata.links);
          })
}

function MergeExampleBloodHIV(){
		//file is in data
		//https://raw.githubusercontent.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/recipes/BloodPlasmaHIV_serialized.json
		stage.removeAllComponents();
		var url = "data/BloodPlasmaHIV_serialized.json";//cellpack_repo+"recipes/BloodPlasmaHIV_serialized.json";//"https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/recipes/BloodPlasmaHIV_serialized.json";
		//var url = "./data/BloodPlasmaHIV_serialzed.json";
		csv_mapping= false;
		comp_column = false;
		console.log(url);
		d3v4.json(url, function (error,json) {
						if (DEBUGLOG) {
							console.log("error",error)
							console.log("json",json);
						}
						var adata = parseCellPackRecipeSerialized(json)
						//var alink =[]
						//alert("worked??");
						//alert(JSON.stringify(adata));
						merge_getModal(adata.nodes,adata.links);
						})
}

function checkAttributes(agraph){
	canvas_label_options = ["name", "None", "pdb", "uniprot", "label"];
	canvas_color_options = ["pdb", "pcpalAxis", "offset", "count_molarity", "Beads",
	"geom", "interaction", "confidence", "color", "viewed", "size", "count",
	"molarity", "molecularweight","default","automatic"];
	canvas_node_clusters = ["none","pdb", "pcpalAxis", "offset", "count_molarity", "Beads",
	"geom", "interaction", "confidence", "color", "viewed", "size", "count",
	  "molarity", "molecularweight","default"];
	agraph.mapping_ids={}
  	console.log("checkAttributes ",agraph);
	if ( !agraph || agraph.length < 2 ) return;
	property_mapping.molecularweight.min=0;
	property_mapping.molecularweight.max=0;
	property_mapping.size.min = 999999;
	property_mapping.size.max = 0;
	property_mapping.molarity.min =0;
	property_mapping.molarity.max =0;
	property_mapping.count.min = 0;
	property_mapping.count.max = 0;
	property_mapping.confidence.min = 0.0;
	property_mapping.confidence.max = 1.0;
	if (additional_data.length !== 0) {
		for (var i=0;i<additional_data.length;i++){
			var key = additional_data[i];
			if (!(key in property_mapping)){
				canvas_color_options.push(key);
				canvas_label_options.push(key);
				property_mapping[key] = {"min": 999999, "max": 0,"cmin":"hsl(0, 100%, 50%)","cmax":"hsl(165, 100%, 50%)","colors":[]};
			}
			else {
				property_mapping[key].min=0;
				property_mapping[key].max=999999;
			}
			if (canvas_label_options.indexOf(key) == -1){
				canvas_label_options.push(key);
			}
			if (canvas_color_options.indexOf(key) == -1){
				canvas_color_options.push(key);
			}			
		}
	}
	var counter_id = 0;
	for (var i=0;i<agraph.length;i++){
		if (!agraph[i].children) {
			agraph[i].data.nodetype = "ingredient";
			if (!"cluster" in agraph[i]) agraph[i].cluster=null;
			if (!("label" in agraph[i].data)) agraph[i].data.label = agraph[i].data.name;
			if (!("geom" in agraph[i].data)) agraph[i].data.geom = "X";
			if (!("geom_type" in agraph[i].data)) agraph[i].data.geom_type = "None";
			//if (agraph[i].children && agraph[i].parent) agraph[i].r = agraph[i].r/2;
			//agraph[i].r = agraph[i].r/2;
			if (!("uniprot" in agraph[i].data)) agraph[i].data.uniprot = "";
			if (!("pcpalAxis" in agraph[i].data)) agraph[i].data.pcpalAxis =[0,0,1];
			if (!("offset" in agraph[i].data)) agraph[i].data.offset = [0,0,0];
			if (!("pos" in agraph[i].data)) agraph[i].data.pos = [];
			if (!("radii" in agraph[i].data)) agraph[i].data.radii = [];
			if (!("molecularweight" in agraph[i].data)) agraph[i].data.molecularweight = 0.0;
			else agraph[i].data.molecularweight = parseFloat(agraph[i].data.molecularweight);
			if (!("confidence" in agraph[i].data) || isNaN(agraph[i].data.confidence) || agraph[i].data.confidence == null ) {
				if ("source" in agraph[i].data
					&& "pdb" in agraph[i].data.source
					&& agraph[i].data.source.pdb
					&& (agraph[i].data.source.pdb.length === 4))//||agraph[i].data.source.pdb.split("_")[0].length ===4
					{
						agraph[i].data.confidence = 1.0;
					}
				else agraph[i].data.confidence = -1.0;
			}
			else agraph[i].data.confidence = parseFloat(agraph[i].data.confidence);
			if (!("count" in agraph[i].data)) agraph[i].data.count = 0;
			else agraph[i].data.count = parseInt(agraph[i].data.count);
			if (!("molarity" in agraph[i].data)) agraph[i].data.molarity = 0.0;
			else agraph[i].data.molarity = parseFloat(agraph[i].data.molarity);
			if (!("color" in agraph[i].data)) agraph[i].data.color = [0,0,0];
			if (!("ingtype" in agraph[i].data)) agraph[i].data.ingtype = "protein";
			if (!("buildtype" in agraph[i].data)) agraph[i].data.buildtype = "random";
			if (!("buildfilename" in agraph[i].data)) agraph[i].data.buildfilename = "";
			if (!("comments" in agraph[i].data)) agraph[i].data.comments = "";
			//if (!("color" in agraph[i].data)) agraph[i].data.color = [];

			//they have to be number not string
			if (agraph[i].data.molecularweight > property_mapping.molecularweight.max) property_mapping.molecularweight.max = agraph[i].data.molecularweight;
			if (agraph[i].data.molecularweight < property_mapping.molecularweight.min) property_mapping.molecularweight.min = agraph[i].data.molecularweight;

			if (agraph[i].data.size > property_mapping.size.max) property_mapping.size.max = agraph[i].data.size;
			if (agraph[i].data.size < property_mapping.size.min) property_mapping.size.min = agraph[i].data.size;

			if (agraph[i].data.molarity > property_mapping.molarity.max) property_mapping.molarity.max = agraph[i].data.molarity;
			if (agraph[i].data.molarity < property_mapping.molarity.min) property_mapping.molarity.min = agraph[i].data.molarity;

			if (agraph[i].data.count > property_mapping.count.max) property_mapping.count.max = agraph[i].data.count;
			//if (agraph[i].data.count < property_mapping.count.min) property_mapping.count.min = agraph[i].data.count;

			//if (agraph[i].data.confidence > property_mapping.confidence.max) property_mapping.confidence.max = agraph[i].data.confidence;
			//if (agraph[i].data.confidence < property_mapping.confidence.min) property_mapping.confidence.min = agraph[i].data.confidence;
			
			//npartner
			//cluster by partner. Cluster is target partner
			//if (agraph[i].data.confidence > property_mapping.confidence.max) property_mapping.confidence.max = agraph[i].data.confidence;
			//if (agraph[i].data.confidence < property_mapping.confidence.min) property_mapping.confidence.min = agraph[i].data.confidence;

			if (!("visited" in agraph[i].data)) agraph[i].data.visited = false;
			if (!("include" in agraph[i].data)) agraph[i].data.include = true;
			if (!("opm" in agraph[i].data)) agraph[i].data.opm = 0;//is it an opm model
			
			if (!("angle" in agraph[i].data)) agraph[i].data.angle = 25.0;//is it an opm model
			if (!("ulength" in agraph[i].data)) agraph[i].data.ulength = 34.0;//is it an opm model
			if (!("tlength" in agraph[i].data)) agraph[i].data.tlength = 100;//is it an opm model
			if (additional_data.length !== 0) {
				for (var j=0;j<additional_data.length;j++){
					var key = additional_data[j];
					var avalue = agraph[i].data[key];
					if (isNumeric(avalue)) {
						avalue = parseFloat(avalue);
						agraph[i].data[key] = avalue;
					} 
					if (avalue === "" || avalue === undefined) {
						avalue = undefined;
						agraph[i].data[key] = avalue;
					}
					if (avalue > property_mapping[key].max) property_mapping[key].max = avalue;
					if (avalue < property_mapping[key].min) property_mapping[key].min = avalue;
				}
			}
			agraph[i].data.__id = counter_id;
			agraph.mapping_ids[counter_id]=i;
			counter_id++;
		}
		else {
 			agraph[i].data.nodetype = "compartment";
			if (agraph[i].data.size === undefined) agraph[i].data.size = 200;
			if (agraph[i].data.size > property_mapping.size.max) property_mapping.size.max = agraph[i].data.size;
			if (agraph[i].data.size < property_mapping.size.min) property_mapping.size.min = agraph[i].data.size;
			//if (!("geom" in agraph[i].data )) agraph[i].data.geom = "";
			//if (!("geom" in agraph[i].data )) agraph[i].data.geom = "";
		}
	}
	//if (additional_data.length !== 0) {
	layout_updateSelect("canvas_color",canvas_color_options);
	layout_updateSelect("canvas_label",canvas_label_options);
	layout_updateSelect("canvas_group",Object.keys(property_mapping));
	///}
	return agraph;
	}

function updateAttributesNode(anode,new_data,akey) {
	for (var key in new_data) 
	{
			//if(!(key in anode.data)) continue;
		if (akey !== key) continue;
		console.log("update ",key,anode.data[key],new_data[key]);
		if (key === "offset"){
				anode.data.offset = (Array.isArray(new_data.offset)) ? new_data.offset : new_data.offset.split(",").map(function(d) {
				return parseFloat(d);
			});
		}
		else if (key ==="pcpalAxis") {
				anode.data.pcpalAxis = (Array.isArray(new_data.pcpalAxis)) ? new_data.pcpalAxis : new_data.pcpalAxis.split(",").map(function(d) {
				return parseFloat(d);
			});
		}
		else if (key === "pdb") {
				if (!anode.data.source) anode.data.source={};
				anode.data.source.pdb = new_data.pdb;
		}
		else if (key === "bu") {
			if (!anode.data.source) anode.data.source={};
			anode.data.source.bu = new_data.bu;
		}
		else if (key === "model") {
			if (!anode.data.source) anode.data.source={};
			anode.data.source.model = new_data.model;
		}
		else if (key === "selection") {
			if (!anode.data.source) anode.data.source={};
			anode.data.source.selection = new_data.selection;
		}
		else {
			if(key in anode.data)
				anode.data[key] = new_data[key];
		}
	}
	if (akey === "size") {
		//update the node size
		if (document.getElementById("canvas_map_r").value === "size")
		{
			checkAttributes(gp_nodes)
			mapRadiusToProperty_cb("size");
		}
	}
	ChangeCanvasColor(null);//update
	updateForce();
	return anode;
}

function getcomphtml(anode) {
	if (anode.data.nodetype!=="compartment") return;
  var htmlStr='<div style="display:flex;flex-flow: column;">';
	for (var e in anode.data)
	{
			if (e==="children") continue;
			htmlStr+= '<label>'+ e + ': ' + anode.data[e] +'</label>'
	}
	var cname = anode.ancestors().reverse().map(function(d) {return (d.children)?d.data.name:""; }).join('/');
	htmlStr+='<label> path: '+cname+'</label>'
	htmlStr+='<label> Nb of children: '+anode.children.length+'</label>'
	htmlStr+='</div>';
	//htmlStr+= '<input type="checkbox" id="unchecked" onclick="toggleLipids(this)" class="cbx hidden" />' ;
	var comptype = ("geom_type" in anode.data)? anode.data.geom_type: "None";
	htmlStr+='<div style="display:flex;align-items: baseline;">';
	htmlStr+=' <label style="width:20%">Source:</label>';
	htmlStr+=' <select id="comp_source" style="width:80%" name="comp_source" onchange="changeCompSource(this)" >';
	htmlStr+='  <option value="file"';
	htmlStr+= (comptype==="file")?" selected ":"";
	htmlStr+='> File (.dae,.obj,.map) </option>';
	htmlStr+='  <option value="sphere"';
	htmlStr+= (comptype==="sphere")?" selected ":"";
	htmlStr+='> Sphere </option>';
	htmlStr+='  <option value="mb"';
	htmlStr+= (comptype==="mb")?" selected ":"";
	htmlStr+='> MetaBalls (multiple spheres) </option>';
	htmlStr+='  <option value="None"';
	htmlStr+= (comptype==="None")?" selected ":"";
	htmlStr+='> None </option>';
	htmlStr+=' </select>';
	htmlStr+='</div><br>';
	if (comptype === "None") {}
	else if (comptype === "file") {
		//add input file
			htmlStr+='<input  class="hidden" type="file" id="comp_source_file" accept=".dae,.obj,.map,.pdb,.mmtf" type="file" onchange="selectCompFile(event)" />';
			//onclick="$('#jsfile_input').trigger('click');"
			var elem = "'comp_source_file'";
			htmlStr+='<input type="button" id="load_comp_source_file" value="Browse..." onclick="document.getElementById('+elem+').click();" />';
			var current_file = (anode.data.geom) ? anode.data.geom :"No file selected";
			htmlStr+='<label id="label_comp_source_file">'+current_file+'</label>';
	}
	else if (comptype === "sphere") {
			//radius slider
			//callback onchange ?
			//htmlStr+=' <input id="comp_slider" style="width:80%" height:"40px" type="range" min="1" max="10000"" step="1" value="500" oninput="updateLabel(this)" onchange="resizeSphere(this)" /> ';
			//htmlStr+=' <label id="comp_slider_label" for="comp_slider" style="width:20%">10A</label>';
			var cradius = 500;
			if (("geom" in anode.data) && (typeof(node_selected.data.geom)!=="string"))
				 cradius = anode.data.geom.radius;
			htmlStr+='<div style="display:flex;"><label>Radius(A):</label><input id="comp_slider" type="range" min="1" max="10000" step="1" value="'+cradius+'"style="width:70%" oninput="updateLabel(this)" onchange="resizeSphere(this)"/>';
		  htmlStr+='<input  id="comp_slider_num" min="1" max="10000" type="number" value="'+cradius+'" style="width:30%" oninput="updateLabel(this)" onchange="resizeSphere(this)"/></div>';
	}
	else if (comptype === "mb") {
		//how many mb do we have so far
		//already has some beads?
		var mb_options=["None"];
		var cradius = 500.0;
   		var type = 1;
		if ("pos" in anode.data && anode.data.pos.length !== 0 ) {
			//for each metaball add a radius slider, or use a select ?
			//and change the radius of the selected bead
			//d.data.radii[lod].radii
			//d.data.pos[lod].coords
			var n_mb = anode.data.pos[0].coords.length/3;
			mb_options = d3v4.range(n_mb);
			cradius = parseFloat(anode.data.radii[0].radii[0]);//node_selected.data.radii[0].radii[mbi];
			if (("types" in anode.data)===false) anode.data.types=[{"types":[type]}];
			else type = anode.data.types[0].types[0];
		}
		else {
			anode.data.pos = [{"coords":[0.0,0.0,0.0]}];
			anode.data.radii=[{"radii":[500]}];
      		anode.data.types=[{"types":[type]}];
			mb_options = [0];
		}
		htmlStr += getSelect("metaball_elem", "options_elems", "Choose MB",
													"SetActiveMB(this)", mb_options,0);
		htmlStr+='<div style="display:flex;"><label>Radius(A):</label>';
    	htmlStr+='<input id="comp_slider" type="range" min="1" max="10000" step="1" value="'+cradius+'"style="width:70%" oninput="updateLabel(this)" onchange="resizeMetaBall(this)"/>';
		htmlStr+='<input  id="comp_slider_num" min="1" max="10000" type="number" value="'+cradius+'" style="width:30%" oninput="updateLabel(this)" onchange="resizeMetaBall(this)"/></div>';
		htmlStr+='<div style="display:flex;"><label>Type:</label>';
		htmlStr+='<input id="comp_slider_type" type="number" min="0" max="4" step="1" value="'+type+'"style="width:70%"  onchange="changeMetaBall(this)"/>';
		htmlStr+='</div>';
		htmlStr+= '<button onclick="RemoveMetaball()">Remove Selected MB</button>';
		htmlStr+= '<button onclick="AddMetaball()">Add MB</button>';
		htmlStr+= '<label> mouse ctrl-left click to drag metaball</label>';
		htmlStr+= '<div><input type="checkbox"  id="meta_preview" onclick="NGL_ToggleMetaGeom(this)" checked>';
		htmlStr+= '<label for="meta_preview"> Preview IsoSurface </label></div>';
		//button Remove
		//button Add
	}
	//add thickness dataset
	if (comptype !== "None") {
		var thickness = (anode.data.thickness)? anode.data.thickness : 7.5;
		htmlStr+='<div style="display:flex;">';
		htmlStr+='<label>Thickness(A):</label>';
		htmlStr+='<input id="comp_slider_thick" type="range" min="-50" max="50" step="1" value="'+thickness+'"style="width:70%" oninput="updateLabelThickness(this)" onchange="updateThickness(this)"/>';
		htmlStr+='<input  id="comp_slider_thick_num" min="-500" max="500" type="number" value="'+thickness+'" style="width:30%" oninput="updateLabelThickness(this)" onchange="updateThickness(this)"/></div>';
	}
return htmlStr;
}

function changeCompSource(compelem){
	console.log(compelem);
	//hide/show file browser Button
	//slider for spheres
	//list of metaballs slider for radius , position should come from NGL
	if (node_selected) node_selected.data.geom_type = compelem.value;
	console.log(node_selected);
	var htmlStr='';
	htmlStr += getcomphtml(node_selected);
	var container_ = document.getElementById("objectOptions");
	if (container_) {
			//container_.previousSibling.innerHTML = anode.data.nodetype + " properties";
			container_.innerHTML = htmlStr;
	}
	UpdateCompartmentRep(node_selected);
}

function updateLabel(e)
{
//document.getElementById('comp_slider_label').innerHTML = e.value+"A";
document.getElementById('comp_slider_num').value = e.value;
document.getElementById('comp_slider').value = e.value;
}

function resizeSphere(e){
		//how to now the current spheres_array
		//or update the current NGL_compartmentSphere
		var name = (node_selected.data.geom)?node_selected.data.geom.name:node_selected.data.name+"_geom";
		var radius = e.value;
		node_selected.data.geom = NGL_compartmentSphere(name,radius);
		document.getElementById('comp_slider_num').value = e.value;
		//document.getElementById('comp_slider_label').innerHTML = radius+"A";
}

function SetActiveMB(e)
{
	var mbi = e.value;
	var radius = node_selected.data.radii[0].radii[mbi];
	document.getElementById('comp_slider_num').value = radius;
	document.getElementById('comp_slider').value = radius;
}

function changeMetaBall(e){
  var name = (node_selected.data.geom)?node_selected.data.geom.name:node_selected.data.name+"_geom";
  var type = parseInt(e.value);
  var mbe = document.getElementById('metaball_elem');
  var mbi = mbe.selectedOptions[0].value;
  node_selected.data.types[0].types[mbi] = type;
}

function resizeMetaBall(e){
		//how to now the current spheres_array
		//or update the current NGL_compartmentSphere
		var name = (node_selected.data.geom)?node_selected.data.geom.name:node_selected.data.name+"_geom";
		var radius = parseFloat(e.value);
		var mbe = document.getElementById('metaball_elem');
		var mbi = mbe.selectedOptions[0].value;
		node_selected.data.radii[0].radii[mbi] = radius;
		//update the metaballs
		document.getElementById('comp_slider_num').value = e.value;
		//document.getElementById('comp_slider_label').innerHTML = radius+"A";
		stage.removeAllComponents();
		NGL_updateMetaBallsGeom(node_selected);
}

function AddMetaball(){
	//use current radius and metaball to current node
	if (node_selected) {
		if (!("pos" in node_selected.data)||(node_selected.data.pos === null)||(node_selected.data.pos.length===0)) {
			node_selected.data.pos = [{"coords":[]}];
			node_selected.data.radii=[{"radii":[]}];
			node_selected.data.types=[{"types":[]}];
		}
		node_selected.data.pos[0].coords.push(0.0);
		node_selected.data.pos[0].coords.push(0.0);
		node_selected.data.pos[0].coords.push(0.0);
		var radius = document.getElementById('comp_slider').value;
		node_selected.data.radii[0].radii.push(radius);
		node_selected.data.types[0].types.push(0);
		//update the select
		var mbe = document.getElementById('metaball_elem');
		mbe.options.length = 0;
		var n_mb = node_selected.data.pos[0].coords.length/3;
		for (let i = 0; i < n_mb; ++i) {
			//addOption(options, i, 'Model ' + (i + 1))
			mbe.options[mbe.options.length] = new Option(i, i);
		}
		stage.removeAllComponents();
		NGL_updateMetaBallsGeom(node_selected);//NGL_MetaBalls();
		NGL_ShowOrigin();
		//stage.autoView();
	}
}

function RemoveMetaball(){
	//remove element and  update geom

}

function updateLabelThickness(e)
{
//document.getElementById('comp_slider_label').innerHTML = e.value+"A";
document.getElementById('comp_slider_thick_num').value = e.value;
document.getElementById('comp_slider_thick').value = e.value;
}

function updateThickness(e){
		//how to now the current spheres_array
		//or update the current NGL_compartmentSphere
		var name = (node_selected.data.geom)?node_selected.data.geom.name:node_selected.data.name+"_geom";
		var thickness = e.value;
		node_selected.data.thickness = thickness;
		//node_selected.data.geom = NGL_compartmentSphere(name,radius);
		document.getElementById('comp_slider_thick_num').value = e.value;
		document.getElementById('comp_slider_thick').value = e.value;
		//document.getElementById('comp_slider_label').innerHTML = radius+"A";
}

function UpdateCompartmentRep(anode,clear_ngl = true){
	console.log("UpdateCompartmentRep ",anode.data);//undefined
	if (!node_selected) node_selected = anode;
	var comptype = ("geom_type" in anode.data)? anode.data.geom_type: "None";
	if (comptype === "file"||(comptype === "None")){

  if ( anode.data.geom && anode.data.geom !== "None") {
				//display in ngl
				if (clear_ngl) stage.removeAllComponents();
				NGL_LoadAShapeObj(anode,anode.data.geom);
				stage.autoView();
		}
	}
	else if (comptype === "sphere") {
		  var name = (anode.data.geom)?anode.data.geom.name:anode.data.name+"_geom";
			var radius = (anode.data.geom && "radius" in anode.data.geom)?anode.data.geom.radius:document.getElementById("comp_slider").value;
			anode.data.geom = NGL_compartmentSphere(name,radius);
	}
	else if (comptype === "mb") {
			//kind of beads-> positions,radii
			//draw the spheres and the metabals
			anode.data.geom = "mb";
			if (clear_ngl) stage.removeAllComponents();
			NGL_updateMetaBallsGeom(anode);//NGL_MetaBalls();
			NGL_ShowOrigin();
			stage.autoView();
	}
	else if (comptype === "raw") {
		if (clear_ngl) stage.removeAllComponents();
		NGL_LoadAShapeObj(anode,anode.data.geom);
		stage.autoView();
	}
	else {
		if (clear_ngl) stage.removeAllComponents();
	}
}

function drawCompRec(anode) {
	if (stage) stage.removeAllComponents();
	//if (DEBUGGPU){
		//document.getElementById( 'container' ).setAttribute("class", "show");
		//document.getElementById( 'viewport' ).setAttribute("class", "hidden");
	//	GP_initFromNodes(graph.nodes,128,10,false);
	//}
	//else {
		anode.each(function(cnode) {
				if (cnode.children && cnode.data.nodetype === "compartment")
						UpdateCompartmentRep(cnode,false);
		});
		//anode is root
		//stage.viewer.boundingBox.min
		//stage.viewer.boundingBox.max
		anode.data.boundingBox = stage.viewer.boundingBox.clone();
		anode.data.boundingBox.expandByScalar(100);
		//add the bounding box
		//NGL_addBB();
//	}
}

function defaultNode_cb(e){
  console.log(e);
  var key = e.id.split("_")[1];
  console.log(key);
  //this hsould apply to the current selected node Only
  //this doesnt take care of the value type
  if (node_selected) {
    if (key in node_selected.data)
    {
      if (e.type === "checkbox")  node_selected.data[key] = e.checked;
      else node_selected.data[key] = e.value;
    }
    else //either source or sprites
    {
      var p="source";
      if (key in node_selected.data.sprite) p = "sprite";
      if (!(key in node_selected.data[p])) return;
      if (e.type === "checkbox")  node_selected.data[p][key] = e.checked;
      else node_selected.data[p][key] = e.value;
    }
    //TODO update the graph dataView as well!!!!
  }
}

function switchBuildType_cb(e){
  console.log(e);
  node_selected.data["buildtype"] = e.value;
  if (e.value === "file") {
    //change the div and specify a filename
    if (node_selected.data.buildfilename==="" && !node_selected.data.buildfile){
      console.log("need a file");

    }
  }
}

/*if (comptype === "file") {
  //add input file
    htmlStr+='<input  class="hidden" type="file" id="comp_source_file" accept=".dae,.obj,.map,.pdb,.mmtf" type="file" onchange="selectCompFile(event)" />';
    //onclick="$('#jsfile_input').trigger('click');"
    var elem = "'comp_source_file'";
    htmlStr+='<input type="button" id="load_comp_source_file" value="Browse..." onclick="document.getElementById('+elem+').click();" />';
    var current_file = (anode.data.geom) ? anode.data.geom :"No file selected";
    htmlStr+='<label id="label_comp_source_file">'+current_file+'</label>';
}
*/

function SetObjectsOptionsDiv(anode) {
	//ues the node objects
	var title='';
	var htmlStr='';
	if ("source" in anode) {
		//id,index,name1,name2,pdb1,sel1,sel2
		htmlStr+= '<label> id : ' + anode.id +'</label>';
		htmlStr+= '<label> partner 1 : ' + anode.name1 +'</label>';
		htmlStr+= '<label> partner 3 : ' + anode.name2 +'</label>'
		htmlStr+= '<label> pdb1 : ' + anode.pdb1 +'</label>'
		htmlStr+= '<label> sel1: ' + anode.sel1 +'</label>'
		htmlStr+= '<label> sel2: ' + anode.sel2 +'</label>'
		if (!("data" in anode)) {
			anode.data={};
			anode.data.nodetype = "interaction";
		}
		title = 'interaction';
	}
	else if (!anode.parent) {
		//root
		for (var e in anode.data){
      //replace by editor?
			if (e !== "children") htmlStr+= '<label>'+ e + ': ' + anode.data[e] +'</label>';
		}
		//htmlStr+=-'<label> Parent Name '+anode.parent.name+'</label>'
		var cname = anode.ancestors().reverse().map(function(d) {return (d.children)?d.data.name:""; }).join('/');
		htmlStr+='<label> path: '+cname+'</label>';
		//bounding box//
		//list only compartments and show them
		htmlStr +='<div id="listholder_root"  class="modal-list">';
		htmlStr += modal_drawHtmlTreeList(graph.nodes, null);
		htmlStr +='</div>';
		title = 'root';
		//update viewer with all compartments
		//loop over all compartment
		drawCompRec(anode);
	}
	else if (anode.data.nodetype === "compartment") {
		//return div with upload for geometry or select0
		//document.getElementById( 'container' ).setAttribute("class", "hidden");
		//document.getElementById( 'viewport' ).setAttribute("class", "show");
		htmlStr += getcomphtml(anode);
		UpdateCompartmentRep(anode);
		title = 'compartment';
	}
	else {
		//	document.getElementById( 'container' ).setAttribute("class", "hidden");
		//	document.getElementById( 'viewport' ).setAttribute("class", "show");
		  //list all property ? use the grid editor ?
      //should order it
			for (var i in attribute_list_order)//anode.data)
			{
          var e = attribute_list_order[i];
          htmlStr+='<div>';
          //e is the key
          if (e==="source" || e==="sprite") {
            for (var f in anode.data[e]){
              htmlStr+='<div>';
              var specificiations = allattributes_type[f];
              if (!specificiations) {
                console.log(e);
                htmlStr+= '<label>'+ f + ': ' + anode.data[e][f] +'</label>';
                continue;
              }
              if (specificiations.editable){
                if (!(specificiations.callback)) specificiations.callback = "defaultNode_cb";
                if (e=="buildfilename" && anode.data.buildtype!=="file") continue;
                htmlStr+=layout_getInputNode(anode.data[e][f],f,specificiations);
              }
            	else {
                if (e == "thumbnail" && anode.data.thumbnail !==null) htmlStr+= anode.data.thumbnail.outerHTML;//resize ?
                else htmlStr+= '<label>'+ f + ': ' + anode.data[e][f] +'</label>';//should we show the image
              }
              htmlStr+='</div>';
            }
          }
          else {
            var specificiations = allattributes_type[e];
            if (!specificiations) {
              console.log(e);
              htmlStr+= '<label>'+ e + ': ' + anode.data[e] +'</label>';
              continue;
            }
            if (specificiations.editable){
              if (!(specificiations.callback)) specificiations.callback = "defaultNode_cb";
              if (e=="buildfilename" && anode.data.buildtype!=="file") continue;
              htmlStr+=layout_getInputNode(anode.data[e],e,specificiations);
            }
          	else {
              if (e == "thumbnail" && anode.data.thumbnail != null)
              {
                  htmlStr+= anode.data.thumbnail.outerHTML;//resize ?
                  htmlStr+='<button onclick="NGL_saveThumbnail()" style="">Save Thumbnail/Sprite</button>';
              }
              else htmlStr+= '<label>'+ e + ': ' + anode.data[e] +'</label>';//should we show the image
            }
          }
          htmlStr+='</div>';
      }
			//htmlStr+=-'<label> Parent Name '+anode.parent.name+'</label>'
			var cname = anode.ancestors().reverse().map(function(d) {return (d.children)?d.data.name:""; }).join('/');
			htmlStr+='<label> path: '+cname+'</label>'
			title = anode.data.nodetype;
	}
	var container_ = document.getElementById("objectOptions");
	if (container_) {
		//container_.previousSibling.innerHTML = title + " properties";
		container_.innerHTML = htmlStr;
	}
}

function resetAllNodePos(agraph){
  if (!agraph || agraph.length <2) return;
  var rect = canvas.getBoundingClientRect();
  //console.log(rect);
  //console.log(canvas.parentNode.offsetHeight);//1278
	for (var i=0;i<agraph.length;i++){

		//console.log(agraph[i].x,agraph[i].y,width,height);
		agraph[i].x = agraph[i].x  - offx/2;// - rect.width/2;
		agraph[i].y = agraph[i].y  - offy/2;// - rect.height/2;
		//console.log(agraph[i].x,agraph[i].y);//+ rect.top
		}
	return agraph;
}

function centerAllNodePos(agraph){
  if (!agraph || agraph.length <2) return;
  var rect = canvas.getBoundingClientRect();
  //console.log(rect);
  //console.log(canvas.parentNode.offsetWidth);//1138
  //console.log(canvas.parentNode.offsetHeight);//1278
	for (var i=0;i<agraph.length;i++){

		//console.log(agraph[i].x,agraph[i].y,width,height);
		agraph[i].x = agraph[i].x  + rect.width/2;// - canvas.parentNode.offsetWidth/2;// - rect.width/2;
		agraph[i].y = agraph[i].y  + rect.height/2;// - canvas.parentNode.offsetHeight/2;// - rect.height/2;
		//console.log(agraph[i].x,agraph[i].y);//+ rect.top
		}
	return agraph;
}

//Run function when browser resizes


function respondCanvas(){
    canvas.width = container.width(); //max width
    canvas.height = container.height()-25; //max height
    width = canvas.width;
    height = canvas.height;
    //console.log(width,height);

    //recenter
    //check parent position
    console.log("top",canvas.parentNode.offsetTop);
    console.log("left",canvas.parentNode.offsetLeft);
    console.log("width",canvas.parentNode.offsetWidth);
    console.log("height",canvas.parentNode.offsetHeight);

    //transform.x = canvas.parentNode.offsetLeft;//width/2;center of the ui?
    //transform.y = canvas.parentNode.offsetTop;//height/2;
    //Call a function to redraw other content (texts, images etc)
}

//isolate the collision force per depth
function isolate(force, filter) {
  var initialize = force.initialize;
  force.initialize = function() { initialize.call(force, graph.nodes.filter(filter)); };
  return force;
}

function updateForce(){
	simulation.nodes(graph.nodes);
	simulation.force("link", d3v4.forceLink().strength(parseFloat( AllForces.LinkForce )));//.iterations(1).id(function(d) { return d.id; })
	simulation.force("link").links(graph.links);
	simulation.force("d0", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 0; }).strength(1));
	simulation.force("d1", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 1; }).strength(1));
	simulation.force("d2", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 2; }).strength(1));
	simulation.force("d3", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 3; }).strength(1));
	simulation.force("d4", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 4; }).strength(1));
	simulation.force("leaf", isolate(d3v4.forceCollide().radius(function(d) {return d.r*1.15;}), function(d) { return !d.children; }).strength(parseFloat(AllForces.collisionForce)));
}

function setupD3(){
	canvas_label = document.getElementById("canvas_label");
    canvas_color = document.getElementById("canvas_color");
	canvas =   document.getElementById("d3canvas");
	//canvas =  document.querySelector("canvas");
    context = canvas.getContext("2d");
    container = $(canvas).parent();
    transform = d3v4.zoomIdentity;
    transform.x = 0;//center of page->we want center of div?
	transform.y = 0;
	transform.k = 1;
	width = canvas.width;
	height = canvas.height;
	console.log("init ",width,height,container,context);

	//var result = syncpyRequestSQL();
	//console.log(result);
    var agraph = {};//JSON.parse(result);

	pack = d3v4.pack()
		  .size([width, height])
		  .padding(30);

	//before packing do the mapping on size ?
	root = d3v4.hierarchy(agraph)
	    .sum(function(d) { return d.size; })
	    .sort(function(a, b) { return b.value - a.value; });

	/*sql_data =  pack(d3v4.hierarchy(JSON.parse(result))
	.sum(function(d) { return d.size; })
	.sort(function(a, b) { return b.value - a.value; })).descendants();
	*/

	var nodes = pack(root).descendants();
	// Returns array of link objects between nodes.
	var links = [];//root.links();//nodes.slice(1);

  	//nodes = checkAttributes(nodes);
	offx = canvas.parentNode.offsetWidth;
	offy = canvas.parentNode.offsetHeight;

	//nodes = resetAllNodePos(nodes);
	graph.nodes = nodes;
	graph.links = links;

    users = d3v4.nest()
      .key(function(d) { return d.name; })
      .entries(graph.nodes)
      .sort(function(a, b) { return b.size - a.size; });

  	clearHighLight();
	simulation = d3v4.forceSimulation()
		    .force("link", d3v4.forceLink())//.iterations(1).id(function(d) { return d.id; }).strength(0.1))
		    .force("d0", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 0; }))
		    .force("d1", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 1; }))
		    .force("d2", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 2; }))
		    .force("d3", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 3; }))
		    .force("d4", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 4; }))
		    .force("leaf", isolate(d3v4.forceCollide().radius(function(d) {return d.r*1.65;}), function(d) { return !d.children; }));


	simulation
	      .nodes(graph.nodes)
	      .on("tick", ticked);

	simulation.force("link").links(graph.links);

    canvas.onmousemove = isKeyPressed;
  	d3v4.select(canvas)
      .on("mousemove", mouseMoved)//or mouseover - mousemove
      .on("mouseout",mouseLeave)
      .on("mouseover",mouseEnter)
      //.on("onmousedown",isKeyPressed)
      //.on('keydown',isKeyPressed)
      .call(d3v4.drag()
          .container(canvas)
          .subject(subject)
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended))
      .call(d3v4.zoom().scaleExtent([1 / 5, 20]).on("zoom", zoomed).filter(function(){
      return (d3v4.event.button === 0 ||
              d3v4.event.button === 1);
    }));
    //if not dragging clearHighlight
    //clearHighLight();
    canvas.addEventListener('click', function(e) {if (!draggin_d_node && current_mode===1) clearHighLight();; }, false);
	}

function isKeyPressed(event) {
	//console.log("keyPressed",event.ctrlKey);
	if (event.ctrlKey) {ctrlKey=true;}
	else {ctrlKey=false;}
	//console.log("canvas mouse move 2d");
	mousein = true;
	}

function intialize()
{
	canvas = document.querySelector("canvas");
    context = canvas.getContext("2d");
    transform = d3v4.zoomIdentity;
    searchRadius = 140;
	
    container = $(canvas).parent();
    width = container.width();
    height = container.height();
    offx = canvas.parentNode.offsetWidth;
    offy = canvas.parentNode.offsetHeight;

	  $(window).resize( respondCanvas );
    //width =  gridster.$widgets.eq(0).width();//width(),
    //height = gridster.$widgets.eq(0).height();//height();
    //respondCanvas();
	canvas.width = 1200;
    canvas.height = 1200; //max height

    transform.x = 0;//center of page->we want center of div?
		transform.y = 0;
		transform.k = 1;
		console.log("init ",width,height,container);
		var result = syncpyRequestSQL();
		//console.log(result);
    var agraph = JSON.parse(result);

		pack = d3v4.pack()
		  .size([width, height])
		  .padding(30);


		root = d3v4.hierarchy(agraph)
	    .sum(function(d) { return d.size; })
	    .sort(function(a, b) { return b.value - a.value; });

	  sql_data =  pack(d3v4.hierarchy(JSON.parse(result))
	    .sum(function(d) { return d.size; })
	    .sort(function(a, b) { return b.value - a.value; })).descendants();

	  var nodes = pack(root).descendants();
	  // Returns array of link objects between nodes.
	  var links = [{"source":7,"target":8}];//root.links();//nodes.slice(1);

  	nodes = checkAttributes(nodes);
    offx = canvas.parentNode.offsetWidth;
		offy = canvas.parentNode.offsetHeight;

	  nodes = resetAllNodePos(nodes);

	  //setup the table for this data
	  CreateGridFromD3Nodes(nodes,"#grid_recipe",1,"Recipe");
	  //take first node

	  //add the tab for the interaction
	  //each table can have some header div ? with some refine search query system ?
	  var options = CreateOptions();

	  var tabId = AddTab("Interaction","grid_interaction");
	  CreateGrid("#grid_interaction","tabs-"+tabId,[],[],options,1);

	  tabId = AddTab("Uniprot Search","grid_uniprot");
	  CreateGrid("#grid_uniprot","tabs-"+tabId,[],[],options,2);

	  tabId = AddTab("PDB Search","grid_pdb");
	  console.log(tabId);
	  CreateGrid("#grid_pdb","tabs-"+tabId,[],[],options,3);

	  changeCurrentGrid(0);


	  graph.nodes = nodes;
	  graph.links = links;

    users = d3v4.nest()
      .key(function(d) { return d.name; })
      .entries(graph.nodes)
      .sort(function(a, b) { return b.size - a.size; });

  	clearHighLight();
		simulation = d3v4.forceSimulation()
		    .force("link", d3v4.forceLink().iterations(1).id(function(d) { return d.id; }).strength(0.1))
		    .force("d0", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 0; }))
		    .force("d1", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 1; }))
		    .force("d2", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 2; }))
		    .force("d3", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 3; }))
		    .force("d4", isolate(d3v4.forceCollide().radius(function(d) {return d.r;}), function(d) { return d.depth === 4; }))
		    .force("leaf", isolate(d3v4.forceCollide().radius(function(d) {return d.r*2;}), function(d) { return !d.children; }));


	  simulation
	      .nodes(graph.nodes)
	      .on("tick", ticked);

	  simulation.force("link").links(graph.links);

  	d3v4.select(canvas)
      .on("mousemove", mouseMoved)//or mouseover - mousemove
      .on("mouseout",mouseLeave)
      .on("mouseover",mouseEnter)
      .call(d3v4.drag()
          .container(canvas)
          .subject(subject)
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended))
      .call(d3v4.zoom().scaleExtent([1 / 2, 8]).on("zoom", zoomed).filter(function(){
      return (d3v4.event.button === 0 ||
              d3v4.event.button === 1);
    }));
}

function wakeUpSim(){
	//if (simulation.alpha() < 0.01) simulation.alphaTarget(0.8).restart();
}

function zoomed() {
  	transform = d3v4.event.transform;
  	//console.log("scale is transform.k",transform.k);
	//?clearHighLight();
	if (d3v4.event.ctrlKey)clearHighLight();
}

function CenterCanvas()
{
	transform = d3v4.zoomIdentity;
	//transform.k = 1.0;
}


function ChangeCanvasLabel(e){}

function drawPalette()
{
	//palette is the available ingredients/block/compartemtnts!
	//should be able to drag-drop all of them in the main root compartments
	//if (graph.nodes.length===0){
		//add root
		//graph.nodes.push({"name":"root","parent":null,"children":[],x:0,y:0,r:100,"data":{"name":"root"}});
		context.beginPath();
    context.rect(-100,-100,100,100);
    context.fillStyle = "yellow";
    context.fill();
    context.strokeStyle = "black";
    context.stroke();
	//}
	//draw available elems should be the data from SQL+custom object
	//sql_data
	context.beginPath();
  context.arc(10,10,10,0,10);//compartments
  context.fillStyle = "yellow";
        context.fill();
        context.strokeStyle = "black";
        context.stroke();

	context.beginPath();
  context.arc(30,10,10,0,10);//available ingredients?
  context.fillStyle = "yellow";
        context.fill();
        context.strokeStyle = "black";
        context.stroke();

  //filter on ingredients? or use a grid and drop from it

	}

function GenerateNColor(ncolors){
	// Generate colors (as Chroma.js objects)
	var colors = paletteGenerator.generate(
		ncolors, // Colors
		function(color){ // This function filters valid colors
		var hcl = color.hcl();
		return hcl[0]>=0 && hcl[0]<=360
		&& hcl[1]>=30 && hcl[1]<=80
		&& hcl[2]>=35 && hcl[2]<=80;
	},
		true, // Using Force Vector instead of k-Means
		50, // Steps (quality)
		false, // Ultra precision
		'Default' // Color distance type (colorblindness)
	);
	// Sort colors by differenciation first
	colors = paletteGenerator.diffSort(colors, 'Default');
	return colors;
	}
	
function GenerateOneColorRangePalette(rgb,ncolors){
	// Generate colors (as Chroma.js objects)
	var hcl = chroma.rgb(rgb[0],rgb[1],rgb[2]).hcl();
	var start = hcl[0]-30;
	var end = hcl[0]+30;
	var colors = paletteGenerator.generate(
		ncolors, // Colors
		function(color){ // This function filters valid colors
		var hcl = color.hcl();
		return hcl[0]>=start && hcl[0]<=end
			&& hcl[1]>=0 && hcl[1]<=100
			&& hcl[2]>=0 && hcl[2]<=100;
		},
		true, // Using Force Vector instead of k-Means
		50, // Steps (quality)
		false, // Ultra precision
		'Default' // Color distance type (colorblindness)
	);
	// Sort colors by differenciation first
	colors = paletteGenerator.diffSort(colors, 'Default');
	return colors;
}

function toggleColorMapping(e){
	use_color_mapping = e.checked;
	//ChangeCanvasColor(null);
}

function toggleShowLegends(e){
	show_last_legends = e.checked;
	var aclass = (e.checked)? "block" :  "none";
	document.getElementById("legends_w_l").style.display = aclass;// .setAttribute("class", aclass);
	document.getElementById("legends_h_l").style.display = aclass;//.setAttribute("class", aclass);
	//document.getElementById("legends_ypad").style.display = aclass;//.setAttribute("class", aclass);
	document.getElementById("legends_f_l").style.display = aclass;//.setAttribute("class", aclass);
}
/*
	comp_colors[d.data.name] = {"surface":theColor[nComp],"interior":theColor[nComp+1]};
	//how many inside and surface children
	var ninside = 0;
	var nsurface = 0;
	d.children.forEach(function(d){
		if (d.data.surface) nsurface++;
		else ninside++;
	})
	color_palette[d.data.name] = {"surface":GenerateOneColorRangePalette(theColor[nComp].rgb(),nsurface),
									"interior":GenerateOneColorRangePalette(theColor[nComp+1].rgb(),ninside)};
	nComp++;
	nComp++;
*/
function ChangeCanvasColor(e){
	var colorby = canvas_color.selectedOptions[0].value;
	if (colorby == "automatic") {
		//automatic color generation with palette.
		//generate one color per compartment
		//generate one color range per compartment
		var nComp = 0;
		graph.nodes.forEach(function(d){
		if (d.parent && d.children && d.data.nodetype == "compartment"){// && d.depth != 0){
			nComp++;
		}
		});
		// nComp = Math.max(nComp,3);
		var theColor = GenerateNColor(nComp);
		if (nComp == 1) {
			var theColor = [chroma.rgb(Math.random()*255,Math.random()*255,Math.random()*255)];
		}
		nComp = 0;
		graph.nodes.forEach(function(d){
		if (d.parent && d.children && d.data.nodetype == "compartment"){// && d.depth != 0){
			if (!(d.data.name in color_palette))
			{
				//should seperate surface / interior
				comp_colors[d.data.name] = theColor[nComp];
				color_palette[d.data.name] = GenerateOneColorRangePalette(theColor[nComp].rgb(),d.children.length);
				nComp++;
			}
		}
		});
	}
	if (!(colorby in property_mapping)) return;
	var cmin = d3v4.color(property_mapping[colorby].cmin).rgb();
	var cmax = d3v4.color(property_mapping[colorby].cmax).rgb();
	var hmin = Util_rgbToHex(parseInt(cmin.r),parseInt(cmin.g),parseInt(cmin.b));
	var hmax = Util_rgbToHex(parseInt(cmax.r),parseInt(cmax.g),parseInt(cmax.b));
	document.getElementById("min_color").value = hmin;
	document.getElementById("max_color").value = hmax;
	if (colorby == "automatic") {
		property_mapping[colorby].max = graph.nodes.length; // Math.max.apply(null, graph.nodes.length);
		property_mapping[colorby].min = 0; // Math.min.apply(null, 0);
		current_color_mapping = d3v4.scaleLinear()//d3v4.scaleLinear()
			//.domain([Math.min(0,property_mapping[colorby].min), property_mapping[colorby].max])
			.domain([property_mapping[colorby].min, property_mapping[colorby].max])
			.range([property_mapping[colorby].cmin, property_mapping[colorby].cmax]);//.interpolate(d3v4.interpolateHcl);
	}
	if (colorby === "confidence"){
		var scores = graph.nodes.map(d=>(d.data.confidence!=null && d.data.confidence!=-1)?d.data.confidence:null).filter(d=>d!=null);
		property_mapping[colorby].max = Math.max.apply(null, scores);
		property_mapping[colorby].min = Math.min.apply(null, scores);
		current_color_mapping = d3v4.scaleLinear()
				.domain([property_mapping[colorby].min, property_mapping[colorby].max])
				.range([property_mapping[colorby].cmin, property_mapping[colorby].cmax]);
	}
	else if (colorby === "count") {
    	var scores = graph.nodes.map(d=>(d.data.count!=null && d.data.count!=-1)?d.data.count:0.0 );
    	property_mapping[colorby].max = Math.max.apply(null, scores);
    	property_mapping[colorby].min = Math.min.apply(null, scores);
		current_color_mapping = d3v4.scaleSqrt()
			.domain([property_mapping[colorby].min, property_mapping[colorby].max])
			.range([property_mapping[colorby].cmin, property_mapping[colorby].cmax]);//.interpolate(d3v4.interpolateHcl);
	}
	else if (colorby === "size") {
		var scores = graph.nodes.map(d=>(d.data.size!=null && d.data.size!=-1)?d.data.size:null).filter(d=>d!=null);
		property_mapping[colorby].max = Math.max.apply(null, scores);
		property_mapping[colorby].min = Math.min.apply(null, scores);
		current_color_mapping = d3v4.scaleLinear()
				.domain([property_mapping[colorby].min, property_mapping[colorby].max])
				.range([property_mapping[colorby].cmin, property_mapping[colorby].cmax]);//.interpolate(d3v4.interpolateHcl);
	}
	else if (colorby === "molarity") {
		var scores = graph.nodes.map(d=>(d.data.molarity!=null && d.data.molarity!=-1)?d.data.molarity:null).filter(d=>d!=null);
		property_mapping[colorby].max = Math.max.apply(null, scores);
		property_mapping[colorby].min = Math.min.apply(null, scores);
		current_color_mapping = d3v4.scaleSqrt() // scaleLinear()
				.domain([property_mapping[colorby].min, property_mapping[colorby].max])
				.range([property_mapping[colorby].cmin, property_mapping[colorby].cmax]);//.interpolate(d3v4.interpolateHcl);
				return ( !d.children && "data" in d && colorby in d.data && d.data[colorby]!=null&& d.data[colorby] >= 0.0)?color_mapping(d.data[colorby]):color(d.depth);
	}
	else if (colorby === "molecularweight") {
		var scores = graph.nodes.map(d=>(d.data.molecularweight!=null && d.data.molecularweight!=-1)?d.data.molecularweight:null).filter(d=>d!=null);
		property_mapping[colorby].max = Math.max.apply(null, scores);
		property_mapping[colorby].min = Math.min.apply(null, scores);
		//try different mapping
		current_color_mapping = d3v4.scaleLinear()//d3v4.scaleLinear()
				.domain([property_mapping[colorby].min, property_mapping[colorby].max])
				.range([property_mapping[colorby].cmin, property_mapping[colorby].cmax]);//.interpolate(d3v4.interpolateHcl);
			return ( !d.children && "data" in d && colorby in d.data && d.data[colorby]!=null&& d.data[colorby] >= 0.0) ? color_mapping(d.data[colorby]):color(d.depth);
	} 
	else {
		var scores = graph.nodes.map(d=>(!d.children && d.data[colorby]!=null && d.data[colorby]!=-1)?d.data[colorby]:null).filter(d=>d!=null);
		var value = parseFloat(scores[0]);
		if (isNaN(value)) {
			//should be string
			latest_colorby = colorby;
			use_unique_array = true;
			unique_array = scores.filter(onlyUnique);
			if (unique_array.indexOf("") == -1) unique_array.push("");
			var nCategories = unique_array.length;
			var cs = GenerateNColor(nCategories);
			//map to rgb string
			if (property_mapping[colorby].colors.length != nCategories)
			{
				property_mapping[colorby].colors = cs.map(function (c, ind) {
					var c1 = c.rgb();
					return 'rgb('+ c1[0]+","+c1[1]+","+c1[2]+')';
				});
			}	
			var new_scores = graph.nodes.map(d=>(d.data[colorby]!=undefined && d.data[colorby]!=null && d.data[colorby]!=-1)?unique_array.indexOf(d.data[colorby]):unique_array.indexOf("")).filter(d=>d!=null);
			//else use scaleLinear
			property_mapping[colorby].max = Math.max.apply(null, new_scores);
			property_mapping[colorby].min = Math.min.apply(null, new_scores);
			current_color_mapping = d3v4.scaleLinear()//d3v4.scaleLinear()
				.domain([property_mapping[colorby].min, property_mapping[colorby].max])
				.range([property_mapping[colorby].cmin, property_mapping[colorby].cmax]);//.interpolate(d3v4.interpolateHcl);
		} else {
			use_unique_array = false;
			property_mapping[colorby].max = Math.max.apply(null, scores);
			property_mapping[colorby].min = Math.min.apply(null, scores);
			current_color_mapping = d3v4.scaleLinear()//d3v4.scaleLinear()
				.domain([property_mapping[colorby].min, property_mapping[colorby].max])
				.range([property_mapping[colorby].cmin, property_mapping[colorby].cmax]);//.interpolate(d3v4.interpolateHcl);
		}					
	}		
}

function ChangeMinColor(e){
  var colorby = canvas_color.selectedOptions[0].value;
  //if (colorby == "automatic") return;
  var min_color = Util_getRGB(e.value);
  //var dmcolor = d3v4.color(min_color);
  //canvas_mincolor=min_color.rgb;
  property_mapping[colorby].cmin = min_color.rgb;
  ChangeCanvasColor(null);
}

function ChangeMaxColor(e){
  var colorby = canvas_color.selectedOptions[0].value;
  //if (colorby == "automatic") return;
  var max_color = Util_getRGB(e.value);
  //var dmcolor = d3v4.color(max_color);
  //canvas_maxcolor = max_color.rgb;
  property_mapping[colorby].cmax = max_color.rgb;
  ChangeCanvasColor(null);
}

function applyColorModeToIngredient(){
  //for all node apply the current color to data.color
  graph.nodes.forEach(function(d){
    var color = colorNode(d);//return "rbg()"
	if (!color) return;
    var dcolor = d3v4.color(color);
	if (!dcolor) return;
    //if (!d.children && "data" in d ){
	if (!(d.data.color) || !( "color" in d.data )) d.data.color=[1,0,0];
	if (!("_color" in d.data)) d.data._color=[d.data.color[0],d.data.color[1],d.data.color[2]];
	d.data.color=[dcolor.r/255.0,dcolor.g/255.0,dcolor.b/255.0];
    //}
  })
  //switch the UI ?

}
//

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function colorNode(d) {
	if (current_color_mapping == undefined && use_color_mapping) return color(d.depth);
	var colorby = canvas_color.selectedOptions[0].value;
	if (d.parent === null) {
		return (d.data.color !== null)? 'rgb('+ Math.floor(d.data.color[0]*255)+","
                                 + Math.floor(d.data.color[1]*255)+","
                                 + Math.floor(d.data.color[2]*255)+')' : color(d.depth);//rgb list ?
	}
	if (colorby === "pdb") {
				return ( !d.children && "data" in d && "source" in d.data
				&& "pdb" in d.data.source
				&& (!d.data.source.pdb || d.data.source.pdb === "None"
						|| d.data.source.pdb === "null" || d.data.source.pdb === ""))? "red" : color(d.depth);
	}
	else if (colorby === "geom") {
				return ( !d.children && "data" in d
						&& (!d.data.geom || d.data.geom === "None"
						|| d.data.geom === "null" || d.data.geom === ""))? "red" : color(d.depth);
	}
	else if (colorby === "pcpalAxis") {
						return ( !d.children && "data" in d && "pcpalAxis" in d.data
				&& (!d.data.pcpalAxis || d.data.pcpalAxis === "None"
				|| d.data.pcpalAxis === "null"|| d.data.pcpalAxis === ""
				|| d.data.pcpalAxis.length === 0))? "red" : color(d.depth);

		}
	else if (colorby === "offset") {
							return ( !d.children && "data" in d && "offset" in d.data
					&& (!d.data.offset || d.data.offset === "None"
					|| d.data.offset === "null"|| d.data.offset === ""
					|| d.data.offset.length === 0))? "red" : color(d.depth);
			}
	else if (colorby === "Beads") {
				return ( !d.children && "data" in d && "source" in d.data
				&& (!d.data.pos || d.data.pos === "None"
				|| d.data.pos === "null" || d.data.pos.length === 0
				|| d.data.pos === ""))? "red" : color(d.depth);

		}
	else if (colorby === "count_molarity") {
		return (!d.children && "data" in d && "count" in d.data && "molarity" in d.data
			&& d.data.count === 0 && d.data.molarity === 0.0)? "red" : color(d.depth);
	}
	else if (colorby === "color") {
    //should work with compartments
		return ( "data" in d && "color" in d.data
			&& d.data.color !== null)? 'rgb('+ Math.floor(d.data.color[0]*255)+","
															 + Math.floor(d.data.color[1]*255)+","
															 + Math.floor(d.data.color[2]*255)+')' : color(d.depth);//rgb list ?
	}
	else if (colorby === "confidence") {
    	return (!d.children && "data" in d && "confidence" in d.data
			&& d.data.confidence != null && d.data.confidence >= 0.0)? current_color_mapping(d.data[colorby]):color(d.depth);//rgb list ?
	}
	else if (colorby === "viewed") {
		return (!d.children && "data" in d && "visited" in d.data
	)? ((d.data.visited)?"yellow":"red") : color(d.depth) ;//rgb list ?
	}
	//molarity_count using the same kind of linear mapping but with color ?
	//else if (colorby === "molarity") {}
	else if (colorby === "count") {
    	return ( !d.children && "data" in d && colorby in d.data && d.data[colorby]!=null && d.data[colorby] >= 0.0)? current_color_mapping(d.data[colorby]):color(d.depth);
	}
	else if (colorby === "size") {
    	return ( !d.children && "data" in d && colorby in d.data && d.data[colorby]!=null&& d.data[colorby] >= 0.0)? current_color_mapping(d.data[colorby]):color(d.depth);
	}
	else if (colorby === "molarity") {
    	return ( !d.children && "data" in d && colorby in d.data && d.data[colorby]!=null&& d.data[colorby] >= 0.0)? current_color_mapping(d.data[colorby]):color(d.depth);
	}
	else if (colorby === "molecularweight") {
		return ( !d.children && "data" in d && colorby in d.data && d.data[colorby]!=null&& d.data[colorby] >= 0.0) ? current_color_mapping(d.data[colorby]):color(d.depth);
	}
	else if (colorby == "automatic") {
		if (use_color_mapping){
			return current_color_mapping(graph.nodes.indexOf(d));	
		}
		else {
			if (!d.children) {
				// console.log(d,d.parent);
				var pname = d.parent.data.name;
				var id = d.parent.children.indexOf(d);
				var c1 = color_palette[pname][id].rgb()
				return 'rgb('+ c1[0]+","+c1[1]+","+c1[2]+')';
			}
			else if (d.children){
				var c1 = comp_colors[d.data.name].rgb();
				return 'rgb('+ c1[0]+","+c1[1]+","+c1[2]+')';
			}
		}
	}
    else if (colorby === "default") {
    if (!d.children && "data" in d && "_color" in d.data)
      return (d.data._color !== null)? 'rgb('+ Math.floor(d.data._color[0]*255)+","
                                 + Math.floor(d.data._color[1]*255)+","
                                 + Math.floor(d.data._color[2]*255)+')' : color(d.depth);//rgb list ?
    else {
      return (!d.children && "data" in d && "color" in d.data
        && d.data.color !== null)? 'rgb('+ Math.floor(d.data.color[0]*255)+","
                                 + Math.floor(d.data.color[1]*255)+","
                                 + Math.floor(d.data.color[2]*255)+')' : color(d.depth);//rgb list ?
    }
	}
	else if (colorby === "interaction") {
		//color by interaction partner or just interaction number
			if (!d.children && "data" in d && "_color" in d.data)
			return (d.data._color !== null)? 'rgb('+ Math.floor(d.data._color[0]*255)+","
										+ Math.floor(d.data._color[1]*255)+","
										+ Math.floor(d.data._color[2]*255)+')' : color(d.depth);//rgb list ?
			else {
			return (!d.children && "data" in d && "color" in d.data
				&& d.data.color !== null)? 'rgb('+ Math.floor(d.data.color[0]*255)+","
										+ Math.floor(d.data.color[1]*255)+","
										+ Math.floor(d.data.color[2]*255)+')' : color(d.depth);//rgb list ?
			}
	}
	else {
		if (additional_data.length!==0){
			if (use_color_mapping){
				if (use_unique_array) {
					return ( !d.children && "data" in d && colorby in d.data && typeof d.data[colorby] !== 'undefined' && d.data[colorby] !== null) ? current_color_mapping(unique_array.indexOf(d.data[colorby])):color(d.depth);		
				} else {
					return ( !d.children && "data" in d && colorby in d.data && typeof d.data[colorby] !== 'undefined' && d.data[colorby] !== null) ? current_color_mapping(d.data[colorby]):color(d.depth);		
				}
			} else {
				if (use_unique_array) 
					return ( !d.children && "data" in d && colorby in d.data && typeof d.data[colorby] !== 'undefined' && d.data[colorby] !== null) ? property_mapping[colorby].colors[unique_array.indexOf(d.data[colorby])]:property_mapping[colorby].colors[unique_array.indexOf("")];	
				else 
					return ( !d.children && "data" in d && colorby in d.data && typeof d.data[colorby] !== 'undefined' && d.data[colorby] !== null) ? current_color_mapping(d.data[colorby]):color(d.depth);	
			}
		}
		else {
			return ( !d.children && "data" in d && "source" in d.data
				&& "pdb" in d.data.source
				&& (!d.data.source.pdb || d.data.source.pdb === "None" || d.data.source.pdb === "null"
				|| d.data.source.pdb === ""))? "red" : color(d.depth);
		}
	}
}

function ClusterNodeBy(eproperty) {
    //loop through node and assign cluster center
    //cluster by properties value range?
    var property = eproperty.value;
    console.log(property_mapping[property]);
	var index_opt = default_options.indexOf(property);
    current_clusters ={};//one cluster by category for this property
	//asign cluster center to each nodes that it apply to
	var unique = [];
	clusterBy = 0;	
	var clusters_points = {}
	//collect points for each cluster
	if (index_opt == -1) {
		//additional_data
		var scores = graph.nodes.map(d=>(d.data[property]!=null && d.data[property]!=-1)?d.data[property]:null).filter(d=>d!=null);
		//type of data ? if string do some categories
		var unique = scores.filter(onlyUnique);
		unique.push("");
		var nCluster = unique.length;
		//use halton in a circle ?
		var counter = 0;
		graph.nodes.forEach(function(d){
			if (!d.children) {
			  //d.cluster = {x:0,y:0,r:5};
			  if (!(property in d.data) || d.data[property] == undefined  || d.data[property] == null) {
				d.data[property] = "";
			  }
			  var c = unique.indexOf(d.data[property]);
			  let valueForKey = c in current_clusters;
			  if ( !valueForKey ) {
				clusters_points[c] = []
				//ensure cluster center are away from each other
				current_clusters[c] = {x:Util_halton(counter,2)*d.parent.r*2,y:Util_halton(counter,3)*d.parent.r*2,r:d.parent.r/nCluster};
				//clusters[c] = {x:d.x-d.parent.x,y:d.y-d.parent.y,r:cluster_rad};//local  to the parent
			  }
			  clusters_points[c].push({x:d.x,y:d.y,r:d.r});
			  counter = counter + 1; 
			}
		  });
		// add a null 
		clusterBy = 1;			
	} else {
		//default option 
		//if interaction the cluster should be the partner target...
	}
	Object.keys(clusters_points).forEach(function(akey,index) {
		var points = clusters_points[akey];
		if (points == undefined){
			console.log("undefined??",akey,index);
			return;
		}
		points.sort((a,b) => b.r - a.r);
		d3v4.packSiblings(points);
		var circle = d3v4.packEnclose(points)
		current_clusters[akey].x = circle.x;
		current_clusters[akey].y = circle.y;
		current_clusters[akey].r = circle.r;		
	});
	current_clusters = Object.values(current_clusters);
	//current_clusters = Object.values(current_clusters);
	d3v4.packSiblings(current_clusters);//no packing then
	//pack the clusters ?
    graph.nodes.forEach(function(d){
      if (!d.children) {
		//d.cluster = {x:0,y:0,r:5};

		var c = unique.indexOf(d.data[property]);
		let valueForKey = c in current_clusters;
		if ( valueForKey ) d.cluster = current_clusters[c];
		else d.cluster = null;
      }
    });
	updateForce();	
	/*var oldF = clusterByForce;
	clusterByForce = 1.0;
	for (var i=0; i<5; i++) ticked(null);
	clusterByForce = oldF;
	ticked(null);*/
}

function mapRadiusToProperty(eproperty){
	var property = eproperty.value;
	mapRadiusToProperty_cb(property);
}

function mapRadiusToProperty_cb(property) {
	
	console.log(property_mapping[property]);
	var mapping = d3v4.scaleLinear()
		.domain([Math.min(0,property_mapping[property].min), property_mapping[property].max])
		.range([1, 50]);
	//should we increase the size of the parent node ?
	graph.nodes.forEach(function(d){
		if (!d.children) {
			if (property==="radius_molecularweight"){ d.r = Util_getRadiusFromMW(d.data.molecularweight)*radius_scale*0.1; }
			else if (property==="molecularweight"){ d.r = Math.cbrt (d.data.molecularweight)* 0.1 * radius_scale;}
			else if (property==="default"){ d.r = 10*radius_scale;}
			else if (property==="size"){ d.r = d.data.size*radius_scale;}
			else d.r = mapping(d.data[property])*radius_scale;//or linearmapping
			if (d.r <= 0) d.r = d.data.size*radius_scale;
			if (isNaN(d.r)) d.r = 10*radius_scale;
		}
	});
	//pack the circle
	graph.nodes.forEach(function(d){
		if (d.children) {
			//d3v4.packSiblings(d.children.filter(ad =>!ad.data.surface));
			var points = d.children.filter(ad => !ad.children ).map(ad => ({ x: ad.x, y: ad.y, r: ad.r}));
			console.log(points);
			if (points.length !== 0)
			{
				points.sort((a,b) => b.r - a.r);
				d3v4.packSiblings(points);
				var circle = d3v4.packEnclose(points)
				//var result = d3v4.packEnclose(d.children);//have .r,.x,.y
				console.log(circle);
				console.log("packEnclose",circle.x,circle.y,circle.r);
				//d.x = circle.x;
				//d.y = circle.y;
				d.r = circle.r+25;//Math.max(25,property_mapping[property].max);
				//d.r = d.children.reduce((acc, val) => acc + val.r/2, 0);
			}
		}
	});
	//update the parent so that all circle fit inside
	//simulation.nodes(graph.nodes);
	updateForce();
	//simulation.restart();
	//simulation.alpha(1).alphaTarget(0).restart();
	//simulation.alpha(1);
}

function sortNodeByDepth(objects){
	// For performance reasons, we will first map to a temp array, sort and map the temp array to the objects array.
	var amap = objects.map(function (d, ind) {
  	return { index : ind, value : d.depth };
	});
	//console.log(map)
	// Now we need to sort the array by z index.
	amap.sort(function (a, b) {
 		 return b.value - a.value;
	});

	// We finaly rebuilt our sorted objects array.
	var objectsSorted = amap.map(function (el) {
	  return objects[el.index];
	});
	//console.log(objectsSorted);
	return amap;
	// Now that objects are sorted, we can iterate to draw them.
	//for (var i = 0; i < objectsSorted.length; i++) {
	//  objectsSorted[i].draw();
	//}
}

function Highlight(d) {
	//check if part of selection?
	if (nodes_selections.length !==0 && nodes_selections.indexOf(d)!==-1) {
		context.fillStyle = "yellow";
		context.fill();
		context.strokeStyle = "orange";
		context.lineWidth=stroke_line_width;
		context.stroke();
	//return;
	}
	else if (d.highlight && d !== node_selected && d!== comp_highligh && d!==comp_highligh_surface) {
		context.fillStyle = colorNode(d);
		context.fill();
		context.strokeStyle = "black";
		context.lineWidth=stroke_line_width;
		context.stroke();
	}
	else if (d === node_selected) {
		context.fillStyle = "yellow";
		context.fill();
		context.strokeStyle = "orange";
		context.lineWidth=stroke_line_width;
		context.stroke();
	}
	else if (d===comp_highligh_surface) {
		context.fillStyle = colorNode(d);
		context.fill();
		context.strokeStyle = "yellow";
		context.lineWidth=stroke_line_width;
		context.stroke();
	}
	else if (d===comp_highligh) {
		context.fillStyle = "grey";//colorNode(d);
		context.fill();
		context.strokeStyle = "black";
		context.lineWidth=stroke_line_width;
		context.stroke();
	}
	else if (d.depth === 6){
		context.fillStyle = "rgba(55, 55, 255, 0.3)";
		context.fill();
		context.strokeStyle = color(d.depth+1);
		context.lineWidth=stroke_line_width;
		context.stroke();
	}
	else {
		context.fillStyle = colorNode(d);
		context.fill();
		context.strokeStyle = color(d.depth+1);
		context.lineWidth=stroke_line_width;
		context.stroke();
	}	
}

function DrawCompartments(nodes_sorted){
	nodes_sorted.forEach(function(d){
		if (d.children) {
			drawNode(d);
			Highlight(d);
		}
	});
}

function DrawIngredients(nodes_sorted){
	nodes_sorted.forEach(function(d){
		if (!d.children) {
			drawNode(d);
			Highlight(d);
			if (document.getElementById("sprites").checked) {
				getThumbnail(d);
				if (!d.children && ( typeof d.data.thumbnail !== 'undefined' && d.data.thumbnail !==null) ) {
					var s = d.r*2.0;//Math.sqrt(((d.r*2.0)*(d.r*2.0))/2.0);
					var ratio = (d.data.thumbnail)? d.data.thumbnail.width/d.data.thumbnail.height:1.0;// 0.5;
					var w = s;
					var h = s;
					if (d.data.thumbnail.width < d.data.thumbnail.height) w = w*ratio;//need to offset
					else h = h / ratio;
					drawThumbnailInCanvas(d,d.x-w/2.0,d.y-h/2.0,w,h)
				}
			}			
		}
	});
}

function DrawCluster() 
{
	return;
	/*current_clusters.forEach(function(d){
		drawNode(d);
		Highlight(d);
	});*/
}

function DrawConnections(all_links){
	all_links.forEach(function(d){
		//draw twich with different thickness for highlihg
		drawLink(context,d);
		if (d.highlight) {//mouse over
			context.strokeStyle = "black";
			context.lineWidth=d.r+0.5;
			context.stroke();
			drawLink(context,d);
			context.strokeStyle = color(d.source.depth+1);
			context.lineWidth=d.r;
			context.stroke();
		}
		else {
			//use the color of the source
			//or the color by ?
			var grd = context.createLinearGradient(0, 0, 170, 0);
			grd.addColorStop(0, colorNode(d.source));
			grd.addColorStop(1, colorNode(d.target));
			context.fillStyle = grd;
			context.strokeStyle = grd;//color(d.source.depth+1);
			context.lineWidth=d.r;
			context.stroke();
		}
		if (d===line_selected){
			context.strokeStyle = "orange";
			context.lineWidth=d.r+0.5;
			context.stroke();
			drawLink(context,d);
			context.strokeStyle = "yellow";
			context.lineWidth=d.r;
			context.stroke();
		}
   }
   );
}

function DrawLabels(){
	//draw all the labels
	var counter = 0; //Needed for the rotation of the arc titles
	//Do a second loop because the arc titles always have to be drawn on top
	for (var i = 0; i < graph.nodes.length; i++) {
		d = graph.nodes[i];
		//a compartments
		if (d.children && d.parent ){
			var fontSizeTitle = Math.round(d.r / 10);
			if (fontSizeTitle <= 4) fontSizeTitle = 10;
			if (fontSizeTitle > 4) {
				drawCircularText(context, d.data.name.replace(/,? and /g, ' & '),
				fontSizeTitle, titleFont, d.x,d.y, d.r+5, rotationText[counter], 0);
			}
			counter = counter + 1;
		}
		if (!d.parent) {//root label
			var ax = transform.invertX(5);
			var ay = transform.invertY(canvas.height-20);
			context.font=(20/transform.k)+"px Georgia";
			context.fillStyle = "black";
			var lb = (recipe_changed)?"*":"";
			context.fillText(d.data.name+lb,ax,ay);
		}
		//	ingredient label
		//console.log(transform.k);
		if ( (d.highlight || ( transform.k > 1.5 && canvas_label.selectedOptions[0].value !== "None")) && !d.children ) {
			var fontSizeTitle = Math.round(d.r / 2);
			if (fontSizeTitle <= 4) fontSizeTitle = 5;
			context.font=fontSizeTitle+"px Georgia";
			var txtoption = canvas_label.selectedOptions[0].value;
			var txt;
			if (!d) console.log("options is ",txtoption,d);
			if (txtoption === "pdb"){
				if (d.data.source && d.data.source.pdb) txt = d.data.source.pdb.replace(/,? and /g, ' & ');//d.data[].replace(/,? and /g, ' & ');
				else txt = d.data["name"].replace(/,? and /g, ' & ');
			}
			else if (txtoption==="None") {txt = d.data["name"].replace(/,? and /g, ' & ');}
			else {
				txt = (d && "data" in d && d.data && d.data[txtoption])? d.data[txtoption].replace(/,? and /g, ' & '):"";
			}
			context.fillText(txt,d.x-d.r,d.y+d.r+fontSizeTitle);
		}
	}
}

function DrawColorLegend(){
	//draw legends for color mapping
	var colorby = canvas_color.selectedOptions[0].value;
	var index_opt = default_options.indexOf(colorby);
	var sx = 0,
		sy = 0,
		w = parseInt (legends.w),
		h = parseInt (legends.h);	
	var ypad = parseInt (legends.ypad);
	var ex = w+ypad,
		ey = h+ypad;
	//difference between H and F
	var f=legends.f.toString();
	if (!use_color_mapping && index_opt == -1 && use_unique_array) {
		unique_array.forEach(function(label){
			context.fillStyle = property_mapping[colorby].colors[unique_array.indexOf(label)];
			context.fillRect(sx,sy+ypad, w,h);
			context.strokeStyle = "black";
			context.strokeRect(sx,sy+ypad, w,h);
			//context.stroke();	
			context.textAlign = 'left';
			context.font=f+"px Georgia";
			if (label == "") label = "unknown";
			context.fillText(label,sx+ex+5,sy+ey-h/2+f/2);//x, y [, maxWidth]
			sy+=h;
		});
	}
	if (colorby === "color" && show_last_legends ){
		unique_array.forEach(function(label){
			context.fillStyle = property_mapping[latest_colorby].colors[unique_array.indexOf(label)];
			context.fillRect(sx,sy+ypad, w,h);
			context.strokeStyle = "black";
			context.strokeRect(sx,sy+ypad, w,h);
			//context.stroke();	
			context.textAlign = 'left';
			context.font=f+"px Georgia";
			if (label == "") label = "unknown";
			context.fillText(label,sx+ex+5,sy+ey-h/2+f/2);
			sy+=h;
		});		
	}
}

//the tick also draw in the canvas!
function ticked(e) {
	if (context===null || context === undefined)
	{
		return;
		//canvas =  document.querySelector("canvas");
		//context = canvas.getContext("2d");
	}
	if (graph.nodes.length === 0) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
	if (graph.nodes[0].data.color)
		context.fillStyle = 'rgb('+ Math.floor(graph.nodes[0].data.color[0]*255)+","
	+ Math.floor(graph.nodes[0].data.color[1]*255)+","
	+ Math.floor(graph.nodes[0].data.color[2]*255)+')';//'rgba(0,255,0,1)';//background color
	else {
		graph.nodes[0].data.color = [0.88,0.88,0.88];
		context.fillStyle ='rgba(225,225,225,1)';
	}
	//context.fillStyle =
	context.fillRect(0,0,window.innerWidth,window.innerHeight);
    context.save();
    /*
    context.shadowColor = 'black';
    context.shadowOffsetX = 5;
    context.shadowOffsetY = 5;
    context.shadowBlur = 10;
    */
    context.translate(transform.x, transform.y);
    //if scale 1 is 200x200, when resizing the windows we could increase the scale.
    //using the max between canvas.width,canvas.height
    context.scale(transform.k, transform.k);//d3v4.dragzoombiased using the current width/height ?

    if (current_mode === 1) {
    	//draw the add ingredient/add compartment ?
    	//drawPalette();
    	//should we let drag/drop object to define compartment
	}

    //draw all the nodes
    //sort the nodes and draw them, when sorting we loose the mapping with the table
    var new_array = graph.nodes.slice(0);
    //var maping = graph.nodes.forEach(function(d,ind){ return {"ind":ind,"depth":d.depth};});
    new_array.sort(function(a,b){return a.depth-b.depth});
	//should start with compartment then links then nodes.
	DrawCompartments(new_array);

    FOLDER_UPDATED = false;
    //draw all the links
    if (graph.links.length) {
		DrawConnections(graph.links);
   	}
	
	DrawIngredients(new_array);
    if ( (nodes_selections.length % 2) === 0 ) {
   		//show link between i,i+1
   		for (var l=0;l<nodes_selections.length-1;l+=2){
   			drawLinkTwoNode(nodes_selections[l],nodes_selections[l+1]);
    		context.strokeStyle = "yellow";
   			context.lineWidth=2;
        	context.stroke();
   		}
   	}
   	if (current_mode===1 && temp_link) {
		drawLink(context,temp_link);
		context.strokeStyle = "white";
		context.lineWidth=2;
		context.stroke();
   	}
    //draw all the labels
    DrawLabels();

    //draw a sphere for the mouse
    if (mousein && draw_debug_mouse) {
    	context.beginPath();
    	context.moveTo(mousexy.x , mousexy.y);//why +3?
    	context.arc(mousexy.x,mousexy.y,15,0,10);//0?
    	context.fillStyle = "green";
      	context.fill();
    }    //thumbnail with special case for surface
    var snode = node_selected;
    if (snode == null || snode.children) snode = node_over;
    if (snode !=null && !snode.children && snode.data && snode.data.thumbnail !==null && snode.data.thumbnail !== undefined && snode.data.name != null) {
      	//scale from image size to 150 ?
		if (snode.data.thumbnail.height!==0 && snode.data.thumbnail.width!==0)
      	{
			context.save();
			context.resetTransform();
			var ratio = (snode.data.thumbnail)? snode.data.thumbnail.width/snode.data.thumbnail.height:1.0;// 0.5;
			var w = 150;//(snode.data.thumbnail)?snode.data.thumbnail.width:150;
			var h = w/ratio;//(snode.data.thumbnail)?snode.data.thumbnail.height:150;
			var x = canvas.width/2.0-w-10;
			var y = canvas.height-h-10;
			context.rect(x,y, w,h);
			context.stroke();
			context.fillText(snode.data["name"].replace(/,? and /g, ' & '),x,y);
			var canvas_scale = (snode.data.thumbnail)? w/snode.data.thumbnail.width : 1.0;
			if (snode.data.ingtype !== "fiber") drawThumbnailInCanvas(snode,x,y, w,h);//scale sized ?
			//if surface draw a line representing the membrane
			if (snode.data.surface) {
				var thickness = 42.0/2.0;//angstrom
				var sc2d = parseFloat(snode.data.sprite.scale2d)*canvas_scale;
				var offy = -parseFloat(snode.data.sprite.offsety)*sc2d;//sc2d is angstrom to pixels
				//aNode.data.thumbnail.oh
				//scale2d should bring angstrom->pixels
				//need to take in account original size of images
				context.beginPath();
				context.lineWidth=2;
				context.moveTo(x,y+h/2.0-offy);
				context.lineTo(x+w,y+h/2.0-offy);
				context.strokeStyle = "green";
				context.stroke();
				//top
				context.beginPath();
				context.lineWidth=2;
				context.moveTo(x,y+h/2.0-offy-thickness*sc2d);
				context.lineTo(x+w,y+h/2.0-offy-thickness*sc2d);
				context.strokeStyle = "red";
				context.stroke();
				//bottom
				context.beginPath();
				context.lineWidth=2;
				context.moveTo(x,y+h/2.0-offy+thickness*sc2d);
				context.lineTo(x+w,y+h/2.0-offy+thickness*sc2d);
				context.strokeStyle = "blue";
				context.stroke();
			}
			if (snode.data.ingtype === "fiber") {
				var sc2d = parseFloat(snode.data.sprite.scale2d)*canvas_scale;
				var leny = -parseFloat(snode.data.sprite.lengthy)*sc2d;//sc2d is angstrom to pixels
				//draw two other thumbnail around
				drawThumbnailInCanvas(snode,x-leny/2.0,y, w,h);//scale sized ?
				drawThumbnailInCanvas(snode,x+leny/2.0,y, w,h);//scale sized ?
			}
			// Restore the default state
			context.restore();
		}
    }
	DrawColorLegend();

	/*if (clusterBy != -1) {
		DrawCluster();
	}*/
    /*context.beginPath();
    	context.moveTo(width/2,height/2);//why +3?
    	context.arc(width/2,height/2,15,0,10);//0?
    	context.fillStyle = "green";
      context.fill();
      */
		//draw the traffic light
		//drawTrafficLight();
    context.restore();
}

function oldticked(e) {
if (context===null)
{
	canvas =  document.querySelector("canvas");
	context = canvas.getContext("2d");
}
context.clearRect(0, 0, canvas.width, canvas.height);
context.save();
/*
context.shadowColor = 'black';
context.shadowOffsetX = 5;
context.shadowOffsetY = 5;
context.shadowBlur = 10;
*/
context.translate(transform.x, transform.y);
//if scale 1 is 200x200, when resizing the windows we could increase the scale.
//using the max between canvas.width,canvas.height
context.scale(transform.k, transform.k);//d3v4.dragzoombiased using the current width/height ?

if (current_mode === 1) {
	//draw the add ingredient/add compartment ?
	//drawPalette();
	//should we let drag/drop object to define compartment
}

//draw all the nodes
//sort the nodes and draw them, when sorting we loose the mapping with the table
var new_array = graph.nodes.slice(0);
//var maping = graph.nodes.forEach(function(d,ind){ return {"ind":ind,"depth":d.depth};});
new_array.sort(function(a,b){return a.depth-b.depth});
//should start with compartment then links then nodes.

//graph.nodes.sort(function(a,b){return a.depth-b.depth});
//var nodetodraw = graph.nodes;//sortNodeByDepth(graph.nodes);
//graph.nodes.forEach(function(d){
new_array.forEach(function(d){
	//for (var i = 0; i < graph.nodes.length; i++) {
	//user.values.forEach(drawNode);
	//var ind = i;//nodetodraw[i].index;
	//var d = graph.nodes[el.ind];
	//console.log("Draw ",i,d.data.name,d.depth);
	drawNode(d);
	//check if part of selection?
	if (nodes_selections.length !==0 && nodes_selections.indexOf(d)!==-1) {
		context.strokeStyle = "orange";
		context.stroke();
		context.fillStyle = "yellow";
		context.fill();
	//return;
	}
	else if (d.highlight && d !== node_selected && d!== comp_highligh && d!==comp_highligh_surface) {
		context.fillStyle = colorNode(d);
		context.fill();
		context.strokeStyle = "black";
		context.stroke();
	}
	else if (d === node_selected) {
		context.strokeStyle = "orange";
		context.stroke();
		context.fillStyle = "yellow";
		context.fill();
	}
	else if (d===comp_highligh_surface) {
		context.strokeStyle = "yellow";
		context.lineWidth=5;
		context.stroke();
		context.fillStyle = colorNode(d);
		context.fill();
	}
	else if (d===comp_highligh) {
		context.strokeStyle = "black";
		context.lineWidth=5;
		context.stroke();
		context.fillStyle = "grey";//colorNode(d);
		context.fill();
	}
	else if (d.depth === 6){
		context.strokeStyle = color(d.depth+1);
		context.stroke();
		context.fillStyle = "rgba(55, 55, 255, 0.3)";
		context.fill();
	}
	else {
		context.strokeStyle = color(d.depth+1);
		context.stroke();
		context.fillStyle = colorNode(d);
		context.fill();
	}
	if (!d.children && ( d.data.image !=null || d.data.thumbnail !==null) ) {
		var s = Math.sqrt(((d.r*2.0)*(d.r*2.0))/2.0);
		console.log("in draw node, draw sprite ?",document.getElementById("sprites").checked);
		if (document.getElementById("sprites").checked) drawThumbnailInCanvas(d,d.x-s/2.0,d.y-s/2.0,s,s)
	}
});
FOLDER_UPDATED = false;
//draw all the links
if (graph.links.length) {
	graph.links.forEach(function(d){
		//draw twich with different thickness for highlihg
		drawLink(context,d);
		if (d.highlight) {//mouse over
			context.strokeStyle = "black";
			context.lineWidth=d.r+1;
			context.stroke();
			drawLink(context,d);
			context.strokeStyle = color(d.source.depth+1);
			context.lineWidth=d.r;
			context.stroke();
		}
		else {
			context.strokeStyle = color(d.source.depth+1);
			context.lineWidth=d.r;
			context.stroke();
		}
		if (d===line_selected){
			context.strokeStyle = "orange";
			context.lineWidth=d.r+1;
			context.stroke();
			drawLink(context,d);
			context.strokeStyle = "yellow";
			context.lineWidth=d.r;
			context.stroke();
		}
	}
	);
}

if ( (nodes_selections.length % 2) === 0 ) {
//show link between i,i+1
	for (var l=0;l<nodes_selections.length-1;l+=2){
		drawLinkTwoNode(nodes_selections[l],nodes_selections[l+1]);
		context.strokeStyle = "yellow";
		context.lineWidth=2;
		context.stroke();
	}
}
if (current_mode===1 && temp_link) {
	drawLink(context,temp_link);
	context.strokeStyle = "white";
	context.lineWidth=2;
	context.stroke();
}
	//draw all the labels
	var counter = 0; //Needed for the rotation of the arc titles
	//Do a second loop because the arc titles always have to be drawn on top
	for (var i = 0; i < graph.nodes.length; i++) {
		d = graph.nodes[i];
		//a compartments
	if (d.children && d.parent ){//&& canvas_label.selectedOptions[0].value !== "None") {
		//context.font="20px Georgia";
		//context.fillStyle = "black";
		//context.fillText(d.data.name,d.x,d.y);
		var fontSizeTitle = Math.round(d.r / 10);
		if (fontSizeTitle <= 4) fontSizeTitle = 10;
				if (fontSizeTitle > 4) {
					drawCircularText(context, d.data.name.replace(/,? and /g, ' & '),
							fontSizeTitle, titleFont, d.x,d.y, d.r, rotationText[counter], 0);
				}
				counter = counter + 1;
	}
	if (!d.parent) {//root label
		var ax = transform.invertX(5);
		var ay = transform.invertY(canvas.height-20);
	context.font=(20/transform.k)+"px Georgia";
	context.fillStyle = "black";
			var lb = (recipe_changed)?"*":"";
	context.fillText(d.data.name+lb,ax,ay);
	}
	//	ingredient label
	//console.log(transform.k);
	if ( (d.highlight || ( transform.k > 1.5 && canvas_label.selectedOptions[0].value !== "None")) && !d.children ) {
		var fontSizeTitle = Math.round(d.r / 2);
	if (fontSizeTitle <= 4) fontSizeTitle = 5;
	context.font=fontSizeTitle+"px Georgia";
	var txtoption = canvas_label.selectedOptions[0].value;
		var txt;
		if (!d) console.log("options is ",txtoption,d);
		if (txtoption === "pdb"){
				if (d.data.source && d.data.source.pdb) txt = d.data.source.pdb.replace(/,? and /g, ' & ');//d.data[].replace(/,? and /g, ' & ');
				else txt = d.data["name"].replace(/,? and /g, ' & ');
		}
		else if (txtoption==="None") {txt = d.data["name"].replace(/,? and /g, ' & ');}
		else {
				txt = (d && "data" in d && d.data && d.data[txtoption])? d.data[txtoption].replace(/,? and /g, ' & '):"";
			}
	context.fillText(txt,d.x-d.r,d.y+d.r+fontSizeTitle);
	}
}

//draw a sphere for the mouse
if (mousein && draw_debug_mouse) {
	context.beginPath();
	context.moveTo(mousexy.x , mousexy.y);//why +3?
	context.arc(mousexy.x,mousexy.y,15,0,10);//0?
	context.fillStyle = "green";
	context.fill();
}    //thumbnail with special case for surface
var snode = node_selected;
if (snode == null || snode.children) snode = node_over;
if (snode !=null && !snode.children && snode.data && snode.data.thumbnail !==null  && snode.data.name != null) {
	//scale from image size to 150 ?
	context.save();
	context.resetTransform();
	var ratio = (snode.data.thumbnail)? snode.data.thumbnail.width/snode.data.thumbnail.height:1.0;// 0.5;
	var w = 150;//(snode.data.thumbnail)?snode.data.thumbnail.width:150;
	var h = w/ratio;//(snode.data.thumbnail)?snode.data.thumbnail.height:150;
	var x = canvas.width/2.0-w-10;
	var y = canvas.height-h-10;
	context.rect(x,y, w,h);
	context.stroke();
	context.fillText(snode.data["name"].replace(/,? and /g, ' & '),x,y);
	if (snode.data.ingtype !== "fiber") drawThumbnailInCanvas(snode,x,y, w,h);//scale sized ?
	//if surface draw a line representing the membrane
	if (snode.data.surface) {
	var thickness = 42.0/2.0;//angstrom
	var canvas_scale = w/snode.data.thumbnail.width;
	var sc2d = parseFloat(snode.data.sprite.scale2d)*canvas_scale;
	var offy = -parseFloat(snode.data.sprite.offsety)*sc2d;//sc2d is angstrom to pixels
	//aNode.data.thumbnail.oh
	//scale2d should bring angstrom->pixels
	//need to take in account original size of images
	context.beginPath();
	context.lineWidth=2;
	context.moveTo(x,y+h/2.0-offy);
	context.lineTo(x+w,y+h/2.0-offy);
	context.strokeStyle = "green";
	context.stroke();
	//top
	context.beginPath();
	context.lineWidth=2;
	context.moveTo(x,y+h/2.0-offy-thickness*sc2d);
	context.lineTo(x+w,y+h/2.0-offy-thickness*sc2d);
	context.strokeStyle = "red";
	context.stroke();
	//bottom
	context.beginPath();
	context.lineWidth=2;
	context.moveTo(x,y+h/2.0-offy+thickness*sc2d);
	context.lineTo(x+w,y+h/2.0-offy+thickness*sc2d);
	context.strokeStyle = "blue";
	context.stroke();
	}
	if (snode.data.ingtype === "fiber") {
	var canvas_scale = w/snode.data.thumbnail.width;
	var sc2d = parseFloat(snode.data.sprite.scale2d)*canvas_scale;
	var leny = -parseFloat(snode.data.sprite.lengthy)*sc2d;//sc2d is angstrom to pixels
	//draw two other thumbnail around
	drawThumbnailInCanvas(snode,x-leny/2.0,y, w,h);//scale sized ?
	drawThumbnailInCanvas(snode,x+leny/2.0,y, w,h);//scale sized ?
	}
	// Restore the default state
	context.restore();
}
/*context.beginPath();
	context.moveTo(width/2,height/2);//why +3?
	context.arc(width/2,height/2,15,0,10);//0?
	context.fillStyle = "green";
	context.fill();
	*/
	//draw the traffic light
	//drawTrafficLight();
context.restore();
}

function getThumbnail(aNode){
	var value = ""
	if ("sprite" in aNode.data && "image" in aNode.data.sprite)
	  	value = aNode.data.sprite.image;
	//var img = new Image();
	//either image is defined or ise the PDB id
	if (aNode.data.repo_check && aNode.data.repo_test) {
		var search_url = cellpack_repo+"images/"+value;
		aNode.data.thumbnail.src = search_url;
		aNode.data.repo_check = false;
		aNode.data.repo_checking = false;
	}	
	if (aNode.data.thumbnail == null || FOLDER_UPDATED ) {
		if (aNode.data.thumbnail == null) {
		  aNode.data.thumbnail = new Image();
		  aNode.data.thumbnail.done = false;
		  aNode.data.repo_check = false;
		  aNode.data.repo_checking = false;
		  aNode.data.thumbnail.onload = function() {
			var height = this.height;
			var width = this.width;
			this.oh = parseFloat(height);
			this.ow = parseFloat(width);
			this.done = true;
		  }
		  aNode.data.thumbnail.onerror = function () {
			this.src = 'images/Warning_icon.png';
			this.done = false;
		  };
		}
		if (value && value in pathList_){
			aNode.data.repo_check = false;
			aNode.data.repo_test = false;
			var data = pathList_[value];//the file
			aNode.data.thumbnail.src = URL.createObjectURL(data);
		}
		else {
		  //search if exist in
		  var found = false;
		  if (value) {
			var search_url = cellpack_repo+"images/"+value;
			if (!aNode.data.repo_checking && !aNode.data.repo_check) {
			  aNode.data.repo_checking = true;
			  var cb = function(exist) {
				aNode.data.repo_check = true;
				aNode.data.repo_test = exist;
			  }
			  async_checkExist(search_url,cb);
			}
			/*else {
			  aNode.data.repo_checking = false;
			  if (aNode.data.repo_test){
				 found = true;
				 aNode.data.thumbnail.src = search_url;
			  }
			}*/
			//async_checkExist
			//var results = urlExists(search_url);//should be done async..
			//if (results)
			//{
			//  found = true;
			//  aNode.data.thumbnail.src = search_url;
			//}
		  }
		  else {
			var ipdb = ("source" in aNode.data && aNode.data.source.pdb) ? aNode.data.source.pdb.split("_")[0].toLowerCase():"";
			var twoletters = ipdb[1] + ipdb[2];
			//pdbe url is https://www.ebi.ac.uk/pdbe/static/entry/5c6e_deposited_chain_front_image-800x800.png//5c6e_deposited_chain_front_image-200x200.png
			var url = "https://www.ebi.ac.uk/pdbe/static/entry/"+ipdb+"_deposited_chain_front_image-400x400.png"
			//var url = "https://cdn.rcsb.org/images/rutgers/" + twoletters + "/" + ipdb + "/" + ipdb + ".pdb1-250.jpg";
			//console.log(html);
			aNode.data.thumbnail.src = url;
		  }
		}
	  }
}
function drawThumbnailInCanvas(aNode,x,y,w,h){
  //first get the image
  if (aNode.data.thumbnail == null || FOLDER_UPDATED ) {
    	getThumbnail(aNode);
  }
  if (aNode.data.thumbnail.complete == true && aNode.data.thumbnail.done)  		{
	context.drawImage(  aNode.data.thumbnail, x,y,w,h);
  }
}

function ColorLuminance(hex, lum) {

		// validate hex string
		hex = String(hex).replace(/[^0-9a-f]/gi, '');
		if (hex.length < 6) {
			hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
		}
		lum = lum || 0;

		// convert to decimal and change luminosity
		var rgb = "#", c, i;
		for (i = 0; i < 3; i++) {
			c = parseInt(hex.substr(i*2,2), 16);
			c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
			rgb += ("00"+c).substr(c.length);
		}

		return rgb;
	}

function drawTrafficLight(){
	var r = (25/2);
	var w = (r*2)*3+4;
	var h = (r*2)+4;
	var ax = transform.invertX(canvas.width - 5 - w);
	var ay = transform.invertY(canvas.height - 10 - h);
	context.roundRect(ax,ay,w/transform.k,h/transform.k,5/transform.k);
	context.strokeStyle = "#000";
	context.lineWidth=2/transform.k;
	context.stroke();
	context.fillStyle = "#333";
	context.fill();

	context.beginPath();
	ax = transform.invertX(canvas.width - 5 - w + r + 2);
	ay = transform.invertY(canvas.height - 10 - h + r + 2);
	context.arc(ax,ay,r/transform.k,0,10);//0?
	context.strokeStyle = "#000";
	context.lineWidth=2/transform.k;
	context.stroke();
	context.fillStyle = ColorLuminance("#FF0000",(current_ready_state===0)?0:-0.5);
	context.fill();

	context.beginPath();
	ax = transform.invertX(canvas.width - 5 - w +r*3+2);
	ay = transform.invertY(canvas.height - 10 - h + r + 2);
	context.arc(ax,ay,r/transform.k,0,10);//0?
	context.strokeStyle = "#000";
	context.lineWidth=2/transform.k;
	context.stroke();
	context.fillStyle = ColorLuminance("#FFFF00",(current_ready_state===1)?0:-0.8);
	context.fill();

	context.beginPath();
	ax = transform.invertX(canvas.width - 5 - w + r*5+2);
	ay = transform.invertY(canvas.height - 10 - h + r + 2);
	context.arc(ax,ay,r/transform.k,0,10);//0?
	context.strokeStyle = "#000";
	context.lineWidth=2/transform.k;
	context.stroke();
	context.fillStyle = ColorLuminance("#00FF00",(current_ready_state===2)?0:-0.8);
	context.fill();
	if (current_ready_state === 2 ) {
		ax = transform.invertX(canvas.width - 5 - w +r*3+2);
		ay = transform.invertY(canvas.height - 10 - h -r );
		context.font=(20/transform.k)+"px Georgia";
		context.fillStyle = "black";
		context.fillText("ready!",ax,ay);
	}
}

// calculate the point on the line that's
// nearest to the mouse position
function linepointNearestMouse(source,target,x,y) {
    //
    var lerp=function(a,b,x){ return(a+x*(b-a)); };
    var dx=source.x-target.x;
    var dy=source.y-target.y;
    var t=((x-source.x)*dx+(y-target.y)*dy)/(dx*dx+dy*dy);
    var lineX=lerp(source.x, target.x, t);
    var lineY=lerp(source.y, target.y, t);
    return({x:lineX,y:lineY});
};

function getNodeByName(aname){
	for (i = 0; i < graph.nodes.length; ++i) {
		if (graph.nodes[i].data.name===aname)
		   return graph.nodes[i];
	}
	return null;
}

function getPairInteracting(anode){
	for (i = 0; i < graph.links.length; ++i) {
		var link = graph.links[i];
		if (anode === link.source) {
			return {"found":"source","link":link};
		}
		else if (anode === link.target) {
			return {"found":"target","link":link};
		}
	}
	return  {"found":"notfound","link":null};
}

function addCompartment() {
	var some_data = {
		nodetype: "compartment",
    name: "newCompartment"+comp_count.toString(),
    size: 150,
    children: []
  };
   var newNode = d3v4.hierarchy(some_data);
   newNode.parent = graph.nodes[0];//should be root
   newNode.depth = graph.nodes[0].depth+1;
   newNode.x = canvas.width/2;
   newNode.y = canvas.height/2;
   newNode.r = 150;
   newNode.size = 150;
   newNode.children =[];
   //console.log(newNode);
	 graph.nodes[0].children.push(newNode);
   graph.nodes.push(newNode);
   updateForce();
	 comp_count+=1;
   return;
	/*root.children.push(newNode);
	var aroot = d3v4.hierarchy(root)
    .sum(function(d) { return d.size; })
    .sort(function(a, b) { return b.value - a.value; });
   var nodes = pack(aroot).descendants();//repack ? this alos changed the order ?
   nodes = checkAttributes(nodes);
   nodes = resetAllNodePos(nodes);
   nodes = centerAllNodePos(nodes);

   //retrieve the node and change the depth

   graph.nodes=nodes;

	 simulation.nodes(graph.nodes);
   simulation.force("link").links(graph.links);

  // simulation.restart();
   //simulation.alpha(1).alphaTarget(0).restart();
   //simulation.alpha(1);
  // newNode.x = canvas.width/2;
  // newNode.y = canvas.height/2;
   simulation.alpha(1).alphaTarget(0).restart();
   console.log(graph.nodes);*/
	}

function addLink(){
	//check number of selected  node
	if (!graph.links) graph.links =[];
	console.log("add link from nodes_selections",nodes_selections,graph.links);
	if (nodes_selections.length>=2) {
		for (var i=0;i<nodes_selections.length-1;i+=2){
			//create a link between the selected nodes
			var name1 = nodes_selections[i].data.name;
			var name2 = nodes_selections[i+1].data.name;
			var s = graph.nodes.indexOf(nodes_selections[i]);
			var t = graph.nodes.indexOf(nodes_selections[i+1]);
			console.log(name1,name2);
			var id = graph.links.length;
			var alink = {
				"source":nodes_selections[i],
				"target":nodes_selections[i+1],
				"name1":name1,
				"name2":name2,
				"pdb1":"",
				"sel1":"",
				"sel2":"",
				"coords1":[],
				"coords2":[],
				"beads1":[],
				"beads2":[],
				"id":id};
			console.log(alink);
			graph.links.push(alink);
			alink = {"source":s,
					"target":t,
					"name1":name1,
					"name2":name2,
					"pdb1":"",
					"sel1":"",
					"sel2":"",
					"coords1":[],
					"coords2":[],
					"beads1":[],
					"beads2":[],
					"id":id};

			//update the table
			updateForce();
			if ( id === 0 ) {
				//setup the Table
				UpdateGridFromD3Links([alink],1);
			}
			else {
				//update the grid
				gridArray[1].dataView.beginUpdate();
				gridArray[1].dataView.addItem(alink);
				gridArray[1].dataView.endUpdate();
				gridArray[1].dataView.setGrouping([])
				gridArray[1].render();
				gridArray[1].dataView.refresh();
				//this is not enought ?
				gridArray[1].resizeCanvas();
				gridArray[1].autosizeColumns();
				gridArray[1].render();
				gridArray[1].dataView.refresh();
				gridArray[1].resizeCanvas();
				gridArray[1].autosizeColumns();
			//gridArray[1].setSelectedRows([0]);
			//gridArray[1].setActiveCell(0,0);
			}
		}
	}
	//clear selection
	node_selected = null;
	node_selected_indice = -1;
	nodes_selections=[];
}

function AddALink(some_link) {
   var newLink = some_link;
	 graph.links.push(newLink);
	 //compare node id and graph length
	 //simulation.nodes(graph.nodes);
   simulation.force("link").links(graph.links);
  // simulation.restart();
   //simulation.alpha(1).alphaTarget(0).restart();
   //simulation.alpha(1);
   simulation.alpha(1).alphaTarget(0).restart();
	}

function addIngredient(){
	var grid = gridArray[0];
	var row_to_edit;
	var columns = grid.getColumns();
	var	item_id = 0;
	//add an empty row data
	var newId = graph.nodes.length;//grid.dataView.getLength();
	//var arow = grid.dataView.getItem(0);
	row_to_edit = {};//JSON.parse(JSON.stringify(arow));
	row_to_edit.id = "id_"+ newId.toString();
	row_to_edit.name = "protein_name"+newId.toString();
	row_to_edit.size = 40;
	row_to_edit.count = 0;
	row_to_edit.molarity = 0.0;
	row_to_edit.surface = false;
	row_to_edit.molecularweight = 0.0;
	row_to_edit.confidence = 0.0;
	row_to_edit.label = "protein_label";
	//row_to_edit.geom = "x";
	row_to_edit.bu="BU1";//default
	row_to_edit.selection = "";
	row_to_edit.pdb = "";
	row_to_edit.offset = [0,0,0];
	row_to_edit.pcpalAxis = [0,0,1];
	row_to_edit.confidence = 0;
	row_to_edit.include = true;
	row_to_edit.ingtype = "protein";
	row_to_edit.buildtype = "random";
	row_to_edit.comments = "";
	row_to_edit.compartment = graph.nodes[0].data.name;//should be root
	for (var i=0;i<additional_data.length;i++){
		var key = additional_data[i];
		if (!(key in row_to_edit)){
			row_to_edit[key]="";
		}
	}
	grid.dataView.beginUpdate();
	//grid.dataView.insertItem(0, row_to_edit);
	grid.dataView.addItem(row_to_edit);
	grid.dataView.endUpdate();
	grid.dataView.setGrouping([])
	grid.render();
	grid.dataView.refresh();
	//grid.setSelectedRows([0]);
	//grid.setActiveCell(0,0);
	AddANode(JSON.parse(JSON.stringify(row_to_edit)));
}

function AddANode(some_data){
	//some data should have all the info need for a graph
	/*var newNode = {
	type: 'node-type',
	name: new Date().getTime(),
	children: []
	};
	//Creates a Node from newNode object using d3v4.hierarchy(.)
	var newNode = d3v4.hierarchy(newNode);

	//later added some properties to Node like child,parent,depth
	newNode.depth = selected.depth + 1;
	newNode.height = selected.height - 1;
	newNode.parent = selected;
	newNode.id = Date.now();
	*/
	console.log(graph.nodes[0]);
	some_data.nodetype = "ingredient";
	var newNode = d3v4.hierarchy(some_data);
	newNode.parent = graph.nodes[0];//should be root
	newNode.depth = graph.nodes[0].depth+1;
	newNode.x = canvas.width/2;
	newNode.y = canvas.height/2;
	newNode.r = 30;
	newNode.data.source = {"pdb":some_data.pdb,"bu":some_data.bu,"selection":some_data.selection,"model":""};
	newNode.data.sprite = {"image":null,"offsety":0,"scale2d":1.0};
	newNode.data.opm = 0;
	newNode.data.angle = 25.0;//is it an opm model
	newNode.data.ulength = 34.0;//is it an opm model
	newNode.data.tlength = 100;//is it an opm model
	for (var i=0;i<additional_data.length;i++){
		var key = additional_data[i];
		if (!(key in newNode)){
			newNode[key]=null;
		}
	}   
	graph.nodes[0].children.push(newNode);
	graph.nodes.push(newNode);
	console.log(newNode);
	updateForce();
	return;
	/*
	//by default  add to root
	//update_graph(agraph,alink)
	newNode.nodetype = "ingredient";
	root.children.push(some_data);
	//var newNode = d3v4.hierarchy(some_data);
	//if the graph is empty need to create a root, then add the elem
	//newNode = root.depth+1
	//newNode.parent = root;
	//graph.nodes.push(newNode);
	var aroot = d3v4.hierarchy(root)
	.sum(function(d) { return d.size; })
	.sort(function(a, b) { return b.value - a.value; });
	var nodes = pack(aroot).descendants();//repack ?
	nodes = checkAttributes(nodes);
	nodes = resetAllNodePos(nodes);
	nodes = centerAllNodePos(nodes);

	graph.nodes=nodes;

	//compare node id and graph length
	simulation.nodes(graph.nodes);
	simulation.force("link").links(graph.links);

	// simulation.restart();
	//simulation.alpha(1).alphaTarget(0).restart();
	//simulation.alpha(1);
	// newNode.x = canvas.width/2;
	// newNode.y = canvas.height/2;
	simulation.alpha(1).alphaTarget(0).restart();
	console.log(graph.nodes);*/
}

function traverseTreeForCompartmentNameUpdate(anode){
	 // console.log("traverse ",anode.data.name);
	  anode.children.forEach(function(n){
	  	    //console.log("change table name for ",n.data.id);
				  var cname = n.ancestors().reverse().map(function(d) {return (d.children)?d.data.name:""; }).join('/').slice(0,-1);
	  		  updateCellValue(gridArray[0],"compartment", n.data.id,cname);
	  		  if (n.children) traverseTreeForCompartmentNameUpdate(n);
		});
	}


async function ChangeColorNodeOver(){
	$(".custom-menu-node").hide(100);
	console.log("change color over",node_over_to_use.data.name);
	console.log(node_over_to_use);
	//var rgb = node_over_to_use.data.color;
	//var hx = Util_rgbToHex(rgb[0]*255,rgb[1]*255,rgb[2]*255);
	var color = Util_getRGB(document.getElementById("node_color").value);
	var acolor = [color.arr[0]/255.0,color.arr[1]/255.0,color.arr[2]/255.0];
	var colorby = canvas_color.selectedOptions[0].value;
	if (node_over_to_use.parent!== null && !use_color_mapping && default_options.indexOf(colorby) == -1 && use_unique_array){
		//what the current property value
		var indice = unique_array.indexOf(node_over_to_use.data[colorby]);
		property_mapping[colorby].colors[indice] = color.rgb;
	} else {
		node_over_to_use.data.color =[color.arr[0]/255.0,color.arr[1]/255.0,color.arr[2]/255.0];
	}
	GP_updateMeshColorGeometry(node_over_to_use);
	//change also in ngl view if geometry is toggled
	if (node_over_to_use === ngl_current_node) {//node_selected
		if  (document.getElementById("showgeom").checked ) {
			var comp = stage.getComponentsByName("geom_surface");
			if (comp.list.length && comp.list[0])
			{
				if (comp.list[0].reprList.length)
				{
					comp.list[0].reprList[0].repr.diffuse = new THREE.Color( acolor[0], acolor[1], acolor[2] );
					comp.list[0].reprList[0].repr.update();
				}
			}
		}
	}
	await MS_ChangeColor(node_over_to_use,node_over_to_use.data.color);
	//what about color by properties, should we change properties color instead
}

function ResizeNodeOver(){
	$(".custom-menu-node").hide(100);
	console.log("resize over",node_over_to_use.data.name);
	console.log(node_over_to_use);
	var new_size = prompt("Please enter new size", node_over_to_use.r);
	if (new_size!=null) {
		//node_over_to_use.data.size = parseFloat(new_size);
		node_over_to_use.r = parseFloat(new_size);
		if (node_over_to_use.data.nodetype!=="compartment")
				updateCellValue(gridArray[0],"size",node_over_to_use.data.id,parseFloat(new_size));
    updateForce();
	}
}

function RenameNodeOver(){
	$(".custom-menu-node").hide(100);
	console.log("rename over",node_over_to_use.data.name);
	console.log(node_over_to_use);
	var new_name = prompt("Please enter new name", node_over_to_use.data.name);
	if (new_name!=null) {
		node_over_to_use.data.name = new_name;
		if (node_over_to_use.data.nodetype!=="compartment")
				updateCellValue(gridArray[0],"name",node_over_to_use.data.id,new_name);
		else //change the compartment value for all child...
				traverseTreeForCompartmentNameUpdate(node_over_to_use);
				//update Grid
	}
}

function DeleteNodeOver(){
	$(".custom-menu-node").hide(100);
	console.log("delete over",node_over_to_use);
	//remove his parent children
	if ("source" in node_over_to_use) {
		var index = graph.links.indexOf(node_over_to_use);
		graph.links.splice(index, 1);
		//remove from table
		var row = gridArray[1].dataView.getItemById(node_over_to_use.id);
		console.log(row);
		gridArray[1].dataView.deleteItem(row.id);
	  gridArray[1].invalidate();
	  gridArray[1].render();
	  gridArray[1].dataView.refresh();
		}
	else {

		var index = node_over_to_use.parent.children.indexOf(node_over_to_use);
		if (index > -1) {
	      node_over_to_use.parent.children.splice(index, 1);
	  }
	  //remove from the graph
	  index = graph.nodes.indexOf(node_over_to_use);
	  graph.nodes.splice(index, 1);
		//remove from the table
		//gettherow
		var row = gridArray[0].dataView.getItemById(node_over_to_use.data.id);
		console.log(row);
		gridArray[0].dataView.deleteItem(row.id);
	  gridArray[0].invalidate();
	  gridArray[0].render();
	  gridArray[0].dataView.refresh();
	}
	updateForce();
	}

function anotherSubject(anode,x,y,allnodes) {
	var tolerance=5/2;
	subject = null;

	//x = transform.invertX(x);
	//y = transform.invertY(y);

	//mousexy = {"x":x,"y":y};
   //return subject;
	//console.log("mouse is at");
	//console.log(x,y);
  var n = allnodes.length,//graph.nodes
      i,
      dx,
      dy,
      d2,
      d,
      subject;
  var miniD=9999;
  var depth_over=-10;
  //var minI = 9999;
  //is this hierarcica
  for (i = 0; i < n; ++i) {
    d = allnodes[i];
    if (d===anode) continue;
		// d3v4.event.subject.children.indexOf(hovernodes.node)!==-1
		if (anode.children && anode.children.indexOf(d)!==-1) continue;

    dx = x  - d.x;
    dy = y  - d.y;
    d2 = Math.sqrt(dx * dx + dy * dy);

    //console.log(d.data.name, d.r, d2, d.depth)
		if (!d.parent)//root
		{
			miniD = d2;
			subject = d;
			depth_over = d.depth;
		}
    if (d2  < d.r + anode.r) {//inside
    	if (d.depth > depth_over) { //closest center? problem with nested circle, pick the top circle
    		//if ( d2 < miniD) {
    			miniD = d2;
    	  	subject = d;
    	  	depth_over = d.depth;
					if (d.children && d.children.indexOf(anode)!==-1) {
						break;
					}
    		//}
    	}
    }
 }
 return {"node":subject,"distance":miniD};
	}

function asubject(x,y) {
	var tolerance=5/2;
	subject = graph.nodes[0];//root ?

	x = transform.invertX(x);
	y = transform.invertY(y);
	mousexy = {"x":x,"y":y};

  	var n = graph.nodes.length,
      i,
      dx,
      dy,
      d2,
      r,
      d,
      subject;
	var miniD=9999;
	var depth_over=-10;
	//var minI = 9999;
	//is this hierarcica
	//sort by depth too ?
	subject = graph.nodes[0];//root
 	for (i = 0; i < n; ++i) {
		d = graph.nodes[i];
		r = d.r;
		//if (d.data.nodeType==="compartment") r = d.r*2;
		dx = x  - d.x;
		dy = y  - d.y;
		d2 = dx * dx + dy * dy;
		if (!d.parent)//root
		{
			miniD = d2;
			subject = d;
			depth_over = d.depth;
		}
    	if (d2 < r*r) {
			if (d.depth > depth_over) { //if (d2 < miniD) {
				miniD = d2;
				subject = d;
				depth_over = d.depth;
			}
    	}
 	}
  	//how to find the link instead
  	//graph.links
  	//miniD=9999;
  	miniD = Math.sqrt(miniD);
  	for (i = 0; i < graph.links.length; ++i) {
		graph.links[i].highlight=false;
		graph.links[i].source.highlight=false;
		graph.links[i].target.highlight=false;		  
  	 	var source = graph.links[i].source;
  	 	var target = graph.links[i].target;
  	 	//console.log("source "+graph.links[i].source.x+" "+i);//undefined ?
		//console.log (x+" "+ source.x+" "+ target.x);
		//if(x < source.x || x > target.x){
		//    continue
		//}
		//var linepoint=linepointNearestMouse(source,target,x,y);
		//var dx=x-linepoint.x;
		//var dy=y-linepoint.y;
		//var distance=Math.abs(Math.sqrt(dx*dx+dy*dy));
		var aoffset = getOffsetLink(graph.links[i],2);
		var distance = distanceToLineSegment(aoffset.sx, aoffset.sy,aoffset.tx, aoffset.ty,x, y);
		//console.log(distance+" "+tolerance);
		if(distance < tolerance){
      	 	if (distance < miniD) 
			{
				miniD = distance;
				subject = graph.links[i];
			} 
        }
	}
  	return subject;
}

function subject() {
    var rect = canvas.getBoundingClientRect(), // abs. size of element
      scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
      scaleY = canvas.height / rect.height;
  return asubject(d3v4.event.x*scaleX, d3v4.event.y*scaleY);
}

function clearHighLight(){
 for (i = 0; i < graph.nodes.length; ++i) {
    graph.nodes[i].highlight=false;
    //alert(graph.nodes[i].data.name);
    }
  for (i = 0; i < graph.links.length; ++i) {
    graph.links[i].highlight=false;

    }
}

function dragsubject() {
  return simulation.find(d3v4.event.x - width / 2, d3v4.event.y - height / 2);
}

function MouseMove(x,y) {
	clearHighLight();
	MS_ClearHighlight();	
	var d = asubject(x,y);
	var line = false;
	if (d && "data" in d) {}//console.log("found "+d.data.name+" at "+x+" "+y);
	else if (d && "source" in d )
	{
		//console.log("found a line");
	  	line = true;
	}
  	if (!d || d===null ) {
	  return;
	}
	if (!line)
	{
		if (!node_over)
		{
			node_over = d ;
			MS_HighlightNode(d);
		}
        else if (node_over != d) {
			node_over.highlight=false;
			node_over = d;
			MS_HighlightNode(d);
        }
        else {
          	node_over = d;
        }
		MS_HighlightNode(d);
		d.highlight=true;
        line_over = null;
	}
	else {
      	node_over = null;
		line_over = d;
		if ("source" in line_over) {
			line_over.highlight=true;
			line_over.source.highlight=true;
			line_over.target.highlight=true;		
			//clearHighLight();
			MS_HighlightNode(d.source);
			MS_HighlightNode(d.target);			
		}
	}
  //}
  if (simulation.alpha() < 0.01 && HQ) simulation.alphaTarget(1).restart();
  //console.log(simulation.alpha());
}

function mouseEnter(){
	//console.log("d3 mouseenter");
	if (!d3v4.event.active) simulation.alphaTarget(0.3).restart();
	mousein = true;
	//console.log(mousein);
}

function mouseLeave(){
	//console.log("d3 mouseleave");
	//if (!d3v4.event.active) simulation.alphaTarget(0);
	mousein = false;
	//console.log(mousein);
}

function mouseMoved(event) {
  var rect = canvas.getBoundingClientRect(), // abs. size of element
    scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
    scaleY = canvas.height / rect.height;
  var mx =  d3v4.event.layerX || d3v4.event.offsetX;//d3v4.event.clientX
  var my =  d3v4.event.layerY || d3v4.event.offsety;//d3v4.event.clientY
  var x = mx*scaleX;//(rect.left!=NaN)? (d3v4.event.clientX - rect.left)* scaleX: 0;//d3v4.event.clientX-width/2;
  var y = my*scaleY;//(rect.top!=NaN)? (d3v4.event.clientY - rect.top)* scaleY : 0;//d3v4.event.clientX-height/2;
  //console.log("x ",x," y ",y);
	//var x = d3v4.event.pageX - canvas.getBoundingClientRect().x;
  //var y = d3v4.event.pageY - canvas.getBoundingClientRect().y;
  //mousexy = {"x":x,"y":y};
	//console.log("d3 mousemove");
	//var mouseX = (d3v4.event.layerX || d3v4.event.offsetX) - canvas.getBoundingClientRect().x;
  //var mouseY = (d3v4.event.layerY || d3v4.event.offsetY) - canvas.getBoundingClientRect().y;
	//console.log(d3v4.event.x,d3v4.event.y);//udefined ?
	//if (d3v4.event.subject) console.log(d3v4.event.subject.data.name);
	//var m = d3v4.mouse();//or d3v4.event.x?
  //MouseMove(mouseX,mouseY);//m[0],m[1]);
  MouseMove(x,y);//nanan
  mousein = true;
 // isKeyPressed(event);
  //console.log(mousein);
}


function dragstarted() {
	//click event on canvas
	console.log("DraggStart",ctrlKey,d3v4.event.subject);
	draggin_d_node = true;
	//padding
  	var rect = canvas.getBoundingClientRect(), // abs. size of element
      scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
      scaleY = canvas.height / rect.height;
	start_drag.x =  d3v4.event.x* scaleX;
	start_drag.y =  d3v4.event.y* scaleY;
  	if (!d3v4.event.active) simulation.alphaTarget(0.3).restart();

	if (!d3v4.event.subject.children) {
		console.log("??",nodes_selections,ctrlKey);
		node_selected =  d3v4.event.subject;
		node_selected_indice = graph.nodes.indexOf(node_selected);
		if (ctrlKey){
			console.log("ctrl",nodes_selections);
			if (nodes_selections.indexOf(node_selected)===-1) nodes_selections.push(node_selected);
			console.log(nodes_selections.length);
		}
		else {
			nodes_selections=[]
			nodes_selections.push(node_selected);
			}
		console.log("??",nodes_selections,ctrlKey);
		//NGL_UpdateWithNode(d3v4.event.subject);
	}
	else if (d3v4.event.subject.parent) {
		if (current_mode !== 1) {
			node_selected =  d3v4.event.subject;
	  		node_selected_indice = graph.nodes.indexOf(node_selected);
			nodes_selections=[]
			nodes_selections.push(node_selected);
		}
		else {
			node_selected = null;
			node_selected_indice = -1;
			nodes_selections=[];
			//clear highligh
			clearHighLight();
			draggin_d_node = false;
		}
	}
  	else {
  		node_selected = null;
  		node_selected_indice = -1;
  		nodes_selections=[];
  		//clear highligh
  		clearHighLight();
  		draggin_d_node = false;
  	}
	//change the node.depth os that it doesnt collide
	if (current_mode === 1 && d3v4.event.subject.parent && !(ctrlKey))
	{
		var depth = d3v4.event.subject.depth;
		d3v4.event.subject._depth = depth;
		d3v4.event.subject.depth = 6;
		updateForce();
	}
	else {
		d3v4.event.subject._depth = d3v4.event.subject.depth;
	}
}

function testsort(){
	// For performance reasons, we will first map to a temp array, sort and map the temp array to the objects array.
	var amap = graph.nodes.map(function (d, ind) {
  	return { index : ind, value : d.depth };
	});
	console.log("before",amap);
	// Now we need to sort the array by z index.
	amap.sort(function (a, b) {
 		 return a.value - b.value;
	});
	console.log("after",amap);
	console.log(graph.nodes[0]);
	return amap;
	// Now that objects are sorted, we can iterate to draw them.
	//for (var i = 0; i < objectsSorted.length; i++) {
	//  objectsSorted[i].draw();
	//}
}

function dragged() {
	var rect = canvas.getBoundingClientRect(), // abs. size of element
      scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
      scaleY = canvas.height / rect.height;
  	if (!d3v4.event.subject.parent) return;//root
	//node_selected =  d3v4.event.subject;
	d3v4.event.subject.fx = start_drag.x  + ((d3v4.event.x - start_drag.x ) / transform.k) * scaleX;//d3v4.event.x;
	d3v4.event.subject.fy = start_drag.y  + ((d3v4.event.y - start_drag.y ) / transform.k) * scaleY;
	if (current_mode === 1 && d3v4.event.subject.parent && !(ctrlKey)){
		//do we hover another object.
		//if ingredient hovering compartment show it
		//then on drag end assign the new parent + surface
		var hovernodes = anotherSubject(d3v4.event.subject,d3v4.event.subject.x,d3v4.event.subject.y,graph.nodes);
		console.log("dragged hover ",hovernodes);
		//console.log(hovernodes.node.data.name);
		if (hovernodes.node && hovernodes.node.data.nodetype === "compartment")
		{
			comp_highligh = hovernodes.node;
			//highlghed surface
			//hovernodes.node.highlight = true;
			if ( Math.abs(hovernodes.node.r - hovernodes.distance) < d3v4.event.subject.r )
				comp_highligh_surface = hovernodes.node;
			else
				comp_highligh_surface = null;
			updateTempLink(d3v4.event.subject,hovernodes.node);
		}
		else {
			temp_link = null;
			comp_highligh = null;
			comp_highligh_surface = null;
		}
		//testsort();
  	}
}

function dragended() {
	draggin_d_node = false;
	console.log("dragended",d3v4.event.subject,ctrlKey);

	if (!d3v4.event.active && HQ) simulation.alphaTarget(0);
	d3v4.event.subject.fx = null;
	d3v4.event.subject.fy = null;
	SetObjectsOptionsDiv(d3v4.event.subject);
  	if (!d3v4.event.subject.children && !("source" in d3v4.event.subject)) {
		d3v4.event.subject.data.visited = true;
  		//node_selected =  d3v4.event.subject;
  		//node_selected_indice = nodes.indexOf(node_selected);
  		grid_UpdateSelectionPdbFromId(d3v4.event.subject.data.id);
		//SelectRowFromId(node_selected.data.id);
		if (current_mode===0) {
			NGL_UpdateWithNode(d3v4.event.subject);
			//also update the PDB component and sequence viewer
			var nopdb = (!d3v4.event.subject.data.source.pdb || d3v4.event.subject.data.source.pdb === "None");
			if (!nopdb)
			{
				var ispdb = document.getElementById("pdb_component_enable")?document.getElementById("pdb_component_enable").checked : false;
  				if (ispdb) {
					  UpdatePDBcomponent(d3v4.event.subject.data.source.pdb.toLowerCase());
					if (!(d3v4.event.subject.data.uniprot)||d3v4.event.subject.data.uniprot === "") {
						//gather the first uniprot code ?
						var entry = CleanEntryPDB(d3v4.event.subject.data.source.pdb.toLowerCase());
						current_list_pdb=[entry]
						custom_report_uniprot_only = true;
						customReport(entry);//should update the uniprot
					}
					else {
						setupProVista(d3v4.event.subject.data.uniprot);
						console.log(protvista_instance);
						UpdateUniPDBcomponent(d3v4.event.subject.data.uniprot);
					}
				}
			}
		}
		line_selected = null;
	}
  	else {
		if ("source" in d3v4.event.subject )
		{
			//&& d3v4.event.subject.nodetype==="ingredient"
			line_selected = d3v4.event.subject;
			nodes_selections=[]
			nodes_selections.push(line_selected.source);
			nodes_selections.push(line_selected.target);
			node_selected = line_selected.source;
			//its a line/interactin with an id.
			UpdateSelectionInteractionFromId(d3v4.event.subject.id);//undefined ?
			if (current_mode===0) NGL_UpdateWithNodePair(d3v4.event.subject);
			//if pdb1 and pdb2 -> NGL_UpdateWithNode with all info...
		}
  	}
  	if (current_mode === 1 )
  	{
		if (ctrlKey) return;
		node_selected = d3v4.event.subject;
  		mousexy = {"x":d3v4.event.subject.x,"y":d3v4.event.subject.y};

		var hovernodes = anotherSubject(d3v4.event.subject,d3v4.event.subject.x,d3v4.event.subject.y,graph.nodes);
		console.log("hover ",hovernodes);

		//restore depth value
		d3v4.event.subject.depth = d3v4.event.subject._depth;
		//if subject is an ingredient and hover is compartment change graph
		if (hovernodes.node && (!("source" in node_selected)) )
		{
			console.log("hover ",hovernodes.node.data.name);
			console.log (hovernodes.node.data.nodetype);
			if ( hovernodes.node.data.nodetype === "compartment" || (!(hovernodes.node.parent))) {//compartment or root
					//current index as a child
					var index = d3v4.event.subject.parent.children.indexOf(d3v4.event.subject);
					//if the current parent is different from the node hover
				if (d3v4.event.subject.parent!==hovernodes.node) {
						//check if hovernode is a child of the subject
					if (d3v4.event.subject.children && d3v4.event.subject.children.indexOf(hovernodes.node)!==-1){}//d3v4.event.subject.children &&
						else {
						if (index > -1) {
								//remove subject to his parent
					d3v4.event.subject.parent.children.splice(index, 1);
					}
							//add subject to hover children list
					hovernodes.node.children.push(d3v4.event.subject);
							//change the parent of subject
					d3v4.event.subject.parent = hovernodes.node;
					d3v4.event.subject.depth = hovernodes.node.depth+1;
					hovernodes.node.r += d3v4.event.subject.r/2;
					var cname = d3v4.event.subject.ancestors().reverse().map(function(d) {return (d.children)?d.data.name:""; }).join('/').slice(0,-1);
					console.log("update ? ",d3v4.event.subject);
					if (d3v4.event.subject.data.nodetype !== "compartment")
						updateCellValue(gridArray[0],"compartment",d3v4.event.subject.data.id,cname);
					else {
								//loop over the children and change the depth and the radius, and the path ?
								d3v4.event.subject.children.forEach(function (ch_node)
								{
									ch_node.depth = d3v4.event.subject.depth+1;
									var cn = ch_node.ancestors().reverse().map(function(d) {return (d.children)?d.data.name:""; }).join('/').slice(0,-1);
									updateCellValue(gridArray[0],"compartment",ch_node.data.id,cn);
								}
							);
							}//need to change all child
					}
				}
				if (d3v4.event.subject.data.nodetype !== "compartment")
				{
					if ( Math.abs(hovernodes.node.r - hovernodes.distance) < d3v4.event.subject.r )
						d3v4.event.subject.data.surface = true;
					else
						d3v4.event.subject.data.surface = false;
					updateCellValue(gridArray[0],"surface",d3v4.event.subject.data.id,d3v4.event.subject.data.surface);
				}
			}
			else {
				//ignredient
				//make a link between them
				//	graph.links.push({"source":hovernodes.node,"target":d3v4.event.subject});
				//	simulation.force("link").links(graph.links);
				}
		}
		//update the table ?
		updateForce();
		temp_link = null;
		comp_highligh = null;
  	}
}

function getOffsetLink(d, padding) {
	 var deltaX = (d.target.x - d.source.x),
        deltaY = (d.target.y - d.source.y),
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = padding,
        targetPadding = padding,
        sourceX = d.source.x + d.source.r * normX,// + (sourcePadding * normX),
        sourceY = d.source.y + d.source.r * normY,// + (sourcePadding * normY),
        targetX = d.target.x - d.target.r * normX,// - (targetPadding * normX),
        targetY = d.target.y - d.target.r * normY;// - (targetPadding * normY);
   return {"sx":sourceX,"sy":sourceY,"tx":targetX,"ty":targetY};
	}

function getOffsetTwoNode(d1,d2) {
	 var deltaX = d1.x - d2.x,
        deltaY = d1.y - d2.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d1.r/2,
        targetPadding = d2.r/2,
        sourceX = d1.x + (sourcePadding * normX),
        sourceY = d1.y + (sourcePadding * normY),
        targetX = d2.x - (targetPadding * normX),
        targetY = d2.y - (targetPadding * normY);
   return {"sx":sourceX,"sy":sourceY,"tx":targetX,"ty":targetY};
	}

function drawLink(acontext,d) {
	acontext.beginPath();
	var aoffset = getOffsetLink(d,2);
   	acontext.moveTo(aoffset.sx, aoffset.sy);
   	acontext.lineTo(aoffset.tx, aoffset.ty);
}

function drawLinkTwoNode(d1,d2) {
	context.beginPath();
	var aoffset = getOffsetTwoNode(d1,d2);
   	context.moveTo(aoffset.sx, aoffset.sy);
   	context.lineTo(aoffset.tx, aoffset.ty);
}


// Move d to be adjacent to the cluster node.
function cluster(alpha) {
  return function(d) {
    var cluster = clusters[d.cluster];
    if (cluster === d) return;
    var x = d.x - cluster.x,
        y = d.y - cluster.y,
        l = Math.sqrt(x * x + y * y),
        r = d.radius + cluster.radius;
    if (l != r) {
      l = (l - r) / l * alpha;
      d.x -= x *= l;
      d.y -= y *= l;
      cluster.x += x;
      cluster.y += y;
    }
  };
}
//use cluster
function drawNode(d) {
  //adapt velocity and draw the node
  var alpha = 0.1;
  context.moveTo(d.x, d.y);
  var ndx = d.x;
  var ndy = d.y;
  var surface = false;
  if (clusterBy!==0){
    var cluster = d.cluster;
    if (cluster && cluster !== d) {
      var dx = d.x - (cluster.x + d.parent.x),
          dy = d.y - (cluster.y + d.parent.y),
          l = Math.sqrt(dx * dx + dy * dy),
          //k = (d.parent.r - r) * 2 * 1 / r;
          r = d.r + cluster.r;
      if (l > r) {
        //l = (l - r) / l * alpha;
		//should be local to the parent
		d.vx += ((cluster.x + d.parent.x) - d.x) * parseFloat(AllForces.clusterByForce);
		d.vy += ((cluster.y + d.parent.y) - d.y) * parseFloat(AllForces.clusterByForce);		
      }
    }
  }
  if (d.parent && !d.children && d.data.surface) {
    //cluster ?
    surface = true;
    //go to the circle parent contour
    var dx = d.x - d.parent.x,
        dy = d.y - d.parent.y,
        r = Math.sqrt(dx * dx + dy * dy),
        k = (d.parent.r - r) * parseFloat(AllForces.SurfaceForce) * 1 / r;
    d.vx += dx * k;
    d.vy += dy * k;
	//d.x = d.x + (d.parent.r - r);
	//d.y = d.y + (d.parent.r - r);
  }
  else if (!d.children && d.parent) {}
  else if (d.parent) {}
  else //context.arc(d.x, d.y, d.r, 0, 10);//0?
  {
    d.vx += (-d.x) * 0.1 * 1;
    d.vy += (-d.y) * 0.1 * 1;
  }
  context.beginPath();
  if (!d.parent) {
	  //root
  }
  else {
    var dx = d.x - d.parent.x,
        dy = d.y - d.parent.y,
        r = Math.sqrt(dx * dx + dy * dy);
    if (r + d.r * 1.2 > d.parent.r-5 && !surface && d.parent.parent)//outside parent
    {
      d.vx += (d.parent.x - d.x) * parseFloat(AllForces.ParentForce);
      d.vy += (d.parent.y - d.y) * parseFloat(AllForces.ParentForce);
    }
    if (d.parent && !d.children) context.arc(ndx, ndy, d.r, 0, 10);//ingredient
	else //compartment
	{
		context.arc(ndx, ndy, d.r+5, 0, 10);
		context.strokeStyle = color(d.depth+1);
		context.stroke();
		context.arc(ndx, ndy, d.r-5, 0, 10);
		context.strokeStyle = color(d.depth+1);
		context.stroke();		
	}
  }
}

// Function to update the temporary connector indicating dragging affiliation
var updateTempLink = function(draggingNode,selectedNode) {
    var data = [];
    if (draggingNode !== null && selectedNode !== null) {
        // have to flip the source coordinates since we did this for the existing connectors on the original tree
        temp_link = {"source" : selectedNode,"target" : draggingNode};
        }
    else temp_link = null;
};

//The start angle in degrees for each of the non-node leaf titles
var rotationText = [-14,4,23,-18,-10.5,-20,20,20,46,-30,-25,-20,20,15,-30,-15,-45,12,-15,-16,15,15,5,18,5,15,20,-20,-25]; //The rotation of each arc text

//Adjusted from: http://blog.graphicsgen.com/2015/03/html5-canvas-rounded-text.html
function drawCircularText(ctx, text, fontSize, titleFont, centerX, centerY, radius, startAngle, kerning) {
	// startAngle:   In degrees, Where the text will be shown. 0 degrees if the top of the circle
	// kearning:     0 for normal gap between letters. Positive or negative number to expand/compact gap in pixels

	//Setup letters and positioning
	ctx.textBaseline = 'alphabetic';
	ctx.textAlign = 'center'; // Ensure we draw in exact center
	ctx.font = fontSize + "px " + titleFont;
	ctx.fillStyle = "rgba(0,0,0,1)";

	startAngle = startAngle * (Math.PI / 180); // convert to radians
	// console.log("drawCircularText",text);
	text = text.toString().split("").reverse().join(""); // Reverse letters

	//Rotate 50% of total angle for center alignment
	for (var j = 0; j < text.length; j++) {
		var charWid = ctx.measureText(text[j]).width;
		startAngle += ((charWid + (j == text.length-1 ? 0 : kerning)) / radius) / 2;
	}//for j

	ctx.save(); //Save the default state before doing any transformations
	ctx.translate(centerX, centerY); // Move to center
	ctx.rotate(startAngle); //Rotate into final start position

	//Now for the fun bit: draw, rotate, and repeat
	for (var j = 0; j < text.length; j++) {
		var charWid = ctx.measureText(text[j]).width/2; // half letter
		//Rotate half letter
		ctx.rotate(-charWid/radius);
		//Draw the character at "top" or "bottom" depending on inward or outward facing
		ctx.fillText(text[j], 0, -radius);
		//Rotate half letter
		ctx.rotate(-(charWid + kerning) / radius);
	}//for j

	ctx.restore(); //Restore to state as it was before transformations
}//function drawCircularText

function MapOneLink(alink){
	var linkmap = {"source":0,"target":1};
	for (var j = 0; j < graph.nodes.length; j++) {
		//if use name as string
		if (alink.source == some_nodes[j].data.name) linkmap.source = j;
		if (alink.target == some_nodes[j].data.name) linkmap.target = j;
		if (typeof( alink.source) == "object" && alink.source.data.name == some_nodes[j].data.name) linkmap.source = j;
		if (typeof( alink.target) == "object" && alink.target.data.name == some_nodes[j].data.name) linkmap.target = j;
	}	
	return linkmap;
}

function MapLinkToNode(some_nodes,some_links) {
	//console.log(some_links);
	for (var i=0;i<some_links.length;i++){
		var alink = some_links[i];
	    for (var j = 0; j < some_nodes.length; j++) {
	    		//if use name as string
	        if (alink.source == some_nodes[j].data.name) alink.source = j;
			if (alink.target == some_nodes[j].data.name) alink.target = j;
			if (typeof( alink.source) == "object" && alink.source.data.name == some_nodes[j].data.name) alink.source = j;
	        if (typeof( alink.target) == "object" && alink.target.data.name == some_nodes[j].data.name) alink.target = j;
    	}
	}
	return some_links;
}

function update_graph(agraph,alink){
  canvas_color_options = ["pdb", "pcpalAxis", "offset", "count_molarity", "Beads",
	"geom", "confidence", "color", "viewed", "size", "count",
	"molarity", "molecularweight","default","automatic"];	
  var isempty= false;
  if ( agraph.length < 1 ) isempty=true;
	if (DEBUGLOG) console.log("agraph",agraph);
	var mapping = d3v4.scaleLinear()
    .domain([Math.min(0,property_mapping["size"].min), property_mapping["size"].max])
    .range([0, 50]);

  root = d3v4.hierarchy(agraph)
    .sum(function(d) { return d.size; });
  //   .sort(function(a, b) { return b.value - a.value; });

  if (DEBUGLOG) console.log("root",root);
  gp_nodes = pack(root).descendants();//flatten--error ?
	if (DEBUGLOG) {
		console.log("nodes",gp_nodes);
  	console.log("alink",alink);
  }
  alink = MapLinkToNode(gp_nodes,alink);

  if (!isempty)gp_nodes = checkAttributes(gp_nodes);
  if (!isempty)gp_nodes = resetAllNodePos(gp_nodes);
  if (!isempty)gp_nodes = centerAllNodePos(gp_nodes);
  if (!gp_nodes) gp_nodes =[];
  // Returns array of link objects between nodes.
  //links = root.links();//nodes.slice(1);
  console.log("update with "+gp_nodes.length);
  UpdateGridFromD3Nodes(gp_nodes,0);
  UpdateGridFromD3Links(alink,1);

  if (DEBUGLOG) console.log( gp_nodes );

  graph={};
  graph.nodes = gp_nodes;
  graph.links = alink;
  users = d3v4.nest()
      .key(function(d) { return d.name; })
      .entries(graph.nodes)
      .sort(function(a, b) { return b.size - a.size; });
  //alert(nodes[0].data.name);
  clearHighLight();
  //simulation.stop();
  //simulation
  //    .nodes(graph.nodes)
  //    .on("tick", ticked);
  //update the size to reflect the table size
  //mapRadiusToProperty_cb("size");
  simulation.stop();
  simulation.nodes(graph.nodes);
  simulation.force("link").links(graph.links);

  //mapRadiusToProperty(document.getElementById("canvas_map_r"));

  simulation.restart();
  //simulation.alpha(1).alphaTarget(0).restart();
  simulation.alpha(1);
  //ticked();
  //saveCurrentState();
  ChangeCanvasColor(null);
  mapRadiusToProperty_cb(document.getElementById("canvas_map_r").value);
}

function merge_node(cnode,newnode){
    Object.keys(merge_field).forEach(function(akey,index) {
        // key: the name of the object key
        // index: the ordinal position of the key within the object
        if (merge_field[akey].checked){
            var key = allfield_key[akey];
			console.log("checked ",akey,( key in newnode.data ));
            if ( key in newnode.data ) cnode.data[key] = newnode.data[key];
            if (cnode.data.nodetype!=="compartment"){
              if (key === "bu" && "bu" in newnode.data) {
                cnode.data.source.bu = newnode.data.bu;
              }
              if (key === "selection" && "bu" in newnode.data) {
                cnode.data.source.selection = newnode.data.selection;
              }
              if (key === "model"  && "bu" in newnode.data) {
                cnode.data.source.model = newnode.data.model;
              }
            }
            //update compartment?
        }
    });
}

function merge_one_node(new_node){
   //check if parent name is the same and exist
   //var newNode = Object.assign({}, new_node);//this doesnt assign the function from the hierarchy
   var anode = JSON.parse(JSON.stringify(new_node.data));
   console.log(anode);
   var newNode = d3v4.hierarchy(anode);
   console.log(newNode);
   var parent = getNodeByName(new_node.parent.data.name);
   parent = (parent)? parent : graph.nodes[0];
   newNode.nodetype = "ingredient";
   console.log("add node to parent "+new_node.parent.data.name);
   console.log(parent);
   //find the parent
   newNode.parent = parent;//should be root
   newNode.depth = parent.depth+1;
   //newNode.x = canvas.width/2;
   //newNode.y = canvas.height/2;
   newNode.r = new_node.r;
   //newNode.data.source = {"pdb":some_data.pdb,"bu":some_data.bu,"selection":some_data.selection,"model":""};
	 newNode.data.opm = 0;
   newNode.data.id = "id_"+graph.nodes.length;
	 parent.children.push(newNode);
   graph.nodes.push(newNode);
   return;
}

function merge_graph(agraph,alink){
  //options to what to do to merge. e.g. what field are going to be overwritten when already Loaded
  //use a modal view like the modal_canvas_comp.
  //use merge_field to help overwrite when name is the name
  var isempty= false;
  if ( agraph.length < 1 ) isempty=true;
  var mapping = d3v4.scaleLinear()
    .domain([Math.min(0,property_mapping["size"].min), property_mapping["size"].max])
    .range([0, 50]);
  
	//agraph
  var new_root = d3v4.hierarchy(agraph)
    .sum(function(d) { return d.size; })
    //.sort(function(a, b) { return b.value - a.value; });

  if (DEBUGLOG) console.log("root",new_root);
  var new_nodes = pack(new_root).descendants();//flatten--error ?
  alink = MapLinkToNode(new_nodes,alink);

  //if (!isempty) new_nodes = checkAttributes(new_nodes);
  //if (!isempty)new_nodes = resetAllNodePos(new_nodes);
  //if (!isempty)new_nodes = centerAllNodePos(new_nodes);
  if (!new_nodes) new_nodes =[];
  if (!alink) alink =[];
  //new_nodes = checkAttributes(new_nodes);
  //new_nodes = resetAllNodePos(new_nodes);
  //new_nodes = centerAllNodePos(new_nodes);

  merge_nodes = new_nodes;
  merge_links = alink;
  //merge with current graph
  //console.log(new_nodes);
  new_nodes.forEach(function(n){
      var cnode = getNodeByName(n.data.name);
      if (n !== new_root) {
        if (cnode == null){
          console.log(n.data.name);
          if (create_when_merge) merge_one_node(n);
        }
        else {
			console.log("merge 2 nodes ",cnode,n);
            merge_node(cnode,n);
        }
      }
  });
  gp_nodes = graph.nodes;
  gp_nodes = checkAttributes(gp_nodes);
  gp_nodes = resetAllNodePos(gp_nodes);
  gp_nodes = centerAllNodePos(gp_nodes);
  //update the links
  alink.forEach(function(l){
	  graph.links.forEach(function(ll){
		if ((l.name1 === ll.name1 && l.name2 === ll.name2)||(l.name2 === ll.name1 && l.name1 === ll.name2)) {
			//update
			Object.keys(l).forEach(function(akey,index) {
				if (akey !== "source" && akey !== "target" && akey !== "index" && akey !== "id" && akey !== "highlight") {
					if ( akey in ll ) ll[akey] = l[akey];	
				}
			});
		}
	  })
  });
  // Returns array of link objects between nodes.
  //links = root.links();//nodes.slice(1);
  console.log("update with "+gp_nodes.length);
  UpdateGridFromD3Nodes(gp_nodes,0);
  UpdateGridFromD3Links(graph.links,1);
  MERGE = false;
  //graph.links = MapLinkToNode(gp_nodes,graph.links);
  if (DEBUGLOG) console.log( gp_nodes );
  users = d3v4.nest()
      .key(function(d) { return d.name; })
      .entries(graph.nodes)
      .sort(function(a, b) { return b.size - a.size; });
  //alert(nodes[0].data.name);
  clearHighLight();
  //simulation.stop();
  //simulation
  //    .nodes(graph.nodes)
  //    .on("tick", ticked);
  //update the size to reflect the table size

  simulation.stop();
  updateForce();
  //simulation.nodes(graph.nodes);
  //simulation.force("link").links(graph.links);
	//mapRadiusToProperty(document.getElementById("canvas_map_r"));
  simulation.restart();
  //simulation.alpha(1).alphaTarget(0).restart();
  simulation.alpha(1);
  //ticked();
  //saveCurrentState();
  MERGE = false;
}

//used _index before, now use table.
function PreviousIgredient(){
	PreviousIgredient_table();
}

function NextIgredient(){
	NextIgredient_table();
}

function PreviousIgredient_table(){
	var current_rows = gridArray[0].getSelectedRows();
	var crow = 0;
	var total = gridArray[0].dataView.getLength();
	if (current_rows.length == 0) {
		//select last row
		crow = -1;
	} else {
		//select previous row
		crow = current_rows[0];
	}
	crow = crow - 1;
	if (crow < 0) crow = total-1;
	var arow = gridArray[0].dataView.getItem(crow);
	node_selected_indice = parseInt(arow.id.split("_")[1]);
	node_selected = graph.nodes[node_selected_indice];
	node_selected.data.visited = true;
	grid_UpdateSelectionPdbFromId(node_selected.data.id);
	NGL_UpdateWithNode(node_selected);
	wakeUpSim();
}

function NextIgredient_table(){
	var current_rows = gridArray[0].getSelectedRows();
	var crow = 0;
	var total = gridArray[0].dataView.getLength();
	if (current_rows.length == 0) {
		//select last row
		crow = -1;
	} else {
		//select previous row
		crow = current_rows[0];
	}
	crow = crow + 1;
	if (crow >= total) crow = 0;
	var arow = gridArray[0].dataView.getItem(crow);
	node_selected_indice = parseInt(arow.id.split("_")[1]);
	node_selected = graph.nodes[node_selected_indice];
	node_selected.data.visited = true;
	grid_UpdateSelectionPdbFromId(node_selected.data.id);
	NGL_UpdateWithNode(node_selected);
	wakeUpSim();
}

function PreviousIgredient_index(){
	var icurrent = node_selected_indice;
	//find previous
	var found = false;
	var i=(icurrent)? icurrent : graph.nodes.length;
	while (!found){
		i=i-1;
		if (i===0) { i = graph.nodes.length;}
		if (!graph.nodes[i].children){
			found = true;
			node_selected_indice = i;
			node_selected = graph.nodes[i];
			nodes_selections=[];
		}
	}
	if (found)
	{
		//find the row
		node_selected.data.visited = true;
		grid_UpdateSelectionPdbFromId(node_selected.data.id);
		NGL_UpdateWithNode(node_selected);
		wakeUpSim();
	}
}

function NextIgredient_index(){
	var icurrent = node_selected_indice;
	//find previous
	var found = false;
	var i=(icurrent)? icurrent : 0;
	while (!found){
		i=i+1;
		if (i===graph.nodes.length) { i = 0;}
		if (!graph.nodes[i].children){
			found = true;
			node_selected_indice = i;
			node_selected = graph.nodes[i];
		}
	}
	if (found)
	{
		node_selected.data.visited = true;
		grid_UpdateSelectionPdbFromId(node_selected.data.id);
		NGL_UpdateWithNode(node_selected);
		wakeUpSim();
	}
}

var gridster;

function getX(){
	var nc = Math.round($(window).width()/50);
	return Math.round(nc/3);
	}

function resizeGridster(){
			var nc = Math.round($(window).width()/50);
			var nr = Math.round($(window).height()/(50*2));
			console.log("gridster size ",nc,nr,nc*50,nr*50);
			console.log("gridster size ",nc/3,nr/2);
			//default layout is
			var nctop = Math.round(nc/3);

      gridster.resize_widget(gridster.$widgets.eq(0),nctop,nr,false);
			gridster.resize_widget(gridster.$widgets.eq(1),nctop,nr,false);
			gridster.resize_widget(gridster.$widgets.eq(2),nctop,nr,false);
			gridster.resize_widget(gridster.$widgets.eq(3),nctop*2,nr,false);

			gridster.$widgets.eq(0).attr("data-row", 1);gridster.$widgets.eq(0).attr("data-col", 1);
      gridster.$widgets.eq(1).attr("data-row", 1);gridster.$widgets.eq(1).attr("data-col", nctop+1);
      gridster.$widgets.eq(2).attr("data-row", 1);gridster.$widgets.eq(2).attr("data-col", nctop*2+1);
      gridster.$widgets.eq(3).attr("data-row", nr+1);gridster.$widgets.eq(3).attr("data-col", 1);

      gridster.$widgets.eq(0).trigger( "resize.start" );
      gridster.$widgets.eq(0).trigger( "resize.resize" );
      gridster.$widgets.eq(0).trigger( "resize.stop" );

      gridster.$widgets.eq(1).trigger( "resize.start" );
      gridster.$widgets.eq(1).trigger( "resize.resize" );
      gridster.$widgets.eq(1).trigger( "resize.stop" );

      gridster.$widgets.eq(2).trigger( "resize.start" );
      gridster.$widgets.eq(2).trigger( "resize.resize" );
      gridster.$widgets.eq(2).trigger( "resize.stop" );

      gridster.$widgets.eq(3).trigger( "resize.start" );
      gridster.$widgets.eq(3).trigger( "resize.resize" );
      gridster.$widgets.eq(3).trigger( "resize.stop" );

	}

function setupGridster() {

		var maxnb = Math.round($(window).width()/50);
		console.log("max number of column ",maxnb);
    	gridster = $(".gridster > ul").gridster({
        widget_base_dimensions: [50, 50],
        //shift_widgets_up: false,
        shift_larger_widgets_down: false,
        collision: {
            wait_for_mouseup: true
        },
        //autogenerate_stylesheet: true,
        //autogrow_cols: true,
        //min_cols: 1,
        //max_cols: maxnb,
        widget_margins: [10, 10],
				//autogrow_cols: true,
				//shift_widgets_up: false,
        //shift_larger_widgets_down: false,
        //helper: 'clone',
        draggable: {
            handle: '.handle-drag-test'
        },
        resize: {
            enabled: true,
            start: function (e, ui, $widget) {
                //log.innerHTML = 'START position: ' + ui.position.top + ' ' + ui.position.left + "<br >" + log.innerHTML;
            },

            resize: function (e, ui, $widget) {
            	//respondCanvas();
            	//change transform.k;
            	//transform.k = (ui.pointer.diff_top+ui.pointer.diff_left)/200;
            	//stage.handleResize();
            	//resize our widget
                //log.innerHTML = 'RESIZE offset: ' + ui.pointer.diff_top + ' ' + ui.pointer.diff_left + "<br >" + log.innerHTML;
            },

            stop: function (e, ui, $widget) {
            	respondCanvas();
            	stage.handleResize();
            	resizeToFitBrowserWindow(gridArray[current_grid], gridIds[current_grid],"BottomPane");// "tabs-"+(current_grid+1));
                //log.innerHTML = 'STOP position: ' + ui.position.top + ' ' + ui.position.left + "<br >" + log.innerHTML;
            }
        }
    }).data('gridster');


		gridster.$el.ready(function () {
			//resize according the window size ?
			var nc = Math.round($(window).width()/50);
			var nr = Math.round($(window).height()/(50*2));
			console.log("gridster size ",nc,nr,nc*50,nr*50);
			console.log("gridster size ",nc/3,nr/2);
			//default layout is
			var nctop = Math.round(nc/3);

			//respondCanvas();
			//stage.handleResize();
			//resizeToFitBrowserWindow(gridArray[current_grid], gridIds[current_grid],"BottomPane");// "tabs-"+(current_grid+1));
			console.log("gridster ready");
			width = 200;//nctop*50;
			height = 200;//nr*50;
			intialize();
			NGL_Setup();
	   		setupPFV();
			graph.nodes = centerAllNodePos(graph.nodes);
			stage.handleResize();
			//resizeToFitBrowserWindow(gridArray[current_grid], gridIds[current_grid],gridster.$widgets.eq(3));//"BottomPane");// "tabs-"+(current_grid+1));
		});
/*      // resize widgets on hover
    gridster.$el
            .on('mouseenter', 'li', function () {
                gridster.resize_widget($(this), 3, 3);
            })
            .on('mouseleave', 'li', function () {
                gridster.resize_widget($(this), 1, 1);
            });

});*/
}//);

//http://golden-layout.com/examples/#8a90e7c51e2b8ba6c964e840793d22de

if (window["CanvasRenderingContext2D"]) {
    /** @expose */
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2*r) r = w/2;
        if (h < 2*r) r = h/2;
        this.beginPath();
        if (r < 1) {
            this.rect(x, y, w, h);
        } else {
            if (window["opera"]) {
                this.moveTo(x+r, y);
                this.arcTo(x+r, y, x, y+r, r);
                this.lineTo(x, y+h-r);
                this.arcTo(x, y+h-r, x+r, y+h, r);
                this.lineTo(x+w-r, y+h);
                this.arcTo(x+w-r, y+h, x+w, y+h-r, r);
                this.lineTo(x+w, y+r);
                this.arcTo(x+w, y+r, x+w-r, y, r);
            } else {
                this.moveTo(x+r, y);
                this.arcTo(x+w, y, x+w, y+h, r);
                this.arcTo(x+w, y+h, x, y+h, r);
                this.arcTo(x, y+h, x, y, r);
                this.arcTo(x, y, x+w, y, r);
            }
        }
        this.closePath();
    };
    /** @expose */
    CanvasRenderingContext2D.prototype.fillRoundRect = function(x, y, w, h, r) {
        this.roundRect(x, y, w, h, r);
        this.fill();
    };
    /** @expose */
    CanvasRenderingContext2D.prototype.strokeRoundRect = function(x, y, w, h, r) {
        this.roundRect(x, y, w, h, r);
        this.stroke();
    };
}

// Trigger action when the contexmenu is about to be shown, only on canvas
$(document).bind("contextmenu", function (event) {
    if (!mousein) return;
    // Avoid the real one
    //check if over something
    console.log("context",node_over,line_over)
    if (!node_over && !line_over) return;
    event.preventDefault();
    node_over_to_use = node_over || line_over;
    console.log("use over ",node_over_to_use)
	var rgb = ("color" in node_over_to_use.data && node_over_to_use.data.color !== null) ? node_over_to_use.data.color: [1,0,0];
    if (rgb === null || !rgb) rgb = [1,0,0];
    node_over_to_use.data.color = rgb;
	var colorby = canvas_color.selectedOptions[0].value;
	if (node_over.parent !== null && !use_color_mapping && default_options.indexOf(colorby) == -1 && use_unique_array){
		var indice = unique_array.indexOf(node_over_to_use.data[colorby]);
		document.getElementById("node_color").value = property_mapping[colorby].colors[indice];
	}
	else {
		var hx = Util_rgbToHex(rgb[0]*255,rgb[1]*255,rgb[2]*255);
		document.getElementById("node_color").value = hx;
	}
	//var x = document.getElementById("node_color").value;
	//var x = document.getElementById("myColor").value;

    // Show contextmenu
    $(".custom-menu-node").finish().toggle(100).

    // In the right position (the mouse)
    css({
        top: event.pageY + "px",
        left: event.pageX + "px"
    });
});

// If the document is clicked somewhere
$(document).bind("mousedown", function (e) {
    // If the clicked element is not the menu
    if (!$(e.target).parents(".custom-menu-node").length > 0) {

        // Hide it
        $(".custom-menu-node").hide(100);
    }
});


/*
// If the menu element is clicked
$(".custom-menu li").click(function(){

    // This is the triggered action name
    switch($(this).attr("node-data-action")) {

        // A case for each action. Your actions here
        case "rename": console.log("rename"); break;
        case "delete": console.log("delete"); break;
    }
  	 console.log("over".node_over);
    // Hide it AFTER the action was triggered
    $(".custom-menu-node").hide(100);
  });

  */
