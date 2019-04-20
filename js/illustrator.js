var i=0;
var _id = -1;//current id on server
var PDBID = "";//current PDB on server
var img_source = "";//current url on server
var structure=null;
var structure_txt=null;
var structure_file=null;
var structure_file_ext = "";
var ngl_center = null;
var custom_structure = false;
var inp_file=null;
var inp_txt=null;
var inp_txt_holder = document.getElementById("inp_txt");
var use_loaded_inp_txt = document.getElementById("use_loaded_inp_txt");
var loaded_pdb = false;
var ignore_h = true;
var current_style = 1;
//get the different elements
var options_elem = document.getElementById("options");
var linkimg = document.getElementById("linkimg");
var current_query = document.getElementById("current_query");
var pdbinput = document.getElementById("pdbinput");
var nameinput= document.getElementById("nameinput");
var _idinput = document.getElementById("_idinput");
var ao = document.getElementById("ao");
var advanced = document.getElementById("advanced");
var ao_params1 = document.getElementById("ao_params1");
var ao_params2 = document.getElementById("ao_params2");
var ao_params3 = document.getElementById("ao_params3");
var ao_params4 = document.getElementById("ao_params4");
var viewport = document.getElementById("viewport");
var ill_style= document.getElementById("ill_style");
var scale = document.getElementById("scale");
var assembly_elem = document.getElementById("ass_type");
var model_number_elem = document.getElementById("model_number");
var sele_elem = document.getElementById("sel_str");
var model_elem = document.getElementById("mod_type");

var current_selection=""
var current_model=0
var currentBU="AU"
var project_name="";
var pdbId="";

var ngl_available_color_schem = [
  "atomindex",
  "bfactor",
  "chainid",
  "chainindex",
  "chainname",
  "densityfit",
  "electrostatic",
  "element",
  "entityindex",
  "entitytype",
  "geoquality",
  "hydrophobicity",
  "modelindex",
  "moleculetype",
  "occupancy",
  "random",
  "residueindex",
  "resname",
  "sstruc",
  "uniform",
  "value",
  "volume"
];

var schemeId2 = NGL.ColormakerRegistry.addSelectionScheme([
  ["rgb(127,178,255)", "_C"],
  ["rgb(102,153,255)", "not _C"]// 0.40, 0.60, 1.00
], "style2");
//0.50, 0.70, 1.00
var schemeId3 = NGL.ColormakerRegistry.addSelectionScheme([
  ["rgb(127,178,255)", ".CA"]
], "style2");

inp_txt_holder.addEventListener("input", function() {
    console.log("input event fired");
    //update the ino-text
    //inp_txt_holder.innerHTML = inp_txt_holder.innerHTML.replace("<br>","\n")
    inp_txt = inp_txt_holder.value;//innerHTML.replace("<pre>","").replace("</pre>","").replace("<code contenteditable=\"true\">","").replace("</code>","");
}, false);

ill_style.addEventListener("selected", function() {
    console.log("input event selected");
    //update the ino-text
    current_style = ill_style.selected;
    //inp_txt_holder.innerHTML = inp_txt_holder.innerHTML.replace("<br>","\n")
    ChangeRep();//innerHTML.replace("<pre>","").replace("</pre>","").replace("<code contenteditable=\"true\">","").replace("</code>","");
}, false);


function Util_forceSelect(e) {
	e.value = '';
}

/****DOM function******/
function addElement (el,parent=null) {
  Object.assign(el.style, {
    position: "absolute",
    zIndex: 10
  })
  if (parent == null) stage.viewer.container.appendChild(el)
  else if (parent == "none") {}
  else {
    parent.appendChild(el)
    }
  return el;
  }


function createElement (name, properties, style) {
  var el = document.createElement(name)
  Object.assign(el, properties)
  Object.assign(el.style, style)
  return el
}

function createSelect (options, properties, style) {
  var select = createElement("select", properties, style)
  options.forEach(function (d) {
    select.add(createElement("option", {
      value: d[ 0 ], text: d[ 1 ]
    }))
  })
  return select
}

