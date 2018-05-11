// d3,ngl,pfv,grid1,grid2,grid3,grid4
var all_intialized = [false, false, false, false, false, false, false];
var proteinFeatureView;
var featureView;// = new Object()
var ProtVista;
var protvista_instance;
var pdbcomponent_setup = false;
var angular_app = (app!==null)?app : null;

console.log("angular is defined ?",app);
//add interaction viewer : https://github.com/ebi-uniprot/interaction-viewer
//add spv https://github.com/Sinnefa/SPV_Signaling_Pathway_Visualizer_v1.0
//metacy: https://websvc.biocyc.org/META/foreignid?ids=Uniprot:P75392
//https://websvc.biocyc.org/META/foreignid?ids=Uniprot:P75392&fmt=json
//https://websvc.biocyc.org/getxml?id=META:MONOMER-584
//-><component-of><Protein resource="getxml?META:CPLX-2022" orgid="META" frameid="CPLX-2022"/></component-of>

//hover_div//style="position:absolute; width:100% !important; display:block;"
var canvasOption = '' +
  '<div class="canvas_head" >' //z-index:50
  +
  '<div><select id="canvas_label" name="canvas_label" onchange="ChangeCanvasLabel(this)" >' +
  '<option value="Select">Label for:</option>' +
  '	<option value="None" > None </option>' +
  '	<option value="label" > label </option>' +
  '<option value="pdb" > pdb </option>' +
  '<option value="uniprot" > uniprot </option>' +
  '<option value="name" selected> name </option>' +
  '</select>' +
  '<select id="canvas_color" name="canvas_color">' +
  '	<option value="Select">Color by:</option>' +
  '	<option value="pdb" selected> missing PDB </option>' +
  '	<option value="pcpalAxis" > missing PcpalAxis </option>' +
  '	<option value="offset" > missing Offset </option>' +
  '	<option value="count_molarity" > missing Copy number or molarity </option>' +
  '	<option value="Beads" > missing SphereTree </option>' +
  '	<option value="geom"> missing Geometry </option>' +
  '	<option value="confidence" > confidence </option>' +
  '	<option value="color" > color </option>' +
  '	<option value="viewed"> viewed </option>' +
  '	<option value="size"> size </option>' +
  '	<option value="count" > count </option>' +
  '	<option value="molarity" > molarity </option>' +
  '	 <option value="mw" > molecularweight </option>' +
  '</select>		' +
  '	<select id="canvas_map_r" name="canvas_map_r" onchange="mapRadiusToProperty(this)" >' +
  '	<option value="Select">Map radius to:</option>' +
  '	<option value="size" selected> size </option>' +
  '	<option value="count" > count </option>' +
  '	<option value="molarity" > molarity </option>' +
  '	 <option value="mw" > molecularweight </option>' +
  '	</select></div>' +
  '<button id="addingr" class="hidden" onclick="addIngredient()">Add ingredient</button>' +
  '<button id="addcomp" class="hidden" onclick="addCompartment()">Add compartment</button>' +
  '<button id="addlink" class="hidden" onclick="addLink()">Add interaction</button>'+
  '<div>'+
  '<input type="checkbox" id="unchecked" onclick="switchMode(this)" class="cbx hidden" />' +
  '<label for="unchecked" class="lbl"></label>' +
  '<label for="lbl" style="width:70px; float:right; margin-top:10px;">Edit Mode</label>' +
  //	+'<div class="row demo">'
  '</div>'+
  '</div>'

//

var ngloptions = '' +
  //'<div class="hover_div" style="position:absolute; width:100% !important; display:block;z-index:1">  ' +
  '<div class="NGLpan">'+
  //accordion_panel
  '<div class="NGLOptions">'+
  '<button class="accordion">NGL options</button>'+
  '<div class="accordion_panel">'+
