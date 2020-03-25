var ingr_uniq_id;
var premade_data={};//per ingredient ids or name ?
var premade_all_data;
var debugxmldoc;

class sCompartment {
  constructor(name, static_id) {
    this.local_id = 0; //# ;// The id of the compartment relative
    this.unique_id = static_id;
    this.name = name;
    this.Compartments = [];
    this.IngredientGroups = [];
    //need geom filename/type/parameters
    //this.static_id += 1;
    //for k in kwds:
    //    setattr(self, k, kwds[k])
  }

  addCompartment(compartment) {
    if (compartment.name=="surface"){
      //mahe sure its the first one
      if (this.Compartments.length!=0) {
        this.Compartments.splice( 0, 0, compartment );
      }
      else this.Compartments.push(compartment);
    }
    else this.Compartments.push(compartment);
    compartment.local_id = this.Compartments.length - 1;
  }

  addIngredientGroup(ingrgroup) {
    this.IngredientGroups.push(ingrgroup);
    ingrgroup.local_id = this.IngredientGroups.length - 1;
    ingrgroup.compartmentId = this.unique_id;
  }
};

class sIngredientGroup {
  //static_id=0
  constructor(name, groupType, static_id) {
    this.local_id = 0; //#
    this.unique_id = static_id; //#
    this.name = name;
    this.Ingredients = [];
    this.groupType = groupType; // #currently 0 1 2 protein, fiber, lipids
    //for k in kwds:
    //    setattr(self, k, kwds[k])
    //sIngredientGroup.static_id += 1
  }

  addIngredient(ingredient) {
    this.Ingredients.push(ingredient);
  }
};

class sBindingSite
{
  constructor(binding_ids,binding_coords) {
    this.binding_proba = 1;
    this.binding_occupied = "uniform_start";
    this.binding_max = 1;
    this.binding_site=binding_ids;
    this.coords=binding_coords;
  }
}

class sPartnersProperties
{
  //static_id = [0, 0, 0]
  constructor(partner_name) {
    this.partner_id = -1;
    this.partner_name = partner_name;
    this.binding_site_lod = [];
  }

  addBindingSite(bindingsite) {
    this.binding_site_lod.push(bindingsite);
  }
};

class sIngredient {
  //static_id = [0, 0, 0]
  constructor(name, groupType, static_id) {
    this.ingredient_id = static_id;
    this.name = name;
    this.path = '';
    this.partners_properties = []; //list of partners
    //for k in kwds:
    //    setattr(self, k, kwds[k])
    //sIngredient.static_id[groupType] += 1
  }
  addPartner(partner) {
    this.partners_properties.push(partner);
  }
};

class sIngredientFiber {
  //static_id = [0, 0, 0]
  constructor(name, groupType, static_id) {
    this.ingredient_id = static_id;
    this.name = name;
    this.path = '';
    this.partners_properties = [];
    //for k in kwds:
    //    setattr(self, k, kwds[k])
    //sIngredient.static_id[groupType] += 1
  }
  addPartner(partner) {
    this.partners_properties.push(partner);
  }
};



function oneIngredientSerialized(singr, node) {
  if (!node.data.source) node.data.source = {};
  node.data.source.transform = {};
  node.data.source.transform.offset = node.data.offset;
  //add the selection and the bu in the source
  if (!(node.data.source.selection) || node.data.source.selection === '')
    node.data.source.selection =
        (node.data.selection) ? node.data.selection : '';
  if (!(node.data.source.bu) || node.data.source.bu === '')
    node.data.source.bu = (node.data.bu) ? node.data.bu : '';
  if (!(node.data.source.model) || node.data.source.model === '')
    node.data.source.model = (node.data.model) ? node.data.model : '';
  singr["encapsulatingRadius"] = node.data.size;
  singr["source"] = node.data.source; //var source = ("pdb" in ing_dic)? ing_dic["pdb"] : "None";
  singr["nbMol"] = node.data.count;
  singr["molarity"] = node.data.molarity;
  singr["principalVector"] = node.data.pcpalAxis;
  singr["description"] = node.data.label;
  singr["radius"] = node.data.radius;
  if (node.data.pos && node.data.radii) {
    singr["positions"] = node.data.pos;
    //singr["radii_lod"] = node.data.radii;
    //test and clean
    var r = [];
    for (var i = 0; i < node.data.radii.length; i++) {
      var e = node.data.radii[i];
      if (e.radii) r.push(e);
    }
    singr["radii_lod"] = r;
  }
  if (!singr.name) singr.name = node.data.name;
  singr["meshFile"] = node.data.geom; //meshfile or v,f,n?
  singr["meshType"] = node.data.geom_type; //meshfile or v,f,n?
  singr["ingtype"] = node.data.ingtype;
  singr["buildtype"] = node.data.buildtype;
  singr["comments"] = node.data.comments;
  singr["color"] = node.data.color;
  singr["uniprot"] = node.data.uniprot;
  singr["confidence"] = node.data.confidence;
  singr["molecularweight"] = node.data.molecularweight;
  singr["sprite"] = node.data.sprite;
  //parse
  //description=label,organism,score,
  //partners_properties
  return singr;
}

function OneIngredientSerializedPartner(singr, link_node) {
  //transform node_data to json serialize as partner property and binding_site
  var pproperty = ing_dic.partners_properties;
  for (var i = 0; i < pproperty.length; i++) {
    var partnerid = pproperty[i].partner_id; //if negative-> fiber
    var alink = {
      "source": ing_dic.ingredient_id,
      "target": partnerid,
      "name1": ing_dic.ingredient_id,
      "name2": partnerid,
      "pdb1": "",
      "sel1": "",
      "sel2": "",
      "id": linkdata.length
    };
    linkdata.push(alink);
  }
  return linkdata;
}