function createFileButton (label, properties, style) {
  var input = createElement("input", Object.assign({
    type: "file"
  }, properties), { display: "none" })
  addElement(input)
  var button = createElement("input", {
    value: label,
    type: "button",
    onclick: function () { input.click() }
  }, style)
  return button
}

var topPosition = 12

function getTopPosition (increment) {
  if (increment) topPosition += increment
  return topPosition + "px"
}

function createOneElemNumber(id,value,parent,label=""){
  var elem = document.createElement("input");
  elem.type = "number";
  elem.step = 0.1; // set the CSS class
  elem.value = atomic_outlines_params[i];
  elem.id=id;
  parent.appendChild(elem);
  if (label!=""){
    var t = document.createTextNode(" "+label);
    parent.appendChild(t);
    var br = document.createElement("br");
    parent.appendChild(br);
  }
  return elem;
}


var params1_labels = ["l_low thresholds for gray to black",
                      "l_high thresholds for gray to black",
                      "kernel for derivative calculation (1,2,3,4 smoothest=4)",
                      "l_diff_max start range of z-difference used for derivative (Angstroms)",
                      "l_diff_max end range of z-difference used for derivative (Angstroms)"]

var atomic_outlines_paramsDiv = document.createElement("div");
atomic_outlines_paramsDiv.id = "atomic_outlines_params";
atomic_outlines_paramsDiv.style="display:none";
options_elem.appendChild(atomic_outlines_paramsDiv);
var atomic_outlines_params=[3.0,10.0,4,0.0,5.0]
var atomic_outlines_params_elem=[]
for (var i=0;i<atomic_outlines_params.length;i++){
  var elem = createOneElemNumber("atomic_outlines_params"+(i+1),
              atomic_outlines_params[i],atomic_outlines_paramsDiv,
              params1_labels[i]);
  atomic_outlines_params_elem.push(elem);
}

var params2_labels = ["l_low thresholds for gray to black (typically ~ 3.0-20.0)",
                      "l_high thresholds for gray to black (typically ~ 3.0-20.0)"]
subunit_outlines_paramsDiv = document.createElement("div");
subunit_outlines_paramsDiv.id = "subunit_outlines_params";
subunit_outlines_paramsDiv.style="display:none";
options_elem.appendChild(subunit_outlines_paramsDiv);
var subunit_outlines_params=[3.,10.]
var subunit_outlines_params_elem=[];
for (var i=0;i<subunit_outlines_params.length;i++){
  var elem = createOneElemNumber("subunit_outlines_params"+(i+1),
              subunit_outlines_params[i],subunit_outlines_paramsDiv,
            params2_labels[i]);
  subunit_outlines_params_elem.push(elem)
}

var params3_labels = ["l_low thresholds for gray to black (typically ~ 3.0-20.0)",
                      "l_high thresholds for gray to black (typically ~ 3.0-20.0",
                      "difference in residue numbers to draw outlines"];
chain_outlines_paramsDiv = document.createElement("div");
chain_outlines_paramsDiv.id = "chain_outlines_params";
chain_outlines_paramsDiv.style="display:none";
options_elem.appendChild(chain_outlines_paramsDiv);
var chain_outlines_params=[3.,8.,6.];
var chain_outlines_params_elem=[];
for (var i=0;i<chain_outlines_params.length;i++){
  var elem = createOneElemNumber("chain_outlines_params"+(i+1),
              chain_outlines_params[i],chain_outlines_paramsDiv,
              params3_labels[i]);
  chain_outlines_params_elem.push(elem)
}

var an_img = new Image();

// When it is loaded...
an_img.addEventListener("load", function() {
    // Set the on-screen image to the same source. This should be instant because
    // it is already loaded.
    document.getElementById("result").src = an_img.src;
    // Schedule loading the next frame.
    setTimeout(function() {
        an_img.src = img_source;
    }, 1000/15); // 15 FPS (more or less)
})