//
  ' <div class="clusterBtn">' +
  '<button onclick="CenterNGL()" style="">Center Camera</button>' +
  '<button onclick="PreviousIgredient()" style="">Previous Ingredient</button>' +
  '<button onclick="NextIgredient()" style="">Next Ingredient</button>' +
  '</div>' +
  '	<label id="ProteinId">protein name</label>' +
  ' <label id="pdb_id">pdb id</label>' +
  ' <div> <label for="rep_type">Selection</label><input type="text" id="sel_str"  style="width:55%" placeholder="Selection" onchange="ChangeSelection(this)"/></div>' +
  ' <label id="ngl_status"></label>' +
   '<div> <label for="rep_type">Representation'+
  ' </label>' +
  ' <select id="rep_type" name="rep_type" style="width:55%" onchange="ChangeRepresentation(this)"  >' +
  ' <option value="representation"> Representation: </option>' +
  ' <option value="cartoon" selected> cartoon </option>' +
  ' <option value="spacefill"> spacefill </option>' +
  ' <option value="licorice" > licorice </option>' +
  ' <option value="surface"> surface </option>' +
  //+'  <option value="beads" disabled > beads </option>'
  ' </select></div>' +

  '<div> <label for="ass_type">Assambly</label>' +
  '  <select id="ass_type" name="ass_type" style="width:55%" onchange="ChangeBiologicalAssambly(this)" >' +
  '  <option value="Assambly"> Assambly: </option>' +
  '  <option value="AU" selected> AU </option>' +
  ' </select></div>' +
  ' <div><label for="mod_type">Model</label>' +
  '  <select id="mod_type" name="mod_type" style="width:55%" onchange="ChangeModel(this)" >' +
  '  <option value="showmodel" selected> Show model: </option>' +
  ' </select></div>' +
  ' <div><label for="color_type">Color</label>' +
  '  <select id="color_type" name="color_type" style="width:55%" onchange="ChangeColorScheme(this)" >' +
  '  <option value="Colorby"> Color by: </option>' +
  ' </select></div>'
  //+' <label for="sym_elem">Symmetry :</label>'
  //	+'  <select id="sym_elem" name="sym_elem" onchange="ChangeSymmetr(this)">'
  //	+'  <option value="All" selected> All </option>'
  //	+' </select>'
  +
  ' <div> <label for="label_elem">Label</label>' +
  ' 	<select id="label_elem" name="label_elem" style="width:55%" onchange="ChangeNGLlabel(this)" >' +
  '   <option value="showlabel" selected> Show labels for: </option>' +
  '		<option value="None"> None </option>' +
  '		<option value="Chain" > Chain </option>' +
  '	</select></div>' +
  ' <div> <input type="checkbox"  id="showgeom" onclick="NGL_showGeomNode(this)" checked>' +
  ' <label for="showgeom"> Show Geometry used </label> '+
  ' <button onclick="buildCMS()">Rebuild Geometry</button>'+getSpinner("stopbuildgeom","stopGeom()")+
  '</div>' +
  ' <div><label for="beads_elem">Show Beads</label>' +
  ' <select id="beads_elem" name="beads_elem" style="width:55%" onchange="showBeadsLevel(this)" >' +
  ' <option value="showbeads" selected> Show beads for lvl </option>' +
  '  <option value="All" > All </option>' +
  '  <option value="0" > 0 </option>' +
  '  <option value="1" > 1 </option>' +
  '  <option value="2" > 2 </option>' +
  '  <option value="None" > None </option>' +
  ' </select></div>' +
  //' <div class="clusterBtn">' +
  //' <select id="cluster_elem" name="cluster_elem" onchange="changeClusterMethod(this)" style="width:100%;height:40px">' +
  //'  <option value="Kmeans" selected>Kmeans </option>' +
  //'  <option value="Optics" disabled> Optics</option>' +
  //'  <option value="DBSCAN" disabled> DBSCAN </option>' +
  //' </select>' +
 ' <div> <label> number of cluster</label>' +
  ' <input id="slidercl_params1" style="width:70%;display:inline" type="range" min="1" max="100"" step="1" value="10" /> ' +
  ' <label id="cl_params1" for="slidercl_params1">10</label>' +  getSpinner("stopkmeans","stopKmeans()")+
  '</div>'+
  //'<label> param 2</label>' +
  //' <input id="slidercl_params2" style="width:100px" type="range" min="1" max="100"" step="1" value="10" /> ' +
  //' <label id="cl_params2" for="slidercl_params2" style="width:30px">10</label>' +
  ' <label id="nbBeads">0 beads</label>' +
  //'</div>' +

  //'<label> Selection</label>' +

  ' <div id="query_search">' +
  ' <label id="heading"></label>' +
  ' </div> ' +

  '<div class="hidden" id="surface">' +
  '<div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpX" type="range" min="-100" max="100" step="1" style="width:70%" />' +
  '<input class="inputNumber" id="num1" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
  '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpY" type="range" min="-100" max="100" step="1" style="width:70%" />' +
  '<input class="inputNumber" id="num2" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
  '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpZ" type="range" min="-100" max="100" step="1" style="width:70%"/>' +
  '<input class="inputNumber" id="num3" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
  '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetX" type="range" min="-150" max="150" step="10" style="width:70%" />' +
  '<input class="inputNumber" id="num4" min="-150" max="150" type="number" value="0" style="width:30%"/>' +
  '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetY" type="range" min="-150" max="150" step="10" style="width:70%"/>' +
  '<input class="inputNumber" id="num5" min="-150" max="150" type="number" value="0" style="width:30%"/>' +
  '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetZ" type="range" min="-150" max="150" step="10" style="width:70%"/>' +
  '<input class="inputNumber" id="num6" min="-150" max="150" type="number" value="0" style="width:30%"/>' +
  '</div>' +
  '<button onclick="applyPcp()">Apply To Ingredient</button>' +
  '</div>' +
  ' <label id="pdb_title">pdb TITLE</label>' +
   '</div>' +
   '<button class="accordion">object properties</button>'+
   '<div class="accordion_panel" id="objectOptions">'+
   //either compartment or ingredient
   '</div>' +
  '</div>' +
  '<div class="NGL" id="NGL"><div id="viewport" style="width:100%; height:100%;"></div></div>'+
  '</div>' +
  '</div>'

