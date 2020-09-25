var atomic_outlines_params=[3.0,10.0,4,0.0,5.0];
var subunit_outlines_params=[3.,10.];
var chain_outlines_params=[3.,10.,6.];
var ao_params=[0.0023,2.0,1.0,0.7];
var ill_current_id=-1;
var ignore_h = true;

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
  [ill_toRGB([1.00, 0.20, 0.20]), "(.O5' or .O3' or .OP) and nucleic"],//1.00, 0.55, 0.55
  [ill_toRGB([1.00, 0.90, 0.50]), "_P and nucleic"],//1.00, 0.49, 0.49
  [ill_toRGB([0.80, 0.90, 1.00]), "_N and nucleic"],//1.00, 0.65, 0.65
  [ill_toRGB([1.00, 0.80, 0.80]), "_O and not (.O5' or .O3' or .OP) and nucleic"],
  [ill_toRGB([1.00, 1.00, 1.00]), "_C"],
  [ill_toRGB([1.00, 0.20, 0.20]), "((.OD and ASP) or (.OE and GLU)) and protein"],
  [ill_toRGB([0.10, 0.70, 1.00]), "((.NZ and LYS) or ((.NH or .NE) and ARG)) or ((.ND or .NE) and HIS)) and protein"],
  [ill_toRGB([1.00, 0.80, 0.80]), "_O and protein"],
  [ill_toRGB([0.80, 0.90, 1.00]), ".N and protein"],
  [ill_toRGB([1.00, 0.80, 0.80]), "_O and protein"],
  [ill_toRGB([0.60, 0.90, 0.60]), "_C and (ligand and hetero)"],
  [ill_toRGB([0.40, 0.90, 0.40]), "not _C and (ligand and hetero)"],
], "style5");

var schemeId6 = NGL.ColormakerRegistry.addSelectionScheme([
  [ill_toRGB([1.00, 1.00, 1.00]), "_H"],//1.00, 0.55, 0.55
  [ill_toRGB([0.50, 0.50, 0.50]), "_C"],//1.00, 0.49, 0.49
  [ill_toRGB([0.10, 0.70, 1.00]), "_N"],//1.00, 0.65, 0.65
  [ill_toRGB([1.00, 0.20, 0.20]), "_O"],
  [ill_toRGB([1.00, 0.90, 0.50]), "_S or _SE or _P"],
  [ill_toRGB([0.40, 0.90, 0.40]), "(_F or _BR or _CL or _I) and (ligand and hetero)"],
  [ill_toRGB([1.00, 0.40, 1.00]), "(_MG or _CA or _NA or _K or _FE or _CU or _ZN ) and (ligand and hetero)"]
], "style6");


function ill_defaults(value, defaultValue) {
    return (value !== undefined && value !== "")? value : defaultValue;
}

function ill_toRGB(color){
  return "rgb("+Math.ceil(color[0]*255).toString()+","+
                Math.ceil(color[1]*255).toString()+","+
                Math.ceil(color[2]*255).toString()+")";
}

function ill_toRGBf(color){
  return "rgb("+color[0].toString()+","+
                color[1].toString()+","+
                color[2].toString()+")";
}
/*
COLUMNS        DATA  TYPE    FIELD        DEFINITION
-------------------------------------------------------------------------------------
 1 -  6        Record name   "ATOM  "
 7 - 11        Integer       serial       5d Atom  serial number. 
13 - 16        Atom          name         4s Atom name.            
17             Character     altLoc       1s Alternate location indicator.
18 - 20        Residue name  resName      3s Residue name.
22             Character     chainID      3sChain identifier.
23 - 26        Integer       resSeq       Residue sequence number.
27             AChar         iCode        Code for insertion of residues.
31 - 38        Real(8.3)     x            Orthogonal coordinates for X in Angstroms.
39 - 46        Real(8.3)     y            Orthogonal coordinates for Y in Angstroms.
47 - 54        Real(8.3)     z            Orthogonal coordinates for Z in Angstroms.
55 - 60        Real(6.2)     occupancy    Occupancy.
61 - 66        Real(6.2)     tempFactor   Temperature  factor.
77 - 78        LString(2)    element      Element symbol, right-justified.
79 - 80        LString(2)    charge       Charge  on the atom.
*/