// Start the loading process.
an_img.src = img_source;
var img = document.getElementById("result");


var ligandSele = "( not polymer or not ( protein or nucleic ) ) and not ( water or ACE or NH2 )"


// Create NGL Stage object
var stage = new NGL.Stage( "viewport" );
stage.setParameters({cameraType: "orthographic"})

// Handle window resizing
window.addEventListener( "resize", function( event ){
    stage.handleResize();
}, false );

stage.setParameters({
  backgroundColor: 'rgba(255, 255, 255, 0)'
})

var test = document.getElementsByTagName('canvas')
test[0].style.backgroundColor = 'rgba(255, 255, 255, 0)'

inp_txt_holder.style.display = "none";

function loadStructure(e){
  loaded_pdb = true;
  structure_file = e.target.files[ 0 ];
  viewport.style.display = "block";
  stage.removeAllComponents();
  PDBID = structure_file.name.split(".")[0];//no extension
  structure_file_ext = structure_file.name.split('.').pop();
  nameinput.value = PDBID;
  var colorStyle = getStyleNGL();
  var colorsc = colorStyle.scheme;
  var color = colorStyle.color;//"rgb(255,0,0)";
  stage.loadFile(structure_file).then(function (o) {
      o.addRepresentation("spacefill", {
        sele: "polymer",
        name: "polymer",
        colorScheme: colorsc,
        color:color,
        assembly: "AU"
      });
      structure = o;
      o.autoView();
      ngl_center = stage.animationControls.controls.position.clone();
  });
  current_query.innerHTML="<h4>Current PDBid :"+PDBID+"</h4>";
}

function changeName(e){

}

function changePDB(e){
  loaded_pdb = false;
  viewport.style.display = "block";
  stage.removeAllComponents();
  PDBID = e.value;
  nameinput.value = PDBID;
  var colorStyle = getStyleNGL();
  var colorsc = colorStyle.scheme;
  var color = colorStyle.color;//"rgb(255,0,0)";
  stage.loadFile('rcsb://'+PDBID).then(function (o) {
      o.addRepresentation("spacefill", {
        sele: "polymer",
        name: "polymer",
        colorScheme: colorsc,
        color:color,
        assembly: "AU"
      });
      structure = o;
      o.autoView();
      ngl_center = stage.animationControls.controls.position.clone();
      UpdateassemblyList(structure);
      setModelOptions(structure);
      setChainSelectionOptions(structure);
  });
  current_query.innerHTML="<h4>Current PDBid :"+PDBID+"</h4>";
}

function changeBU(){
  ChangeRep();
}
function changeModel(){
  ChangeModel();
}
function changeSelection(e){
  ChangeRep();
}

function showOptions(e){
    var display = (e.checked)? "block" : "none";
    //document.getElementById("shadow_options").style.display = display;
    document.getElementById("ao_options").style.display = display;
    atomic_outlines_paramsDiv.style.display = display;
    subunit_outlines_paramsDiv.style.display = display;
    chain_outlines_paramsDiv.style.display = display;
}

function updateImage()
{
    var image = document.getElementById("result");
    if(image.complete) {
        var new_image = new Image();
        //set up the new image
        new_image.id = "result";
        new_image.src = image.src;
        // insert new image and remove old
        image.parentNode.insertBefore(new_image,image);
        image.parentNode.removeChild(image);
    }
    setTimeout(updateImage, 1000);
}

function resetToDefault(){
  ao.checked = true;
  ao_params1.value = 0.0023;
  ao_params2.value = 2.0;
  ao_params3.value = 1.0;
  ao_params4.value = 0.7;
  scale.value = 12;
  for (var i=0;i<atomic_outlines_params.length;i++){
    atomic_outlines_params_elem[i].value = atomic_outlines_params[i];
  }
  for (var i=0;i<subunit_outlines_params.length;i++){
    subunit_outlines_params_elem[i].value = subunit_outlines_params[i];
  }
  for (var i=0;i<chain_outlines_params.length;i++){
    chain_outlines_params_elem[i].value = chain_outlines_params[i];
  }
}