function getSpinner(spinner_id,callback_close)
{
  return ''+
  '<label id="'+spinner_id+'_lbl" class="hidden"></label>' +
  '<div class="spinner hidden" id="'+spinner_id+'" style="width:200px;height:20px;" >' +
  '	  <div class="rect1"></div>' +
  '	  <div class="rect2"></div>' +
  '	  <div class="rect3"></div>' +
  '	  <div class="rect4"></div>' +
  '	  <div class="rect5"></div>' +
  '    <button onclick="'+callback_close+'">Stop</button>' +
  '	</div>'
}

var gridoptions = ''
  //+'<div class="hover_div" style="position:absolute; width:25px !important; display:block;z-index:9999">   '
  +
  '					<button onclick="undo()">UnDo</button>' +
  '					<button onclick="addRow()">AddRow</button>' +
  '					<button onclick="removeRow()">RemoveRow</button>' +
  '					<button onclick="gridArray[current_grid].dataView.setGrouping([])">Clear grouping</button>' +
  '					<button onclick="groupByCompartmentSurface()">Group by compartment then surface</button>' +
  '					<label for="column_type">Group By :</label>' +
  '					<select id="column_type" name="column_type" onchange="groupByElem(this)">' +
  '						<option value="All" selected> All </option>' +
  '					</select>' +
  '<div style="display:flex"><input type="text"" style="width:100%;" placeholder="Uniprot_Query" id="Query_3" onchange="refineQuery(this)"/>' +//class="input-medium form-control"
  '<button style="width:20%;" id="QueryBtn_3" onclick="refineQuery(this)">search</button></div>'+
  '<div style="display:flex"><input type="text""  style="width:100%;" placeholder="PDB_Query" id="Query_4" onchange="refineQuery(this)"/>' +
  '<button style="width:20%;" id="QueryBtn_4" onclick="refineQuery(this)">search</button></div>'+
  '<label for="sequence_search"> Use Sequence Blast PDB Search </label><input type="checkbox" name="sequence_search" id="sequence_search">' +
  '</div>'+
  '<label id="LoaderTxt" class="hidden" for="aloader"></label>' +
  '<div class="spinner hidden" id="spinner" style="width:200px;height:20px;" >' +
  '	  <div class="rect1"></div>' +
  '	  <div class="rect2"></div>' +
  '	  <div class="rect3"></div>' +
  '	  <div class="rect4"></div>' +
  '	  <div class="rect5"></div>' +
  '   <button onclick="stopAll()">Stop query search</button>' +
  '	</div>'+
  ' <img wicth="250" height="250" class="hidden" id="imagepdbclone" src=""/>'+
  ' <button style="display:block;" onclick="BuildAll()">AutoFix Recipe (geometry, beads, ...) </button>' + getSpinner("stopbeads","stopBeads()")
  //'	<button style="display:block;" onclick="BuildAllGeoms()">Build missing Geoms</button>' + getSpinner("stopgeoms","stopGeoms()")


//	+'</div>'