function oneCompartment(scomp, node) {
  var gtype = (node.data.geom_type) ? node.data.geom_type : "None";
  var geom = (node.data.geom) ? node.data.geom : "";
  scomp["geom_type"] = gtype; //file,sphere,mb
  if (gtype === "raw") {
    scomp["mesh"] = geom;
  } else if (gtype === "file") {
    scomp["filename"] = (typeof geom === 'string') ? geom : geom.name;
  } else if (gtype === "sphere") {
    scomp["radius"] = ("radius" in geom) ? geom.radius : 500.0;
  } else if (gtype === "mb") {
    scomp["mb"] = {
      "positions": [],
      "radii": [],
      "types":[]
    };
    if (node.data.pos && node.data.radii) {
      scomp["mb"].positions = node.data.pos[0].coords;
      scomp["mb"].radii = node.data.radii[0].radii;
      scomp["mb"].types = node.data.types[0].types;
    }
  } else if (gtype === "None") {} else {}
  scomp["thickness"] = ("thickness" in node.data) ? node.data.thickness : 7.5;
  scomp["color"] = ("color" in node.data) ? node.data.color : null;
  return scomp;
}

function AddPartnerSerialized(ingdic, node, some_links) {
  for (var i = 0; i < some_links.length; i++) {
    //partner_name from the link table/graph_links
    if (some_links[i].source === node){
      var found = false;
      for (var i=0;i<ingdic.partners_properties.length;i++){
        if (ingdic.partners_properties[i].partner_name == some_links[i].target.data.name) {
          found = true;
          break;
        }
      }
      if (!(found)){
        var partner = new sPartnersProperties(some_links[i].target.data.name);
        var binding = new sBindingSite(some_links[i].beads1,some_links[i].coords1);
        partner.addBindingSite(binding);
        ingdic.addPartner(partner);
      }
    }
    if (some_links[i].target === node){
      var found = false;
      for (var i=0;i<ingdic.partners_properties.length;i++){
        if (ingdic.partners_properties[i].partner_name == some_links[i].target.data.name) {
          found = true;
          break;
        }
      }
      if (!(found)){
        var partner = new sPartnersProperties(some_links[i].source.data.name);
        var binding = new sBindingSite(some_links[i].beads2,some_links[i].coords2);
        partner.addBindingSite(binding);
        ingdic.addPartner(partner);
      }
    }
  }
  return ingdic;
}

function serializedRecipe(some_data, some_links) {
  var list_comp = {};
  var sCompartment_static_id = 0,
      sIngredientFiber_static_id = 0,
      sIngredient_static_id = 0; //[0, 0, 0],
  sIngredientGroup_static_id = 0;
  var root;
  //cytoplasme if the first ingredient group
  var aroot;
  //proteins = None  # sIngredientGroup("proteins", 0)
  //fibers = None  # sIngredientGroup("fibers", 1)

  //traverse the hierarchy instead of the flat data?
  for (var i = 0; i < some_data.length; i++) {
    var node = some_data[i];
    console.log(i, ' node ', node.data.name);
    if (!node.parent) //root
    {
      aroot = node;
      root = new sCompartment(node.data.name, sCompartment_static_id);
      sCompartment_static_id += 1;
      list_comp[node.data.name] = root;
      continue;
    }
    if (node.children && node !== root) //compartment
    {
      var cname = node.data.name;
      var comp;
      //add a compartment
      if (!(cname in list_comp)) {
        comp = new sCompartment(cname, sCompartment_static_id);
        comp = oneCompartment(comp, node);
        sCompartment_static_id += 1;
        list_comp[cname] = comp;
        //if (!(node.parent.name in list_comp))
        if (node.parent.data.name in list_comp) {
          //list_comp[node.parent.data.name].addCompartment(comp);
        } else {
          var acomp = new sCompartment(node.parent.data.name,
                                       sCompartment_static_id);
          var anode = node.parent; //getNodeByName(node.parent.data.name);
          acomp = oneCompartment(acomp, anode);
          sCompartment_static_id += 1;
          list_comp[node.parent.data.name] = acomp;
          //console.log("list ??", list_comp);
        }
        list_comp[node.parent.data.name].addCompartment(comp);
      }
      continue;
    }
    if (!node.children && node.data.nodetype !== "compartment") //ingredient
    {
      if ("include" in node.data && node.data.include === false) continue;
      var cname = node.parent.data.name;
      var sing = new sIngredient(node.data.name, 0, sIngredient_static_id);
      sIngredient_static_id += 1;
      sing = oneIngredientSerialized(sing, node); //assign the attributes
      if (some_links.length) {
        console.log("check links", some_links.length)
        sing = AddPartnerSerialized(sing, node, some_links);
      }
      if (node.parent === aroot) {
        var pgroup;
        if (root.IngredientGroups.length === 0) {
          var pgroup = new sIngredientGroup("proteins", 0,
                                            sIngredientGroup_static_id);
          sIngredientGroup_static_id += 1;
          root.addIngredientGroup(pgroup);
        } else {
          pgroup = root.IngredientGroups[0];
        }
        pgroup.addIngredient(sing);
      } else if (node.data.surface) {
        //surface = new sCompartment("surface")
        if (!(cname + "_surface" in list_comp)) {
          var acomp = new sCompartment("surface", sCompartment_static_id);
          //sCompartment_static_id+=1;
          list_comp[cname + "_surface"] = acomp;
          list_comp[cname].addCompartment(acomp);
        }
        var pgroup;
        if (list_comp[cname + "_surface"].IngredientGroups.length === 0) {
          var pgroup = new sIngredientGroup("proteins", 0,
                                            sIngredientGroup_static_id);
          sIngredientGroup_static_id += 1;
          list_comp[cname + "_surface"].addIngredientGroup(pgroup);
        } else {
          pgroup = list_comp[cname + "_surface"].IngredientGroups[0];
        }
        pgroup.addIngredient(sing);
      } else {
        if (!(cname + "_interior" in list_comp)) {
          var acomp = new sCompartment("interior", sCompartment_static_id);
          //sCompartment_static_id+=1;
          list_comp[cname + "_interior"] = acomp;
          list_comp[cname].addCompartment(acomp);
        }
        var pgroup;
        if (list_comp[cname + "_interior"].IngredientGroups.length === 0) {
          var pgroup = new sIngredientGroup("proteins", 0,
                                            sIngredientGroup_static_id);
          sIngredientGroup_static_id += 1;
          list_comp[cname + "_interior"].addIngredientGroup(pgroup);
        } else {
          pgroup = list_comp[cname + "_interior"].IngredientGroups[0];
        }
        pgroup.addIngredient(sing);
      }
    }
  }
  return root;
}