function resetView(){
  stage.animationControls.controls.rotate(new NGL.Quaternion(0,0,0,1));
  stage.animationControls.controls.center();
  structure.autoView()
}

function loadInp(e){
  inp_file= e.target.files[ 0 ];
  //update the txt dom content
  var reader = new FileReader();
  // Closure to capture the file information.
  reader.onload = (function(theFile) {
        return function(e) {
           inp_txt = e.target.result;
           inp_txt_holder.value = inp_txt;//innerHTML = "<pre><code contenteditable=\"true\">"+inp_txt+"</code></pre>";
           use_loaded_inp_txt.checked = true;
           inp_txt_holder.style.display = "block";        };
      })(inp_file);
      // Read in the image file as a data URL.
  reader.readAsText(inp_file);
}

function getText(url){
    // read text from URL location
    var request = new XMLHttpRequest();
    request.open('GET', url, false);
    request.send(null);
    return request.responseText;
}

function readWildCard(filename){
    var url="https://mesoscope.scripps.edu/beta/data/"+filename;//https://mesoscope.scripps.edu/beta
    var outer_text = getText(url);
    return outer_text;
}

function prepareWildCard(style){
    //ignore hydrogen
    var astr=""
    if (ignore_h){
      astr+="HETATM-----HOH-- 0,9999, 0.5,0.5,0.5, 0.0\n\
ATOM  -H-------- 0,9999, 1.0,1.0,1.0, 0.0\n\
ATOM  H--------- 0,9999, 1.0,1.0,1.0, 0.0\n\
";
    }
    if (style == 1)
    {
        astr+="ATOM  ---------- 5,9999,.9,.0,.0,1.6\n";
        astr+="END\n"
    }
    else if (style == 2)
    {
        //#open wildcard1
        astr+=readWildCard("wildcard1.inp");
    }
    else if (style==3)
    {         //open wildcard1
        astr+=readWildCard("wildcard2.inp");
        chain_outlines_params_elem[2].value = 6000;
    }
    else if (style==4)
    {         //open wildcard1
        astr+=readWildCard("generic.inp");
        //chain_outlines_params_elem[2].value = 6000;
    }
    return astr
}

function prepareInput(){
    var q = stage.animationControls.controls.rotation;
    var rotation = new NGL.Euler().setFromQuaternion( q);
    var position = new NGL.Vector3(0,0,0);
    //position.subVectors(stage.animationControls.controls.position , ngl_center);
    //position.multiplyScalar(-1.0);
    var scontour_params1 = JSON.stringify(atomic_outlines_params_elem.map(i=>i.value));
    var scontour_params2 = JSON.stringify(subunit_outlines_params_elem.map(i=>i.value));
    var scontour_params3 = JSON.stringify(chain_outlines_params_elem.map(i=>i.value));
    //formData.append("shadow", shadow.checked);
    //formData.append("shadow_params",  JSON.stringify(new NGL.Vector2(shadow_params1.value,shadow_params2.value)));
    var sao = ao.checked;
    var sao_params = JSON.stringify(new NGL.Quaternion(ao_params1.value,ao_params2.value,ao_params3.value,ao_params4.value));
    var astyle = current_style;
    params_ao = [0.0023,2.0,1.0,0.7]
    var astr="read\n"
    astr+=nameinput.value+".pdb\n"
    astr+=prepareWildCard(astyle);
    astr+="center\n"
    astr+="auto\n"
    astr+="trans\n"
    astr+= position.x.toString()+","+position.y.toString()+","+position.z.toString()+"\n"
    astr+="scale\n"
    astr+=scale.value+"\n"
    astr+="zrot\n"
    astr+="90.0\n"
    astr+="yrot\n"
    astr+="-180.0\n"
    astr+="xrot\n"
    astr+=(rotation.x * 180 / Math.PI).toString()+"\n"
    astr+="yrot\n"
    astr+=(rotation.y * 180 / Math.PI).toString()+"\n"
    astr+="zrot\n"
    astr+=(rotation.z * 180 / Math.PI).toString()+"\n"
    astr+="wor\n"
    astr+="0.99607843137,0.99607843137,0.99607843137,1.,1.,1.,1.,1.\n"
    astr+=((sao)?"1":"0")+","+ ao_params1.value+","+ ao_params2.value+","+ ao_params3.value+","+ ao_params4.value+"\n"
    astr+="-30,-30                                                      # image size in pixels, negative numbers pad the molecule by that amount\n"
    astr+="illustrate\n"
    astr+=atomic_outlines_params_elem.map(i=>i.value).join()+"  # parameters for outlines, atomic\n"
    astr+=subunit_outlines_params_elem.map(i=>i.value).join()+"  # subunits\n"
    astr+=chain_outlines_params_elem.map(i=>i.value).join()+"  # outlines defining regions of the chain\n"
    astr+="calculate\n"
    astr+=nameinput.value+".pnm\n"
    return astr;
}