var pfvoptions = '' +
  '		<div class="PFV container-fluid" id="PFV">' +
  '		 <div class="NGLOptions" role="toolbar" style="padding-bottom: 3px;">' +
  '	        <div class="col-md-2 input-group pull-left">' +
  '	            <input type="text" style="width:200px" class="input-medium form-control" placeholder="UniProt ID" name="up-field" id="up-field">' +
  '			        <div class="input-group-btn">' +
  '			          <button class="btn btn-group" style="height:34px;" type="submit"><i class="fa fa-search"></i></button>' +
  '			        </div>' +
  '					</div>' +
  '	     </div>  <!-- toolbar //-->' +
  '		  <div class="modal fade" tabindex="-1" role="dialog" id="mySequenceMotifDialog" aria-labelledby="mySequenceMotifDialog" aria-hidden="true">' +
  '		    <div class="modal-dialog">' +
  '		      <div class="modal-content">' +
  '		        <div class="modal-header">' +
  '		          <button type="button" class="close" data-dismiss="modal">' +
  '		            <span aria-hidden="true"></span>' +
  '		            <span class="sr-only">Close</span>' +
  '		          </button>' +
  '		          <h4 class="modal-title">Find Sequence Motif' +
  '		            <a href="/pdb/staticHelp.do?p=help/advancedsearch/sequenceMotif.html">' +
  '		              <span class="iconSet-main icon-help" title="Help | Motif Search">&nbsp;</span>' +
  '		            </a>' +
  '		          </h4>' +
  '		        </div>' +
  '		        <div class="modal-body">' +
  '		          <form id="findSequenceMotif" class="form-horizontal">' +
  '		            <div class="input-group">' +
  '		              <input class="form-control" id="enterMotif" type="text" placeholder="Enter sequence motif (example: GX[DN]FXKXDE )" />' +
  '		              <span class="input-group-btn">' +
  '		                <button class="btn btn-default" type="button" id="findMotifDialogSubmit">Find</button>' +
  '		              </span>' +
  '		            </div>' +
  '		          </form>' +
  '		        </div>' +
  '		      </div>' +
  '		    </div>' +
  '		  </div>' +
  '		  <div class="panel panel-default">' +
  '		    <div class="panel-body">' +
  '		      <div class="row-fluid">' +
  '		        <div class="span12">' +
  '		          <div id="pfv-parent"></div>' +
  '		        </div>' +
  '		      </div>' +
  '		    </div>' +
  '		  </div>   	' +
  '	  </div> 			'

function get_comp_definition_d3() {
  return {
    id: 0,
    type: 'component',
    title: 'Recipe View',
    tooltip: 'Overiew of the current recipe',
    isClosable: false,
    componentName: 'd3canvas',
    componentState: {
      label: 'A'
    }
  };
}

function get_comp_defintion_ngl() {
  return {
    id: 1,
    type: 'component',
    title: 'NGL View',
    tooltip: 'Structure View',
    isClosable: false,
    componentName: 'ngl',
    componentState: {
      label: 'B'
    }
  };
}

function get_comp_defintion_pfv() {
  return {
    id: 2,
    type: 'component',
    title: 'Protein Feature View',
    isClosable: false,
    tooltip: 'Protein Feature View',
    componentName: 'pfv',
    componentState: {
      label: 'C'
    }
  };
}

var comp_titles = {
  'PDB search table': 3,
  'Uniprot search table': 2,
  'Interaction table': 1,
  'Recipe table': 0
};
var tooltips = ['Overiew of the current recipe', "Interaction/Constraints defined", "Uniprot search result", "PDB search results"];

function get_comp_defintion_grid(gname, gid) {
  return {
    id: 3,
    type: 'component',
    title: gname,
    isClosable: false,
    tooltip: tooltips[gid],
    componentName: 'slickgrid',
    componentState: {
      id: gridIds[gid],
      ind: gid + 1
    }
  };
}

function get_comp_defintion_options_grid() {
  return {
    type: 'component',
    title: 'Table Options',
    isClosable: false,
    tooltip: 'Options for selected grid',
    componentName: 'slickgridoptions',
    componentState: {
      id: "",
      ind: 1
    }
  };
}

function get_new_single_component(atitle, atooltip,acname,states){
	return {
		type: 'component',
		title: atitle,
		isClosable: false,
		tooltip: atooltip,
		componentName: acname,
		componentState: states
	};
}

function get_PDB_component(atitle, atooltip,acname,states){
	return {
		type: 'component',
		title: atitle,
		isClosable: false,
		tooltip: atooltip,
		componentName: 'pdb_component',
		componentState: states
	};
}


//topology_viewer
var config = {
  settings: {
    showPopoutIcon: false,
    //      selectionEnabled: true
  },
  content: [{
    type: 'column',
    content: [{
        type: 'row',
        content: [get_comp_definition_d3(),
          				get_comp_defintion_ngl(),
									{
										type:'stack',
										content:[
											//get_comp_defintion_pfv(),
                      get_new_single_component("Sequence features","show sequence features","seq_feature_viewer",{"entry":"","entity":"1","type":"pdb-seq-viewer"}),
                      get_new_single_component("protvista","show protvista","protvista",{"entry":"","entity":"1"}),
											get_new_single_component("Topology","show topology 2d","topology_viewer",{"entry":"","entity":"1","type":"pdb-topology-viewer"}),
										  get_new_single_component("Uniprot mapping","show uniprot coverage","uniprot_viewer",{"entry":"","entity":"1","type":"pdb-uniprot-viewer"})
									    ]
									}
        ]
      },
      {
        type: 'row',
        content: [
          get_comp_defintion_options_grid(),
          {
            type: 'stack',
            content: [
              get_comp_defintion_grid('Recipe table', 0),
              get_comp_defintion_grid('Interaction table', 1),
              get_comp_defintion_grid('Uniprot search table', 2),
              get_comp_defintion_grid('PDB search table', 3)
            ]
          }
        ]
      }
    ]
  }]
};