var illAtomFormat   = 'ATOM  %5d%4s%1s%3s%3s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
var ilHetatmFormat = 'HETATM%4s-%3s-%1s %d,%4d  %1.2f, %1.2f, %1.2f, %1.1f';
//const illAtomFormat   = 'ATOM  %4s-%3s-%1s %d,%4d  %1.2f, %1.2f, %1.2f, %1.1f';
//const ilHetatmFormat = 'HETATM%4s-%3s-%1s %d,%4d  %1.2f, %1.2f, %1.2f, %1.1f';
//const AtomFormat = 'ATOM  %5d %-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
//const HetatmFormat = 'HETATM%5d %-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
//ngl_current_structure.structure
function ill_writeAtoms(structure,style) {
    const BiomtFormat = 'REMARK 350   BIOMT%1d %3d%10.6f%10.6f%10.6f%15.5f';
    let writeBU = true;
    let ia = 1;
    let im = 1;
    let renumberSerial = true;
    let asele="";
    var o = structure;
    var current_model = model_elem.value;
    
    var nch = structure.structure.getChainnameCount();

    if (sele_elem.value&& sele_elem.value!=="") {
      if (asele !== sele_elem.value) asele = sele_elem.value;
    }
    var bu = false;
    var au=assembly_elem.selectedOptions[0].value;//Options[0].value;
    if (au !== "AU" && o.object.biomolDict[au]) bu = true;
    if (asele === "" && bu) {
      //need to apply the matrix to the selection inside the BU selection ?
      //console.log(o.object.biomolDict[o.assembly].getSelection());
      //build using given selection AND biomolDic selection
      asele = "(" + o.object.biomolDict[au].getSelection().string + ") AND not water";
    }
    if (asele === "" && current_model != null ) asele = "/"+model_elem.value+" AND not water";
    if (asele === "") asele = "not water";
    
    if (style === 1) {
      asele="("+asele+") and (.CA or .P or .C1')";
    }
    
    console.log(asele);
    var chnames = []
    structure.structure.eachChain( chain => {
      if ( $.inArray(chain.chainname, chnames) === -1 ) chnames.push( chain.chainname)
    }, new NGL.Selection(asele));

    _records = [];
    if (bu && writeBU) {
        //first write the matrix
        for (var j = 0; j < o.object.biomolDict[au].partList.length; j++) {
          //REMARK 350 BIOMOLECULE: 1
          //REMARK 350 APPLY THE FOLLOWING TO CHAINS: 1, 2, 3, 4
          var s= structure.object.biomolDict[au].getSelection() //max in illustrator is 12
          var t = []
          $.each(s.selection.rules, function (i, e) {
            if (chnames.includes(e.chainname)){
                t.push(e.chainname);
            }
          });
          var nchain = t.length;
          //s.selection.rules.map(function(d) {
          //  if (chnames.includes(d.chainname)) {return d.chainname;}          
          //} )
          _records.push("REMARK 350 BIOMOLECULE: 1");
          var linemax = 68;// 41+27.0;
          var _chain_str = "REMARK 350 APPLY THE FOLLOWING TO CHAINS:";
          var counter = 41;
          for (var i=0;i<nchain;i++){
            var r = " "+t[i]+",";
            if (counter + r.length >= linemax){
              _chain_str+="\n";
              _chain_str+="REMARK 350                    AND CHAINS:";
              counter = 41;
            }
            if (i === nchain-1) {
              r = " "+t[i];
            } //#last chain
            _chain_str+=r;
            counter+=r.length;
          }
          _records.push(_chain_str)
          //_records.push("REMARK 350 APPLY THE FOLLOWING TO CHAINS: "+t.join(', '));
          for (var k = 0; k < o.object.biomolDict[au].partList[j].matrixList.length; k++) {
            var mat = o.object.biomolDict[au].partList[j].matrixList[k];
            //_records.push(sprintf(BiomtFormat, 1, k+1,mat.elements[0],-mat.elements[1],-mat.elements[2],mat.elements[12]));//+ - -
            //_records.push(sprintf(BiomtFormat, 2, k+1,-mat.elements[4],mat.elements[5],mat.elements[6],mat.elements[13]));//- + +
            //_records.push(sprintf(BiomtFormat, 3, k+1,-mat.elements[8],mat.elements[9],mat.elements[10],mat.elements[14]));//- + +
            _records.push(sprintf(BiomtFormat, 1, k+1,mat.elements[0],mat.elements[1],mat.elements[2],mat.elements[12]));//+ - -
            _records.push(sprintf(BiomtFormat, 2, k+1,mat.elements[4],mat.elements[5],mat.elements[6],mat.elements[13]));//- + +
            _records.push(sprintf(BiomtFormat, 3, k+1,mat.elements[8],mat.elements[9],mat.elements[10],mat.elements[14]));//- + +
          }
          _records.push("REMARK 350END");
        }
        //then the atoms
        structure.structure.eachAtom((a) => {
              const formatString = a.hetero ? HetatmFormat : AtomFormat;
              var serial = renumberSerial ? ia : a.serial;
              if (serial > 99999) serial = 99999;
              // Alignment of one-letter atom name such as C starts at column 14,
              // while two-letter atom name such as FE starts at column 13.
              let atomname = a.atomname;
              if (atomname.length <= 3 && !a.hetero)
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
                var serial = renumberSerial ? ia : a.serial;
                if (serial > 99999) serial = 99999;
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
            var serial = renumberSerial ? ia : a.serial;
            if (serial > 99999) serial = 99999;
            // Alignment of one-letter atom name such as C starts at column 14,
            // while two-letter atom name such as FE starts at column 13.
            let atomname = a.atomname;
            if (atomname.length <= 3 && !a.hetero)
            {
                atomname = ' ' + atomname;
                //if (atomname.length === 1)
                //    atomname = ' ' + atomname;
                //defaults(a.chainname, ' ')
                _records.push(sprintf(formatString, serial, atomname, a.resname, ' ', a.resno, a.x, a.y, a.z, defaults(a.occupancy, 1.0), defaults(a.bfactor, 0.0), '', // segid
              defaults(a.element, '')));
            }
            ia += 1;
        }, new NGL.Selection(asele));
    }
    _records.push(sprintf('%-80s', 'END'));
    return _records.join('\n');
}