function BuildInput(){
  //given the option prepare the txt for input
  //depends on the style
  //var astr ="<pre><code contenteditable=\"true\">"
  var astr=prepareInput();
  //astr+="</code></pre>\n"
  inp_txt =  astr;
}

function previewInput(){
  BuildInput();
  inp_txt_holder.style.display = "block";
  inp_txt_holder.value = inp_txt;
}

function clearInpTxt(){
  inp_txt_holder.value = "";
  use_loaded_inp_txt.checked = false;
  inp_txt_holder.style.display = "none";
}

function BuildInputPDB(){
  //if selection otherwise pass the BU/AU tothe server that will wget
  //does this take in account selection and assambly?
  //how to use the bu.selection et etcx..test?
  var pdbWriter = new NGL.PdbWriter(structure.structure);
  structure_txt = pdbWriter.getData();
}
//sele = ngl_current_structure.object.biomolDict[assembly].getSelection().string;
function UpdateassemblyList(ngl_ob) {
  assembly_elem.options.length = 0;
  assembly_elem.options[0] = new Option("assembly:", "assembly:");
  assembly_elem.options[1] = new Option("AU", "AU");
  Object.keys(ngl_ob.structure.biomolDict).forEach(function(k) {
    console.log(k);
    assembly_elem.options[assembly_elem.options.length] = new Option(k, k);
  });
}

function GetSelection(sel_str, model) {
  //doesnt work with model onmly?
  var ngl_sele = "";
  sel_str = sel_str.replace("(","").replace(")","")
  if ( sel_str.includes(":") || sel_str.includes("or") || sel_str.includes("and") || sel_str.includes("/")) {ngl_sele = sel_str;}
  else {
    if (sel_str && sel_str !== "") {
    //convert to ngl selection string.
      var ch_sel = "(";
      var sp = sel_str.split(",");
      for (var i = 0; i < sp.length; i++) {
        var el = sp[i].split("!");
        console.log("el ",el);
        if (el[0] === "") {
          ch_sel += " not ";
          if (/[0-9a-zA-Z]/.test(el[1])) ch_sel += ":" + el[1].replace(":","") + " and ";
        }
        else if (/[0-9a-zA-Z]/.test(el[0])) ch_sel += ":" + el[0].replace(":","") + "  or ";
      }
      ngl_sele = ch_sel.slice(0, -5) + ")";
      console.log("ngl_sele ",ngl_sele);
  }
    if (model && model !== "") {
      ngl_sele += " and /" + model;
    }
  }
  return ngl_sele;
}

function testSelectedChain(chainName){
    var elem = sele_elem.value.split(":")
    var selected_chains = [];
    elem.forEach(
      function(el){
          if  ( el[0] !== " " && !(!(el[0]))) selected_chains.push(el[0]);
      }
    )
    if ( selected_chains.length === 0 ) return true;
    else return ($.inArray(chainName, selected_chains)!==-1);
}