var alt_layout = [];

var myLayout,
  savedState = localStorage.getItem('savedState');

var usesavedState = true;
var usesavedSession = true;
var savedRecipe = localStorage.getItem('savedRecipe');
var current_version = {"version":1.006};
var session_version = localStorage.getItem('session_version');

sessionStorage.clear()


//console.log(config);
//console.log(savedState);
//console.log(savedRecipe);
console.log("site version ",current_version);
console.log("stored version ",session_version);

if (savedState !== null && usesavedState && session_version) {
  //myLayout = new GoldenLayout( JSON.parse( savedState ) );
  var p = JSON.parse(savedState);
  var v = JSON.parse(session_version);
  console.log("version is ", v.version);
  console.log(JSON.stringify(p.content));
  if (v.version === current_version.version) {
    try {
      myLayout = new window.GoldenLayout(p, $('#layoutContainer'));
    } catch (error) {
      console.error(error);
      myLayout = new window.GoldenLayout(config, $('#layoutContainer'));
    }
  }
  else {
    //myLayout = new GoldenLayout( config );
    myLayout = new window.GoldenLayout(config, $('#layoutContainer'));
    localStorage.setItem('session_version', JSON.stringify(current_version));
    savedRecipe = null;
  }
} else {
  //myLayout = new GoldenLayout( config );
  myLayout = new window.GoldenLayout(config, $('#layoutContainer'));
  localStorage.setItem('session_version', JSON.stringify(current_version));
}
//console.log(myLayout);

function toggleLayout(layoutId) {
  //loop over current layout and change it ?
  /*
    var oldElement = myLayout.root.contentItems[ 0 ],
        newElement = myLayout.createContentItem({
            type: oldElement.isRow ? 'column' : 'row',
            content: []
        }),
        i;

    //Prevent it from re-initialising any child items
    newElement.isInitialised = true;

    for( i = 0; i < oldElement.contentItems.length; i++ ) {
        newElement.addChild( oldElement.contentItems[ i ] );
    }

    myLayout.root.replaceChild( oldElement, newElement );
    */
};


$(window).resize(function() {
  myLayout.updateSize();

})

myLayout.on('stateChanged', function() {
  var state;
  try {
    state = JSON.stringify(myLayout.toConfig());
  } catch (error) {
    console.error(error);
    state = JSON.stringify(config);
  }
  localStorage.setItem('savedState', state);
  var jdata = serializedRecipe(graph.nodes, graph.links);
  //var jdata = getCurrentNodesAsCP_JSON(graph.nodes, graph.links); //Links?
  localStorage.setItem('savedRecipe', JSON.stringify(jdata));
});

function saveCurrentState() {
  var jdata = serializedRecipe(graph.nodes, graph.links);
  //var jdata = getCurrentNodesAsCP_JSON(graph.nodes, graph.links); //Links?
  localStorage.setItem('savedRecipe', JSON.stringify(jdata));
}

var d3canvasComponent = function(container, state) {
  this._container = container;
  this._state = state;
  //var optionsDropdown = $( $( 'CanvasOptionTemplate' ).html() );
  //this._container.on( 'tab', function( tab ){
  //      tab.element.append( optionsDropdown );
  //  });

  this._container.on('open', this._Setup, this);
};

d3canvasComponent.prototype._Setup = function() {
  this._canvas = document.createElement('canvas');
  this._canvas.setAttribute("id", "d3canvas");
  this._canvas.style.border = "1px solid black";
  this._canvas.transform = d3.zoomIdentity;
  var optionsDropdown = $(canvasOption);
  this._container.getElement().append(optionsDropdown);
  this._container.getElement().append(this._canvas); // '<canvas width="100%" height="100%" style="border:1px solid black;"></canvas>');
  this._container.on('resize', this._Resize, this);
  this._Resize();
  console.log(this._canvas);
  setupD3(this._canvas);
  all_intialized[0] = true;
}

d3canvasComponent.prototype._Resize = function() {
  console.log("resize Canvas?!!?");
  console.log(this._canvas);
  if (!this._canvas) return;
  this._canvas.width = this._canvas.parentNode.clientWidth; //max width
  this._canvas.height = this._canvas.parentNode.clientHeight; //max height
  //change the scale and transform
  //this._canvas.transform.x = this._canvas.width /2;
  // this._canvas.transform.y = this._canvas.height /2;
  //this._canvas.transform.k = this._canvas.width /  200;
  //console.log(this._canvas.transform);
  //change the scale according ?
  //transform.k
};

