var MS_inited = false;
var ms_trace_only = document.getElementById("ms_trace_only");
var ms_spacefill = document.getElementById("ms_spacefill");
var ms_membrane = document.getElementById("ms_membrane");
//.checked
var ms_model_loaded = false;
//https://molstar.org/viewer/?snapshot-url=https://mesoscope.scripps.edu/beta/data/mol-star_state_1189.molx&snapshot-url-type=molx
//Working : https://molstar.org/viewer/?snapshot-url=https://rawcdn.githack.com/mesoscope/cellPACK_data/fe7891a2af5c14bf12845e69314b30037caf4c64/cellPACK_database_1.1.0/results/mol-star_state_1189.molx&snapshot-url-type=molx
//https://molstar.org/viewer/?snapshot-url=https://mesoscope.scripps.edu/beta/data/cellpack_mge.molx&snapshot-url-type=molx
//https://molstar.org/viewer/?snapshot-url=https://github.com/ccsb-scripps/MycoplasmaGenitalium/blob/main/Models/cellpack_atom_instances_149_curated.bcif?raw=true&snapshot-url-type=cif
//https://rawcdn.githack.com/ccsb-scripps/MycoplasmaGenitalium/main/Models/mol-star_state_1189.molx

//https://molstar.org/viewer/?snapshot-url=https://ghcdn.rawgit.org/ccsb-scripps/MycoplasmaGenitalium/main/Models/cellpack_atom_instances_149_curated.zip&snapshot-url-type=cif&structure-url-is-binary=1
//https://molstar.org/viewer/?structure-url=https://ghcdn.rawgit.org/ccsb-scripps/MycoplasmaGenitalium/main/Models/cellpack_atom_instances_149_curated.bcif&structure-url-format=mmcif&structure-url-is-binary=1
//https://molstar.org/viewer/?structure-url=https://ghcdn.rawgit.org/ccsb-scripps/MycoplasmaGenitalium/main/Models/cellpack_atom_instances_149_curated.zip&structure-url-format=mmcif
async function MS_molstart_init(){
    BasicMolStarWrapper.init('molstar', {
        layoutShowControls: false,
        viewportShowExpand: false,
        layoutIsExpanded: false,
        layoutControlsDisplay: false
        //pdbProvider: pdbProvider || 'pdbe',
        //emdbProvider: emdbProvider || 'pdbe',
    }).then(function() {
      BasicMolStarWrapper.setBackground(0xffffff);
      MS_setupcallback();
      //MS_applyAllColors();
      //BasicMolStarWrapper.coloring.applyCellPACKColor();
      MS_inited = true;
      ms_trace_only = document.getElementById("ms_trace_only");
      ms_spacefill = document.getElementById("ms_spacefill");
      ms_membrane = document.getElementById("ms_membrane");
    });
}

function MS_setupcallback(){
  const canvas3d = BasicMolStarWrapper.plugin.canvas3d;
  //this.suscribe(canvas3d.interaction.hover, e => this.plugin.behaviors.interaction.hover.next(e));
  if (canvas3d) {
    canvas3d.input.move.subscribe(({x, y, inside, buttons, button, modifiers }) => {
        if (mousein) return;
        if (!inside) return;
        if (!ms_model_loaded) return;
        const pickingId = canvas3d.identify(x, y);
        //console.log("move found pickingId ",x,y,pickingId);
        //let label = '';
        if (pickingId) {
            const reprLoci = canvas3d.getLoci(pickingId.id);
            //label = lociLabel(reprLoci.loci);
            //console.log(reprLoci);
            if (reprLoci.loci.kind === "element-loci") MS_callback(reprLoci.loci.elements[0].unit.model.entryId);
            else clearHighLight();   
        } else {
            clearHighLight();
        }
    });
    canvas3d.input.click.subscribe(({x, y, buttons, button, modifiers })=> {
      //this should be a selection
      if (mousein) return;
      if (!ms_model_loaded) return;
      const pickingId = canvas3d.identify(x, y);
      //console.log("click pickingId ",x,y,pickingId);
      if (pickingId) {
        //console.log("click found pickingId ",pickingId);
        const reprLoci = canvas3d.getLoci(pickingId.id);
        console.log(reprLoci,reprLoci.loci.kind);
        if (reprLoci.loci.kind === "element-loci") MS_callback(reprLoci.loci.elements[0].unit.model.entryId, click = true);
        else {
          if (node_selected) node_selected.highlight = false;
          node_selected = null;
          clearHighLight();       
        }
      }
      else {
        if (node_selected) node_selected.highlight = false;
        node_selected = null;
        clearHighLight();
      }
    });
  }
}