function addOptionsForMultiSelect(select_id,options){
  var check_elem = document.getElementById(select_id);
  check_elem.innerHTML = "";
  for (var i = 0;i<options.length;i++) {
    var opt = options[i];//label
    var ch = (testSelectedChain(opt))?" checked ":"";
    check_elem.innerHTML += '<label for="'+opt+'"><input type="checkbox" id="'+opt+'" onclick="ChangeChainsSelection(this)"'+ch+'/>'+opt+'</label>';
    //if (i > 20) break;//safety ?
  }
}

function Util_showCheckboxes() {
  var checkboxes = document.getElementById("selection_ch_checkboxes");
  checkboxes.style.display = "block";
}

function setChainSelectionOptions(ngl_ob)
{
  //update the selection div element
   const modelStore = structure.structure.modelStore;
   var model = model_elem.value;
   var aselection = (modelStore.count > 1) ? GetSelection("", model):"polymer";
   var chnames = []
   var nch = structure.structure.getChainnameCount();
   structure.structure.eachChain( chain => {
     if ( $.inArray(chain.chainname, chnames) === -1 ) chnames.push( chain.chainname)
  }, new NGL.Selection(aselection));
  //console.log("layout_addOptionsForMultiSelect",aselection,chnames,nch);
  addOptionsForMultiSelect("selection_ch_checkboxes",chnames);
}

function setModelOptions(ngl_ob) {
  model_elem.options.length = 0;
  const modelStore = ngl_ob.structure.modelStore;
  var model = "0";
  if (modelStore.count > 1) {
    model_elem.options[model_elem.options.length] = new Option('Show model:', 'Show model:');
    model_elem.options[model_elem.options.length] = new Option('all', 'all');
  }
  for (let i = 0; i < modelStore.count; ++i) {
    //addOption(options, i, 'Model ' + (i + 1))
    model_elem.options[model_elem.options.length] = new Option(i, i,(parseInt(model) === i), (parseInt(model) === i));
  }
  //if (modelStore.count === 0) model_elem.options[model_elem.options.length] = new Option(0, 0);
}



function getStyleNGL(){
  var colorStyle = {"scheme":"uniform","color":"rgb(255,0,0)"};
  if (current_style == 1){colorStyle = {"scheme":"uniform","color":"rgb(255,0,0)"};}
  else if (current_style == 2){
      /*var schemeId = NGL.ColormakerRegistry.addScheme(function (params) {
        this.atomColor = function (atom) {
          if (atom.serial < 1000) {
            return 0x0000FF;  // blue
          } else if (atom.serial > 2000) {
            return 0xFF0000;  // red
          } else {
            return 0x00FF00;  // green
          }
        };
      });*/
      colorStyle = {"scheme":"null","color":schemeId2};
  }
  else if (current_style == 3){
      colorStyle = {"scheme":"null","color":schemeId3};
  }
  else if (current_style == 4){colorStyle = {"scheme":"uniform","color":"rgb(255,255,255)"};}
  return colorStyle;
}

function ChangeRep() {
  var colorStyle = getStyleNGL();
  var colorsc = colorStyle.scheme;
  var color = colorStyle.color;//"rgb(255,0,0)";
  stage.getRepresentationsByName("polymer").dispose();
  var params = {
    name: "polymer",
    sele: sele_elem.value,
    assembly: assembly_elem.selectedOptions[0].value
  }
  if (colorsc!="null"){
    params.colorScheme= colorsc;
  }
  params.color=color;
  stage.eachComponent(function(o) {
    o.addRepresentation("spacefill", {
      colorScheme: colorsc,
      color:color,
      name: "polymer",
      sele: sele_elem.value,
      assembly: assembly_elem.selectedOptions[0].value
    });
  });
  stage.autoView(10);
}