var nglComponent = function(container, state) {
  this._container = container;
  this._state = state;
  this._stage;
  //var optionsDropdown = $( $( 'CanvasOptionTemplate' ).html() );
  //this._container.on( 'tab', function( tab ){
  //      tab.element.append( optionsDropdown );
  //  });

  this._container.on('open', this._Setup, this);
};

nglComponent.prototype._Setup = function() {
  //this._container.getElement().html( '<div class="NGL" id="NGL"><div id="viewport" style="width:100%; height:100%;"></div></div>');
  //var ngl = $('<div class="NGL" id="NGL"><div id="viewport" style="width:100%; height:100%;"></div></div>');
  var optionsDropdown = $(ngloptions); //$( 'NGLOptionTemplate' ).html() );
  this._container.getElement().append(optionsDropdown);
  //this._container.getElement().append(ngl);
  this._stage = setupNGL();
  this._container.on('resize', this._Resize, this);
  this._Resize();
  all_intialized[1] = true;
}

nglComponent.prototype._Resize = function() {
  this._stage.handleResize();
};


var pfvComponent = function(container, state) {
  this._container = container;
  this._state = state; //gridname and id
  this._pfv = null;
  this._container.on('open', this._Setup, this);
  //this._container.on( 'open', this._createGrid, this );

};


pfvComponent.prototype._Setup = function() {
  var optionsDropdown = $(pfvoptions); //$( 'NGLOptionTemplate' ).html() );
  this._container.getElement().append(optionsDropdown);
  //this._container.getElement().append(ngl);
  setupPFV();
  this._container.on('resize', this._Resize, this);
  this._Resize();
  all_intialized[2] = true;
}

pfvComponent.prototype._Resize = function() {
  console.log("resize PFV"); //this._stage.handleResize();
};


var slickgridComponent = function(container, state) {
  this._container = container;
  this._state = state; //gridname and id
  this._grid = null;
  this._data;
  this._columns = [];
  this._options = CreateOptions();
  //setupSlickGrid()
  this._container.on('open', this._scheduleGridCreation, this);
  //this._container.on( 'open', this._createGrid, this );

};

slickgridComponent.prototype._setupTab = function() {
  //console.log("tab??",this._container.tab.element[0]);//theactual li tab
  var component = this;
  this._container.tab.element[0].onclick = function(e) {
    console.log(this.title, comp_titles[this.title]);
    changeCurrentGrid(comp_titles[this.title]);
  };
  //console.log(this._container.getElement()[0]);
  this._container.getElement()[0].onmouseenter = function(e) {
    //console.log("container element mouse over", this);
    //console.log(component);
    //console.log(component._state.id,component._state.ind,current_grid);//undefined ?
    if (current_grid != component._state.ind - 1) changeCurrentGrid(component._state.ind - 1);
  };
  //this._container.tab.addEventListener("click", function() {
  //				console.log("testest2");
  //				changeCurrentGrid(this._state.ind-1)
  //				});
}

slickgridComponent.prototype._scheduleGridCreation = function() {
  var interval = setInterval(function() {
    var stylesheetNodes = $('link[rel=stylesheet]'),
      i;

    for (i = 0; i < stylesheetNodes.length; i++) {
      if (stylesheetNodes[i].sheet === null) {
        return;
      }
    }

    clearInterval(interval);
    this._createGrid();
  }.bind(this), 10);
  //option and pager ?
};

slickgridComponent.prototype._createGrid = function() {
  var cdata = [];
  var ccolumn = [];
  if (this._state.ind === 1) {
    if (graph) cdata = CreateDataColumnFromD3Nodes(graph);
    ccolumn = CreateNodeColumns();
  }
  //var optionsDropdown = $( gridoptions);//$( 'slickOptionTemplate' ).html() );
  //this._container.getElement().append(optionsDropdown);
  //setupSlickGrid();

  this._grid = CreateGrid(this._container.getElement(), this._container.getElement().parentNode, cdata, ccolumn, options, this._state.ind - 1);
  this._container.on('resize', this._resize, this);
  this._container.on('destroy', this._destroy, this);
  this._container.on('tab', this._setupTab, this);
  this._setupTab();
  //this._resize();
  all_intialized[this._state.ind + 2] = true;
};

slickgridComponent.prototype._resize = function() {
  console.log("resize grid ?");
  //console.log(this._grid);
  if (!this._grid) return
  this._grid.resizeCanvas();
  this._grid.autosizeColumns();
};

slickgridComponent.prototype._destroy = function() {
  this._grid.destroy();
};