function ill_writeAtoms_cb(structure,style,au,sele_elem,current_model) {
  var AFormat = 'ATOM  %5d %-4s %3s%2s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';//'ATOM  %5d %-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
  var HFormat = 'HETATM%5d %-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
  const BiomtFormat = 'REMARK 350   BIOMT%1d %3d%10.6f%10.6f%10.6f%15.5f';
  let writeBU = true;
  let ia = 1;
  let im = 1;
  let renumberSerial = true;
  let asele = sele_elem;
  var o = structure;
  //var current_model = model_elem.value;
  
  var nch = structure.structure.getChainnameCount();

  var bu = false;
  if (au !== "AU" && o.object.biomolDict[au]) bu = true;
  if (asele === "" && bu) {
    //need to apply the matrix to the selection inside the BU selection ?
    //console.log(o.object.biomolDict[o.assembly].getSelection());
    //build using given selection AND biomolDic selection
    asele = "(" + o.object.biomolDict[au].getSelection().string + ") AND not water";
  }
  if (asele === "" && current_model != null ) asele = "/"+current_model+" AND not water";
  if (asele === "") asele = "not water";
  
  if (style === 1) {
    asele="("+asele+") and (.CA or .P or .C1')";
  }

  console.log(asele);
  var chnames = []
  structure.structure.eachChain( chain => {
    if (!chnames.includes(chain.chainname)) chnames.push( chain.chainname)
  }, new NGL.Selection(asele));

    
  _records = [];
  if (bu && writeBU) {
      //first write the matrix
      for (var j = 0; j < o.object.biomolDict[au].partList.length; j++) {
        //REMARK 350 BIOMOLECULE: 1
        //REMARK 350 APPLY THE FOLLOWING TO CHAINS: 1, 2, 3, 4
        var s= structure.object.biomolDict[au].getSelection() //max in illustrator is 12
        var t = []
        s.selection.rules.forEach(element => {
          if (chnames.includes(element.chainname)){
            t.push(element.chainname);
        }
        });
        //s.selection.rules.map(function(d) {
        //  if (chnames.includes(d.chainname)) {return d.chainname;}          
        //} )
        _records.push("REMARK 350 BIOMOLECULE: 1");
        _records.push("REMARK 350 APPLY THE FOLLOWING TO CHAINS: "+t.join(', '));
        for (var k = 0; k < o.object.biomolDict[au].partList[j].matrixList.length; k++) {
          var mat = o.object.biomolDict[au].partList[j].matrixList[k];
          //_records.push(sprintf(BiomtFormat, 1, k+1,mat.elements[0],-mat.elements[1],-mat.elements[2],mat.elements[12]));//+ - -
          //_records.push(sprintf(BiomtFormat, 2, k+1,-mat.elements[4],mat.elements[5],mat.elements[6],mat.elements[13]));//- + +
          //_records.push(sprintf(BiomtFormat, 3, k+1,-mat.elements[8],mat.elements[9],mat.elements[10],mat.elements[14]));//- + +
          _records.push(sprintf(BiomtFormat, 1, k+1,mat.elements[0],mat.elements[1],mat.elements[2],mat.elements[12]));//+ - -
          _records.push(sprintf(BiomtFormat, 2, k+1,mat.elements[4],mat.elements[5],mat.elements[6],mat.elements[13]));//- + +
          _records.push(sprintf(BiomtFormat, 3, k+1,mat.elements[8],mat.elements[9],mat.elements[10],mat.elements[14]));//- + +
        }
        _records.push("REMARK 350END");
      }
      //then the atoms
      structure.structure.eachAtom((a) => {
            const formatString = a.hetero ? HFormat : AFormat;
            var serial = renumberSerial ? ia : a.serial;
            if (serial > 99999) serial = 99999;
            // Alignment of one-letter atom name such as C starts at column 14,
            // while two-letter atom name such as FE starts at column 13.
            let atomname = a.atomname;
            if (atomname.length <= 3 && !a.hetero)
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
              const formatString = a.hetero ? HFormat : AFormat;
              var serial = renumberSerial ? ia : a.serial;
              if (serial > 99999) serial = 99999;
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
          const formatString = a.hetero ? HFormat : AFormat;
          var serial = renumberSerial ? ia : a.serial;
          if (serial > 99999) serial = 99999;
          // Alignment of one-letter atom name such as C starts at column 14,
          // while two-letter atom name such as FE starts at column 13.
          let atomname = a.atomname;
          if (atomname.length <= 3 && !a.hetero)
          {
              atomname = ' ' + atomname;
              //if (atomname.length === 1)
              //    atomname = ' ' + atomname;
              //defaults(a.chainname, ' ')
              _records.push(sprintf(formatString, serial, atomname, a.resname, ' ', a.resno, a.x, a.y, a.z, defaults(a.occupancy, 1.0), defaults(a.bfactor, 0.0), '', // segid
            defaults(a.element, '')));
          }
          ia += 1;
      }, new NGL.Selection(asele));
  }
  _records.push(sprintf('%-80s', 'END'));
  return _records.join('\n');
}

