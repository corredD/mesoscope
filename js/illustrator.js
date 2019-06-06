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
var ignore_w = true;
var current_style = "ProteinDNA";
var changed_selection = false;
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
var inp_options =document.getElementById("inp_options");
var ignore_H= document.getElementById("hb");
var ignore_W= document.getElementById("water");
var ucolor = document.getElementById("ucolor");
var customStyle = document.getElementById("customStyle");
var customStyleColor = document.getElementById("acolor");
var customStyleSelectionAtoms = document.getElementById("atoms");
var customStyleSelectionResidues = document.getElementById("residues");
var customStyleSelectionChains = document.getElementById("chains");

var customStyleSelectionAtomsList = new Awesomplete(customStyleSelectionAtoms,
                                      {minChars: 1,autoFirst:true,maxItems:200});
var customStyleSelectionResiduesList = new Awesomplete(customStyleSelectionResidues,{minChars: 1,autoFirst:true,maxItems:200});
var customStyleSelectionChainsList = new Awesomplete(customStyleSelectionChains,{minChars: 1,autoFirst:true,maxItems:200});

var customStyleCard = customStyle.firstChild;

window.addEventListener('load', function() {
  //inp_options.style.display = "none";
})
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

function toRGB(color){
  return "rgb("+Math.ceil(color[0]*255).toString()+","+
                Math.ceil(color[1]*255).toString()+","+
                Math.ceil(color[2]*255).toString()+")";
}

function toRGBf(color){
  return "rgb("+color[0].toString()+","+
                color[1].toString()+","+
                color[2].toString()+")";
}

//wildcard1
var schemeId2 = NGL.ColormakerRegistry.addSelectionScheme([
  ["rgb(255,140,140)", "_O and nucleic"],//1.00, 0.55, 0.55
  ["rgb(255,125,125)", "_P and nucleic"],//1.00, 0.49, 0.49
  ["rgb(255,166,166)", "not _O and not _P and nucleic"],//1.00, 0.65, 0.65
  ["rgb(127,178,255)", "_C"],
  ["rgb(102,153,255)", "not _C"]// 0.40, 0.60, 1.00
], "style2");
//0.50, 0.70, 1.00
//wildcard2
var schemeId3 = NGL.ColormakerRegistry.addSelectionScheme([
  ["rgb(127,178,255)", ".CA"]
], "style2");

var schemeId5 = NGL.ColormakerRegistry.addSelectionScheme([
  [toRGB([1.00, 0.20, 0.20]), "(.O5' or .O3' or .OP) and nucleic"],//1.00, 0.55, 0.55
  [toRGB([1.00, 0.90, 0.50]), "_P and nucleic"],//1.00, 0.49, 0.49
  [toRGB([0.80, 0.90, 1.00]), "_N and nucleic"],//1.00, 0.65, 0.65
  [toRGB([1.00, 0.80, 0.80]), "_O and not (.O5' or .O3' or .OP) and nucleic"],
  [toRGB([1.00, 1.00, 1.00]), "_C"],
  [toRGB([1.00, 0.20, 0.20]), "((.OD and ASP) or (.OE and GLU)) and protein"],
  [toRGB([0.10, 0.70, 1.00]), "((.NZ and LYS) or ((.NH or .NE) and ARG)) or ((.ND or .NE) and HIS)) and protein"],
  [toRGB([1.00, 0.80, 0.80]), "_O and protein"],
  [toRGB([0.80, 0.90, 1.00]), ".N and protein"],
  [toRGB([1.00, 0.80, 0.80]), "_O and protein"],
  [toRGB([0.60, 0.90, 0.60]), "_C and (ligand and hetero)"],
  [toRGB([0.40, 0.90, 0.40]), "not _C and (ligand and hetero)"],
], "style5");

var schemeId6 = NGL.ColormakerRegistry.addSelectionScheme([
  [toRGB([1.00, 1.00, 1.00]), "_H"],//1.00, 0.55, 0.55
  [toRGB([0.50, 0.50, 0.50]), "_C"],//1.00, 0.49, 0.49
  [toRGB([0.10, 0.70, 1.00]), "_N"],//1.00, 0.65, 0.65
  [toRGB([1.00, 0.20, 0.20]), "_O"],
  [toRGB([1.00, 0.90, 0.50]), "_S or _SE or _P"],
  [toRGB([0.40, 0.90, 0.40]), "(_F or _BR or _CL or _I) and (ligand and hetero)"],
  [toRGB([1.00, 0.40, 1.00]), "(_MG or _CA or _NA or _K or _FE or _CU or _ZN ) and (ligand and hetero)"]
], "style6");

var schemeGeneral;
var schemeGeneralStr;
var schemeCustom;
var schemeCustomStr;
var cards=[];

inp_txt_holder.addEventListener("input", function() {
    console.log("input event fired");
    //update the ino-text
    //inp_txt_holder.innerHTML = inp_txt_holder.innerHTML.replace("<br>","\n")
    inp_txt = inp_txt_holder.value;//.replace("<pre>","").replace("</pre>","");//innerHTML.replace("<pre>","").replace("</pre>","").replace("<code contenteditable=\"true\">","").replace("</code>","");
}, false);

assembly_elem.addEventListener("selected", function() {
    ChangeRep();//innerHTML.replace("<pre>","").replace("</pre>","").replace("<code contenteditable=\"true\">","").replace("</code>","");
}, false);

model_elem.addEventListener("selected", function() {
    ChangeModel();//innerHTML.replace("<pre>","").replace("</pre>","").replace("<code contenteditable=\"true\">","").replace("</code>","");
}, false);