function ChangeChainsSelection(an_elem) {
  var aselection = "";
  //check the model
  var checkboxes = document.getElementById("selection_ch_checkboxes");
  var selection = "";
  var allcheck = checkboxes.getElementsByTagName("input");
  var all = allcheck.length;
  var countchecked = 0;
  for (var i=0;i<all;i++)
  {
      if (allcheck[i].checked) countchecked++;
  }
  var diff = all-countchecked;//1-1 or 1-0 when only one entry
  var test = false;//(diff<countchecked);
  //if (all === 1 ) test = countchecked === 0;
  if (test) {
    //aselection+="not :"+allcheck[0].id
    for (var i=0;i<all;i++)
    {
        if (!allcheck[i].checked) aselection+=" and not :"+allcheck[i].id;
    }
  }
  else {
    //aselection+=":"+allcheck[0].id
    for (var i=0;i<all;i++)
    {
        if (allcheck[i].checked) aselection+=" or :"+allcheck[i].id;
    }
  }
  //add the model
  aselection += GetSelection("",current_model);
  console.log(aselection);
  sele_elem.value = aselection;
  ChangeRep();
}

function ChangeModel() {
  var curr_sel = sele_elem.value.split("/")[0];
  //split on /
  current_model = model_elem.value;
  console.log(curr_sel + "/" + model_elem.value);
  sele_elem.value = curr_sel + "/" + model_elem.value;

  setChainSelectionOptions();
  ChangeRep();
}

function defaults(value, defaultValue) {
    return value !== undefined ? value : defaultValue;
}

const AtomFormat = 'ATOM  %5d %-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
const HetatmFormat = 'HETATM%5d %-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
function writeAtoms() {
    let ia = 1;
    let im = 1;
    let renumberSerial = false;
    let asele="";
    var o = structure;
    _records = [];
    if (sele_elem.value&& sele_elem.value!=="") {
      if (asele !== sele_elem.value) asele = sele_elem.value;
    }
    var bu = false;
    var au=assembly_elem.selectedOptions[0].value;
    if (au !== "AU" && o.object.biomolDict[au]) bu = true;
    if (asele === "" && bu) {
      //need to apply the matrix to the selection inside the BU selection ?
      //console.log(o.object.biomolDict[o.assembly].getSelection());
      //build using given selection AND biomolDic selection
      asele = "(" + o.object.biomolDict[au].getSelection().string + ") AND " + asele;
    }
    if (asele === "") asele = "polymer";
    console.log(asele);
    if(bu)
    {
      for (var j = 0; j < o.object.biomolDict[au].partList.length; j++) {
        for (var k = 0; k < o.object.biomolDict[au].partList[j].matrixList.length; k++) {
          var mat = o.object.biomolDict[au].partList[j].matrixList[k];
          //console.log("mat ",j,k);
          structure.structure.eachAtom((a) => {
                var new_pos = new NGL.Vector3(a.x, a.y, a.z);//should be uncentered
                new_pos.applyMatrix4(mat);
                const formatString = a.hetero ? HetatmFormat : AtomFormat;
                const serial = renumberSerial ? ia : a.serial;
                // Alignment of one-letter atom name such as C starts at column 14,
                // while two-letter atom name such as FE starts at column 13.
                let atomname = a.atomname;
                if (atomname.length === 1)
                    atomname = ' ' + atomname;
                _records.push(sprintf(formatString, serial, atomname, a.resname,
                                    defaults(a.chainname, ' '), a.resno, new_pos.x, new_pos.y, new_pos.z,
                                    defaults(a.occupancy, 1.0), defaults(a.bfactor, 0.0), '', // segid
                                    defaults(a.element, '')));
                ia += 1;
            }, new NGL.Selection(asele));
          //new_pos.applyMatrix4(mat);
          //pos[pos.length] = new_pos.x - center.x;
          //pos[pos.length] = new_pos.y - center.y;
          //pos[pos.length] = new_pos.z - center.z;
          //rad[rad.length] = radius;
        }
      }
    }
    else {
      structure.structure.eachAtom((a) => {
            const formatString = a.hetero ? HetatmFormat : AtomFormat;
            const serial = this.renumberSerial ? ia : a.serial;
            // Alignment of one-letter atom name such as C starts at column 14,
            // while two-letter atom name such as FE starts at column 13.
            let atomname = a.atomname;
            if (atomname.length === 1)
                atomname = ' ' + atomname;
            _records.push(sprintf(formatString, serial, atomname, a.resname, defaults(a.chainname, ' '), a.resno, a.x, a.y, a.z, defaults(a.occupancy, 1.0), defaults(a.bfactor, 0.0), '', // segid
            defaults(a.element, '')));
            ia += 1;
        }, new NGL.Selection(asele));
    }
    _records.push(sprintf('%-80s', 'END'));
    return _records.join('\n');
}

