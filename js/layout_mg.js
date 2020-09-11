// d3,ngl,pfv,grid1,grid2,grid3,grid4
var all_intialized = [false, false, false, false, false, false, false];
var proteinFeatureView;
var featureView;// = new Object()
var ProtVista;
var protvista_instance;
var pdbcomponent_setup = false;
var angular_app = (app !== null) ? app : null;

var seq_feature_viewer_lbl;
var uniprot_viewer_tab_lbl;
var topology_viewer_lbl;
var protvista_tab_lbl;

var grid_tab_label = [];

console.log("angular is defined ?", app);
//add interaction viewer : https://github.com/ebi-uniprot/interaction-viewer
//add spv https://github.com/Sinnefa/SPV_Signaling_Pathway_Visualizer_v1.0
//metacy: https://websvc.biocyc.org/META/foreignid?ids=Uniprot:P75392
//https://websvc.biocyc.org/META/foreignid?ids=Uniprot:P75392&fmt=json
//https://websvc.biocyc.org/getxml?id=META:MONOMER-584
//-><component-of><Protein resource="getxml?META:CPLX-2022" orgid="META" frameid="CPLX-2022"/></component-of>

function getSplitter()
{
  return '<div class="splitter"></div>';
}

//exampel : rep_type,option_elem,representation,NGL_ChangeRepresentation(this),
//specify selected default option
function getSelect(select_id, div_class, label, onchange_cb, list_options, default_options) {
  var astr=''+
  '<div class="'+div_class+'">'+
    '<label for="'+select_id+'">'+label+'</label>' +
    '<select id="'+select_id+'" name="'+select_id+'" onchange="'+onchange_cb+'"  >';
  for (var i=0;i<list_options.length;i++)
  {
    var selected = (default_options === list_options[i])? ' selected':'';
    astr+=' <option value="'+list_options[i]+'"'+selected+'> '+list_options[i]+'</option>';
  }
  astr+='</select></div>';
  return astr;
}

function layout_getInputButton(select_id, div_class, label, onchange_cb, list_options, default_options){}
function layout_getInputCheckbox(select_id, div_class, label, onchange_cb, list_options, default_options){}
function layout_getInputSlider(select_id, div_class, label, onchange_cb, list_options, default_options){}
function layout_getInputString(select_id, div_class, label, onchange_cb, list_options, default_options){}

function layout_getInputNode(value,key,spec){
    var aHtml = "";
    var atype=spec.type;
    aHtml = '<label for="input_'+key+'">'+key+'</label>';
    switch(atype) {
      case "string":
          aHtml+='<input type="text" id="input_'+key+'" value="'+value+'" style="" onchange="'+spec.callback+'(this)"/>'
          break;
      case "number"://use a slider ?
          var step = ("step" in spec)? spec.step:1;//or any
          aHtml+='<input type="number" id="input_'+key+'" value="'+value+'" step="'+step+'" style="" onchange="'+spec.callback+'(this)"/>'
          break;
      case "range"://use a slider ?
          var step = ("step" in spec)? spec.step:1;
          //aHtml+='<input type="text" id="input_'+key+'" value="'+anode.data[key]+'" style="" onchange="'+spec.callback+'(this)"/>'
          aHtml+='<input type="range" id="input_'+key+'" value="'+value+'"  step="'+step+'" min="'+spec.min+'" max="'+spec.max+'" style="" oninput="output_'+key+'.value=parseFloat(this.value)" onchange="'+spec.callback+'(this)"/>'
          aHtml+='<output for="input_'+key+'" id="output_'+key+'">'+value+'</output>'
          break;
      case "object":
          aHtml+='<input type="text" id="input_'+key+'" value="'+value+'" style="" onchange="'+spec.callback+'(this)"/>'
          break;
      case "bool":
        //should use a checkbox
          aHtml+='<input type="checkbox" id="input_'+key+'" checked="'+value+'" style="" onchange="'+spec.callback+'(this)"/>'
          break;
      case "button":
          aHtml+='<input type="text" id="input_'+key+'" value="'+value+'" style="" onchange="'+spec.callback+'(this)"/>'
          break;
      case "color":
          aHtml+='<input type="text" id="input_'+key+'" value="'+value+'" style="" onchange="'+spec.callback+'(this)"/>'
          break;
      case "select":
          aHtml+='<select id="input_'+key+'" name="input_'+key+'" onchange="'+spec.callback+'(this)">';
          for (var i=0;i<spec.options.length;i++)
          {
            var selected = (value === spec.options[i])? ' selected':'';
            aHtml+=' <option value="'+spec.options[i]+'"'+selected+'> '+spec.options[i]+'</option>';
          }
          aHtml+='</select>';
          break;
      default:
          aHtml+='<input type="text" id="input_'+key+'" value="'+value+'" style="" onchange="'+spec.callback+'(this)"/>'
          break;
    }
    return aHtml;
}


function layout_addOptionsForMultiSelect(select_id,options){
  var check_elem = document.getElementById(select_id);
  check_elem.innerHTML = "";
  for (var i = 0;i<options.length;i++) {
    var opt = options[i];//label
    var ch = (NGL_testSelectedChain(opt))?" checked ":"";
    check_elem.innerHTML += '<label for="'+opt+'"><input type="checkbox" id="'+opt+'" onclick="NGL_ChangeChainsSelection(this)"'+ch+'/>'+opt+'</label>';
    //if (i > 20) break;//safety ?
  }
}

function layout_getMultiSelect(select_id)
{
  var astr=''+
  '<div class="multiselect">'+
  '<div class="selectBox" onclick="Util_showCheckboxes()">'+
    '<select>'+
    '  <option>Select an option</option>'+
    '</select>'+
    '<div class="overSelect"></div>'+
  '</div>'+
  '<div id="'+select_id+'">'+
    '<label for="one">'+
    '  <input type="checkbox" id="one" />First checkbox</label>'+
    '<label for="two">'+
    '  <input type="checkbox" id="two" />Second checkbox</label>'+
    '<label for="three">'+
    '  <input type="checkbox" id="three" />Third checkbox</label>'+
    '</div>'+
  '</div>';
  return astr;
}

//hover_div//style="position:absolute; width:100% !important; display:block;"
var canvasOption = '' +
  '<div class="canvas_head" >' +
    '<div>'+
     '<input type="checkbox" checked="true" id="sprites">Node image</input>'+
      getSelect("canvas_label", "options_elems", "Node label",
                            "ChangeCanvasLabel(this)", canvas_label_options,"name")+//canvas_label_options)+
      getSelect("canvas_color", "options_elems", "Node color",
                            "ChangeCanvasColor(this)", canvas_color_options,"pdb")+
      '<input type="color" id="min_color" onchange="ChangeMinColor(this)" name="colormin" value="#ff0000" />' +
      '<input type="color" id="max_color" onchange="ChangeMaxColor(this)" name="colormax" value="#00ffbf" />' +
      //add two color picker for the min-max linear mapping
      '<button id="applycolor" onclick="applyColorModeToIngredient()">Apply to ingredient color</button>' +
      //load color palette?
      getSelect("canvas_map_r", "options_elems", "Node size",
                            "mapRadiusToProperty(this)", Object.keys(property_mapping),"size")+
      getSelect("canvas_group", "options_elems", "Node group by",
                            "ClusterNodeBy(this)", Object.keys(property_mapping),"size")+
    '</div>' +
    '<button id="addingr" class="hidden" onclick="addIngredient()">Add ingredient</button>' +
    '<button id="addcomp" class="hidden" onclick="addCompartment()">Add compartment</button>' +
    '<button id="addlink" class="hidden" onclick="addLink()">Add interaction</button>'+
    '<div>'+
      '<input type="checkbox" id="unchecked" onclick="switchMode(this)" class="cbx hidden" />' +
      '<label for="unchecked" class="lbl"></label>' +
      '<label for="lbl" style="width:70px; float:right; margin-top:10px;">Edit Mode</label>' +
    '</div>'+
  '</div>'