function OneIngredientDeserialized(ing_dic, surface, comp) {
  var elem = {};
  var size = ("encapsulatingRadius" in ing_dic) ? ing_dic["encapsulatingRadius"] : 40;
  var name = ing_dic["name"];
  var pdb = ("pdb" in ing_dic) ? ing_dic["pdb"] : "None";
  var offset = [0, 0, 0];
  var source = {
    "pdb": pdb,
    "bu": "BU1",
    "model": "",
    "selection": ""
  };
  if ("source" in ing_dic) { //} && pdb === "None") {
    source = ing_dic["source"];
    if (!("pdb" in source)) source.pdb = "None";
    if (!("bu" in source)) source.bu = "BU1";
    if (source.bu ==="")source.bu ="BU1";
    if (!("model" in source)) source.model = "";
    if (!("selection" in source)) source.selection = "";
    if ('emdb' in source) source.pdb = "EMD-" + source.emdb + ".map"; //"EMD-5241.map"
    if ('transform' in ing_dic["source"])
      if ('offset' in ing_dic["source"].transform)
        offset = ing_dic.source.transform.offset;
  }

  if (source.pdb && source.pdb.length != 4) {
    if ((source.pdb.slice(-4, source.pdb.length) !== ".pdb") && (!source.pdb.startsWith("EMD"))) source.pdb = source.pdb + ".pdb";
  }

  var label = ("description" in ing_dic) ? ing_dic["description"] : "";
  var comments = ("comments" in ing_dic) ? ing_dic["comments"] : "";
  var acount = ("nbMol" in ing_dic) ? ing_dic["nbMol"] : 0;
  if (!acount) acount = 0;
  var molarity = ("molarity" in ing_dic) ? ing_dic["molarity"] : 0.0;
  if (!molarity) molarity = 0.0;
  var mw = ("molecularweight" in ing_dic) ? ing_dic["molecularweight"] : 0.0;
  if (!mw) mw = 0.0;
  var geom_type = ("meshType" in ing_dic) ? ing_dic["meshType"] : "None";
  var geom = "";
  if (geom_type !== "None") {
    geom = (("meshFile" in ing_dic) && (ing_dic["meshFile"] !== null)) ? ing_dic["meshFile"] : "";
  } //(("meshFile" in ing_dic)&&(ing_dic["meshFile"]!==null))? ing_dic["meshFile"].split("\\").pop() : "";

  var principalVector = ("principalVector" in ing_dic) ? ing_dic["principalVector"] : [0, 0, 0];
  //var offset = ("offset" in ing_dic.source.transform)? ing_dic.source.transform.offset : [0,0,0];
  var confidence = ("confidence" in ing_dic) ? ing_dic["confidence"] : 0.0; //overall confidence
  //var spheres = getSpheres(ing_dic);
  var p = ("positions" in ing_dic) ? ing_dic.positions : null;
  var r = ("radii_lod" in ing_dic) ? ing_dic.radii_lod : null;
  if (!r) {
    r = ("radii" in ing_dic) ? ing_dic.radii : null;
  }
  if (p && p.length !== 0) {
    if (!("coords" in p[0])) {
      var pos = [];
      var rad = [];
      for (var lod = 0; lod < p.length; lod++) {
        pos.push({
          "coords": []
        });
        rad.push({
          "radii": []
        });
        for (var i = 0; i < p[lod].length; i++) {
          pos[lod].coords.push(p[lod][i][0]);
          pos[lod].coords.push(p[lod][i][1]);
          pos[lod].coords.push(p[lod][i][2]);
          rad[lod].radii.push(r[lod][i]);
        }
      }
      p = pos;
      r = rad;
    }
  }
  var ingtype = ("ingtype" in ing_dic) ? ing_dic.ingtype : "protein";
  var buildtype = ("buildtype" in ing_dic) ? ing_dic.buildtype : "random";
  var id = "id_" + ingr_uniq_id; //ing_dic.ingredient_id;//unique ingredient id
  ingr_uniq_id += 1;
  var color = ("color" in ing_dic) ? ing_dic["color"] : null;
  var sprite = {
    "image": "",
    "offsety": 0,
    "scale2d": 1
  };
  if ("sprite" in ing_dic) {
    sprite.image = ("image" in ing_dic["sprite"]) ? ing_dic["sprite"]["image"] : null;
    sprite.offsety = ("offsety" in ing_dic["sprite"]) ? ing_dic["sprite"]["offsety"] : 0;
    sprite.scale2d = ("scale2d" in ing_dic["sprite"]) ? ing_dic["sprite"]["scale2d"] : 1;
  }
  var elem = {
    "name": name,
    "size": size,
    "molecularweight": mw,
    "confidence": confidence,
    "source": source,
    "count": acount,
    "molarity": molarity,
    "surface": surface,
    "geom": geom,
    "geom_type": geom_type,
    "label": label,
    "uniprot": "",
    "pcpalAxis": principalVector,
    "offset": offset,
    "pos": p,
    "radii": r,
    "ingtype": ingtype,
    "buildtype": buildtype,
    "comments": comments,
    "color": color,
    "sprite":sprite,
    "nodetype": "ingredient"
  }; //,"id":id};
  return elem;
}