function onClick(){
    nameinput.value = nameinput.value.slice(0, 80-4)//max char is 80
    img.style.display = "none";
    document.getElementById("loader").style.display = "block";
    clearTimeout();
    var q = stage.animationControls.controls.rotation;
    var rotation = new NGL.Euler().setFromQuaternion( q);
    var formData = new FormData();
    //if (use_loaded_inp_txt.checked){
    formData.append("key", "query");//array of x,y,z
    if (use_loaded_inp_txt.checked) formData.append("input_txt", inp_txt);
    else {
      var input = prepareInput();
      console.log(input);
      formData.append("input_txt", input);
    }
    if (loaded_pdb) {
      if (structure_file_ext == "pdb")
        if (sele_elem.value!=""){
            structure_txt=writeAtoms();
            formData.append("PDBtxt",structure_txt);}
        else formData.append("PDBfile",structure_file);
      else{
        structure_txt=writeAtoms();
        formData.append("PDBtxt",structure_txt);
      }
    }
    else if (custom_structure) {
      structure_txt=writeAtoms();
      formData.append("PDBtxt",structure_txt);
    }
    else {
      if (sele_elem.value!=""){
          structure_txt=writeAtoms();
          formData.append("PDBtxt",structure_txt);
        }
      else formData.append("PDBID", PDBID);
    }
    formData.append("_id", _id);
    formData.append("name",nameinput.value);
    //}
    /*else {
      formData.append("key", "processpreview");//array of x,y,z
      formData.append("PDBID", PDBID);
      formData.append("position", JSON.stringify(new NGL.Vector3(0,0,0)));
      formData.append("rotation", JSON.stringify(rotation));
      formData.append("scale", parseFloat(scale.value));
      formData.append("_id", _id);
      formData.append("contour_params1",JSON.stringify(atomic_outlines_params_elem.map(i=>i.value)));
      formData.append("contour_params2",JSON.stringify(subunit_outlines_params_elem.map(i=>i.value)));
      formData.append("contour_params3",JSON.stringify(chain_outlines_params_elem.map(i=>i.value)));
      //formData.append("shadow", shadow.checked);
      //formData.append("shadow_params",  JSON.stringify(new NGL.Vector2(shadow_params1.value,shadow_params2.value)));
      formData.append("ao", ao.checked);
      formData.append("ao_params",  JSON.stringify(new NGL.Quaternion(ao_params1.value,ao_params2.value,ao_params3.value,ao_params4.value)));
      formData.append("style", ill_style.value);
    }*/
    console.log("submit to server");
    console.log(formData);
    //show progress bar
    var xhr = new XMLHttpRequest();
    var url = 'https://mesoscope.scripps.edu/beta/cgi-bin/illustrator.py'
    xhr.open('POST', url);
    xhr.timeout = 1000000000;
    xhr.ontimeout = function () {
      console.error("The request for " + url + " timed out.");
    };
    xhr.onload = function () {
      // do something to response
      console.log(this.responseText);
      var data = JSON.parse(this.responseText)
      an_img.src = data.image+"?"+i;
      _id = parseInt(data.id);
      //hide progress bar
      document.getElementById("loader").style.display = "none";
      img.style.display = "block";
      linkimg.href = data.image;
      current_query.innerHTML="<h4>Current PDB and working Id :"+PDBID+" <a href='https://mesoscope.scripps.edu/data/tmp/ILL/"+_id+"'> "+_id+"</a></h4>";
      i=i+1;
    };
    xhr.send(formData);
}
