var MS_inited = false;
function MS_molstart_init(){
    BasicMolStarWrapper.init('molstar', {
        layoutShowControls: false,
        viewportShowExpand: true,
        layoutIsExpanded: true,
        layoutControlsDisplay: false
        //pdbProvider: pdbProvider || 'pdbe',
        //emdbProvider: emdbProvider || 'pdbe',
    });
    BasicMolStarWrapper.setBackground(0xffffff);
    MS_setupcallback();
    //MS_applyAllColors();
    //BasicMolStarWrapper.coloring.applyCellPACKColor();
    MS_inited = true;
}
function MS_setupcallback(){
  const canvas3d = BasicMolStarWrapper.plugin.canvas3d;
  //this.suscribe(canvas3d.interaction.hover, e => this.plugin.behaviors.interaction.hover.next(e));
  canvas3d.input.move.subscribe(({x, y, inside, buttons, button, modifiers }) => {
      if (mousein) return;
      if (!inside) return;
      const pickingId = canvas3d.identify(x, y);
      //let label = '';
      if (pickingId) {
          const reprLoci = canvas3d.getLoci(pickingId);
          //label = lociLabel(reprLoci.loci);
          //console.log(reprLoci.loci);
          if (reprLoci.loci.kind === "element-loci") MS_callback(reprLoci.loci.elements[0].unit.model.entryId);
          else clearHighLight();   
      } else {
          clearHighLight();
      }
  });
  canvas3d.input.click.subscribe(({x, y, buttons, button, modifiers })=> {
    //this should be a selection
    if (mousein) return;
    const pickingId = canvas3d.identify(x, y);
    if (pickingId) {
      const reprLoci = canvas3d.getLoci(pickingId);
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

function MS_callback(entryId, click = false){
  //console.log("MS_callback "+entryId);
  var found = false;
  for (var i=0;i<graph.nodes.length;i++){
    var d = graph.nodes[i];
    if (!d.children){
      var n = d.data.source.pdb;
      if (n.length === 4 ) n = n.toUpperCase();
      else n = n.replace(".pdb","")
      //console.log(n);
      //console.log(n === entryId);
      if ( n === entryId ) {
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
  if (query.length === 4 ) query = query.toUpperCase();
  else query = query.replace(".pdb","")
  BasicMolStarWrapper.interactivity.highlight(query);
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

function MS_LoadModel(recipefile,modelfile){
    if (!MS_inited) return;
    //how to access cellpack menu ?
    //traceonly 
    //'spacefill', 'gaussian-surface', 'point', 'orientation'
    BasicMolStarWrapper.loadCellPACK_model(recipefile,modelfile,true,'gaussian-surface');
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
    await BasicMolStarWrapper.loadCellPACK_example(example_name,false,'gaussian-surface');
    MS_applyAllColors();
}

async function MS_mapColorSchem(){
    if (!MS_inited) return;
    //save in json dictionary current color mapping only
    var color_mapping_js={};//
    //what about compartments
    graph.nodes.forEach(function(d){
      if (!d.children)
      {
        var aname = d.data.source.pdb;
        if (aname.length === 4 ) aname = aname.toUpperCase();
        else aname = name.replace(".pdb","")
        if (!d.data.color) d.data.color = [1,0,0];
        var node_color = d.data.color ;
        color_mapping_js[aname]=node_color;
        MS_ChangeColor(d,node_color)
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
}

async function MS_ChangeColor(node,acolor)
{
    if (!MS_inited) return;
    var aname = node.data.source.pdb;
    if (aname.length === 4 ) aname = aname.toUpperCase();
    else aname = aname.replace(".pdb","")
    //console.log(aname,acolor)
    BasicMolStarWrapper.coloring.changeColorStructure(aname,acolor);
    await BasicMolStarWrapper.coloring.applyCellPACKRandom();
    await BasicMolStarWrapper.coloring.applyCellPACKColor();
}

async function MS_applyRandomColors(){
    await BasicMolStarWrapper.coloring.applyCellPACKRandom();
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