function ill_prepareWildCard(style){
    //ignore hydrogen
    var astr=""
    //use the selection?
    if (ignore_h){
      astr+="HETATM-H-------- 0,9999, 1.1,1.1,1.1, 0.0\n\
HETATMH--------- 0,9999, 1.1,1.1,1.1, 0.0\n\
ATOM  -H-------- 0,9999, 1.1,1.1,1.1, 0.0\n\
ATOM  H--------- 0,9999, 1.1,1.1,1.1, 0.0\n\
";
    }
    if (style == 0)
    {
        astr+="ATOM  -C-------- 0,9999, 1.0,1.0,1.0, 1.6\n\
ATOM  C--------- 0,9999, 1.0,1.0,1.0, 1.6\n\
ATOM  -S-------- 0,9999, 1.0,1.0,1.0, 1.8\n\
ATOM  -P-------- 0,9999, 1.0,1.0,1.0, 1.8\n\
ATOM  -N-------- 0,9999, 1.0,1.0,1.0, 1.5\n\
ATOM  -O-------- 0,9999, 1.0,1.0,1.0, 1.5\n\
ATOM  ---------- 0,9999, 1.0,1.0,1.0, 1.5\n\
HETATM-H-------- 0,9999, 1.0,1.0,1.0, 0.0\n\
HETATMH--------- 0,9999, 1.0,1.0,1.0, 0.0\n\
HETATM-C-------- 0,9999, 1.0,1.0,1.0, 1.6\n\
HETATM-S-------- 0,9999, 1.0,1.0,1.0, 1.8\n\
HETATM-P-------- 0,9999, 1.0,1.0,1.0, 1.8\n\
HETATM-N-------- 0,9999, 1.0,1.0,1.0, 1.5\n\
HETATM-O-------- 0,9999, 1.0,1.0,1.0, 1.5\n\
HETATM---------- 0,9999, 1.0,1.0,1.0, 1.5\n";
    }
    else if (style == 1)
    {
        //#open wildcard1
        //P,C5,CA
        astr+="ATOM  -P-------- 0,9999 1.00, 1.0, 1.0, 5.0\n\
ATOM  -C1'------ 0,9999 1.0,1.0,1.0, 5.0\n\
HETATM-P-------- 0,9999 1.0, 1.0, 1.0, 5.0\n\
HETATM-C1'------ 0,9999 1.00, 1.00, 1.00, 5.0\n\
ATOM  -CA------- 0,9999 1.0,1.0,1.0, 5.0\n\
HETATM-C-------- 0,9999 1.0,1.0,1.0, 1.6\n\
HETATM---------- 0,9999 1.0,1.0,1.0, 1.5\n";
        chain_outlines_params[2] = 6000;
    }
    astr+="END\n"
    return astr
}

function ill_prepareInput(astyle,nameinput,ascale=12){
    var q = stage.animationControls.controls.rotation;
    var rotation = new NGL.Euler().setFromQuaternion( q);
    var position = new NGL.Vector3(0,0,0);
    var sao = true;
    var astr="read\n"
    astr+=nameinput+".pdb\n"
    astr+=ill_prepareWildCard(astyle);
    astr+="center\n"
    astr+="auto\n"
    astr+="trans\n"
    astr+= position.x.toString()+","+position.y.toString()+","+position.z.toString()+"\n"
    astr+="scale\n"
    astr+=ascale+"\n"
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
    astr+=((sao)?"1":"0")+","+ ao_params.join()+"\n";
    astr+="-30,-30                                                      # image size in pixels, negative numbers pad the molecule by that amount\n"
    astr+="illustrate\n"
    astr+=atomic_outlines_params.join()+"  # parameters for outlines, atomic\n"
    astr+=subunit_outlines_params.join()+"  # subunits\n"
    astr+=chain_outlines_params.join()+"  # outlines defining regions of the chain\n"
    astr+="calculate\n"
    astr+=nameinput+".pnm\n"
    return astr;
}