var pdb_component = function(container, state) {
  this._container = container;
  this._state = state; //gridname and id
  this._type = null;
  //setupSlickGrid()
  this._container.on('open', this._scheduleCreation, this);
  //this._container.on( 'open', this._createGrid, this );
};

pdb_component.prototype._setupTab = function() {
  //console.log("tab??",this._container.tab.element[0]);//theactual li tab
  var component = this;
  'use strict';
   angular.bootstrap(this._container.getElement(), ['pdb.component.library']);
}

pdb_component.prototype._scheduleCreation = function() {
  var interval = setInterval(function() {
    clearInterval(interval);
    this._setup();
  }.bind(this), 10);
  //option and pager ?
};

pdb_component.prototype._setup = function() {
  this._container.getElement().html('<div class="topov"><'+this._state.type+' entry-id="'+this._state.entry+'" entity-id="1" height="100%" width="100%"></'+this._state.type+'></div>');
  this._container.getElement().append(optionsDropdown);
  this._container.on('tab', this._setupTab, this);
  this._setupTab();
};

pdb_component.prototype._resize = function() {
  console.log("resize ",this._type);
};

myLayout.registerComponent('d3canvas', d3canvasComponent);

myLayout.registerComponent('ngl', nglComponent);

myLayout.registerComponent('pfv', pfvComponent);

myLayout.registerComponent('slickgrid', slickgridComponent);

//myLayout.registerComponent( 'slickgrid', function( container, state ){});
myLayout.registerComponent('slickgridoptions', function(container, state) {
  container.getElement().html(gridoptions);
  setupSlickGrid();
})

//topologyViewerWrapper
myLayout.registerComponent('topology_viewer', function(container, state) {
  var ahtml='<div id="topov_p" class="topov_p"  height="100%" width="100%" style="overflow: scroll;"></div>';
  //ahtml+='<div hidden>';
  //ahtml+='<pre style="clear:both">';
  //ahtml+='<code id="pdbeComp_topov" class="pdbeComp" display-in="topov" contenteditable="true">';
  //ahtml+='&lt;pdb-topology-viewer entry-id="1aqd" entity-id="1" height="370"&gt;&lt;/pdb-topology-viewer&gt;';
  //ahtml+='</code></pre></div>';
  container.getElement().html(ahtml);
})

myLayout.registerComponent('seq_feature_viewer', function(container, state) {
  var ahtml='<div id="seqv_p" class="seqv_p"  height="100%" width="100%" style="overflow: scroll;"></div>';
  //ahtml+='<div hidden>';
  //ahtml+='<pre style="clear:both">';
  //ahtml+='<code id="pdbeComp_seqv" class="pdbeComp" display-in="seqv" contenteditable="true">';
  //ahtml+='&lt;pdb-seq-viewer entry-id="1aqd" entity-id="1" height="370"&gt;&lt;/pdb-seq-viewer&gt;';
  //ahtml+='</code></pre></div>';
  container.getElement().html(ahtml);
})

myLayout.registerComponent('uniprot_viewer', function(container, state) {
  var ahtml='<div id="puv_p" class="puv_p"  height="100%" width="100%" style="overflow: scroll;"></div>';
  //ahtml+='<div hidden>';
  //ahtml+='<pre style="clear:both">';
  //ahtml+='<code id="pdbeComp_puv" class="pdbeComp" display-in="puv" contenteditable="true">';
  //ahtml+='&lt;pdb-uniprot-viewer entry-id="P07550" entity-id="1" height="370"&gt;&lt;/pdb-uniprot-viewer&gt;';
  //ahtml+='</code></pre></div>';
  container.getElement().html(ahtml);
})

myLayout.registerComponent('protvista', function(container, state) {
  container.getElement().html('<div id="protvista" class="protvista" style="height:100%;width=100%"></div>');
})
//myLayout.createDragSource( element, newItemConfig );
//uniprot_viewer
var persistentComponent = function(container, state) {

  //Check for localStorage
  if (!typeof window.localStorage) {
    container.getElement().append('<h2 class="err">Your browser doesn\'t support localStorage.</h2>');
    return;
  }

  // Create the input
  var input = $('<input type="text" />');

  // Set the initial / saved state
  if (state.label) {
    input.val(state.label);
  }

  // Store state updates
  input.on('change', function() {
    container.setState({
      label: input.val()
    });
  });

  // Append it to the DOM
  container.getElement().append('<h2>I\'ll be saved to localStorage</h2>', input);
};

var setuped = false;
var evaluate_interval;
myLayout.init();

