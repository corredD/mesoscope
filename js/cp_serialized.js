var ingr_uniq_id;


class sCompartment{
    constructor( name,static_id){
        this.local_id = 0;  //# ;// The id of the compartment relative only to the parent
        this.unique_id = static_id ;  // It  does not matter how this one is obtained as long as it is unique for each group
        this.name = name;
        this.Compartments = [];
        this.IngredientGroups = [];
        //need geom filename/type/parameters
        //this.static_id += 1;
        //for k in kwds:
        //    setattr(self, k, kwds[k])
    }

    addCompartment(compartment){
        this.Compartments.push(compartment);
        compartment.local_id = this.Compartments.length-1;
    }

    addIngredientGroup(ingrgroup){
        this.IngredientGroups.push(ingrgroup);
        ingrgroup.local_id = this.IngredientGroups.length-1;
        ingrgroup.compartmentId = this.unique_id;
		}

    //def to_JSON(self):
    //    return json.dumps(self, default=lambda o: o.__dict__,
    //        sort_keys=True, indent=4)
}

class sIngredientGroup
{
    //static_id=0
    constructor( name, groupType, static_id){
        this.local_id = 0 ; //# // The id of the group relative only to the parent
        this.unique_id = static_id ; //# // It  does not matter how this one is obtained as long as it is unique for each group
        this.name=name;
        this.Ingredients = [];
        this.groupType = groupType;// #currently 0 1 2 protein, fiber, lipids
        //for k in kwds:
        //    setattr(self, k, kwds[k])
        //sIngredientGroup.static_id += 1
    }

    addIngredient(ingredient){
        this.Ingredients.push(ingredient);
    }

    //def to_JSON(self):
    //    return json.dumps(self, default=lambda o: o.__dict__,
    //       sort_keys=True, indent=4)
}

class sIngredient{
    //static_id = [0, 0, 0]
    constructor( name, groupType,static_id ){
        this.ingredient_id = static_id;
        this.name = name;
        this.path = ""  ;//# // The path is made out of the local id of each parent nodes starting from the root
        this.partners_properties=[];//list of partners
        //for k in kwds:
        //    setattr(self, k, kwds[k])
        //sIngredient.static_id[groupType] += 1
    }
}

class sIngredientFiber
{
    //static_id = [0, 0, 0]
    constructor( name, groupType, static_id){
        this.ingredient_id = static_id;
        this.name = name;
        this.path = ""  //# // The path is made out of the local id of each parent nodes starting from the root
        this.partners_properties=[];
        //for k in kwds:
        //    setattr(self, k, kwds[k])
        //sIngredient.static_id[groupType] += 1
    }

}

function oneIngredientSerialized(singr,node){
	//var aing_dic = {};
	  //console.log(node);
	  if (!node.data.source) node.data.source={};
	  node.data.source.transform={}
	  node.data.source.transform.offset = node.data.offset;
    //add the selection and the bu in the source
    if (!(node.data.source.selection) || node.data.source.selection === "")
        node.data.source.selection = (node.data.selection)?node.data.selection:"";
    if (!(node.data.source.bu) || node.data.source.bu === "")
        node.data.source.bu = (node.data.bu)?node.data.bu:"";
    if (!(node.data.source.model) || node.data.source.model === "")
        node.data.source.model = (node.data.model)?node.data.model:"";
	  singr["encapsulatingRadius"] = node.data.size;
	  singr["source"] = node.data.source;//var source = ("pdb" in ing_dic)? ing_dic["pdb"] : "None";
	  singr["nbMol"] = node.data.count;
	  singr["molarity"] = node.data.molarity;
	  singr["principalVector"] = node.data.pcpalAxis;
	  singr["description"] = node.data.label;
    singr["radius"] = node.data.radius;
	  if (node.data.pos && node.data.radii) {
	  	singr["positions"] = node.data.pos;
	  	//singr["radii_lod"] = node.data.radii;
      //test and clean
      var r=[];
      for (var i=0;i<node.data.radii.length;i++)
      {
        var e = node.data.radii[i];
        if (e.radii) r.push(e);
      }
      singr["radii_lod"] = r;
      //console.log(r);
      //singr["radii_lod"] = node.data.radii.forEach(function(e) {if (e.radii) return e;} );
	  }
	  if (!singr.name)  singr.name = node.data.name;
    singr["meshFile"] = node.data.geom;//meshfile or v,f,n?
    singr["meshType"] = node.data.geom_type;//meshfile or v,f,n?
    singr["ingtype"] = node.data.ingtype;
    singr["buildtype"] = node.data.buildtype;
    singr["comments"] = node.data.comments;
	  //parse
	  //description=label,organism,score,
	  //partners_properties
	 return singr;
	}