function MS_callback(entryId, click = false){
  console.log("MS_callback "+entryId,click);
  var found = false;
  for (var i=0;i<graph.nodes.length;i++){
    var d = graph.nodes[i];
    if (!d.children){
      var n = d.data.source.pdb;
      if (n.length === 4 ) n = n.toUpperCase();
      else {
        if (!entryId.endsWith(".pdb"))
          n = n.replace(".pdb","")
      }
      if ( n === entryId || d.data.name === entryId) {
        //console.log("found");
        clearHighLight();
        if (node_selected) node_selected.highlight = false;
        d.highlight = true;
        if ( click ) node_selected = d;
        node_over = d;
        found = true;
        break;
      }
    }
  }
  if(!found) return;
  if (click) {
    node_selected.highlight = true;
    grid_UpdateSelectionPdbFromId(node_selected)
    NGL_UpdateWithNode(node_selected);
  }
}

function MS_ClearHighlight(){
  if (!MS_inited) return;
  BasicMolStarWrapper.interactivity.clearHighlight();
}

function MS_Highlight(query){
  if (!MS_inited) return;
  //console.log("MS_Highlight "+query);
  BasicMolStarWrapper.interactivity.highlight(query);
}

function MS_HighlightNode(anode){
  if (!MS_inited) return;
  if (anode.data && anode.data.source ) {
    var aname = anode.data.source.pdb;
    if (aname === null) return;
    if (aname.length === 4 ) {
      aname = aname.toUpperCase();
    } 
    //else aname = aname.replace(".pdb","")
    //fiber use the ingredient name
    if (anode.data.ingtype === "fiber") aname = anode.data.name;
    MS_Highlight(aname);
    MS_Highlight(anode.data.name);
  }
}

function MS_Select(query){
  if (!MS_inited) return;
  BasicMolStarWrapper.interactivity.select(query);
}

function MS_Load(pdbname, bu, sel_str){
    if (!MS_inited) return;
    if (pdbname.length === 4) {
        var format = "mmcif";
        var url = "https://files.rcsb.org/download/" + pdbname + ".cif";
        BasicMolStarWrapper.load({ url: url, format: format, assemblyId: bu })
        //NGL_LoadOneProtein("rcsb://" + pdbname + ".mmtf", pdbname, bu, sel_str);
      }
      else {

      }
}

function MS_LoadMGMembrane(){
  var format = "mmcif";//or cif or bcif?
  var url = "data/lipid_149.cif";
  //BasicMolStarWrapper.load({ url: url, format: format, assemblyId: '1'})
  BasicMolStarWrapper.load_dev_url({ url: url, format: format, assemblyId: '1'})
}


//const { models } = ctx.structure.root;
//const { models } = BasicMolStarWrapper.getStructureRoot().root;

function MS_LoadModel(recipefile,modelfile){
    if (!MS_inited) return;
    //how to access cellpack menu ?
    //traceonly 
    //'spacefill', 'gaussian-surface', 'point', 'orientation'
    if (ms_spacefill.checked) BasicMolStarWrapper.setPreset('illustrative_spacefill');
    else BasicMolStarWrapper.setPreset('illustrative');
    var ingredients_files = [];
    Object.keys(pathList_).forEach(function(key) {
      //console.log(key, pathList_[key]);
      ingredients_files.push(pathList_[key]);
    });
    BasicMolStarWrapper.loadCellPACK_model(recipefile,modelfile,ingredients_files, ms_trace_only.checked, ms_membrane.checked, ms_spacefill.checked ? 'spacefill' : 'gaussian-surface');
    BasicMolStarWrapper.setPreset('clip_instance');
    
    ms_model_loaded = true;
}