function OneIngredientDeserializedPartner(ing_dic, linkdata) {
  var pproperty = ing_dic.partners_properties;
  for (var i = 0; i < pproperty.length; i++) {
    //does the link already exist
    var found = false;
    for (var i = 0; i < linkdata.length; i++) {
      //partner_name from the link table/graph_links
      if (linkdata[i].name1 === pproperty[i].partner_name && linkdata[i].name2 === ing_dic.name){
        linkdata[i].coords2 = pproperty[i].binding_site_lod[0].coords;
        linkdata[i].beads2 = pproperty[i].binding_site_lod[0].binding_site;
        found=true;
        break;
      }
      else if (linkdata[i].name2 === pproperty[i].partner_name && linkdata[i].name1 === ing_dic.name){
        linkdata[i].coords1 = pproperty[i].binding_site_lod[0].coords;
        linkdata[i].beads1 = pproperty[i].binding_site_lod[0].binding_site;
        found=true;
        break;
      }
    }
    if (!(found)){
      var alink = {
        "source": ing_dic.name,
        "target": pproperty[i].partner_name,
        "name1": ing_dic.name,
        "name2": pproperty[i].partner_name,
        "pdb1": "",
        "sel1": "",
        "sel2": "",
        "coords1":pproperty[i].binding_site_lod[0].coords,
        "coords2":[],
        "beads1":pproperty[i].binding_site_lod[0].binding_site,
        "beads2":[],
        "id": linkdata.length
      };
      linkdata.push(alink);
    }
  }
  return linkdata;
}

function parseIngredientsGroups(groupdic, comp, surface, linkdata) {
  for (var i = 0; i < groupdic.Ingredients.length; i++) {
    var elem = OneIngredientDeserialized(groupdic.Ingredients[i], surface, comp);
    if (groupdic.Ingredients[i].partners_properties) {
      linkdata = OneIngredientDeserializedPartner(groupdic.Ingredients[i], linkdata);
    }
    comp.children.push(elem);
  }
  return {
    "comp": comp,
    "link": linkdata
  };
}

function SetupOneCompartment(acomp, acompdic) {
  acomp["children"] = [];
  acomp["nodetype"] = "compartment";
  acomp["geom_type"] = ("geom_type" in acompdic) ? acompdic.geom_type : "None";
  if (acomp.geom_type === "raw") {
    acomp["geom"] = acompdic.mesh;
  }
  if (acomp.geom_type === "file") {
    acomp["geom"] = acompdic.filename;
  }
  if (acomp.geom_type === "sphere") {
    acomp["geom"] = {
      "name": acompdic.name,
      "radius": acompdic.radius
    };
  }
  if (acomp.geom_type === "mb") {
    acomp["geom"] = acompdic.mb;
    acomp["pos"] = [{
      "coords": acompdic.mb.positions
    }];
    acomp["radii"] = [{
      "radii": acompdic.mb.radii
    }];
    acomp["types"] = [{
      "types": acompdic.mb.types
    }];
  }
  if (acomp.geom_type === "None") {
    acomp["geom"] = "None";
  }
  //could have both a source file and a mesh ? if the source is a map or pdb ?
  acomp["color"] = ("color" in acompdic) ? acompdic.color : null;
  acomp["thickness"] = ("thickness" in acompdic) ? acompdic.thickness : 7.5;
  return acomp;
}

function parseOneCompartment(compdic, graph, parent_comp, linkdata) {
  //recursive to child compartments
  //need to loop through the different ingredient group
  //compartment define surface..and interior
  //check ingredient group
  //console.log("parse comp",compdic.name,parent_comp);
  var comp = {};
  var newcomp = false;
  var surface = (compdic.name === "surface");
  if (compdic.name === "surface" || compdic.name === "interior" || compdic.name === "cytoplasme") { //use parent comp
    comp = parent_comp;
  } else {
    comp["name"] = compdic.name;
    comp = SetupOneCompartment(comp, compdic);
    newcomp = true;
  }
  if (compdic.IngredientGroups.length !== 0) {
    for (var i = 0; i < compdic.IngredientGroups.length; i++) {
      var res = parseIngredientsGroups(compdic.IngredientGroups[i], comp, surface, linkdata);
      comp = res.comp;
      linkdata = res.link;
    }
  }
  if (newcomp) {
    if (parent_comp) {
      parent_comp.children.push(comp);
    } else {
      if (graph.children) graph.children.push(comp);
      else graph = comp; //root
    }
  }
  if (compdic.Compartments.length !== 0) {
    for (var i = 0; i < compdic.Compartments.length; i++) {
      var res = parseOneCompartment(compdic.Compartments[i], graph, comp, linkdata);
      graph = res.comp;
      linkdata = res.link;

    }
  }
  return {
    "comp": graph,
    "link": linkdata
  };
}

function parseCellPackRecipeSerialized(jsondic) {
  //the serialzied is nested
  //need to check how we defined the itneraction
  var graph = {}; //the main graph
  var interaction = []; //name1,name2,id1,id2,data // pdb, beads, etc...
  var rootName = jsondic.name;
  ingr_uniq_id = 0;
  //use cytoplasme or not ?
  //beads position/radius
  //recursive on compartment
  //parseOneCompartment(compdic,graph,parent_comp,linkdata)
  var res = parseOneCompartment(jsondic, graph, null, interaction);
  return {
    "nodes": res.comp,
    "links": res.link
  };
}

/* regular cellpack */

function checkPartners(ing_dic, currentId) {
  var partners = [];
  if ("partners_name" in ing_dic && ing_dic["partners_name"] !== null) {
    for (var i = 0; i < ing_dic["partners_name"].length; i++) {
      var name1 = ing_dic["name"];
      var name2 = ing_dic["partners_name"][i];
      var pdb1 = "";
      var sel1 = "";
      var sel2 = "";
      var id = currentId;
      var alink = {
        "source": name1,
        "target": name2,
        "name1": name1,
        "name2": name2,
        "pdb1": pdb1,
        "sel1": sel1,
        "sel2": sel2,
        "id": id
      };

      partners.push(alink);
      currentId++;
    }
  }
  return partners;
}