function OneIngredientSerializedPartner(singr,link_node){
	//transform node_data to json serialize as partner property and binding_siute ?
	var pproperty = ing_dic.partners_properties;
	for (var i=0;i <pproperty.length;i++) {
			var partnerid = pproperty[i].partner_id;//if negative-> fiber
			var alink = {"source":ing_dic.ingredient_id,"target":partnerid,"name1":ing_dic.ingredient_id,"name2":partnerid,
     			"pdb1":"","sel1":"","sel2":"","id":linkdata.length};
     	linkdata.push(alink);
		}
	return linkdata;
	}

function oneCompartment(scomp,node)
{
  var gtype = (node.data.geom_type)? node.data.geom_type : "None";
  var geom = (node.data.geom)? node.data.geom : "";
  scomp["geom_type"]=gtype;//file,sphere,mb
  if (gtype === "raw")
  {
    scomp["mesh"] = geom;
  }
  else if (gtype === "file") {
    scomp["filename"] = (typeof geom === 'string')? geom : geom.name;//extension give the type
  }
  else if (gtype === "sphere") {
    scomp["radius"] = ("radius" in geom)? geom.radius : 500.0;
  }
  else if (gtype === "mb") {
    scomp["mb"] = {"positions":[],"radii":[]};
    if (node.data.pos && node.data.radii) {
      scomp["mb"].positions = node.data.pos[0].coords;
      scomp["mb"].radii = node.data.radii[0].radii;
    }
  }
  else if (gtype === "None") {
  }
  else {}
  scomp["thickness"] = ("thickness" in node.data)?node.data.thickness:7.5;
  return scomp;
}