var ngl_widget_options = ''+
 '<div class="NGLOptions">'+
  '<div class="clusterBtn">' +
    '<button onclick="NGL_CenterView()" style="">Center Camera</button>' +
  '</div>' +
  '<div><label id="ProteinId">protein name</label></div>' +
  '<div><label id="pdb_id">pdb id</label></div>' +
  '<div>'+
    '<label for="rep_type">Selection</label>'+
    '<input type="text" id="sel_str" style="width:55%" placeholder="Selection" onchange="NGL_ChangeSelection(this)"/>'+
    layout_getMultiSelect("selection_ch_checkboxes") +
  '</div>'+
  '<label id="ngl_status"></label>' +
  getSelect("rep_type", "options_elems", "Representation",
                          "NGL_ChangeRepresentation(this)", ngl_styles,"cartoon")+
  getSelect("ass_type", "options_elems", "Assembly",
                          "NGL_ChangeBiologicalAssembly(this)", ["AU"],"AU")+
  getSelect("mod_type", "options_elems", "Model",
                          "NGL_ChangeModel(this)", ["0"],"0")+
  getSelect("color_type", "options_elems", "Color",
                          "NGL_ChangeColorScheme(this)", ngl_available_color_schem,"atomindex")+
  getSelect("label_elem", "options_elems", "Label",
                          "NGL_Changelabel(this)", ["None","Chain"],"None")+

  '<div><input type="checkbox"  id="showbox" onclick="NGL_showBox(this)">' +
  '<label for="showbox"> Show Bounding Box </label></div>'+
  '<div><input type="checkbox"  id="showorigin" onclick="NGL_toggleOrigin(this)">' +
  '<label for="showorigin"> Show Origin </label></div>'+
  '<div>'+
    '<input type="checkbox"  id="showgeom" onclick="NGL_showGeomNode(this)" checked>' +
    '<label for="showgeom"> Show Geometry used </label> '+
    '<button onclick="NGL_buildCMS()">Rebuild Geometry</button>'+getSpinner("stopbuildgeom","stopGeom()")+
    '<div>'+
      '<label>Geometry details</label>' +
      '<input id="slidercl_params2" style="width:70%;display:inline" type="range" min="0.01" max="1.00"" step="0.01" value="0.2" /> ' +
      '<label id="cl_params2" for="slidercl_params2">0.2</label>' +
    '</div>'+
  '</div>' +
  getSelect("beads_elem", "options_elems", "Show Beads",
                        "NGL_showBeadsLevel(this)", ["All","0","1","2","None"],"None")+
  '<div>'+
    '<label> number of cluster</label>' +
    '<input id="slidercl_params1" style="width:70%;display:inline" type="range" min="1" max="200"" step="1" value="10" /> ' +
    '<input class="inputNumber" id="slidercl_params11" min="1" max="200" type="number" value="10" />' +getSpinner("stopkmeans","stopKmeans()")+
  '</div>'+
  '<div>'+
  '<input type="checkbox"  id="toggle_cluster_edit" onclick="NGL_ChangeOpacityMultiSpheresComp_cb(this)">' + 
  '<label for="toggle_cluster_edit"> Edit beads (ctrl) </label> '+
  '<input type="checkbox"  id="cl_use_radius" onclick="NGL_toggleUseCurrentBeadsRadius(this)" >' + 
  '<label for="showgeom"> Overwrite cluster radius</label> '+   
  '</div>'+
  '<div>'+
  '<input id="cl_radius" min="1.0" max="100.0" onchange="NGL_updateCurrentBeadsRadius(this)" type="number" value="1.0" style="width:30%"/>' +
  '</div>'+
  '<label id="nbBeads">0 beads</label>' +
  '<div id="query_search">' +
    '<label id="heading"></label>' +
  '</div> ' +
  '<div class="hidden" id="surface">' +
    '<div><input type="checkbox"  id="showgeommb" onclick="NGL_showGeomMembrane(this)" checked>' +
    '<label for="showgeommb"> Show Membrane used </label></div>'+
    '<label id="pcpLabel">Principal Axis (shift+control left click)</label>' +
    '<div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpX" type="range" min="-100" max="100" step="1" style="width:70%" />' +
    '<input class="inputNumber" id="num1" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
    '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpY" type="range" min="-100" max="100" step="1" style="width:70%" />' +
    '<input class="inputNumber" id="num2" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
    '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpZ" type="range" min="-100" max="100" step="1" style="width:70%"/>' +
    '<input class="inputNumber" id="num3" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
    '<label id="offsetLabel">Offset (shift+control right click)</label>' +
    '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetX" type="range" min="-450" max="450" step="1" style="width:70%" />' +
    '<input class="inputNumber" id="num4" min="-350" max="350" type="number" value="0" style="width:30%"/>' +
    '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetY" type="range" min="-450" max="450" step="1" style="width:70%"/>' +
    '<input class="inputNumber" id="num5" min="-350" max="350" type="number" value="0" style="width:30%"/>' +
    '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetZ" type="range" min="-450" max="450" step="1" style="width:70%"/>' +
    '<input class="inputNumber" id="num6" min="-350" max="350" type="number" value="0" style="width:30%"/>' +
    '</div>' +
    //'<button onclick="NGL_applyPcp()">Apply To Ingredient</button>' +
    '<button onclick="NGL_resetPcp()">Reset</button>' +
  '</div>' +
  '<label id="pdb_title">pdb TITLE</label>' +
'</div>';