function checkProperties(ing_dic, currentId) {
  var alink;
  if ("properties" in ing_dic) {
    if ("st_ingr" in ing_dic["properties"]) {
      var name1 = ing_dic["name"];
      var name2 = ing_dic["properties"]["st_ingr"];
      var pdb1 = "";
      var sel1 = "";
      var sel2 = "";
      var id = currentId;
      alink = {
        "source": name1,
        "target": name2,
        "name1": name1,
        "name2": name2,
        "pdb1": pdb1,
        "sel1": sel1,
        "sel2": sel2,
        "id": id
      };
    }
  }
  return alink;
}

function getSpheres(ing_dic) {
  //use the last element
  var spheres_array = [];
  var spheres_radii = [];
  var spheres_color = [];
  if ("positions" in ing_dic) {
    //console.log(ing_dic.positions);
    var lod = ing_dic.positions.length - 1;
    spheres_array = ing_dic.positions;
    spheres_radii = ing_dic.radii;
  }
  return {
    "pos": ing_dic.positions,
    "radii": ing_dic.radii
  };
}

function OneIngredient(ing_dic, surface) {
  var elem = {};
  var size = ("encapsulatingRadius" in ing_dic) ? ing_dic["encapsulatingRadius"] : 40;
  var name = ing_dic["name"];
  var pdb = ("pdb" in ing_dic) ? ing_dic["pdb"] : "None";
  var source = {
    "pdb": pdb,
    "bu": "BU1",
    "model": "",
    "selection": ""
  }; //should be id,type,model,chain,bu
  if ("source" in ing_dic) { //} && pdb === "None") {
    source = ing_dic["source"];
    if (!("pdb" in source)) source.pdb = "None";
    if (!("bu" in source)) source.bu = "BU1";
    if (source.bu === "") source.bu = "BU1";//default
    if (!("model" in source)) source.model = "";
    if (!("selection" in source)) source.selection = "";
  }
  if (source.pdb && source.pdb.length != 4) {
    if ((source.pdb.slice(-4, source.pdb.length) !== ".pdb") && (!source.pdb.startsWith("EMD"))) source.pdb = source.pdb + ".pdb";
  }
  var label = ("label" in ing_dic) ? ing_dic["label"] : name;
  var uniprot = ("uniprot" in ing_dic) ? ing_dic["uniprot"] : "";
  var acount = ("nbMol" in ing_dic) ? ing_dic["nbMol"] : 0;
  if (!acount) acount = 0;
  var molarity = ("molarity" in ing_dic) ? ing_dic["molarity"] : 0.0;
  if (!molarity) molarity = 0.0;
  var geom = (("meshFile" in ing_dic) && (ing_dic["meshFile"] !== null)) ? ing_dic["meshFile"] : "";
  if (typeof geom === 'string') geom = geom.split("\\").pop();
  var geom_type = (geom !== "") ? "file" : "None";
  if ("meshType" in ing_dic) geom_type = ing_dic["meshType"];
  var mw = ("molecularweight" in ing_dic) ? ing_dic["molecularweight"] : 0.0;
  if (!mw) mw = 0.0;
  var confidence = ("confidence" in ing_dic) ? ing_dic["confidence"] : 0.0; //overall confidence
  if (!confidence) confidence = 0.0;
  var principalVector = ("principalVector" in ing_dic) ? ing_dic["principalVector"] : [0, 0, 0];
  var offset = ("offset" in ing_dic) ? ing_dic["offset"] : [0, 0, 0];
  //var spheres = getSpheres(ing_dic);
  if ((!principalVector) || principalVector === 0 || principalVector === "" || principalVector === [0] || principalVector.length === 1) principalVector = [0, 0, 1];
  if ((!offset) || offset === 0 || offset === "" || offset === [0] || offset.length === 1) offset = [0, 0, 0];
  var p = ing_dic.positions;
  var r = ing_dic.radii;
  //console.log(JSON.stringify(p));
  //console.log(offset);
  //console.log(principalVector);
  //check the type
  var comments = ("comments" in ing_dic) ? ing_dic["comments"] : "";
  var atype = ("Type" in ing_dic) ? ing_dic["Type"] : ""; //Grow,MultiSphere,etc...
  var packingMode = ("packingMode" in ing_dic) ? ing_dic["packingMode"] : ""; //random,close,etc...
  var btype = GetIngredientTypeAndBuildType(ing_dic); //"ingtype":btype.type,"buildtype":btype.build,
  var color = ("color" in ing_dic) ? ing_dic["color"] : null;
  var sprite = {
    "image": "",
    "offsety": 0,
    "scale2d": 1
  };
  if ("sprite" in ing_dic) {
    sprite.image = ("image" in ing_dic["sprite"]) ? ing_dic["sprite"]["image"] : null;
    sprite.offsety = ("offsety" in ing_dic["sprite"]) ? ing_dic["sprite"]["offsety"] : 0;
    sprite.scale2d = ("scale2d" in ing_dic["sprite"]) ? ing_dic["sprite"]["scale2d"] : 1;
  }
  else {
    if ("image" in ing_dic) sprite.image = ing_dic["image"];
  }
  var elem = {
    "name": name,
    "size": size,
    "molecularweight": mw,
    "confidence": confidence,
    "source": source,
    "count": acount,
    "ingtype": btype.type,
    "buildtype": btype.build,
    "molarity": molarity,
    "surface": surface,
    "geom": geom,
    "geom_type": geom_type,
    "label": label,
    "comments": comments,
    "uniprot": uniprot,
    "pcpalAxis": principalVector,
    "offset": offset,
    "pos": p,
    "radii": r,
    "nodetype": "ingredient",
    "sprite":sprite,
    "color": color
  };
  //console.log(JSON.stringify(elem));
  //console.log(elem);
  return elem;
}