function serializedRecipe(some_data,some_links){
	  var list_comp={};
	  var sCompartment_static_id = 0,
    sIngredientFiber_static_id = 0,
    sIngredient_static_id = 0;//[0, 0, 0],
    sIngredientGroup_static_id= 0	;
    var root;
    //cytoplasme if the first ingredient group
    var aroot;
    //proteins = None  # sIngredientGroup("proteins", 0)
    //fibers = None  # sIngredientGroup("fibers", 1)

    //traverse the hierarchy instead of the flat data?
		for (var i=0;i<some_data.length;i++)
		{
	      var node = some_data[i];
        console.log(i," node ",node.data.name);
	      if (!node.parent) //root
	      {
	      	aroot = node;
	      	root =  new sCompartment(node.data.name,sCompartment_static_id);
    			sCompartment_static_id+=1;
    			list_comp[node.data.name] = root;
	      	continue;
	      }
	      if (node.children && node !== root) //compartment
	      {
	      	  var cname = node.data.name;
	      	  var comp;
	      	  //add a compartment
            console.log("parent ",list_comp[node.parent.data.name]);
            console.log(i,"comp ",cname,(cname in list_comp),
                      (node.parent.data.name in list_comp),
                      list_comp.hasOwnProperty(cname),
                      list_comp.hasOwnProperty(node.parent.data.name));
            if (!(cname in list_comp)) {
								comp = new sCompartment(cname, sCompartment_static_id);
                comp = oneCompartment(comp,node);
    						sCompartment_static_id+=1;
								list_comp[cname] = comp;
								//if (!(node.parent.name in list_comp))
								if (node.parent.data.name in list_comp) {
                  //list_comp[node.parent.data.name].addCompartment(comp);
                }
                else {
                  var acomp = new sCompartment(node.parent.data.name, sCompartment_static_id);
                  var anode = node.parent;//getNodeByName(node.parent.data.name);
                  acomp = oneCompartment(acomp,anode);
      						sCompartment_static_id+=1;
  								list_comp[node.parent.data.name] = acomp;
                  console.log("list ??",list_comp);
                }
                list_comp[node.parent.data.name].addCompartment(comp);
	      	  }
	      	  continue;
	      }
	      if (!node.children && node.data.nodetype!=="compartment") //ingredient
	      {
          if ("include" in node.data && node.data.include === false) continue;
	      	var cname = node.parent.data.name;
	      	var sing = new sIngredient(node.data.name,0,sIngredient_static_id);sIngredient_static_id+=1;
	      	sing = oneIngredientSerialized(sing,node);//assign the attributes
	      	if (node.parent === aroot) {
	      		var pgroup;
	      		if (root.IngredientGroups.length===0){
	      			var pgroup = new sIngredientGroup("proteins", 0,sIngredientGroup_static_id);sIngredientGroup_static_id+=1;
	      			root.addIngredientGroup(pgroup);
	      			}
	      		else {
	      			pgroup = root.IngredientGroups[0];
	      			}
	      		pgroup.addIngredient(sing);
	      		}
	      	else if (node.data.surface) {
	      		//surface = new sCompartment("surface")
	      		if (!(cname+"_surface" in list_comp)){
	      				var acomp = new sCompartment("surface", sCompartment_static_id);
    						//sCompartment_static_id+=1;
								list_comp[cname+"_surface"] = acomp;
								list_comp[cname].addCompartment(acomp);
	      			}
	      		var pgroup;
	      		if (list_comp[cname+"_surface"].IngredientGroups.length===0){
	      			var pgroup = new sIngredientGroup("proteins", 0,sIngredientGroup_static_id);sIngredientGroup_static_id+=1;
	      			list_comp[cname+"_surface"].addIngredientGroup(pgroup);
	      			}
	      		else {
	      			pgroup = list_comp[cname+"_surface"].IngredientGroups[0];
	      			}
	      		pgroup.addIngredient(sing);
	      		}
	      	else {
	      		if (!(cname+"_interior" in list_comp)){
	      				var acomp = new sCompartment("interior", sCompartment_static_id);
    						//sCompartment_static_id+=1;
								list_comp[cname+"_interior"] = acomp;
								list_comp[cname].addCompartment(acomp);
	      			}
	      		var pgroup;
	      		if (list_comp[cname+"_interior"].IngredientGroups.length===0){
	      			var pgroup = new sIngredientGroup("proteins", 0,sIngredientGroup_static_id);sIngredientGroup_static_id+=1;
	      			list_comp[cname+"_interior"].addIngredientGroup(pgroup);
	      			}
	      		else {
	      			pgroup = list_comp[cname+"_interior"].IngredientGroups[0];
	      			}
	      		pgroup.addIngredient(sing);
	      		}
	      }
	  }
		return root;
}