var ngl_widget_options_collapsible = ''+
  '<div class="NGLOptions">'+
  '<button class="meso_collapsible">Molecule header</button>'+
  '<div class="meso_content">'+
  '<div><label id="ProteinId">protein name</label></div>' +
  '<div><label id="pdb_id">pdb id</label></div>' + 
  '<div><label id="pdb_title">pdb TITLE</label></div>' +
  '</div>'+
  '<button class="meso_collapsible">Molecule options</button>'+
  '<div class="meso_content">'+
      '<div>'+
        '<label for="rep_type">Selection</label>'+
        '<input type="text" id="sel_str" style="width:55%" placeholder="Selection" onchange="NGL_ChangeSelection(this)"/>'+
        layout_getMultiSelect("selection_ch_checkboxes") +
      '</div>'+
      '<label id="ngl_status"></label>' +
      getSelect("rep_type", "options_elems", "Representation",
                            "NGL_ChangeRepresentation(this)", ngl_styles,"cartoon")+
      getSelect("ass_type", "options_elems", "Assembly",
                            "NGL_ChangeBiologicalAssembly(this)", ["AU"],"AU")+
      getSelect("mod_type", "options_elems", "Model",
                            "NGL_ChangeModel(this)", ["0"],"0")+
      getSelect("color_type", "options_elems", "Color",
                            "NGL_ChangeColorScheme(this)", ngl_available_color_schem,"atomindex")+
      getSelect("label_elem", "options_elems", "Label",
                            "NGL_Changelabel(this)", ["None","Chain"],"None")+
  '</div>'+
  '<div class="hidden" id="surface">' +
  '<button class="meso_collapsible">Membrane options</button>'+
  '<div class="meso_content">'+
    '<div><input type="checkbox"  id="showgeommb" onclick="NGL_showGeomMembrane(this)" checked>' +
    '<label for="showgeommb"> Show Membrane used </label></div>'+
    '<label id="pcpLabel">Principal Axis (shift+control left click)</label>' +
    '<div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpX" type="range" min="-100" max="100" step="1" style="width:70%" />' +
    '<input class="inputNumber" id="num1" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
    '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpY" type="range" min="-100" max="100" step="1" style="width:70%" />' +
    '<input class="inputNumber" id="num2" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
    '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpZ" type="range" min="-100" max="100" step="1" style="width:70%"/>' +
    '<input class="inputNumber" id="num3" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
    '<label id="offsetLabel">Offset (shift+control right click)</label>' +
    '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetX" type="range" min="-450" max="450" step="1" style="width:70%" />' +
    '<input class="inputNumber" id="num4" min="-350" max="350" type="number" value="0" style="width:30%"/>' +
    '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetY" type="range" min="-450" max="450" step="1" style="width:70%"/>' +
    '<input class="inputNumber" id="num5" min="-350" max="350" type="number" value="0" style="width:30%"/>' +
    '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetZ" type="range" min="-450" max="450" step="1" style="width:70%"/>' +
    '<input class="inputNumber" id="num6" min="-350" max="350" type="number" value="0" style="width:30%"/>' +
    '</div>' +
    //'<button onclick="NGL_applyPcp()">Apply To Ingredient</button>' +
    '<button onclick="NGL_resetPcp()">Reset</button>' +
    '</div>' +
  '</div>'+
  '<button class="meso_collapsible">Beads and Geom options</button>'+
  '<div class="meso_content">'+
    '<div>'+
        '<input type="checkbox"  id="showgeom" onclick="NGL_showGeomNode(this)">' +
        '<label for="showgeom"> Show Geometry used </label> '+
        '<button onclick="NGL_buildCMS()">Rebuild Geometry</button>'+getSpinner("stopbuildgeom","stopGeom()")+
        '<div>'+
          '<label>Geometry details</label>' +
          '<input id="slidercl_params2" style="width:70%;display:inline" type="range" min="0.01" max="1.00"" step="0.01" value="0.2" /> ' +
          '<label id="cl_params2" for="slidercl_params2">0.2</label>' +
        '</div>'+
      '</div>' +
      getSelect("beads_elem", "options_elems", "Show Beads",
                            "NGL_showBeadsLevel(this)", ["All","0","1","2","None"],"None")+
      '<div>'+
        '<label> number of cluster</label>' +
        '<input id="slidercl_params1" style="width:70%;display:inline" type="range" min="1" max="200"" step="1" value="10" /> ' +
        '<input class="inputNumber" id="slidercl_params11" min="1" max="200" type="number" value="10" />' +getSpinner("stopkmeans","stopKmeans()")+
      '</div>'+
      '<div>'+
      '<input type="checkbox"  id="toggle_cluster_edit" onclick="NGL_ChangeOpacityMultiSpheresComp_cb(this)">' + 
      '<label for="toggle_cluster_edit"> Edit beads (ctrl) </label> '+
      '<input type="checkbox"  id="cl_use_radius" onclick="NGL_toggleUseCurrentBeadsRadius(this)" >' + 
      '<label for="showgeom"> Overwrite cluster radius</label> '+   
      '</div>'+
      '<div>'+
      '<input id="cl_radius" min="1.0" max="100.0" onchange="NGL_updateCurrentBeadsRadius(this)" type="number" value="1.0" style="width:30%"/>' +
      '</div>'+
      '<label id="nbBeads">0 beads</label>' +
      '<div id="query_search">' +
        '<label id="heading"></label>' +
      '</div> ' +
  '</div>'+

    '<button class="meso_collapsible">Sprites options</button>'+
    '<div class="meso_content">'+
    '<div><button onclick="NGL_UpdateThumbnailCurrent()" style="">Update Thumbnail/Sprite From NGL</button></div>' +
    '<div><button onclick="NGL_Illustrate()" style="">Update Thumbnail/Sprite From Illustrate</button>' +
    '<input type="checkbox" id="ill_style">Coarse Illustration</input></div>' +
    '<div>'+
    '<div class="spinner hidden" id="spinnerILL" style="width:200px;height:20px;" >' +
    '	  <div class="rect1"></div>' +
    '	  <div class="rect2"></div>' +
    '	  <div class="rect3"></div>' +
    '	  <div class="rect4"></div>' +
    '	  <div class="rect5"></div>' +
    //'   <button onclick="stopAll()">Stop query search</button>' +
    '	</div>'+
    '</div>'+
    '<div><input type="checkbox" id="savethumbnail" checked="true">Save Thumbnail/Sprite</input></div>' +    
    //add offset y
    '<label id="labeloffsety">sprite 2d Y offset</label>' +
    '<div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="2d_yoffset_range" type="range" min="-450" max="450" step="1" style="width:70%"/>' +
    '<input class="inputNumber" id="2d_yoffset_num" min="-350" max="350" type="number" value="0" style="width:30%"/></div>' +
    //add the sprites image here ?

    '</div>'+
    '<button class="meso_collapsible">View options</button>'+
    '<div class="meso_content">'+
        '<div class="clusterBtn">' +
        '<button onclick="NGL_CenterView()" style="">Center Camera</button>' +
        '</div>' +
      '<div><input type="checkbox"  id="showbox" onclick="NGL_showBox(this)">' +
      '<label for="showbox"> Show Bounding Box </label></div>'+
      '<div><input type="checkbox"  id="showorigin" onclick="NGL_toggleOrigin(this)">' +
      '<label for="showorigin"> Show Origin </label></div>'+
    '</div>'+
  '</div>';