ill_style.addEventListener("selected", function() {
    console.log("input event selected");
    //update the ino-text
    current_style = ill_style.selected;
    if (current_style == "One" || current_style== "OneRange") ucolor.style.display = "";
    else ucolor.style.display = "none";
    if (current_style == "Custom"){
        customStyle.style = "";
    }
    else {
      customStyle.style.display = "none";
    }

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
      UpdateassemblyCombo(structure);// UpdateassemblyList(structure);
      setModelOptionsCombo(structure);//setModelOptions(structure);
      setChainSelectionOptions(structure);
      setCustomStyle(structure);
      if(current_style!="Custom") {
        customStyle.style.display="none";
      }
      changed_selection = true;
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
        assembly: "BU1"
      });
      structure = o;
      o.autoView();
      ngl_center = stage.animationControls.controls.position.clone();
      UpdateassemblyCombo(structure);// UpdateassemblyList(structure);
      setModelOptionsCombo(structure);//setModelOptions(structure);
      setChainSelectionOptions(structure);
      setCustomStyle(structure);
      changed_selection = true;
      if(current_style!="Custom") {
        customStyle.style.display="none";
      }
  });
  current_query.innerHTML="<h4>Current PDBid :"+PDBID+"</h4>";
}

function changeBU(){
  getEntityChainAtomStyleAndNGL();
  ChangeRep();
}
function changeModel(){
  getEntityChainAtomStyleAndNGL();
  ChangeModel();
}
function changeSelection(e){
  getEntityChainAtomStyleAndNGL();
  ChangeRep();
}