//partner properties..e.g. partner_name 1, partner_name 2, pdb ?, sel ? beads sel ?
//partners_properties
function OneIngredientDeserialized(ing_dic,surface,comp) {
	  var elem = {};
	  var size = ("encapsulatingRadius" in ing_dic)? ing_dic["encapsulatingRadius"] : 40;
	  var name = ing_dic["name"];
    var pdb = ("pdb" in ing_dic)? ing_dic["pdb"] : "None";
    var offset = [0,0,0];
    var source = {"pdb":pdb,"bu":"","model":"","selection":""};
    if ("source" in ing_dic){//} && pdb === "None") {
      source = ing_dic["source"];
      if (!("pdb" in source)) source.pdb = "None";
      if (!("bu" in source)) source.bu = "";
      if (!("model" in source)) source.model = "";
      if (!("selection" in source)) source.selection = "";
      //if ("pdb" in ing_dic["source"])
      //{
      //	p = ing_dic["source"]["pdb"];
      //	}
      if ('emdb' in source) source.pdb = "EMD-"+source.emdb+".map";//"EMD-5241.map"
      if ('transform' in ing_dic["source"])
          if ('offset' in ing_dic["source"].transform)
            offset = ing_dic.source.transform.offset;
    }

    if (source.pdb && source.pdb.length!=4){
	     if ( (source.pdb.slice(-4,source.pdb.length) !== ".pdb" )&&(!source.pdb.startsWith("EMD"))) source.pdb = source.pdb+".pdb";
	  }

	  var label = ("description" in ing_dic)? ing_dic["description"] : "";
    var comments = ("comments" in ing_dic)? ing_dic["comments"] : "";
	  var acount = ("nbMol" in ing_dic)? ing_dic["nbMol"] : 0;
	  if (!acount ) acount = 0;
	  var molarity = ("molarity" in ing_dic)? ing_dic["molarity"] : 0.0;
	  if (!molarity )  molarity = 0.0;
    var mw = ("molecularweight" in ing_dic )?ing_dic["molecularweight"] : 0.0;
    if (!mw) mw =0.0;
    var geom_type = ("meshType" in ing_dic)? ing_dic["meshType"] : "None";
    var geom = "";
    if (geom_type !== "None") {
      geom = (("meshFile" in ing_dic)&&(ing_dic["meshFile"]!==null))?ing_dic["meshFile"]:"";
    }//(("meshFile" in ing_dic)&&(ing_dic["meshFile"]!==null))? ing_dic["meshFile"].split("\\").pop() : "";

	  var principalVector = ("principalVector" in ing_dic)? ing_dic["principalVector"] : [0,0,0];
	  //var offset = ("offset" in ing_dic.source.transform)? ing_dic.source.transform.offset : [0,0,0];
    var confidence = ("confidence" in ing_dic ) ? ing_dic["confidence"]:0.0;//overall confidence
	  //var spheres = getSpheres(ing_dic);
	  var p = ("positions" in ing_dic) ? ing_dic.positions : null;
    var r = ("radii_lod" in ing_dic)? ing_dic.radii_lod : null;
    if (!r) {
      r = ("radii" in ing_dic)? ing_dic.radii : null;
    }
    if (p && p.length!==0) {
      if (!("coords" in p[0])) {
        var pos = [];
        var rad = [];
        for (var lod=0; lod < p.length;lod++)
        {
          pos.push({"coords":[]});
          rad.push({"radii":[]});
          for (var i=0;i<p[lod].length;i++)
          {
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
    var ingtype = ("ingtype" in ing_dic)? ing_dic.ingtype : "protein";
    var buildtype = ("buildtype" in ing_dic)? ing_dic.buildtype : "random";
	  var id = "id_"+ingr_uniq_id;//ing_dic.ingredient_id;//unique ingredient id
    ingr_uniq_id+=1;
    var elem ={"name":name,"size":size,"molecularweight":mw,"confidence":confidence,
	  	"source":source,"count":acount,
	  	"molarity":molarity, "surface":surface,"geom":geom,
      "geom_type":geom_type,"label":label,
	  	"uniprot":"","pcpalAxis":principalVector,
      "offset":offset,"pos":p,"radii":r,
      "ingtype":ingtype,"buildtype":buildtype,
      "comments":comments,
      "nodetype":"ingredient"};//,"id":id};
	  return elem;
	}


function OneIngredientDeserializedPartner(ing_dic,linkdata){
	var pproperty = ing_dic.partners_properties;
	for (var i=0;i <pproperty.length;i++) {
			var partnerid = pproperty[i].partner_id;//if negative-> fiber
			var alink = {"source":ing_dic.ingredient_id,"target":partnerid,"name1":ing_dic.ingredient_id,"name2":partnerid,
     			"pdb1":"","sel1":"","sel2":"","id":linkdata.length};
     	linkdata.push(alink);
		}
	return linkdata;
}

function parseIngredientsGroups(groupdic,comp,surface,linkdata){
		for (var i=0;i<groupdic.Ingredients.length;i++) {
				var elem = OneIngredientDeserialized(groupdic.Ingredients[i],surface,comp);
				if (groupdic.Ingredients[i].partners_properties) {
					linkdata = OneIngredientDeserializedPartner(groupdic.Ingredients[i],linkdata)
				}
				comp.children.push(elem);
		}
		return {"comp":comp,"link":linkdata};
}

function SetupOneCompartment(acomp,acompdic)
{
  acomp["children"]=[];
  acomp["nodetype"]="compartment";
  acomp["geom_type"] = ("geom_type" in acompdic)?acompdic.geom_type:"None";
  if (acomp.geom_type === "raw") {acomp["geom"] = acompdic.mesh;}
  if (acomp.geom_type === "file") {acomp["geom"] = acompdic.filename;}
  if (acomp.geom_type === "sphere") {acomp["geom"] = {"name":acompdic.name,"radius":acompdic.radius};}
  if (acomp.geom_type === "mb") {
      acomp["geom"] = acompdic.mb;
      acomp["pos"] = [{"coords":acompdic.mb.positions}];
      acomp["radii"] = [{"radii":acompdic.mb.radii}];
  }
  if (acomp.geom_type === "None") {acomp["geom"] = "None";}
  //could have both a source file and a mesh ? if the source is a map or pdb ?
  acomp["thickness"] = ("thickness" in acompdic)?acompdic.thickness:7.5;
  return acomp;
}

function parseOneCompartment(compdic,graph,parent_comp,linkdata) {
	//recursive to child compartments
	//need to loop through the different ingredient group
	//compartment define surface..and interior
	//check ingredient group
	//console.log("parse comp",compdic.name,parent_comp);
	var comp = {};
	var newcomp = false;
	var surface = (compdic.name === "surface");
	if (compdic.name === "surface" || compdic.name === "interior" || compdic.name === "cytoplasme")
	{//use parent comp
		comp = parent_comp;
	}
	else {
	  comp["name"] = compdic.name;
	  comp = SetupOneCompartment(comp,compdic);
    newcomp = true;
	}
	if (compdic.IngredientGroups.length!==0) {
			for (var i=0;i<compdic.IngredientGroups.length;i++){
				var res = parseIngredientsGroups(compdic.IngredientGroups[i],comp,surface,linkdata);
				comp = res.comp;
				linkdata = res.link;
			}
	}
	if (newcomp){
		if (parent_comp) {
	  		parent_comp.children.push(comp);
	  }
	  else {
	  	if (graph.children) graph.children.push(comp);
	  	else graph = comp;//root
	  }
	}
  if (compdic.Compartments.length!==0)
  {
  		for (var i=0;i<compdic.Compartments.length;i++)
  		{
  				var res = parseOneCompartment(compdic.Compartments[i],graph,comp,linkdata);
  				graph = res.comp;
  				linkdata = res.link;

  		}
  }
	return {"comp":graph,"link":linkdata};
}

function parseCellPackRecipeSerialized(jsondic){
	  //the serialzied is nested
	  //need to check how we defined the itneraction
		var graph ={};//the main graph
    var interaction = [];//name1,name2,id1,id2,data // pdb, beads, etc...
    var rootName=jsondic.name;
    ingr_uniq_id = 0;
		//use cytoplasme or not ?
    //beads position/radius
    //recursive on compartment
    //parseOneCompartment(compdic,graph,parent_comp,linkdata)
    var res = parseOneCompartment(jsondic,graph,null,interaction);
    return {"nodes":res.comp,"links":res.link};
	}