$(document).ready(function() {
  //nothing is ready here
  console.log("document ready !");
  console.log(graph);
  //wait for initialisation then
  var interval = setInterval(function() {
    var stylesheetNodes = $('link[rel=stylesheet]'),
      i;

    if (myLayout.isInitialised && !setuped) {
      console.log("initialized")
      //console.log(JSON.parse( savedRecipe ));
      console.log(all_intialized);
			//is the pdb library loaded ?
      if (false in all_intialized) return;
      else setuped = true;
    }
    clearInterval(interval);
    if (savedRecipe !== null && usesavedState) LoadSaveState(JSON.parse(savedRecipe));
    else LoadExampleMpn();
    evaluate_interval = setInterval(EvaluateCurrentReadyState,10000);
    //setupPDBLib();
		//'use strict';angular.bootstrap(document, ['pdb.component.library']);
  }.bind(this), 20);
});
/*
var topo = document.getElementsByClassName("topologyViewerWrapper");
var seqs = document.getElementsByClassName("seqViewerWrapper");
console.log("lib");
console.log(topo,seqs);
///
var overlay1 = document.querySelectorAll('[ng-style="topoViewerOverlay"]');
console.log(overlay1);
if (overlay1)  overlay1 =overlay1[0].className ;
var overlay2 = document.querySelectorAll('[ng-style="seqViewerOverlay"]');
console.log(overlay2);
if (overlay2)  overlay2 =overlay2[0].className ;

if (overlay1 === "ng-hide" && overlay2 === "ng-hide")
		{
			setuped = true;
			console.log("setup is true!");
		}
else return;
*/


function on(flag) {
  document.getElementById("overlay").style.display = "block";
  document.getElementById("overlay_text").innerHTML = '<iframe src="' + flag + '.html" width="100%" height="100%"></iframe>';
}

function off() {
  document.getElementById("overlay").style.display = "none";
} //overlay_text

function setupPDBLib(){
  var topo = document.getElementById("topov");
  var topop = document.getElementById("topov_p");
  topo.parent = topop;
  topop.appendChild(topo);

  var seqv = document.getElementById("seqv");
  var seqvp = document.getElementById("seqv_p");
  seqv.parent = seqvp;
  seqvp.appendChild(seqv);

  var puv = document.getElementById("puv");
  var puvp = document.getElementById("puv_p");
  puv.parent = puvp;
  puvp.appendChild(puv);

  pdbcomponent_setup = true;
  return;
  angular_app.directive('pdbeComp',function($compile){
    return {
      restrict: 'C',
      link: function(scope, element, attrs){

        var compMainDiv = document.getElementById(attrs.displayIn);
        var template = element.text();
        var compContent =  $compile(template)(scope);

        angular.element(compMainDiv).prepend(compContent);

        element.bind('DOMSubtreeModified', function() {
          console.log("DOMSubtreeModified");
          template = element.text();
          compContent =  $compile(template)(scope);
          angular.element(compMainDiv).html('');
          angular.element(compMainDiv).prepend(compContent);
          scope.flag = 1;
        });
      }
    }
  });
  console.log(angular_app);
}


function UpdatePDBcomponent(entry)
{
  if (!pdbcomponent_setup) setupPDBLib();
  if (entry.length !== 4 ) {
    var asplit = entry.split("_");
    console.log(asplit);
    if (asplit[0].length === 4 ) entry = asplit[0];
    else return;
  }
  console.log("UpdatePDBcomponent with "+entry);
  var topo = document.getElementById("pdbeComp_topov");//document.getElementsByTagName("pdb-topology-viewer")[0];
  topo.innerHTML = '&lt;pdb-topology-viewer entry-id="'+entry+'" entity-id="1" height="370"&gt;&lt;/pdb-topology-viewer&gt;';
  var seqv = document.getElementById("pdbeComp_seqv");//document.getElementsByTagName("pdb-topology-viewer")[0];
  seqv.innerHTML = "";
  seqv.innerHTML = '&lt;pdb-seq-viewer entry-id="'+entry+'" entity-id="1" height="370"&gt;&lt;/pdb-seq-viewer&gt;';
  console.log("update ?",entry,seqv.innerHTML );
  //use ngl to get all entity ?
}

function UpdateUniPDBcomponent(entry){
  if (!pdbcomponent_setup) setupPDBLib();
  var puv = document.getElementById("pdbeComp_puv");//document.getElementsByTagName("pdb-topology-viewer")[0];
  puv.innerHTML = "";
  puv.innerHTML = '&lt;pdb-uniprot-viewer entry-id="'+entry+'" entity-id="1" height="370"&gt;&lt;/pdb-uniprot-viewer&gt;';
}

/*
(function () {
'use strict';
angular.element(document).ready(function () {
angular.bootstrap(document, ['pdb.component.library']);
});
}());
*/