function showOptions(e){
    var display = (e.checked)? "block" : "none";
    //document.getElementById("shadow_options").style.display = display;
    document.getElementById("ao_options").style.display = display;
    atomic_outlines_paramsDiv.style.display = display;
    subunit_outlines_paramsDiv.style.display = display;
    chain_outlines_paramsDiv.style.display = display;
    inp_options.style.display = display;
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
           inp_txt_holder.value =  inp_txt ;//innerHTML = "<pre><code contenteditable=\"true\">"+inp_txt+"</code></pre>";
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
//ATOM  HCCC-RES-A 0,9999  0.00, 0.00, 0.00, 1.6
//HETATMHCCC-RES-A 0,9999  0.00, 0.00, 0.00, 1.6
//HETATM----------
const IllAtomFormat   = 'ATOM  %4s-%3s-%1s %d,%4d  %1.2f, %1.2f, %1.2f, %1.1f';
const IllHetatmFormat = 'HETATM%4s-%3s-%1s %d,%4d  %1.2f, %1.2f, %1.2f, %1.1f';

function Ill_defaults(value, defaultValue) {
    return (value !== undefined && value !== "")? value : defaultValue;
}

function OnCard(atom,residue,chain,color){
  var card ={};
  card.atom = atom;
  card.residue = residue;
  card.chain = chain;
  card.color = color;
  return card;
}

function getEntityChainAtomNGLStyle(){

}

function getEntityChainAtomStyleAndNGL(){
    //one input color?
    //handle HETATOM
    var _records=[];
    var _selection_schem=[];
    var nentity = structure.structure.entityList.length;
    var nchains;
    var natom;//_C and not _C
    //schemeGeneral
    var entity_colors = GenerateNColor(nentity);
    structure.structure.eachEntity(ent=>{
      var chlist = ent.chainIndexList;
      var cnames = []
      for (var chid in chlist){
          var cname = structure.structure.chainStore.getChainname(chlist[chid]);
          if (ent.entityType==1) {
            if (testSelectedChain(cname))
                if (!cnames.includes(cname)) cnames.push(cname);
          }
      }
      var is_protein = false;
      var chain_colors = GenerateOneColorRangePalette(entity_colors[ent.index].rgb(),cnames.length);
      var cid = 0;
      ent.eachChain( chain => {
        var chain_is_protein = false;
        var found = false;
        if ( cnames.includes(chain.chainname ) ) {
          var atom_colors = GenerateOneColorRangePalette(chain_colors[cid].rgb(),2);
          var c1 = atom_colors[0].rgb();//chain_colors[cid].rgb()
          var c2 = atom_colors[1].rgb();//chain_colors[cid].brighten().rgb()
          cid+=1;
          chain.eachResidue(r =>{
            var res = r.resname;
            if (r.moleculeType == 4 || r.moleculeType == 5) {
              //break;
              if (!found) {
                chain_is_protein = false;
                found = true;
              }
            }
            else if (r.moleculeType == 3) {
              if (!found) {
                chain_is_protein = true;
                found = true;
              }
            }
          });
          if (chain_is_protein) {
              _records.push(sprintf(IllAtomFormat,
                                  Ill_defaults("-C--", '----'),
                                  Ill_defaults("", '---'),
                                  Ill_defaults(chain.chainname, '-'),
                                  0,
                                  9999,
                                  Ill_defaults(c1[0]/255.0, 1.0),
                                  Ill_defaults(c1[1]/255.0, 0.0),
                                  Ill_defaults(c1[2]/255.0, 0.0),
                                  Ill_defaults("", 1.6) ) );
              _records.push(sprintf(IllAtomFormat,
                                  Ill_defaults("----", '----'),
                                  Ill_defaults("", '---'),
                                  Ill_defaults(chain.chainname, '-'),
                                  0,
                                  9999,
                                  Ill_defaults(c2[0]/255.0, 1.0),
                                  Ill_defaults(c2[1]/255.0, 0.0),
                                  Ill_defaults(c2[2]/255.0, 0.0),
                                  Ill_defaults("", 1.6) ) );

          }
          else {
            _records.push(sprintf(IllAtomFormat,
                                Ill_defaults("-C--", '----'),
                                Ill_defaults("", '---'),
                                Ill_defaults(chain.chainname, '-'),
                                0,
                                9999,
                                Ill_defaults(c1[0]/255.0, 1.0),
                                Ill_defaults(c1[1]/255.0, 0.0),
                                Ill_defaults(c1[2]/255.0, 0.0),
                                Ill_defaults("", 1.6) ) );
            _records.push(sprintf(IllAtomFormat,
                                Ill_defaults("----", '----'),
                                Ill_defaults("", '---'),
                                Ill_defaults(chain.chainname, '-'),
                                0,
                                9999,
                                Ill_defaults(c2[0]/255.0, 1.0),
                                Ill_defaults(c2[1]/255.0, 0.0),
                                Ill_defaults(c2[2]/255.0, 0.0),
                                Ill_defaults("", 1.6) ) );

          }
          _selection_schem.push([toRGBf(c2),"_C and :"+chain.chainname]);
          _selection_schem.push([toRGBf(c1),"not _C and :"+chain.chainname]);
        }
      });
    });
    console.log(_selection_schem);
    schemeGeneral = NGL.ColormakerRegistry.addSelectionScheme(_selection_schem,"entity");
    astr = _records.join('\n')+"\n";
    schemeGeneralStr = astr;
    return astr;
}

function getStructureWildCardStyle5(){
  _records=[];
  var nucleic_colors_templates = [
              OnCard("-P--","","",[1.00, 0.90, 0.50, 1.8]),
              OnCard("-O3'","","",[1.00, 0.20, 0.20, 1.5]),
              OnCard("-O5'","","",[1.00, 0.20, 0.20, 1.5]),
              OnCard("-OP-","","",[1.00, 0.20, 0.20, 1.5]),
              OnCard("-N--","","",[0.80, 0.90, 1.00, 1.5]),
              OnCard("-O--","","",[1.00, 0.80, 0.80, 1.5]),
              OnCard("-C--","","",[1.00, 1.00, 1.00, 1.6])];
  var hetatm_n_color_templates=[]
  var proteins_color_templates = [
              OnCard("-OD-","ASP","",[1.00, 0.20, 0.20, 1.6]),
              OnCard("-OE-","GLU","",[1.00, 0.20, 0.20, 1.6]),
              OnCard("-NZ-","LYS","",[0.10, 0.70, 1.00, 1.6]),
              OnCard("-NH-","ARG","",[0.10, 0.70, 1.00, 1.6]),
              OnCard("-NE-","ARG","",[0.10, 0.70, 1.00, 1.6]),
              OnCard("-ND-","HIS","",[0.10, 0.70, 1.00, 1.6]),
              OnCard("-NE-","HIS","",[0.10, 0.70, 1.00, 1.6]),
              OnCard("-N--","","",[0.80, 0.90, 1.00, 1.5]),
              OnCard("-O--","","",[1.00, 0.80, 0.80, 1.5]),
              OnCard("-C--","","",[1.00, 1.00, 1.00, 1.6]),
              OnCard("-S--","","",[1.00, 0.90, 0.50, 1.8])
            ];
  var hetatm_p_color_templates=[
      OnCard("-C--","","",[0.60, 0.90, 0.60, 1.5]),
      OnCard("----","","",[0.40, 0.90, 0.40, 1.5])
    ];
  let asele="";
  if (sele_elem.value&& sele_elem.value!=="") {
    if (asele !== sele_elem.value) asele = sele_elem.value;
  }
  let mid = parseInt(model_elem.selected);
  console.log(asele);
  structure.structure.eachEntity(ent=>{
    var chlist = ent.chainIndexList;//per model?
    var cnames = []
    let chid = mdi;
    //for (var chid in chlist){
        var cname = structure.structure.chainStore.getChainname(chlist[chid]);
        if (ent.entityType==1) {
          if (testSelectedChain(cname))
              if (!cnames.includes(cname)) cnames.push(cname);
        }
    //}
    var is_protein = false;
    ent.eachChain( chain => {
      var chain_is_protein = false;
      var found = false;
      _residues_done={};
      console.log(chain);
      console.log(chain.chainname);
      console.log( cnames.includes(chain.chainname ) );
      if ( cnames.includes(chain.chainname ) ) {
        chain.eachResidue(r =>{
          var res = r.resname;
          if (r.moleculeType == 4 || r.moleculeType == 5) {
            //break;
            if (!found) {
              chain_is_protein = false;
              found = true;
            }
          }
          else if (r.moleculeType == 3) {
            if (!found) {
              chain_is_protein = true;
              found = true;
            }
          }
        });

        if (chain_is_protein) {
          for (var d in proteins_color_templates) {
            var templ = proteins_color_templates[d];
            _records.push(sprintf(IllAtomFormat,
                                Ill_defaults(templ.atom, '----'),
                                Ill_defaults(templ.residue, '---'),
                                Ill_defaults(chain.chainname, '-'),
                                0,
                                9999,
                                Ill_defaults(templ.color[0], 1.0),
                                Ill_defaults(templ.color[1], 0.0),
                                Ill_defaults(templ.color[2], 0.0),
                                Ill_defaults(templ.color[3], 1.5) ) );
          }
        }
        else {
          for (var d in nucleic_colors_templates) {
            var templ = nucleic_colors_templates[d];
            _records.push(sprintf(IllAtomFormat,
                                Ill_defaults(templ.atom, '----'),
                                Ill_defaults(templ.residue, '---'),
                                Ill_defaults(chain.chainname, '-'),
                                0,
                                9999,
                                Ill_defaults(templ.color[0], 1.0),
                                Ill_defaults(templ.color[1], 0.0),
                                Ill_defaults(templ.color[2], 0.0),
                                Ill_defaults(templ.color[3], 1.5) ) );
          }
        }
      }
    },new NGL.Selection(asele));
  });
  //add hetatm
  for (var d in hetatm_p_color_templates) {
    var templ = hetatm_p_color_templates[d];
    _records.push(sprintf(IllHetatmFormat,
                        Ill_defaults(templ.atom, '----'),
                        Ill_defaults(templ.residue, '---'),
                        Ill_defaults(templ.chain, '-'),
                        0,
                        9999,
                        Ill_defaults(templ.color[0], 1.0),
                        Ill_defaults(templ.color[1], 0.0),
                        Ill_defaults(templ.color[2], 0.0),
                        Ill_defaults(templ.color[3], 1.5) ) );
  }
  astr = _records.join('\n')+"\n";
  return astr;
}

function getStructureWildCardStyle1(){
  //proteins
  //nucleic
  _records=[];
  var _residues_done={};
  var nucleic_colors_templates = {"-P--":[1.00, 0.49, 0.49, 1.8],
                "-O3'":[1.00, 0.55, 0.55, 1.5],
                "-O5'":[1.00, 0.55, 0.55, 1.5],
                "-OP-":[1.00, 0.55, 0.55, 1.5],
                "---'":[1.00, 0.55, 0.55, 1.6],
                "----":[1.00, 0.75, 0.79, 1.6]
      };
  var proteins_color_templates = {"-C--":[0.50, 0.70, 1.00, 1.6],
                                  "----":[0.40, 0.60, 1.00, 1.5]};
  structure.structure.eachEntity(ent=>{
    var chlist = ent.chainIndexList;
    var cnames = []
    for (var chid in chlist){
        var cname = structure.structure.chainStore.getChainname(chlist[chid]);
        if (ent.entityType==1) {
          if (testSelectedChain(cname))
              cnames.push(cname);
        }
    }
    var is_protein = false;
    ent.eachChain( chain => {
      var chain_is_protein = false;
      _residues_done={};
      console.log(chain);
      console.log(chain.chainname);
      console.log( cnames.includes(chain.chainname ) );
      if ( cnames.includes(chain.chainname ) ) {
        chain.eachResidue(r =>{
          var res = r.resname;
          if (!(r.resname in _residues_done)){
            _residues_done[res] = "done";
            const formatString = r.hetero ? IllHetatmFormat : IllAtomFormat;
            var atoms = "----";
            var res = r.resname;
            if (res.length==1) {
              res = "--"+res;
            }
            var chains = chain.chainname;
            var rangeS = 0;
            var rangeE = 9999;
            if (r.moleculeType == 4 || r.moleculeType == 5) {
              for (var d in nucleic_colors_templates) {
                var templ = nucleic_colors_templates[d];
                _records.push(sprintf(formatString, defaults(d, '----'),
                                    Ill_defaults(res, '---'),
                                    Ill_defaults(chains, '--'),
                                    Ill_defaults(rangeS, '0'),
                                    Ill_defaults(rangeE, '9999'),
                                    Ill_defaults(templ[0], 1.0),
                                    Ill_defaults(templ[1], 0.0),
                                    Ill_defaults(templ[2], 0.0),
                                    Ill_defaults(templ[3], 1.5) ) );
              }
            }
            else if (r.moleculeType == 3) {
              chain_is_protein = true;
            }
          }
        });
        /*structure.structure.residueMap.list.forEach(function(r){
            const formatString = r.hetero ? IllHetatmFormat : IllAtomFormat;
            var atoms = "----";
            var res = r.resname;
            if (res.length==1) {
              res = "--"+res;
            }
            var chains = chain.chainname;
            var rangeS = 0;
            var rangeE = 9999;
            if (r.moleculeType == 4 || r.moleculeType == 5) {
            //sprintf(IllAtomFormat1 ,"----","---","-",0,9999,1.00,0.5,0.5,1.5)
              for (var d in nucleic_colors_templates) {
                var templ = nucleic_colors_templates[d];
                _records.push(sprintf(formatString, defaults(d, '----'),
                                    Ill_defaults(res, '---'),
                                    Ill_defaults(chains, '--'),
                                    Ill_defaults(rangeS, '0'),
                                    Ill_defaults(rangeE, '9999'),
                                    Ill_defaults(templ[0], 1.0),
                                    Ill_defaults(templ[1], 0.0),
                                    Ill_defaults(templ[2], 0.0),
                                    Ill_defaults(templ[3], 1.5) ) );
              }
          }
            else if (r.moleculeType == 3) {
              chain_is_protein = true;
            }
        });*/
        if (chain_is_protein) {
          for (var d in proteins_color_templates) {
            var templ = proteins_color_templates[d];
            _records.push(sprintf(IllAtomFormat, defaults(d, '----'),
                                '---',
                                Ill_defaults(chain.chainname, '--'),
                                0,
                                9999,
                                Ill_defaults(templ[0], 1.0),
                                Ill_defaults(templ[1], 0.0),
                                Ill_defaults(templ[2], 0.0),
                                Ill_defaults(templ[3], 1.5) ) );
          }
        }
        //chain type?
      }
    });
  });
  /*structure.structure.residueMap.list.forEach(function(r){
      //r.chemCompType
      //r.hetero
      //r.resname
      //r.moleculeType
      if (r.moleculeType == 4 || r.moleculeType == 5) {
        const formatString = r.hetero ? IllHetatmFormat : IllAtomFormat;
        //sprintf(IllAtomFormat1 ,"----","---","-",0,9999,1.00,0.5,0.5,1.5)
        var atoms = "----";
        var res = r.resname;
        if (res.length==1) {
          res = "--"+res;
        }
        var chains = "-";
        var rangeS = 0;
        var rangeE = 9999;
        for (var d in nucleic_colors_templates) {
          var templ = nucleic_colors_templates[d];
          _records.push(sprintf(formatString, defaults(d, '----'),
                              defaults(res, '---'),
                              defaults(chains, '--'),
                              defaults(rangeS, '0'),
                              defaults(rangeE, '9999'),
                              defaults(templ[0], 1.0),
                              defaults(templ[1], 0.0),
                              defaults(templ[2], 0.0),
                              defaults(templ[3], 1.5) ) );
        }
      }
  });
  astr+="HETATMMG-------- 0,9999  1.00, 0.60, 1.00, 1.6\n\
HETATMCA-------- 0,9999  1.00, 0.60, 1.00, 1.6\n\
HETATMFE-------- 0,9999  1.00, 0.60, 1.00, 1.6\n\
HETATMMN-------- 0,9999  1.00, 0.60, 1.00, 1.6\n\
HETATM-C-------- 0,9999  0.60, 0.95, 0.60, 1.6\n\
HETATM---------- 0,9999  0.50, 0.95, 0.50, 1.5\n\
"

  */

  var hetatm_p_color_templates=[
      OnCard("-C--","","",[0.60, 0.90, 0.60, 1.5]),
      OnCard("----","","",[0.40, 0.90, 0.40, 1.5])
    ];
    //add hetatm
  for (var d in hetatm_p_color_templates) {
    var templ = hetatm_p_color_templates[d];
    _records.push(sprintf(IllHetatmFormat,
                        Ill_defaults(templ.atom, '----'),
                        Ill_defaults(templ.residue, '---'),
                        Ill_defaults(templ.chain, '-'),
                        0,
                        9999,
                        Ill_defaults(templ.color[0], 1.0),
                        Ill_defaults(templ.color[1], 0.0),
                        Ill_defaults(templ.color[2], 0.0),
                        Ill_defaults(templ.color[3], 1.5) ) );
  }
  astr = _records.join('\n')+"\n";
  console.log(_residues_done);
  return astr;
}

function prepareWildCard(style){
    //ignore hydrogen
    var astr=""
    if (ignore_H.checked){
      astr+="HETATM-H-------- 0,9999, 1.1,1.1,1.1, 0.0\n\
HETATMH--------- 0,9999, 1.1,1.1,1.1, 0.0\n\
ATOM  -H-------- 0,9999, 1.1,1.1,1.1, 0.0\n\
ATOM  H--------- 0,9999, 1.1,1.1,1.1, 0.0\n\
";
    }
    if (ignore_W.checked){
      astr+="HETATM-----HOH-- 0,9999, 1.5,1.5,1.5, 0.0\n";
    }
    if (style == "OneRange")
    {
        var col = Util_getRGB(ucolor.value);
        var r = col.arr[0]/255.0;
        var g = col.arr[1]/255.0;
        var b = col.arr[2]/255.0;
        astr+=sprintf(IllAtomFormat,'-C--','---','-','0','9999',r,g,b,1.6 )+"\n";
        astr+=sprintf(IllAtomFormat,'----','---','-','0','9999',(r>=0.1)?r-0.1:r,
                        (g>=0.1)?g-0.1:g,(b>=0.1)?b-0.1:b,1.6 )+"\n";
        astr+=sprintf(IllHetatmFormat,'----','---','-','0','9999',(r>=0.1)?r-0.1:r,
                        (g>=0.1)?g-0.1:g,(b>=0.1)?b-0.1:b,1.6 )+"\n";
        astr+=sprintf(IllHetatmFormat,'-C--','---','-','0','9999',r,g,b,1.6 )+"\n"
    }
    else if (style == "One"){
      var col = Util_getRGB(ucolor.value);
      var r = col.arr[0]/255.0;
      var g = col.arr[1]/255.0;
      var b = col.arr[2]/255.0;
      astr+=sprintf(IllAtomFormat,'----','---','-','0','9999',r,g,b,1.6 )+"\n";
      astr+=sprintf(IllHetatmFormat,'----','---','-','0','9999',r,g,b,1.6 )+"\n"
    }
    else if (style == "ProteinDNA")
    {
        astr+=getStructureWildCardStyle1();//readWildCard("wildcard1.inp");
    }
    else if (style=="Coarse")
    {         //open wildcard1
        //astr+=readWildCard("wildcard2.inp");
        astr+="ATOM  -P---  --- 0,9999 1.00, 0.49, 0.49, 5.0\n\
ATOM  -C5--  --- 0,9999 1.00, 0.49, 0.49, 5.0\n\
ATOM  -P--- D--- 0,9999 1.00, 0.75, 0.40, 5.0\n\
ATOM  -C5-- D--- 0,9999 1.00, 0.75, 0.40, 5.0\n\
ATOM  -CA------- 0,9999 0.50, 0.70, 1.00, 5.0\n\
HETATM-C-------- 0,9999 0.60, 0.95, 0.60, 1.6\n\
HETATM---------- 0,9999 0.50, 0.95, 0.50, 1.5\n";
        chain_outlines_params_elem[2].value = 6000;
    }
    else if (style=="Generic")
    {         //open wildcard1
        astr+=readWildCard("generic.inp");
        //chain_outlines_params_elem[2].value = 6000;
    }
    else if (style=="Atomic")
    {         //open wildcard1
        astr+=getStructureWildCardStyle5();
    }
    else if (style=="CPK")
    {         //open wildcard1
        astr+=readWildCard("wildcard_cpk.inp");
    }
    else if (style=="EntityChain")
    {
      if (schemeGeneralStr==null) schemeGeneralStr=getEntityChainAtomStyleAndNGL();
      astr+=schemeGeneralStr;
    }
    else if (style=="Custom")
    {
      //use the current list of card=>string
      //or premade them as we go
      astr+=schemeCustomStr;
    }
    //else if (style==7){
        //use uniq color to get a range using IwantHue?
        //how many color ?
    //}
    astr+="END\n"
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
    //astr+="0.99607843137,0.99607843137,0.99607843137,1.,1.,1.,1.,1.\n"
    astr+="0.,0.,0.,0.,0.,0.,1.,1.\n"
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
  inp_txt_holder.value =  inp_txt ;
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

function UpdateassemblyCombo(ngl_ob) {
  assembly_elem.innerHTML = '';// <wired-item style=\"color:black\" value=\"AU\">AU</wired-item>\n\
  assembly_elem.innerHTML += '<wired-item style="color:black" value="AU">AU</wired-item>\n'
  Object.keys(ngl_ob.structure.biomolDict).forEach(function(k) {
    console.log(k);
    assembly_elem.innerHTML += '<wired-item style="color:black" value="'+k+'">'+k+'</wired-item>\n'
  });
  assembly_elem.selected = "BU1";
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
    var tsplit = sele_elem.value.split("(polymer or rna or dna)");
    var elem=[];
    if (tsplit.length < 2) elem = tsplit[0].split(":");
    else elem = tsplit[1].split(":");
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
    //check_elem.innerHTML += '<label for="'+opt+'"><input type="checkbox" id="'+opt+'" onclick="ChangeChainsSelection(this)"'+ch+'/>'+opt+'</label>';
    check_elem.innerHTML += '<wired-checkbox id="'+opt+'" name="'+opt+'"onclick="ChangeChainsSelection(this)"'+ch+'>'+opt+'</wired-checkbox>';
    //if (i > 20) break;//safety ?
  }
}

function Util_showCheckboxes() {
  var checkboxes = document.getElementById("selection_ch_checkboxes");
  checkboxes.style.display = "block";
}

function setCustomStyle(ngl_ob){
    cards=[];

    //customStyleSelectionAtoms.innerHTML = '';
    //customStyleSelectionResidues.innerHTML = '';
    //customStyleSelectionChains.innerHTML = '';
    var atlist = ["All"];
    //customStyleSelectionAtoms.innerHTML += '<wired-item style="width:30px;color:black" value="All">All</wired-item>\n'
    ngl_ob.structure.atomMap.list.forEach(function(k) {
      //console.log(k);
      atlist.push(k.atomname);
      //customStyleSelectionAtoms.innerHTML += '<wired-item style="color:black" value="'+k.atomname+'">'+k.atomname+'</wired-item>\n'
    });
    customStyleSelectionAtomsList.list = atlist;

    var reslist = ["All"];
    //customStyleSelectionResidues.innerHTML += '<wired-item style="width:30px;color:black" value="All">All</wired-item>\n'
    ngl_ob.structure.residueMap.list.forEach(function(k) {
      //console.log(k);
      reslist.push(k.resname);
      //customStyleSelectionResidues.innerHTML += '<wired-item style="color:black" value="'+k.resname+'">'+k.resname+'</wired-item>\n'
    });
    customStyleSelectionResiduesList.list = reslist;

    var chnames = ["All"]
    var nch = ngl_ob.structure.getChainnameCount();
    ngl_ob.structure.eachChain( chain => {
      if ( $.inArray(chain.chainname, chnames) === -1 ) chnames.push( chain.chainname)
   });
   customStyleSelectionChainsList.list = chnames;
   //customStyleSelectionChains.innerHTML += '<wired-item style="width:30px;color:black" value="All">All</wired-item>\n'
   //chnames.forEach(function(k) {
      //console.log(k);
  //    customStyleSelectionChains.innerHTML += '<wired-item style="color:black" value="'+k+'">'+k+'</wired-item>\n'
  //  });
}

function setChainSelectionOptions(ngl_ob)
{
  //update the selection div element
   const modelStore = structure.structure.modelStore;
   var model = model_elem.selected;//.value;
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

function setModelOptionsCombo(ngl_ob) {
  model_elem.innerHTML = '';
  const modelStore = ngl_ob.structure.modelStore;
  var model = "0";
  if (modelStore.count > 1) {
    model_elem.innerHTML+= '<wired-item style="color:black" value="All">All</wired-item>\n'
  }
  for (let i = 0; i < modelStore.count; ++i) {
    //addOption(options, i, 'Model ' + (i + 1))
    model_elem.innerHTML+= '<wired-item style="color:black" value="'+i+'">'+i+'</wired-item>\n'
  }
}

function getStyleNGL(){
  var colorStyle = {"scheme":"uniform","color":"rgb(255,0,0)"};
  if (current_style == "OneRange"){
    var col = Util_getRGB(ucolor.value);
    var lr = (col.arr[0]>=25)? col.arr[0]-25:col.arr[0];
    var lg = (col.arr[1]>=25)? col.arr[1]-25:col.arr[1];
    var lb = (col.arr[2]>=25)? col.arr[2]-25:col.arr[2];
    var schemeId1 = NGL.ColormakerRegistry.addSelectionScheme([
      [col.rgb, "_C"],
      ["rgb("+lr+","+lg+","+lb+")", "not _C"]// 0.40, 0.60, 1.00
    ], "style2");
    colorStyle = {"scheme":"null","color":schemeId1};
  }
  else if (current_style == "One"){
    var col = Util_getRGB(ucolor.value);
    colorStyle = {"scheme":"uniform","color":col.rgb};
  }
  else if (current_style == "ProteinDNA"){
      colorStyle = {"scheme":"null","color":schemeId2};
  }
  else if (current_style == "Coarse"){
      colorStyle = {"scheme":"null","color":schemeId3};
  }
  else if (current_style == "Generic"){colorStyle = {"scheme":"uniform","color":"rgb(255,255,255)"};}
  else if (current_style == "Atomic"){colorStyle = {"scheme":"null","color":schemeId5};}
  else if (current_style == "CPK"){colorStyle = {"scheme":"null","color":schemeId6};}
  else if (current_style == "EntityChain"){
    getEntityChainAtomStyleAndNGL();//update
    colorStyle = {"scheme":"null","color":schemeGeneral};
  }
  else if (current_style == "Custom"){
    colorStyle = {"scheme":"custom","color":schemeCustom};
  }
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
    assembly: assembly_elem.selected//Options[0].value
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
      assembly: assembly_elem.selected//Options[0].value
    });
  });
  stage.autoView(10);
  changed_selection = true;
}