var ngl_options= ''+
  '<div class="NGLOptions">'+
  '<button onclick="PreviousIgredient()" style="">Previous Ingredient</button>' +
  '<button onclick="NextIgredient()" style="">Next Ingredient</button>' +
  '<button onclick="NGL_UpdateThumbnailCurrent()" style="">Update Thumbnail/Sprite</button>' +
  '<input type="checkbox" id="ill_style" checked="false">Coarse Illustration</input>' +
  '<button onclick="NGL_Illustrate()" style="">Illustrate</button>' +
  '<input type="checkbox" id="savethumbnail" checked="true">Save Thumbnail/Sprite</input>' +
  '<input type="checkbox" id="ngl_scene_control" checked="true">Mouse Control World</input>' +
  '<button class="accordion">NGL options</button>'+
  '<div class="accordion_panel">'+
    '<div class="clusterBtn">' +
      '<button onclick="NGL_CenterView()" style="">Center Camera</button>' +
    '</div>' +
    '<div><label id="ProteinId">protein name</label></div>' +
    '<div><label id="pdb_id">pdb id</label></div>' +
    '<div>'+
      '<label for="rep_type">Selection</label>'+
      '<input type="text" id="sel_str" style="width:55%" placeholder="Selection" onchange="NGL_ChangeSelection(this)"/>'+
      layout_getMultiSelect("selection_ch_checkboxes") +
    '</div>'+
    '<label id="ngl_status"></label>' +
    getSelect("rep_type", "options_elems", "Representation",
                            "NGL_ChangeRepresentation(this)", ngl_styles,"cartoon")+
    getSelect("ass_type", "options_elems", "Assembly",
                            "NGL_ChangeBiologicalAssembly(this)", ["AU"],"AU")+
    getSelect("mod_type", "options_elems", "Model",
                            "NGL_ChangeModel(this)", ["0"],"0")+
    getSelect("color_type", "options_elems", "Color",
                            "NGL_ChangeColorScheme(this)", ngl_available_color_schem,"atomindex")+
    getSelect("label_elem", "options_elems", "Label",
                            "NGL_Changelabel(this)", ["None","Chain"],"None")+
    '<div>'+
      '<input type="checkbox"  id="showgeom" onclick="NGL_showGeomNode(this)" checked>' +
      '<label for="showgeom"> Show Geometry used </label> '+
      '<button onclick="NGL_buildCMS()">Rebuild Geometry</button>'+getSpinner("stopbuildgeom","stopGeom()")+
    '</div>' +
    getSelect("beads_elem", "options_elems", "Show Beads",
                            "NGL_showBeadsLevel(this)", ["All","0","1","2","None"],"None")+
  //' <div class="clusterBtn">' +
  //' <select id="cluster_elem" name="cluster_elem" onchange="NGL_changeClusterMethod(this)" style="width:100%;height:40px">' +
  //'  <option value="Kmeans" selected>Kmeans </option>' +
  //'  <option value="Optics" disabled> Optics</option>' +
  //'  <option value="DBSCAN" disabled> DBSCAN </option>' +
  //' </select>' +
    '<div>'+
      '<label> number of cluster</label>' +
      '<input id="slidercl_params1" style="width:70%;display:inline" type="range" min="1" max="200"" step="1" value="10" /> ' +
      '<input class="inputNumber" id="slidercl_params2" min="1" max="200" type="number" value="1" />' +
      '<label id="cl_params1" for="slidercl_params1">10</label>' +  getSpinner("stopkmeans","stopKmeans()")+
      '<input id="cl_radius" min="1.0" max="100.0" onchange="NGL_updateCurrentBeadsRadius(this)" type="number" value="1.0" style="width:30%"/>' +
      '<input type="checkbox"  id="cl_use_radius" onclick="NGL_updateCurrentBeadsRadius(this)" checked>' +
    '</div>'+
    '<label id="nbBeads">0 beads</label>' +
    '<div id="query_search">' +
      '<label id="heading"></label>' +
    '</div> ' +
    '<div class="hidden" id="surface">' +
      '<div><input type="checkbox"  id="showgeommb" onclick="NGL_showGeomMembrane(this)" checked>' +
      '<label for="showgeommb"> Show Membrane used </label></div>'+
      '<label id="pcpLabel">Principal Axis (shift+control left click)</label>' +
      '<div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpX" type="range" min="-100" max="100" step="1" style="width:70%" />' +
      '<input class="inputNumber" id="num1" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
      '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpY" type="range" min="-100" max="100" step="1" style="width:70%" />' +
      '<input class="inputNumber" id="num2" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
      '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="pcpZ" type="range" min="-100" max="100" step="1" style="width:70%"/>' +
      '<input class="inputNumber" id="num3" min="-100" max="100" type="number" value="0" style="width:30%"/>' +
      '<label id="offsetLabel">Offset (shift+control right click)</label>' +
      '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetX" type="range" min="-450" max="450" step="1" style="width:70%" />' +
      '<input class="inputNumber" id="num4" min="-350" max="350" type="number" value="0" style="width:30%"/>' +
      '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetY" type="range" min="-450" max="450" step="1" style="width:70%"/>' +
      '<input class="inputNumber" id="num5" min="-350" max="350" type="number" value="0" style="width:30%"/>' +
      '</div><div style="display:flex;flex-flow: row wrap;"><input class="inputRange" id="offsetZ" type="range" min="-450" max="450" step="1" style="width:70%"/>' +
      '<input class="inputNumber" id="num6" min="-350" max="350" type="number" value="0" style="width:30%"/>' +
      '</div>' +
      //'<button onclick="NGL_applyPcp()">Apply To Ingredient</button>' +
      '<button onclick="NGL_resetPcp()">Reset</button>' +
    '</div>' +
    '<label id="pdb_title">pdb TITLE</label>' +
  '</div>' +
  '<button class="accordion">object properties</button>'+
  '<div class="accordion_panel" id="objectOptions">'+
   //either compartment or ingredient
  '</div>' +
  '</div>'

var object_properties = '<div style="display:flex;flex-flow:column;" id="objectOptions"></div>';

var ngl_viewport='' +
  '<div class="NGL" id="NGL">'+
    '<div id="viewport" style="width:100%; height:100%;">'+  '</div>'+
  '</div>';

var file_cb = "$('#modelfile_input').trigger('click');";
var gpu_phy_viewport='' +
  '<div class="GPGPU" id="GPGPU">'+
    '<div id="gui-container"></div>'+
    '<div id="container" style="width:100%; height:100%;"></div>'+
    '<button id="preview_button" onclick="GP_initFromNodes(graph.nodes,128,10,false);" style="position:absolute;top:0px;right:50%;z-index:999">Preview</button>' +
    '<button id="loadmodel_button" onclick="'+file_cb+'" style="position:absolute;top:0px;right:60%;">Load Model</button>' +    
  '</div>';

var file_cb = "$('#modelfile_input2').trigger('click');";
var mol_star_view=''+
'<div id="acontainer" >'+
'<div id="molstar">'+  '</div>'+
'<div style="position:absolute;top:0px">'+
'<div><button id="loadmodel_button" onclick="'+file_cb+'" style="">Load a Model</button>' +//z-index:999,right:5%;
'<button id="applyAllcolors_button" onclick="MS_applyAllColors()" style="">Apply nodes Colors</button>' +//z-index:999,right:5%;
'<button id="applyAllcolors_button" onclick="MS_applyRandomColors()" style="">Apply default Colors</button></div>' +//z-index:999,right:5%;
'<div><input type="checkbox" id="ms_trace_only">Trace Only</input></div>' +
'<div><input type="checkbox" id="ms_spacefill">Spacefill</input></div>' +
'</div>'+
'</div>';