async function loadCellPACK_model(recipe_file, model_file, traceOnly, representation ){
  await BasicMolStarWrapper.plugin.clear();
  const params = LoadCellPackModel.createDefaultParams(BasicMolStarWrapper.plugin.state.data.root.obj, this.plugin);
  params.membrane = false;
  params.source.name = 'file';
  params.source.params = Asset.File(new File([recipe_file],'recipe.json'));
  params.results = (model_file)?Asset.File(new File([model_file],'model.bin')) : null;
  params.preset.traceOnly = traceOnly;//check file size ?
  params.preset.representation = representation;
  return this.plugin.runTask(this.plugin.state.data.applyAction(LoadCellPackModel,params));
}
/*
 ['blood_hiv_immature_inside.json', 'Blood HIV immature'],
            ['HIV_immature_model.json', 'HIV immature'],
            ['BloodHIV1.0_mixed_fixed_nc1.cpr', 'Blood HIV'],
            ['HIV-1_0.1.6-8_mixed_radii_pdb.cpr', 'HIV'],
            ['influenza_model1.json', 'Influenza envelope'],
            ['InfluenzaModel2.json', 'Influenza Complete'],
            ['ExosomeModel.json', 'Exosome Model'],
            ['Mycoplasma1.5_mixed_pdb_fixed.cpr', 'Mycoplasma simple'],
            ['MycoplasmaModel.json', 'Mycoplasma WholeCell model'],
*/
async function MS_LoadExample(example_name){
    //current example
    if (!MS_inited) return;
    if (example_name === 'influenza_model1.json') {
      BasicMolStarWrapper.setPreset('illustrative_spacefill');
      await BasicMolStarWrapper.loadCellPACK_example(example_name, ms_trace_only.checked,'spacefill');
    }
    else {
      if (ms_spacefill.checked) BasicMolStarWrapper.setPreset('illustrative_spacefill');
      else BasicMolStarWrapper.setPreset('illustrative');
      await BasicMolStarWrapper.loadCellPACK_example(example_name, ms_trace_only.checked, ms_spacefill.checked ? 'spacefill' : 'gaussian-surface');
      if (example_name === 'HIV-1_0.1.6-8_mixed_radii_pdb.json') BasicMolStarWrapper.setPreset('clip_pixel');
    }
    MS_applyAllColors();
    ms_model_loaded = true;
}

async function MS_mapColorSchem(){
    if (!MS_inited) return;
    //save in json dictionary current color mapping only
    var color_mapping_js={};//
    //what about compartments
    graph.nodes.forEach(function(d){
      if (!d.children)
      {
        if (!d.data.color) d.data.color = [1,0,0];
        var node_color = d.data.color ;
        
        var aname = d.data.source.pdb;
        if (aname.length === 4 ) {
          aname = aname.toUpperCase();
          color_mapping_js[aname]=node_color;
        }
        else {
          if (d.data.ingtype === "fiber") aname = d.data.name;
          color_mapping_js[aname]=node_color;
          color_mapping_js[d.data.name]=node_color;
          //color_mapping_js[aname.replace(".pdb","")]=node_color;
        }
        //fiber use the ingredient name
        //if (d.data.ingtype === "fiber") aname = d.data.name;
        //MS_ChangeColor(d,node_color)
      }
      else {
        //compartment inner and outer membrane if specified?
        //root.mpn.membrane.inner_membrane
        //root.mpn.membrane.outer_membrane
      }
    });
    return color_mapping_js;
  }

async function MS_applyAllColors(){
    if (!MS_inited) return;
    //pass the nodes to the wrapper
    var color_mapping = await MS_mapColorSchem();
    await BasicMolStarWrapper.coloring.applyNodesColors(color_mapping);
    //BasicMolStarWrapper.coloring.applyCellPACKRandom().catch(alert);
    let pr = BasicMolStarWrapper.coloring.applyCellPACKRandom();
    let ppr = await pr;    
    let p = BasicMolStarWrapper.coloring.applyCellPACKColor();
    let pp = await p;
    console.log(p,pp)
}

async function MS_ChangeColor(node,acolor)
{
    if (!MS_inited) return;
    if (!node.data.source) return;
    var aname = node.data.source.pdb;
    if (aname.length === 4 ) {
      aname = aname.toUpperCase();
    }
    if (node.data.ingtype === "fiber") aname = node.data.name;
    BasicMolStarWrapper.coloring.changeColorStructure(aname,acolor);
    BasicMolStarWrapper.coloring.changeColorStructure(node.data.name,acolor);
    //if (node.data.ingtype === "fiber") aname = node.data.name;
    //console.log(aname,acolor)
    let pr = BasicMolStarWrapper.coloring.applyCellPACKRandom();
    let ppr = await pr;    
    let p = BasicMolStarWrapper.coloring.applyCellPACKColor();
    let pp = await p;
    console.log(p,pp)
}

async function MS_applyRandomColors(){
  if (!MS_inited) return;
  let p = BasicMolStarWrapper.coloring.applyCellPACKRandom();
  let pp = await p;
  console.log(p,pp)    
}

async function MS_Clear(){
  ms_model_loaded = false;
  if (!MS_inited) return;
  await BasicMolStarWrapper.plugin.clear();
} 

function MS_Resize(){
    if (!MS_inited) return;
    BasicMolStarWrapper.resize();
}

/*
.Layout.Update(_this.plugin, {
    state: {
      showControls: !_this.plugin.layout.state.showControls
    }
  });
}
*/