function GetIngredientTypeAndBuildType(an_ing_dic) {
  var atype = ("Type" in an_ing_dic) ? an_ing_dic["Type"] : ""; //Grow,MultiSphere,etc...
  var packingMode = ("packingMode" in an_ing_dic) ? an_ing_dic["packingMode"] : ""; //random,close,etc...
  var ingType = "protein"; //protein
  var buildType = packingMode; //random
  if (atype === "Grow") {
    ingType = "fiber";
  }
  return {
    "type": ingType,
    "build": buildType
  };
}

function parseCellPackRecipe(jsondic) {
  var graph = {}; //the main graph
  var interaction = []; //name1,name2,id1,id2,data // pdb, beads, etc...
  var rootName = "root";
  if ("recipe" in jsondic)
    rootName = jsondic["recipe"]["name"];
  if ("options" in jsondic) {
    if ("boundingBox" in jsondic["options"]) {
      graph["boundingBox"] = jsondic["options"]["boundingBox"];
    }
  }
  graph["name"] = rootName;
  graph["children"] = [];
  graph["nodetype"] = "compartment";
  //beads position/radius
  if ("cytoplasme" in jsondic) {
    //alert("cytoplasme");
    var rnode = jsondic.cytoplasme;
    var cname = jsondic.recipe.name + "cytoplasme";
    var ingrs_dic = jsondic.cytoplasme.ingredients;
    // alert(JSON.stringify(rnode));
    // alert(cname);
    // alert(JSON.stringify(ingrs_dic));
    //  alert(ingrs_dic.length);
    //if (ingrs_dic.length){
    // alert("ingredients");
    for (var ing_name in ingrs_dic) { //# ingrs_dic:
      var ing_dic = ingrs_dic[ing_name];
      var elem = OneIngredient(ing_dic, false);
      graph["children"].push(elem);
      //check for partner
      var ps = checkPartners(ing_dic, interaction.length);
      if (ps.length) {
        console.log("found parnters ?");
        console.log(ps.length);
        console.log(ps);
        ps.forEach(function(elem) {
          interaction.push(elem);
        }); // $.extend( interaction, ps );
        console.log(interaction);
      }
      var p = checkProperties(ing_dic, interaction.length);
      if (p) {
        interaction.push(p);
        console.log("found Properties ?");
        console.log(p);
      }
    }
    //}
  }
  if ("compartments" in jsondic) {
    //if (jsondic["compartments"].length){
    for (var cname in jsondic["compartments"]) {
      var comp_dic = jsondic["compartments"][cname];
      var comp_geom = comp_dic['geom'];
      var comp_type = comp_dic['geom_type'];
      var thickness = ("thickness" in comp_dic) ? comp_dic.thickness : 7.5;
      console.log("geom in comp ? ", comp_geom);
      var comp = {
        "name": cname,
        "children": [],
        "nodetype": "compartment",
        "geom": comp_geom,
        "geom_type": comp_type,
        "thickness": thickness
      };
      //if (comp_type === "raw") {comp["geom"] = acompdic.mesh;}
      //  if (comp_type === "file") {acomp["geom"] = acompdic.filename;}
      //if (comp_type === "sphere") {acomp["geom"] = {"name":acompdic.name,"radius":acompdic.radius};}
      if (comp_type === "mb" && "mb" in comp_dic) {
        //acomp["geom"] = acompdic.mb;
        comp["pos"] = [{
          "coords": comp_dic.mb.positions
        }];
        comp["radii"] = [{
          "radii": comp_dic.mb.radii
        }];
      }
      //could have both a source file and a mesh ? if the source is a map or pdb ?

      if ("surface" in comp_dic) {
        var snode = comp_dic["surface"];
        var ingrs_dic = snode["ingredients"];
        //if (ingrs_dic.length){
        for (var ing_name in ingrs_dic) { //# ingrs_dic:
          var ing_dic = ingrs_dic[ing_name];
          var elem = OneIngredient(ing_dic, true);
          comp["children"].push(elem);
          //check for partner
          var ps = checkPartners(ing_dic, interaction.length);
          if (ps.length) {
            console.log("found parnters ?");
            console.log(ps.length);
            console.log(ps);
            ps.forEach(function(elem) {
              interaction.push(elem);
            }); // $.extend( interaction, ps );
            console.log(interaction);
          }
          var p = checkProperties(ing_dic, interaction.length);
          if (p) {
            interaction.push(p);
            console.log("found Properties ?");
            console.log(p);
          }
        }
        //}
      }
      if ("interior" in comp_dic) {
        var snode = comp_dic["interior"];
        var ingrs_dic = snode["ingredients"];
        //if (ingrs_dic.length){
        for (var ing_name in ingrs_dic) { //# ingrs_dic:
          var ing_dic = ingrs_dic[ing_name];
          var elem = OneIngredient(ing_dic, false);
          comp["children"].push(elem);
          //check for partner
          var ps = checkPartners(ing_dic, interaction.length);
          if (ps.length) {
            console.log("found parnters ?");
            console.log(ps.length);
            console.log(ps);
            ps.forEach(function(elem) {
              interaction.push(elem);
            }); // $.extend( interaction, ps );
            console.log(interaction);
          }
          var p = checkProperties(ing_dic, interaction.length);
          if (p) {
            interaction.push(p);
            console.log("found Properties ?");
            console.log(p);
          }
        }
        //}
      }
      graph["children"].push(comp);
    }
    //}
  }
  return {
    "nodes": graph,
    "links": interaction
  };
}