var ngloptions = '' +
  '<div class="NGLpan">'+
    ngl_viewport+
    '<div style="position:absolute;top:0px">'+//;z-index:999
    '<div><button onclick="PreviousIgredient()" style="">Previous Ingredient</button>' +
    '<button onclick="NextIgredient()" style="">Next Ingredient</button></div>' +
    '<div><input type="checkbox" id="ngl_scene_control" checked="true">Mouse Control World</input></div>' +
  '</div>';


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
  '<div style="display:list-item">'+
    //'<label for="sequence_search"> Use Sequence Blast PDB Search </label>' +
    '<div><input type="checkbox" name="sequence_search" id="sequence_search">Use Sequence Blast PDB Search</input></div>' +
    //'<label for="sequence_mapping"> Setup mapping uniprot-PDB resnum </label>' +
    '<div><input type="checkbox" name="sequence_mapping" id="sequence_mapping">Setup mapping uniprot-PDB resnum</input></div>' +
    //'<label for="pdb_component_enable"> Update PDB component library </label>' +
    '<div><input type="checkbox" name="pdb_component_enable" id="pdb_component_enable"> Update PDB component library</input></div>' +
    '<div><button id="UpdatePDBcomponent" onclick="NGL_UpdatePDBComponent(this)">Update Component</button></div>'+
  '</div>'+
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
  ' <button style="display:block;" onclick="query_ClearAll()">Reset Geometry and Beads</button>' + getSpinner("stopbeads","stopBeads()")+
  ' <button style="display:block;" onclick="query_BuildAll()">AutoFix Recipe (geometry, beads, ...) </button>' + getSpinner("stopbeads","stopBeads()")


//	+'</div>'

var grid_header = '<div id="inlineFilterPanel" style="display:none;background:#dddddd;padding:3px;color:black;">'+
                  'Show tasks with title including <input type="text" id="txtSearch2">'+
                  'and % at least &nbsp;'+
                  '<div style="width:100px;display:inline-block;" id="pcSlider2"></div>'+
                  '</div>'

var recipe_grid_header = '<div id="inlineFilterPanel" style="display:none;background:#dddddd;padding:3px;color:black;">'+
'Show ingredient including <input type="text" id="txtSearch2"></div>';


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