function ChangeChainsSelection(an_elem) {
  var aselection = "";
  //check the model
  var checkboxes = document.getElementById("selection_ch_checkboxes");
  var selection = "";
  var allcheck = checkboxes.getElementsByTagName("wired-checkbox");//input");
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
  current_model = model_elem.selected;//.value;
  console.log(curr_sel + "/" + current_model);
  sele_elem.value = curr_sel + "/" +current_model;

  setChainSelectionOptions();
  ChangeRep();
}

function defaults(value, defaultValue) {
    return value !== undefined ? value : defaultValue;
}


//need a function to write BIOMT
/*
12345678901234567890123456789012345678901234567890123456789012345678901234567890
REMARK 350 BIOMOLECULE: 1
REMARK 350 APPLY THE FOLLOWING TO CHAINS: 1, 2, 3, 4
REMARK 350   BIOMT1   1  1.000000  0.000000  0.000000        0.00000
REMARK 350   BIOMT2   1  0.000000  1.000000  0.000000        0.00000
REMARK 350   BIOMT3   1  0.000000  0.000000  1.000000        0.00000
"0.30901699,0.80901699,-0.5,0, + - -
-0.80901699,0.5,0.30901699,0,  - + +
0.5,0.30901699,0.80901699,0,   - + +
0,0,0,1"
REMARK 350   BIOMT1   2  0.309017 -0.809017  0.500000        0.00000
REMARK 350   BIOMT2   2  0.809017  0.500000  0.309017        0.00000
REMARK 350   BIOMT3   2 -0.500000  0.309017  0.809017        0.00000
"-0.80901699,0.5,-0.30901699,0,
 -0.5,-0.30901699,0.80901699,0,
  0.30901699,0.80901699,0.5,
  0,0,0,0,1"
REMARK 350   BIOMT1   3 -0.809017 -0.500000  0.309017        0.00000
REMARK 350   BIOMT2   3  0.500000 -0.309017  0.809017        0.00000
REMARK 350   BIOMT3   3 -0.309017  0.809017  0.500000        0.00000
*/
const AtomFormat = 'ATOM  %5d %-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
const HetatmFormat = 'HETATM%5d %-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
const BiomtFormat = 'REMARK 350   BIOMT%1d %3d%10.6f%10.6f%10.6f%15.5f';
function writeAtoms() {
    let writeBU = true;
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
    var au=assembly_elem.selected;//Options[0].value;
    if (au !== "AU" && o.object.biomolDict[au]) bu = true;
    if (asele === "" && bu) {
      //need to apply the matrix to the selection inside the BU selection ?
      //console.log(o.object.biomolDict[o.assembly].getSelection());
      //build using given selection AND biomolDic selection
      asele = "(" + o.object.biomolDict[au].getSelection().string + ") AND " + asele;
    }
    if (asele === "") asele = "polymer";
    console.log(asele);
    if (bu && writeBU) {
        //first write the matrix
        for (var j = 0; j < o.object.biomolDict[au].partList.length; j++) {
          //REMARK 350 BIOMOLECULE: 1
          //REMARK 350 APPLY THE FOLLOWING TO CHAINS: 1, 2, 3, 4
          var s= structure.object.biomolDict[au].getSelection()
          var t = s.selection.rules.map(d=>d.chainname)
          _records.push("REMARK 350 BIOMOLECULE: 1");
          _records.push("REMARK 350 APPLY THE FOLLOWING TO CHAINS: "+t.join(', '));
          for (var k = 0; k < o.object.biomolDict[au].partList[j].matrixList.length; k++) {
            var mat = o.object.biomolDict[au].partList[j].matrixList[k];
            _records.push(sprintf(BiomtFormat, 1, k+1,mat.elements[0],-mat.elements[1],-mat.elements[2],mat.elements[12]));//+ - -
            _records.push(sprintf(BiomtFormat, 2, k+1,-mat.elements[4],mat.elements[5],mat.elements[6],mat.elements[13]));//- + +
            _records.push(sprintf(BiomtFormat, 3, k+1,-mat.elements[8],mat.elements[9],mat.elements[10],mat.elements[14]));//- + +
          }
          _records.push("REMARK 350END");
        }
        //then the atoms
        structure.structure.eachAtom((a) => {
              const formatString = a.hetero ? HetatmFormat : AtomFormat;
              const serial = this.renumberSerial ? ia : a.serial;
              // Alignment of one-letter atom name such as C starts at column 14,
              // while two-letter atom name such as FE starts at column 13.
              let atomname = a.atomname;
              if (atomname.length <= 3)
              {
                  atomname = ' ' + atomname;
                  _records.push(sprintf(formatString, serial, atomname, a.resname, defaults(a.chainname, ' '), a.resno, a.x, a.y, a.z, defaults(a.occupancy, 1.0), defaults(a.bfactor, 0.0), '', // segid
                          defaults(a.element, '')));
              }
              ia += 1;
          }, new NGL.Selection(asele));
    }
    else if(bu)
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
                if (atomname.length <= 3)
                {
                  atomname = ' ' + atomname;
                  //if (atomname.length === 1)
                  //    atomname = ' ' + atomname;
                  _records.push(sprintf(formatString, serial, atomname, a.resname,
                                    defaults(a.chainname, ' '), a.resno, new_pos.x, new_pos.y, new_pos.z,
                                    defaults(a.occupancy, 1.0), defaults(a.bfactor, 0.0), '', // segid
                                    defaults(a.element, '')));
                }
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
            if (atomname.length <= 3)
            {
                atomname = ' ' + atomname;
                //if (atomname.length === 1)
                //    atomname = ' ' + atomname;
                _records.push(sprintf(formatString, serial, atomname, a.resname, defaults(a.chainname, ' '), a.resno, a.x, a.y, a.z, defaults(a.occupancy, 1.0), defaults(a.bfactor, 0.0), '', // segid
              defaults(a.element, '')));
            }
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
    /*if (loaded_pdb) {
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
      if (sele_elem.value!="" || assembly_elem.selected != "AU"){
          structure_txt=writeAtoms();
          formData.append("PDBtxt",structure_txt);
        }
      else formData.append("PDBID", PDBID);
    }
    */
    structure_txt=writeAtoms();
    //make a blob of it?
    var astructure_file = new Blob([structure_txt], {
      type: 'text/plain'
    });
    //formData.append("PDBtxt",structure_txt);
    formData.append("PDBfile",astructure_file);
    formData.append("_id", _id);
    formData.append("name",nameinput.value);
    formData.append("force_pdb",changed_selection);
    if (changed_selection)
      changed_selection = false;
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
//var col = Util_getRGB(ucolor.value);
function GenerateOneColorRangePalette(rgb,ncolors){
  // Generate colors (as Chroma.js objects)
  var hcl = chroma.rgb(rgb[0],rgb[1],rgb[2]).hcl();
  var start = hcl[0]-25;
  var end = hcl[0]+25;
  var colors = paletteGenerator.generate(
    ncolors, // Colors
    function(color){ // This function filters valid colors
      var hcl = color.hcl();
      return hcl[0]>=start && hcl[0]<=end
        && hcl[1]>=38.82 && hcl[1]<=100
        && hcl[2]>=38.04 && hcl[2]<=100;
    },
    false, // Using Force Vector instead of k-Means
    50, // Steps (quality)
    false, // Ultra precision
    'Default' // Color distance type (colorblindness)
  );
  // Sort colors by differenciation first
  colors = paletteGenerator.diffSort(colors, 'Default');
  return colors;
}

function GenerateNColor(ncolors){
  // Generate colors (as Chroma.js objects)
  var colors = paletteGenerator.generate(
    ncolors, // Colors
    function(color){ // This function filters valid colors
    var hcl = color.hcl();
    return hcl[0]>=0 && hcl[0]<=360
      && hcl[1]>=0 && hcl[1]<=100
      && hcl[2]>=0 && hcl[2]<=100;
  },
    false, // Using Force Vector instead of k-Means
    50, // Steps (quality)
    false, // Ultra precision
    'Default' // Color distance type (colorblindness)
  );
  // Sort colors by differenciation first
  colors = paletteGenerator.diffSort(colors, 'Default');
  return colors;
}

//TRANSFORM ngl SELECTION OT WILDCARD?
function nglSelToWildCard(ngl_sel_string){
    var sel =new NGL.Selection(ngl_sel_string);
    //can be used in each iteration
    //is it chain,residue,atom
}
//or use button (Atom,Res,Chain,BU?)

function UpdateSchemeCustom(){
  var sstyle=[];
  var _records = [];
  schemeCustomStr="";
  cards.forEach(function(c){
      var col = Util_getRGB(c.acolor.value);
      var sele = (c.sele.value=="")?c.sele.placeholder:c.sele.value;
      sstyle.push([col.rgb,sele]);
      var r = col.arr[0]/255.0;
      var g = col.arr[1]/255.0;
      var b = col.arr[2]/255.0;
      var at = ""
      if (c.card.at!="")
          at = (c.card.at.length==1)?"-"+c.card.at+"--":"-"+c.card.at+"-";
      _records.push(sprintf(IllAtomFormat,
                          Ill_defaults(at, '----'),
                          Ill_defaults(c.card.res, '---'),
                          Ill_defaults(c.card.chain, '-'),
                          0,
                          9999,
                          Ill_defaults(r, 1.0),
                          Ill_defaults(g, 0.0),
                          Ill_defaults(b, 0.0),
                          Ill_defaults("", 1.6) ) );
      sele_elem.value = sele_elem.value+" or ("+sele+")";
  });
  console.log(sstyle);
  schemeCustom=NGL.ColormakerRegistry.addSelectionScheme(sstyle,"custom");
  //the string
  schemeCustomStr=_records.join('\n')+"\n";
}

function AddCard(){
  //use acolor and acard
  //create new div element editable
  //customStyle
  var id = cards.length;
  //var asele = customStyleSelection.value;
  //customStyleSelectionAtoms.innerHTML = '';
  //customStyleSelectionResidues.innerHTML = '';
  //customStyleSelectionChains.innerHTML = '';
  var asele = "";
  var card = {"at":"","res":"","chain":""};
  if (customStyleSelectionAtoms.value!="All" && customStyleSelectionAtoms.value!="")
  {
    card.at = customStyleSelectionAtoms.value;
    asele+="."+customStyleSelectionAtoms.value;
  }
  if (customStyleSelectionResidues.value!="All" && customStyleSelectionResidues.value!="")
      {
        asele+=" and "+customStyleSelectionResidues.value;
        card.res = customStyleSelectionResidues.value;
  }
  if (customStyleSelectionChains.value!="All" && customStyleSelectionChains.value!="")
      {
        asele+=" and :"+customStyleSelectionChains.value;
        card.chain = customStyleSelectionChains.value;
      }
  var acolor = Util_getRGB(customStyleColor.value);
  var container = document.createElement("div");
  container.className = "cards";
  //selection should be NGL selection? or simplified ?
  var asele_elem = document.createElement("input");
  asele_elem.type = "text";
  asele_elem.id = "acard"+id.toString();
  asele_elem.style = "color:black";
  asele_elem.onchange = function() { console.log(asele_elem.value); };

  var acolor_elem = document.createElement("input");
  acolor_elem.type = "color";
  acolor_elem.id = "acolor"+id.toString();
  acolor_elem.onchange = function(){console.log("changed color");};

  var delete_button = document.createElement("wired-button");
  delete_button.innerHTML="Delete Card";
  var elem = {"sele":asele_elem,"acolor":acolor_elem,"button":delete_button,"card":card}
  cards.push(elem);
  delete_button.onclick = function() { RemoveCard(container,elem); }
  container.appendChild(asele_elem);
  container.appendChild(acolor_elem);
  container.appendChild(delete_button);
  //customStyle.appendChild(container);
  customStyle.insertBefore(container,customStyleCard);
  asele_elem.placeholder = asele;
  asele_elem.value = asele;
  $("acard"+id.toString()).val(asele);
  acolor_elem.value = customStyleColor.value;
  //sele_elem.value = sele_elem.value+" or ("+asele+")";
  console.log(acolor_elem.value);
  console.log(asele);
  UpdateSchemeCustom();
  ChangeRep();
}

function RemoveCard(container,elem){
  var anid = cards.indexOf(elem);
  var removed = cards.splice(anid,1)[0];
  customStyle.removeChild(container);
  UpdateSchemeCustom();
  ChangeRep();
}