function OneIngredientXML(ing_dic){
    //.getAttribute("class");
    var elem = {};
    var surface = false;
    var size = ing_dic.getAttribute("encapsulatingRadius");// in ing_dic) ? ing_dic["encapsulatingRadius"] : 40;
    size = (size !== null && size !=="")? parseFloat(size):0;
    var name = ing_dic.getAttribute("name");
    var pdb = ing_dic.getAttribute("pdb");
    var source = {
      "pdb": pdb,
      "bu": "BU1",
      "model": "",
      "selection": ""
    }; //should be id,type,model,chain,bu
    if (source.pdb && source.pdb.length != 4) {
      if ((source.pdb.slice(-4, source.pdb.length) !== ".pdb") && (!source.pdb.startsWith("EMD"))) source.pdb = source.pdb + ".pdb";
    }
    var label = ing_dic.getAttribute("label");
    var uniprot = ing_dic.getAttribute("uniprot");
    var acount = ing_dic.getAttribute("nbMol");
    if (!acount) acount = 0;
    else acount = parseInt(acount);
    var molarity = ing_dic.getAttribute("molarity");
    if (!molarity) molarity = 0.0;
    else molarity = parseFloat(molarity);
    var geom = ing_dic.getAttribute("meshFile");
    if (typeof geom === 'string') geom = geom.split("\\").pop();
    var geom_type = (geom !== "") ? "file" : "None";
    var mw = ing_dic.getAttribute("molecularweight");
    if (!mw) mw = 0.0;
    var confidence = ing_dic.getAttribute("confidence" in ing_dic); //overall confidence
    if (!confidence) confidence = 0.0;
    var principalVector = ing_dic.getAttribute("principalVector" in ing_dic);
    var offset = ing_dic.getAttribute("offset" );
    //var spheres = getSpheres(ing_dic);
    if ((!principalVector) || principalVector === 0 || principalVector === "" || principalVector === [0] || principalVector.length === 1) principalVector = [0, 0, 1];
    if ((!offset) || offset === 0 || offset === "" || offset === [0] || offset.length === 1) offset = [0, 0, 0];
    var p = ing_dic.getAttribute("positions");
    var r = ing_dic.getAttribute("radii");
    p = [{"coords":p.replace(/[^a-zA-Z0-9. ]/g, '').split(' ').map(parseFloat)}];
    r = [{"radii":r.replace(/[^a-zA-Z0-9. ]/g, '').split(' ').map(parseFloat)}];
    var comments = ing_dic.getAttribute("comments" );
    var atype = ing_dic.getAttribute("Type"); //Grow,MultiSphere,etc...
    var packingMode = ing_dic.getAttribute("packingMode"); //random,close,etc...
    var btype = GetIngredientTypeAndBuildType(ing_dic); //"ingtype":btype.type,"buildtype":btype.build,
    var color = ing_dic.getAttribute("color");
    color = color.replace(/[^a-zA-Z0-9. ]/g, '').split(' ').map(parseFloat);
    var sprite = {
      "image": "",
      "offsety": 0,
      "scale2d": 1
    };
    var elem = {
      "name": name,
      "size": size,
      "molecularweight": mw,
      "confidence": confidence,
      "source": source,
      "count": acount,
      "ingtype": btype.type,
      "buildtype": btype.build,
      "molarity": molarity,
      "surface": surface,
      "geom": geom,
      "geom_type": geom_type,
      "label": label,
      "comments": comments,
      "uniprot": uniprot,
      "pcpalAxis": principalVector,
      "offset": offset,
      "pos": p,
      "radii": r,
      "nodetype": "ingredient",
      "sprite":sprite,
      "color": color
    };
    //console.log(JSON.stringify(elem));
    //console.log(elem);
    return elem;
}

function parseCellPackRecipeXML(xmldoc){
  debugxmldoc = xmldoc;
  var rootName = "root";
  var interaction = [];
  graph["name"] = rootName;
  graph["children"] = [];
  graph["nodetype"] = "compartment";
  var ingredients = xmldoc.getElementsByTagName("ingredient");
  for (var i = 0; i < ingredients.length ; i++) {
    var elem = OneIngredientXML(ingredients[i], false);
    graph["children"].push(elem);
  }
  return {
    "nodes": graph,
    "links": interaction
  };
}


/* David Goodsell PDB format */
function OneDefaultIngredient(name,isfiber,isfile){
  var elem = {
    "name": name,
    "size": 30,
    "molecularweight": 0.0,
    "confidence": 0.0,
    "source": {"pdb":"","bu":"BU1","selection":"","model":0},
    "count": 0,
    "ingtype": (isfiber)?"fiber":"protein",
    "buildtype": (isfile)?"file":"random",
    "molarity": 0.0,
    "surface": false,
    "geom": null,
    "geom_type": null,
    "label": name,
    "comments": "",
    "uniprot": "",
    "pcpalAxis": [1,0,0],
    "offset": [0,0,0],
    "pos": [],
    "radii": [],
    "nodetype": "ingredient",
    "color": [1,0,0],
  };
  //check if in the known ingredient ? would require species
  if (isfiber){
    if (name.includes("DNA")) {
      elem.source.pdb = "DNA_oneTurn.pdb";
      elem.angle = 15.0;
      elem.ulength = 34.0;
      elem.tlength = 100.0;
    }
    else if (name.includes("RNA")) {
      elem.source.pdb = "DNA_oneTurn.pdb";
      elem.source.selection = ":A";
      elem.angle = 15.0;
      elem.ulength = 34.0;
      elem.tlength = 100.0;
    }
  }
  return elem;
}