function get_comp_defintion_gpgpu() {
  return {
    id: 4,
    type: 'component',
    title: 'PreView',
    tooltip: 'Preview Model',
    isClosable: false,
    componentName: 'gpgpu',
    componentState: {
      label: 'B'
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


//Main Config
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
                  {type:'column',content:[
                    get_new_single_component("NGL Options","ngl viewer options","ngl_options",{label: 'C'}),
                    get_new_single_component("Object Properties","change object properties","object_properties",{label: 'C'})
                  ]},
                  {type:'stack', content:[
                    get_comp_defintion_ngl(),
                    get_new_single_component("Mol-*","Mol-*","molstar",{label: 'molstar'})//,
                    //get_comp_defintion_gpgpu()
                  ]},
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

var config_light = {
  settings: {
    showPopoutIcon: false,
    //      selectionEnabled: true
  },
  content: [{
    type: 'column',
    content: [{
        type: 'row',
        content: [get_comp_definition_d3(),
                  {type:'stack',content:[
                    get_new_single_component("NGL Options","ngl viewer options","ngl_options",{label: 'C'}),
                    get_new_single_component("Object Properties","change object properties","object_properties",{label: 'C'}),
                    get_new_single_component("Sequence features","show sequence features","seq_feature_viewer",{"entry":"","entity":"1","type":"pdb-seq-viewer"}),
                    get_new_single_component("protvista","show protvista","protvista",{"entry":"","entity":"1"}),
                    get_new_single_component("Topology","show topology 2d","topology_viewer",{"entry":"","entity":"1","type":"pdb-topology-viewer"}),
                    get_new_single_component("Uniprot mapping","show uniprot coverage","uniprot_viewer",{"entry":"","entity":"1","type":"pdb-uniprot-viewer"})                    
                  ]},
                  get_comp_defintion_ngl(),
                  get_new_single_component("Mol-*","Mol-*","molstar",{label: 'molstar'})
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
//_onCloseClick
//for mobile
var alt_layout = [];

var myLayout,
  savedState = localStorage.getItem('savedState');

var usesavedState = true;
var usesavedSession = true;
var savedRecipe = localStorage.getItem('savedRecipe');
var current_version = {"version":1.17};
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
      myLayout = new window.GoldenLayout(config_light, $('#layoutContainer'));
    }
  }
  else {
    //myLayout = new GoldenLayout( config );
    myLayout = new window.GoldenLayout(config_light, $('#layoutContainer'));
    localStorage.setItem('session_version', JSON.stringify(current_version));
    savedRecipe = null;
  }
} else {
  //myLayout = new GoldenLayout( config );
  myLayout = new window.GoldenLayout(config_light, $('#layoutContainer'));
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
  saveCurrentState();
});

function saveCurrentState() {
  var jdata = serializedRecipe(graph.nodes, graph.links);
  //var jdata = getCurrentNodesAsCP_JSON(graph.nodes, graph.links); //Links?
  localStorage.setItem('savedRecipe', JSON.stringify(jdata));
  recipe_changed = false;
  if (grid_tab_label && grid_tab_label[0]) grid_tab_label[0].text ( "" );
}

var d3canvasComponent = function(container, state) {
  this._container = container;
  this._state = state;
  //var optionsDropdown = $( $( 'CanvasOptionTemplate' ).html() );
  //this._container.on( 'tab', function( tab ){
  //      tab.element.append( optionsDropdown );
  //  });

  this._container.on('open', this._Setup, this);
  this._container.on('close', this._Close, this);
};
d3canvasComponent.prototype._Close = function() {
  console.log("close ",this);
}

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

var gpgpuComponent = function(container, state) {
  this._container = container;
  this._container.on('open', this._Setup, this);
};
//init also the component for gpu?
gpgpuComponent.prototype._Setup = function() {
  //this._container.getElement().html( '<div class="NGL" id="NGL"><div id="viewport" style="width:100%; height:100%;"></div></div>');
  //var ngl = $('<div class="NGL" id="NGL"><div id="viewport" style="width:100%; height:100%;"></div></div>');
  var optionsDropdown = $(gpu_phy_viewport); //$( 'NGLOptionTemplate' ).html() );
  this._container.getElement().append(optionsDropdown);
  //this._container.getElement().append(ngl);
  //GP_initRenderer();
  this._container.on('resize', this._Resize, this);
  this._Resize();
  all_intialized[1] = true;
}

gpgpuComponent.prototype._Resize = function() {
    GP_onWindowResize();
};


var molstarcomponent  = function(container, state) {
  this._container = container;
  this._container.on('open', this._Setup, this);
};
//init also the component for gpu?
molstarcomponent.prototype._Setup = function() {
  //this._container.getElement().html( '<div class="NGL" id="NGL"><div id="viewport" style="width:100%; height:100%;"></div></div>');
  //var ngl = $('<div class="NGL" id="NGL"><div id="viewport" style="width:100%; height:100%;"></div></div>');
  var optionsDropdown = $(mol_star_view); //$( 'NGLOptionTemplate' ).html() );
  this._container.getElement().append(optionsDropdown);
  //this._container.getElement().append(ngl);
  //initialize molstar wrapper on div id molstar
  MS_molstart_init();
  this._container.on('resize', this._Resize, this);
  this._Resize();
  all_intialized[1] = true;
}

molstarcomponent.prototype._Resize = function() {
    //molstar resize?
    MS_Resize();
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

//init also the component for gpu?
nglComponent.prototype._Setup = function() {
  //this._container.getElement().html( '<div class="NGL" id="NGL"><div id="viewport" style="width:100%; height:100%;"></div></div>');
  //var ngl = $('<div class="NGL" id="NGL"><div id="viewport" style="width:100%; height:100%;"></div></div>');
  var optionsDropdown = $(ngloptions); //$( 'NGLOptionTemplate' ).html() );
  this._container.getElement().append(optionsDropdown);
  //this._container.getElement().append(ngl);
  this._stage = NGL_Setup();
  //GP_initRenderer();
  this._container.on('resize', this._Resize, this);
  this._Resize();
  all_intialized[1] = true;
  //setup the splitter ?
  /*$(".NGLOptions").resizable({
    handleSelector: ".splitter",
    resizeHeight: false
  });*/
}

nglComponent.prototype._Resize = function() {
    this._stage.handleResize();
  //  GP_onWindowResize();
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
  grid_tab_label[component._state.ind-1] = $('<div class="messageTab" id="grid_tab_'+(component._state.ind-1).toString()+'">' + '' + '</div>');
  var buton = '<span style="float:right" class="ui-icon ui-icon-search" title="Toggle search panel" onclick="toggleFilterRow()"</span>';
  // Add the counter element whenever a tab is created
  this._container.tab.element.append( grid_tab_label[component._state.ind-1] );
  this._container.tab.element.append( buton );

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

//myLayout.registerComponent('gpgpu', gpgpuComponent);
myLayout.registerComponent('molstar',molstarcomponent);
myLayout.registerComponent('pfv', pfvComponent);

myLayout.registerComponent('slickgrid', slickgridComponent);

//myLayout.registerComponent( 'slickgrid', function( container, state ){});
myLayout.registerComponent('slickgridoptions', function(container, state) {
  container.getElement().html(gridoptions+recipe_grid_header);
  setupSlickGrid();
})

myLayout.registerComponent('ngl_options', function(container, state) {
  var el = container.getElement();
  el[0].style.overflow="scroll";
  el.html(ngl_widget_options_collapsible);
})

myLayout.registerComponent('object_properties', function(container, state) {
  var el = container.getElement();
  el[0].style.overflow="scroll";
  el.html(object_properties);
})

//topologyViewerWrapper
myLayout.registerComponent('topology_viewer', function(container, state) {
  var ahtml='<div id="topov_p" class="topov_p"  height="100%" width="100%" style="overflow: scroll;"></div>';
  //ahtml+='<div hidden>';
  //ahtml+='<pre style="clear:both">';
  //ahtml+='<code id="pdbeComp_topov" class="pdbeComp" display-in="topov" contenteditable="true">';
  //ahtml+='&lt;pdb-topology-viewer entry-id="1aqd" entity-id="1" height="370"&gt;&lt;/pdb-topology-viewer&gt;';
  //ahtml+='</code></pre></div>';
  topology_viewer_lbl = $('<div class="messageTab">' + '' + '</div>');
  // Add the counter element whenever a tab is created
  container.on( 'tab', function( tab ){
      tab.element.append( topology_viewer_lbl );
      tab.element[0].onclick = function(e) {
        UpdatePDBtopo(null);
      };
  });
  container.getElement().html(ahtml);
})

myLayout.registerComponent('seq_feature_viewer', function(container, state) {
  var ahtml='<div id="seqv_p" class="seqv_p"  height="100%" width="100%" style="overflow: scroll;"></div>';
  //ahtml+='<div hidden>';
  //ahtml+='<pre style="clear:both">';
  //ahtml+='<code id="pdbeComp_seqv" class="pdbeComp" display-in="seqv" contenteditable="true">';
  //ahtml+='&lt;pdb-seq-viewer entry-id="1aqd" entity-id="1" height="370"&gt;&lt;/pdb-seq-viewer&gt;';
  //ahtml+='</code></pre></div>';
  seq_feature_viewer_lbl = $('<div class="messageTab">' + '' + '</div>');
  // Add the counter element whenever a tab is created
  container.on( 'tab', function( tab ){
      tab.element.append( seq_feature_viewer_lbl );
      tab.element[0].onclick = function(e) {
        UpdatePDBseq(null);
      };
  });
  container.getElement().html(ahtml);
})

myLayout.registerComponent('uniprot_viewer', function(container, state) {
  var ahtml='<div id="puv_p" class="puv_p"  height="100%" width="100%" style="overflow: scroll;"></div>';
  //ahtml+='<div hidden>';
  //ahtml+='<pre style="clear:both">';
  //ahtml+='<code id="pdbeComp_puv" class="pdbeComp" display-in="puv" contenteditable="true">';
  //ahtml+='&lt;pdb-uniprot-viewer entry-id="P07550" entity-id="1" height="370"&gt;&lt;/pdb-uniprot-viewer&gt;';
  //ahtml+='</code></pre></div>';
  uniprot_viewer_tab_lbl = $('<div class="messageTab">' + '' + '</div>');
  // Add the counter element whenever a tab is created
  container.on( 'tab', function( tab ){
      tab.element.append( uniprot_viewer_tab_lbl );
      tab.element[0].onclick = function(e) {
        UpdateUniPDBcomponent(uniprot_viewer_tab_lbl.text());
      };
  });
  //container.on('tab', setupProVista, this);
  container.getElement().html(ahtml);
})

myLayout.registerComponent('protvista', function(container, state) {
  protvista_tab_lbl = $('<div class="messageTab">' + '' + '</div>');
  // Add the counter element whenever a tab is created
  container.on( 'tab', function( tab ){
      tab.element.append( protvista_tab_lbl );
      tab.element[0].onclick = function(e) {
        setupProVista(null);
      };
  });
  container.getElement().html('<div id="protvista" class="protvista" style="height:100%;width=100%"></div>');
})

myLayout.on( 'componentCreated', function( component ){
    // ...manipulate the component
    console.log('componentCreated');
    console.log(component);
});

myLayout.on( 'close', function( component ){
  // ...manipulate the component
  console.log("close event ",component);
});


//myLayout.createDragSource( element, newItemConfig );
//uniprot_viewer
var setuped = false;
var evaluate_interval;
myLayout.init();

$(document).ready(function() {
  //nothing is ready here
  console.log("document ready !");
  Util_SetupCollapsible();
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
    else LoadExampleInfluenza_envelope();
    evaluate_interval = setInterval(EvaluateCurrentReadyState,10000);//in ms, Do every 10 seconds
    var checkboxes = document.getElementById("selection_ch_checkboxes");
    checkboxes.style.display = "none";
    layout_HideTabFor(["Interaction table","Object Properties","Sequence features","Topology","Uniprot mapping","Uniprot search table","PDB search table","protvista" ]);
    //grid_SetDefaultColumn(gridArray[0],["include","name","surface","pdb","bu","selection","compartment","image"]);
    //setupPDBLib();
		//'use strict';angular.bootstrap(document, ['pdb.component.library']);
  }.bind(this), 20);
});

/*
window.onpopstate = function(event) {
  //save the recipe
  console.log("autosave");
	saveCurrentState();
};
*/
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


function pdbcomp_click_callback(e) {
  //if (e.eventData.elementData.elementType === "molecule") return;
  var entityId = e.eventData.entityId;
  var did = node_selected.data.mapping.unimap[entityId];// e.eventData.elementData.domainId;
  if (e.eventData.elementData.elementType ==="uniprot") {
    //e.eventData.entityId: "1"
    //e.eventData.entryId: "3bc1"
    //e.eventData.residueNumber: 98
    //check if its the uniprot we have in the grid ?
    if (e.eventData.elementData.domainId !== node_selected.data.uniprot)
    {
        node_selected.data.uniprot = e.eventData.elementData.domainId;
        updateCellValue(gridArray[0], "uniprot", current_grid_row, node_selected.data.uniprot);
        setupProVista(node_selected.data.uniprot);
        did = node_selected.data.uniprot ;
    }
  }
  if (did !== node_selected.data.uniprot ) did = node_selected.data.uniprot ;
  //highligh the clicked residue?
  var start;
  var end;
  if ('chain_range' in e.eventData.elementData.pathData){
    var sp = e.eventData.elementData.pathData.chain_range.split("-");
    start = parseInt(sp[0]);
    end = parseInt(sp[1]);
  }
  else {
    start = parseInt(e.eventData.elementData.pathData.start.residue_number);//residue_number,//author_residue_number;
    end = parseInt(e.eventData.elementData.pathData.end.residue_number);//residue_number,//author_residue_number;
  }
  var color = "rgb("+e.eventData.elementData.color[0]+", "+e.eventData.elementData.color[1]+", "+e.eventData.elementData.color[2]+")";
  //mapping ?

  var ch = e.eventData.elementData.pathData.chain_id;
  console.log("before mapping ",start,end,entityId,did,ch);
  if (start in node_selected.data.mapping[did][ch].mapping)
      start = node_selected.data.mapping[did][ch].mapping[start];
  if (end in node_selected.data.mapping[did][ch].mapping)
      end = node_selected.data.mapping[did][ch].mapping[end];
  console.log("after mapping ",start,end);
  NGL_ChangeHighlight(start,end,color,ch);
}

function pdbcomp_mouseover_callback(e) {
  //if (e.eventData.elementData.elementType === "molecule") return;
  if (!node_selected) return;
  var entityId = e.eventData.entityId;
  console.log("entityId ", entityId);
  var did = node_selected.data.mapping.unimap[entityId];//
  //compare with the one in the widget.
  if (e.eventData.elementData.elementType ==="uniprot") {
    //e.eventData.entityId: "1"
    //e.eventData.entryId: "3bc1"
    //e.eventData.residueNumber: 98
    //check if its the uniprot we have in the grid ?
    console.log("e.eventData.elementData.domainId ",e.eventData.elementData.domainId);
    console.log("node_selected.data.uniprot ",node_selected.data.uniprot);
    var domainId = e.eventData.elementData.domainId;
    if (domainId === undefined) {
      domainId = node_selected.data.uniprot;
    }
    if (domainId !== node_selected.data.uniprot)
    {
        node_selected.data.uniprot = e.eventData.elementData.domainId;
        updateCellValue(gridArray[0], "uniprot", current_grid_row, node_selected.data.uniprot);
        setupProVista(node_selected.data.uniprot);
        did = e.eventData.elementData.domainId;
    }
  }
  if (did !== node_selected.data.uniprot ) did = node_selected.data.uniprot ;
  var ch = e.eventData.elementData.pathData.chain_id;
  if (ch === undefined) {
    if (did in node_selected.data.mapping) ch = Object.keys(node_selected.data.mapping[did])[1];
    else ch = "";
  }
  var resnum = e.eventData.residueNumber;
  console.log("before mapping ",resnum,entityId,did,ch);
  if (did in node_selected.data.mapping && ch in node_selected.data.mapping[did] && resnum in node_selected.data.mapping[did][ch].mapping)
      resnum = node_selected.data.mapping[did][ch].mapping[resnum];
  console.log("after mapping ",resnum);
  NGL_ChangeHighlightResidue(resnum,ch);
}

function setupPDBLib(){
  var topo = document.getElementById("topov");
  var topop = document.getElementById("topov_p");
  if (!topop) return;
  topo.parent = topop;
  topop.appendChild(topo);

  var seqv = document.getElementById("seqv");
  var seqvp = document.getElementById("seqv_p");
  seqv.parent = seqvp;
  seqvp.appendChild(seqv);
  seqv.setAttribute('display','grid');

  var puv = document.getElementById("puv");
  var puvp = document.getElementById("puv_p");
  puv.setAttribute('display','grid');

  puv.parent = puvp;
  puvp.appendChild(puv);

  pdbcomponent_setup = true;

  document.addEventListener('PDB.seqViewer.click', function(e){
    //do something on event
    console.log('PDB.seqViewer.click');
    console.log(e);
    pdbcomp_click_callback(e);
  });

  document.addEventListener('PDB.topologyViewer.click', function(e){
    //do something on event
    console.log('PDB.topologyViewer.click');
    console.log(e);
    pdbcomp_click_callback(e);
  });

  document.addEventListener('PDB.uniprotViewer.click', function(e){
    //do something on event
    console.log('PDB.uniprotViewer.click');
    console.log(e);
  });

  document.addEventListener('PDB.topologyViewer.mouseover', function(e){
    //console.log('PDB.topologyViewer.mouseover');
    //console.log(e);
    var resnum = e.eventData.residueNumber;
    var ch = e.eventData.chainId;
    NGL_ChangeHighlightResidue(resnum,ch);
  });

  document.addEventListener('PDB.seqViewer.mouseover', function(e){
    //console.log('PDB.seqViewer.mouseover');
    //console.log(e);
    pdbcomp_mouseover_callback(e);
  });

  return;
  /*angular_app.directive('pdbeComp',function($compile){
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
  console.log(angular_app);*/
}

function CleanEntryPDB(entry) {
  console.log(entry);
  console.log(typeof entry);
  if ( typeof entry !== "string") entry = (node_selected)? node_selected.data.source.pdb:"";
  if (entry === null) entry = (node_selected)? node_selected.data.source.pdb:"";
  if (!pdbcomponent_setup) setupPDBLib();
  if (entry.length !== 4 ) {
    console.log("UpdatePDBcomponent with nothing");
    var asplit = entry.split("_");
    console.log(asplit);
    if (asplit[0].length === 4 ) entry = asplit[0];
    else return "";
  }
  console.log("UpdatePDBcomponent with "+entry);
  return entry;
}

function UpdatePDBseq(entry){
  entry = CleanEntryPDB(entry);
  seq_feature_viewer_lbl.text( entry );
  var seqv = document.getElementById("pdbeComp_seqv");//document.getElementsByTagName("pdb-topology-viewer")[0];
  seqv.innerHTML = "";//this doesnt do anything ?
  if (entry === "") {
    seqv = document.getElementById("seqv");
    seqv.innerHTML = "";
    return;
  }
  if (ngl_current_structure) {
    var nEntity = ngl_current_structure.structure.entityList.length;
    console.log("UpdatePDBseq", nEntity);//limit this number ?
    //if entity is 0 probably a opm
    var special_case = false;
    if (nEntity === 0 ) {
      nEntity = 1;
      special_case=true;
    }
    for (var i=0;i<nEntity;i++){
      if (!special_case){
        console.log(ngl_current_structure.structure.entityList[i]);
        if (!ngl_current_structure.structure.entityList[i].isPolymer()) continue;
        if (!NGL_testSelectedChainInEntity(i)) continue;
      }
      seqv.innerHTML += '&lt;pdb-seq-viewer entry-id="'+entry+'" entity-id="'+(i+1).toString()+'" height="370"&gt;&lt;/pdb-seq-viewer&gt;';
      if (i>=3) break;
    }
  }
  else {
    seqv.innerHTML = '&lt;pdb-seq-viewer entry-id="'+entry+'" entity-id="1" height="370"&gt;&lt;/pdb-seq-viewer&gt;';
  }
}


function UpdatePDBtopo(entry){
  entry = CleanEntryPDB(entry);
  topology_viewer_lbl.text( entry );
  var topo = document.getElementById("pdbeComp_topov");//document.getElementsByTagName("pdb-topology-viewer")[0];
  topo.innerHTML = "";
  if (entry === "") {
    topo = document.getElementById("topov");
    topo.innerHTML = "";
    return;
  }
  //use current chain selection
  if (ngl_current_structure) {
    var nEntity = ngl_current_structure.structure.entityList.length;
    console.log("UpdatePDBseq", nEntity);
    var special_case = false;
    if (nEntity === 0 ) {
      nEntity = 1;
      special_case=true;
    }
    for (var i=0;i<nEntity;i++){
      if (!special_case){
        console.log(ngl_current_structure.structure.entityList[i]);
        if (!ngl_current_structure.structure.entityList[i].isPolymer()) continue;
        if (!NGL_testSelectedChainInEntity(i)) continue;
      }
      topo.innerHTML += '&lt;pdb-topology-viewer entry-id="'+entry+'" entity-id="'+(i+1).toString()+'" height="370"&gt;&lt;/pdb-topology-viewer&gt;';
      if (i>=3) break;
    }
  }
  else {
    topo.innerHTML = '&lt;pdb-topology-viewer entry-id="'+entry+'" entity-id="1" height="370"&gt;&lt;/pdb-topology-viewer&gt;';
  }
}

//if there is too many of them, the website hang...
function UpdatePDBcomponent(entry)
{
  var ispdb = document.getElementById("pdb_component_enable")?document.getElementById("pdb_component_enable").checked : false;
  if (!ispdb) return;
  //do it for all entity?
  UpdatePDBtopo(entry);
  UpdatePDBseq(entry)
}

function UpdateUniPDBcomponent(entry){
  if (node_selected && entry===null) entry = node_selected.data.uniprot;
  if (!pdbcomponent_setup) setupPDBLib();
  var puv = document.getElementById("pdbeComp_puv");//document.getElementsByTagName("pdb-topology-viewer")[0];
  puv.innerHTML = "";
  if (!(entry) || entry === "" || entry === null)
  {
    console.log("UpdateUniPDBcomponent with null ", entry);
    puv = document.getElementById("puv");
    puv.innerHTML = "";
    uniprot_viewer_tab_lbl.text("");
    return;
  }
  puv.innerHTML = '&lt;pdb-uniprot-viewer entry-id="'+entry+'" entity-id="1" &gt;&lt;/pdb-uniprot-viewer&gt;';//height="100%"
  uniprot_viewer_tab_lbl.text(entry);
  //protvista_tab_lbl.text(entry);
}

function setupProtVistaEvents()
{
	protvista_instance.getDispatcher().on("featureSelected", function(obj) {
    console.log('featureSelected');
    console.log(obj);
		console.log(obj.feature.begin,obj.feature.end);
    //use Mapping
    var start = obj.feature.begin;
    var end = obj.feature.end;
    var isseq = document.getElementById("sequence_mapping")?document.getElementById("sequence_mapping").checked : false;
    var ch="";
    if (isseq) {
        //whats is the uniport id. and the chain
        if (node_selected) {
          console.log(node_selected.data.uniprot);
          //chain Id ?
          var k = Object.keys(node_selected.data.mapping[node_selected.data.uniprot]);//Object.keys(node_selected.data.mapping[node_selected.data.uniprot])
          var ch = k[0];
          if (ch === "chainId") ch = k[1];
          //node_selected.data.mapping.E1B792.A.mapping[23]
          if (obj.feature.begin in node_selected.data.mapping[node_selected.data.uniprot][ch].mapping)
              start = node_selected.data.mapping[node_selected.data.uniprot][ch].umapping[obj.feature.begin];
          if (obj.feature.end in node_selected.data.mapping[node_selected.data.uniprot][ch].mapping)
              end = node_selected.data.mapping[node_selected.data.uniprot][ch].umapping[obj.feature.end];
        }
    }
    console.log("new ",start,end);
		NGL_ChangeHighlight(start,end,obj.color,ch);
});
}

/*protvista features*/
//the pvf features to protvista e.g. pdb,model,pfam...
function setupProVista(uniid){
  //return;
  if (uniid===null) uniid = (node_selected)?node_selected.data.uniprot:"";
  if (!(uniid) || uniid ==="" || uniid === null) {
    console.log("Update ProVista with null ",uniid);
    protvista_tab_lbl.text("");
    document.getElementById("protvista").innerHTML ="";
    return;
  }
	if (!protvista_instance) {
		if (!ProtVista ) ProtVista = require(['ProtVista']);
		protvista_instance = new ProtVista({
			el: document.getElementById("protvista"),
			uniprotacc: uniid,
			categoryOrder: ['DOMAINS_AND_SITES', 'VARIATION', 'PTM','SEQUENCE_INFORMATION',
		'STRUCTURAL','TOPOLOGY']

		});
	} else { //update
		document.getElementById("protvista").innerHTML ="";
		protvista_instance = new ProtVista({
			el: document.getElementById("protvista"),
			uniprotacc: uniid,
			categoryOrder: ['DOMAINS_AND_SITES', 'VARIATION', 'PTM','SEQUENCE_INFORMATION',
		'STRUCTURAL','TOPOLOGY']
		});
	}
	setupProtVistaEvents();
  //uniprot_viewer_tab_lbl.text(uniid);
  //uniprot_viewer_tab_lbl.text(uniid);
  protvista_tab_lbl.text(uniid);
}

/*
0: <li class="lm_tab lm_active" title="Recipe View">​
1: <li class="lm_tab lm_active" title="NGL Options">​
2: <li class="lm_tab" title="Object Properties">​
3: <li class="lm_tab lm_active" title="NGL View">​
4: <li class="lm_tab" title="Mol-*">​
5: <li class="lm_tab lm_active" title="Sequence features">​
6: <li class="lm_tab" title="protvista">​
7: <li class="lm_tab" title="Topology">​
8: <li class="lm_tab" title="Uniprot mapping">​
9: <li class="lm_tab lm_active" title="Table Options">​
10: <li class="lm_tab lm_active" title="Recipe table">​
11: <li class="lm_tab" title="Interaction table">​
12: <li class="lm_tab" title="Uniprot search table">​
13: <li class="lm_tab" title="PDB search table">
​*/

function layout_HideTabFor(names){
  //hide the given tabs name
  var alltabs = document.getElementsByClassName('lm_tab');
  //var alltabs = document.querySelectorAll('.klass')
  $.each(alltabs, function (i, e) {
    if (names.includes(e.title)){
        e.style.display = "none";
    }
  });
}

helper_setupFibersDictionary();


/*
(function () {
'use strict';
angular.element(document).ready(function () {
angular.bootstrap(document, ['pdb.component.library']);
});
}());
*/
