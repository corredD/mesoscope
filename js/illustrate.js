var atomic_outlines_params=[3.0,10.0,4,0.0,5.0];
var subunit_outlines_params=[3.,10.];
var chain_outlines_params=[3.,8.,6.];
var ao_params=[0.0023,2.0,1.0,0.7];
var ill_current_id=-1;

function getText(url){
    // read text from URL location
    var request = new XMLHttpRequest();
    request.open('GET', url, false);
    request.send(null);
    return request.responseText;
}

function readWildCard(filename){
    var url="https://mesoscope.scripps.edu/beta/data/"+filename;
    var outer_text = getText(url);
    return outer_text;
}

function prepareWildCard(style){
    //ignore hydrogen
    var astr=""
    if (style == 1)
    {
        astr+="HETATM-----HOH-- 0,9999,.5,.5,.5,0.0\n\
ATOM  -H-------- 0,9999,.5,.5,.5,0.0\n\
ATOM  H--------- 0,9999,.5,.5,.5,0.0\n\
";
        astr+="ATOM  -C-------- 5,9999,.9,.0,.0,1.6\n";
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
    }
    return astr
}

function ill_prepareInput(astyle,nameinput,ascale=12){
    var q = stage.animationControls.controls.rotation;
    var rotation = new NGL.Euler().setFromQuaternion( q);
    var position = new NGL.Vector3(0,0,0);
    //position.subVectors(stage.animationControls.controls.position , ngl_center);
    //position.multiplyScalar(-1.0);
    var sao = true;
    var astr="read\n"
    astr+=nameinput+".pdb\n"
    astr+=prepareWildCard(astyle);
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
    astr+="0.99607843137,0.99607843137,0.99607843137,1.,1.,1.,1.,1.\n"
    astr+=((sao)?"1":"0")+","+ao_params.join()+"\n";
    astr+="-30,-30                                                      # image size in pixels, negative numbers pad the molecule by that amount\n"
    astr+="illustrate\n"
    astr+=atomic_outlines_params.join()+"  # parameters for outlines, atomic\n"
    astr+=subunit_outlines_params.join()+"  # subunits\n"
    astr+=chain_outlines_params.join()+"  # outlines defining regions of the chain\n"
    astr+="calculate\n"
    astr+=nameinput+".pnm\n"
    return astr;
}

//node_selected.data.sprite.scale2d