function cp_LoadGoodsellPDBModel(textdata)
{
    //compartments->none or a default compartment?
    premade_data = {};
    premade_all_data = [];
    var graph = {};
    var rootName = "root";
    graph["name"] = rootName;
    graph["children"] = [];
    graph["nodetype"] = "compartment";
    var comp = {
      "name": "default_comp",
      "children": [],
      "nodetype": "compartment",
      "geom": null,
      "geom_type": "None",
      "thickness": 0.0
    };
    var links = [];
    var unique_names = {};
    var ingredients_names = [];//instance type name
    var ingredients_data = [];//instance coord start, end, constraints-> help rebuild the rotation
    var lines = textdata.split('\n');
    var isfiber = false;
    lines.forEach(function(line){
       isfiber = false;
       if (line.startsWith("DEFINE")){
            var elems = line.split(/[ ]+/);
            ingredients_names.push(elems[1]);
            var start = parseInt(elems[2]) - 1;
            var end = parseInt(elems[3]) - 1;
            var cstr = parseInt(elems[4]) - 1;
            if (end-start > 1) isfiber = true;
            ingredients_data.push(new THREE.Vector3(start, end, cstr));
            if (!(elems[1] in unique_names)) unique_names[elems[1]] = {"name":elems[1],"fiber":isfiber};
        }
       if (line.startsWith("ATOM")){
          //scale ?
            var x = parseFloat(line.substring(30, 30+8))*ascale;
            var y = parseFloat(line.substring(38, 38+8))*ascale;
            var z = parseFloat(line.substring(46, 46+8))*ascale;
            premade_all_data.push(new THREE.Vector3(x, y, z));//use the scale ?
        }
    });
    //loop through the ingredient_names and generate the pos/rot/info
    for (var key in unique_names){
      var anode = OneDefaultIngredient(key,unique_names[key].fiber,true);
      comp["children"].push(anode);
      unique_names[key].node = comp["children"][comp["children"].length-1];
    }
    graph["children"].push(comp);
    for (var i=0;i < ingredients_names.length; i++) {
        var name = ingredients_names[i];
        var data = ingredients_data[i];
        var anode = unique_names[name].node
        if (anode.ingtype === "fiber")
        {
            var pos = premade_all_data.slice(parseInt(data.x),parseInt(data.y));//Skip((int)data.x).Take((int)(data.y - data.x)).ToList();
            var D = pos[0].distanceTo( pos[1] )/(ascale);//this is scale
            anode.tlength = pos.length;
            anode.ulength = D;
            var spline = new THREE.CatmullRomCurve3( pos );
            if (!anode.curves) anode.curves = [];
            //var lgeometry = new THREE.BufferGeometry().setFromPoints( array_points );
            //var lmaterial = new THREE.LineBasicMaterial( { color : 0xff0000 } );
            //var curveObject = new THREE.Line( lgeometry, lmaterial );
            //scene.add(curveObject);
            anode.curves.push({"points":pos,"spline":spline,"mesh":null,"line":null});
        }
        else {
            if (!anode.results) anode.results = {"positions":[],"rotations":[]};
            var pos = premade_all_data[parseInt(data.x)];
            anode.results.positions.push(new THREE.Vector3(pos.x, pos.y, pos.z));
            //rotation for now is random
            var q = new THREE.Quaternion();
            var axis = new THREE.Vector3(
                Math.random()-0.5,
                Math.random()-0.5,
                Math.random()-0.5
            );
            axis.normalize();
            q.setFromAxisAngle(axis, Math.random() * Math.PI * 2);
            anode.results.rotations.push(q);
        }
    }
    return {"nodes":graph,"links":links};
}

function cp_SerializedMolarity(){
  //save in json dictionary current color mapping only
  var molarity_count_mapping_js={};//
  //what about compartments
  graph.nodes.forEach(function(d){
    if (!d.children)
    {
      var name_path = d.ancestors().reverse().map(function(d) {
        return (d.children) ? d.data.name : "";
      }).join('.').slice(0, -1);
      //check if surfaces
      //is it root or a compartment
      if (d.parent.data.name !== "root"){
        if ("surface" in d.data && d.data.surface){
          name_path = name_path+".surface.proteins."+d.data.name;
        }
        else {
          name_path =  name_path+".interior.proteins."+d.data.name;
        }
      }
      else name_path = name_path+".proteins."+d.data.name;
      if (!d.data.color) d.data.color = [1,0,0];
      var molarity = parseFloat(d.data.molarity);
      var count = parseInt(d.data.count);
      molarity_count_mapping_js[name_path]={"molarity":molarity,"count":count};
    }
  });
  console.log(JSON.stringify(molarity_count_mapping_js));
  download(JSON.stringify(molarity_count_mapping_js), 'molarity.json', 'text/plain');
}

function cp_SerializedColorSchem(){
  //save in json dictionary current color mapping only
  var color_mapping_js={};//
  //what about compartments
  graph.nodes.forEach(function(d){
    if (!d.children)
    {
      var name_path = d.ancestors().reverse().map(function(d) {
        return (d.children) ? d.data.name : "";
      }).join('.').slice(0, -1);
      //check if surfaces
      //is it root or a compartment
      if (d.parent.data.name !== "root"){
        if ("surface" in d.data && d.data.surface){
          name_path = name_path+".surface.proteins."+d.data.name;
        }
        else {
          name_path =  name_path+".interior.proteins."+d.data.name;
        }
      }
      else name_path = name_path+".proteins."+d.data.name;
      if (!d.data.color) d.data.color = [1,0,0];
      var node_color = {"x":parseInt(d.data.color[0]*255.0),
                   "y":parseInt(d.data.color[1]*255.0),
                   "z":parseInt(d.data.color[2]*255.0)};
      color_mapping_js[name_path]=node_color;
    }
    else {
      //compartment inner and outer membrane if specified?
      //root.mpn.membrane.inner_membrane
      //root.mpn.membrane.outer_membrane
      var name_path = d.ancestors().reverse().map(function(d) {
        return (d.children) ? d.data.name : "";
      }).join('.').slice(0, -1);
      if (!d.data.color) d.data.color = [1,0,0];
      var node_color = {"x":parseInt(d.data.color[0]*255.0),
                   "y":parseInt(d.data.color[1]*255.0),
                   "z":parseInt(d.data.color[2]*255.0)};
      color_mapping_js[name_path+".membrane.outer_membrane"]=node_color;
      color_mapping_js[name_path+".membrane.inner_membrane"]=node_color;
    }
  });
  console.log(JSON.stringify(color_mapping_js));
  download(JSON.stringify(color_mapping_js), 'palette.json', 'text/plain');
}

function cp_DeserializedColorSchem(){}
