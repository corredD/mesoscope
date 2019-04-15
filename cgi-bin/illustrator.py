#!/bin/python
import string
import cgi
import sys
import os
import copy
import math
import gzip
import types
import time
import random
import json
g = random
sys.path.append('../python/')
from HTMLTools import *
#import cgitb
#cgitb.enable()

def mkTmpName(tmpDir = " /var/www/data/tmp/",Id="",prefix = "tmp", ext = ".tmp"):
    tmpName = tmpDir+"/"+prefix
    tmp= id
    tmpName += tmp+ext
    return tmpName

def mkRand():
    tmp= str(int(g.random()*1000000000))
    return tmp

# Display the form
#
def displayForm(file = "", seq = ""):
    aStr = ""
    aStr += htmlHeader("Illustrator",other = "<META NAME=\"keywords\" content=\"\">")
    #aStr += "<div align=\"center\"><img src=\"http://bioserv.rpbs.jussieu.fr/~autin/help/ABCgen/ABCgen.png\" width=\"800\" height=\"89\"></a></div>\n"
    aStr += htmlRule()
    aStr += htmlMsg("<form method=\"POST\" action=\"../cgi-bin/illustrator.py\" enctype=\"multipart/form-data\"> <INPUT TYPE=HIDDEN NAME=\"key\" VALUE=\"process\">")
    aStr += "<table><tr><td>\n"
    aStr += htmlH4Msg("This facility is to generate protein illustration. ")
    aStr += "<H4><font color=Blue>Enter a PDBid&nbsp;</font><input type=\"text\"name=\"PDBID\"value=\"2hbb\" size=50><br><small>limited to 156 character</H4>\n"
    aStr += htmlMsg("<p> <input type=submit name=\"preview\" value=\"preview\"><input type=submit value=\"process\"><input type=reset value=\"Clear\"> ")
    aStr += "</td><td align=\"center\"></div></td></tr></table>\n"
    aStr += htmlRule()
    aStr += htmlMsg("</form>")
    aStr += htmlTailer()
    print aStr

def displayFormPreview(PDBID):
    aStr = ""
    aStr += htmlHeader("Illustrator",other = "<META NAME=\"keywords\" content=\"\">")
    #aStr += "<div align=\"center\"><img src=\"http://bioserv.rpbs.jussieu.fr/~autin/help/ABCgen/ABCgen.png\" width=\"800\" height=\"89\"></a></div>\n"
    aStr += htmlRule()
    #aStr += htmlMsg("<form method=\"POST\" action=\"../cgi-bin/illustrator.py\" enctype=\"multipart/form-data\"> <INPUT TYPE=HIDDEN NAME=\"key\" VALUE=\"processpreview\">")
    aStr += "<table><tr><td>\n"
    aStr += htmlH4Msg("This facility is to generate protein illustration. ")
    aStr += "<H4><font color=Blue>Enter a PDBid&nbsp;</font><input id=\"PDBID\" type=\"text\"name=\"PDBID\"value=\""+PDBID+"\" size=50><br><small>limited to 156 character</H4>\n"
    aStr += htmlMsg("<p> <button onclick='onPreview()'>Preview</button><button onclick='onClick()'>Process</button>")
    aStr += "</td><td align=\"center\"></td></tr></table>\n"
    aStr += htmlRule()
    #aStr += htmlMsg("</form>")
    #aStr += "<div></div>\n"
    aStr += "<div id=\"viewport\" style=\"width:300; height:300;\"></div>\n"
    aStr += "<script src=\"https://cdn.rawgit.com/arose/ngl/v2.0.0-dev.24/dist/ngl.js\"></script>\n"
    aStr +="<script>\n"
    aStr +="var PDBID = \""+PDBID+"\";\n"
    aStr +="""// Create NGL Stage object
var stage = new NGL.Stage( "viewport" );
stage.setParameters({cameraType: "orthographic"})
// Handle window resizing
window.addEventListener( "resize", function( event ){
    stage.handleResize();
}, false );

stage.setParameters({
  backgroundColor: "white"
})

function onPreview(){
    stage.removeAllComponents();
    PDBID = document.getElementById("PDBID").value;
    stage.loadFile('rcsb://'+PDBID,{ defaultRepresentation: true }).then(function (o) {o.addRepresentation("spacefill")});
}

function onClick(){
    var q = stage.animationControls.controls.rotation;
    var rotation = new NGL.Euler().setFromQuaternion( q);
    var formData = new FormData();
    formData.append("key", "processpreview");//array of x,y,z
    formData.append("PDBID", PDBID);
    formData.append("position", JSON.stringify(new NGL.Vector3(0,0,0)));
    formData.append("rotation", JSON.stringify(rotation));
    formData.append("scale", 12.0);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://mesoscope.scripps.edu/beta/cgi-bin/illustrator.py');
    xhr.onload = function () {
      // do something to response
      console.log(this.responseText);
      var data = JSON.parse(this.responseText)
      var myWindow = window.open(data.url, "_self");
    };
    xhr.send(formData);
}
    """
    aStr+="stage.loadFile('rcsb://"+PDBID+"',{ defaultRepresentation: true }).then(function (o) {o.addRepresentation(\"spacefill\")});\n"
    #aStr+="stage.autoView(200);\n"
    aStr+="</script>\n"
    aStr += htmlTailer()
    print aStr
#need to gather pos and rot and pass it to cgi
#var rotation = new THREE.Euler().setFromQuaternion( quaternion, eulerOrder );
#stage.animationControls.controls.rotation
#stage.animationControls.controls.position

argsDict = {#"TXTFile":    ["", "upload", None,      "No data specified (PDBFile)", "notMandatory", "TXT"],
            "PDBID":      ["", "value", None,       "No data specified (TXT)",   "notMandatory", "TXT"]
           }


#
# Make a processing object, from a dictionnary
#
class processObj:
    def __init__(self, theDict, values = None, formArgs = None, verbose = 0):

        # We setup de default values
        self.tmpKey = `int(random.random()*1000000)`
        self.queryId = ""

        self.data = {}
        for aKey in theDict.keys():
            self.data[aKey] = theDict[aKey][0]

    # We setup a parameter value
    def setKey(self, aKey, value):
        self.data[aKey] = value

    # To produce a listing of the current parameters
    def dict(self, mode = "text"):
        aStr = ""

        if mode == "text":
            sep = "\n"
            fun = str
        elif mode == "html":
            sep = "<br>"
            fun = htmlMsg
        for aKey in self.data.keys():
            if mode == "text":
                aStr += aKey+":"+str(self.data[aKey])+sep
            elif mode == "html":
                aStr += htmlMsg(aKey+":"+str(self.data[aKey])+sep)

        #print aStr
        return aStr

    # To fill the object with new values from a form
    def formParse(self, form, theDict, verbose = 0):
        # params = {}
        for aKey in form.keys():
            if self.data.has_key(aKey) == 0:
                continue
            # params[aKey] = None
            if theDict[aKey][1] == "value":
                try:
                    self.data[aKey] = form[aKey].value
                    if aKey == "PDBID":
                        if self.data[aKey] != "":
                            self.queryId = self.data[aKey]
                            self.data[theDict[aKey][-1]] = self.queryId
                except:
                    pass
            elif theDict[aKey][1] == "upload":
                queryId = ""
                try:
                    aKeyVal = form[aKey]
                    # queryId = "1"
                    aKeyVal = form[aKey]
                    queryId = cgi.escape(aKeyVal.filename)
                    oId     = ""
                    for aChar in queryId:
                        if aChar not in "ABCEDFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.:":
                            oId += "_"
                        else:
                            oId += aChar
                    queryId = oId
                    if len(queryId) > 30:
                        queryId = queryId[len(queryId)-30:]
                    if queryId != "":
                        # self.queryId = cgi.escape(aKeyVal.filename)
                        self.queryId = queryId
                        self.data[aKey] = cgi.escape(aKeyVal.filename)
                        self.data[theDict[aKey][-1]] = aKeyVal.file.readlines()
                        # Check for mac format
                        if len(self.data[theDict[aKey][-1]]) == 1:
                            if string.count(self.data[theDict[aKey][-1]][0],"\r") and (string.count(self.data[theDict[aKey][-1]][0],"\n") == 0):
                                self.data[theDict[aKey][-1]][0] = string.replace(self.data[theDict[aKey][-1]][0],"\r","\n\r")
                                self.data[theDict[aKey][-1]] = string.split(self.data[theDict[aKey][-1]][0],"\r")
                    #                aStr += "queryId :\""+queryId+"\""
                except:
                    pass

                if queryId == "":
                    self.data[aKey] = None
                    if theDict[aKey][4] != "notMandatory":
                        displayFormError(aKey+": "+queryId+" no file or incorrect file to upload !")

                #    aStr += htmlTailer()
                #    print aStr
        # print "queryId: ",self.queryId
        return

#maybe the input should be prepare in the client
def prepareWildCard(style):
    #ignore hydrogen
    astr=""
    if (style == 1) :
        astr="""HETATM-----HOH-- 0,9999,.5,.5,.5,1.6
ATOM  -H-------- 0,9999,.5,.5,.5,1.6
ATOM  H--------- 0,9999,.5,.5,.5,1.6
"""
        astr+="""ATOM  -C-------- 5,9999,.9,.0,.0,1.6
"""
        astr+="END\n"
    elif (style==2):
        #open wildcard1
        with open("../data/wildcard1.inp","r") as f:
            astr=f.read()
    elif (style==3):
        #open wildcard1
        with open("../data/wildcard2.inp","r") as f:
            astr=f.read()
    return astr
#"""HETATM-----HOH-- 0,9999,0,0,.5,.5,.5,1.6
#ATOM  -H-------- 0,9999,0,0,.5,.5,.5,1.6
#ATOM  H--------- 0,9999,0,0,.5,.5,.5,1.6
#ATOM  -C-------A 5,9999,1,1,.9,.4,.4,1.3
#ATOM  ---------A 5,9999,2,1,.9,.3,.3,1.3
#ATOM  -C-------C 5,9999,3,2,.9,.4,.4,1.6
#ATOM  ---------C 5,9999,4,2,.9,.3,.3,1.6
#ATOM  -C-------- 5,9999,3,3,.9,.8,.4,1.6
#ATOM  ---------- 5,9999,4,3,.9,.7,.3,1.6
#HETATM-SG--SNC-- 0,9999,7,5,.5,.5,.5,1.6
#HETATM-ND--SNC-- 0,9999,8,5,.5,.5,.5,1.6
#HETATM-OE--SNC-- 0,9999,9,5,.5,.5,.5,1.6
#HETATM-C---HEM-- 0,9999,5,4,.5,.5,.9,1.9
#HETATM-----HEM-- 0,9999,6,4,.5,.5,.8,1.9
#HETATM---------- 0,9999,0,0,.5,.5,.5,1.6
#ATOM  HCCC-RES-A 0,9999,0,0,1.,1.,1.,1.6
#END
#"""

#selection is wild card for chain for instance
def prepareInput(pdbId,form,scale=12.0,center=True,trans=[0,0,0],rotation=[0,0,0]):
    if (form.has_key("rotation")) :
        rotobj = json.loads(form["rotation"].value)
        rotation = [math.degrees(rotobj['_x']),math.degrees(rotobj['_y']),math.degrees(rotobj['_z'])]
    if (form.has_key("position")) :
        transobj = json.loads(form["position"].value)
        trans= [transobj['x'],transobj['y'],transobj['z']]
    if (form.has_key("scale")) :
        scale = form["scale"].value
    shadow = False
    ao = True
    if form.has_key("shadow"):
        shadow = True if form["shadow"].value == 'true' else False
    if form.has_key("ao"):
        ao = True if form["ao"].value == 'true' else False
    params_ao = [0.0023,2.0,1.0,0.7]
    if form.has_key("ao_params"):
        params_ao_obj = json.loads(form["ao_params"].value)
        params_ao= [float(params_ao_obj['_x']),
                    float(params_ao_obj['_y']),
                    float(params_ao_obj['_z']),
                    float(params_ao_obj['_w'])]
    contour_params=[]
    if form.has_key("contour_params1"):
        at_p_obj = json.loads(form["contour_params1"].value)
        contour_params.append(at_p_obj)
    else :
        contour_params.append(["3.","10.","3.","8.","4","0.","5."])
    if form.has_key("contour_params2"):
        sub_p_obj = json.loads(form["contour_params2"].value)
        contour_params.append(sub_p_obj)
    else :
        contour_params.append(["3.","10."])
    if form.has_key("contour_params3"):
        ch_p_obj = json.loads(form["contour_params3"].value)
        contour_params.append(ch_p_obj)
    else :
        contour_params.append(["3.","8.","6."])
    astr="read\n"
    astr+=pdbId+".pdb\n"
    style=2
    if form.has_key("style"):
        style = int(form["style"].value)
    astr+=prepareWildCard(style)
    if (center):
        astr+="center\n"
        astr+="auto\n"
    astr+="trans\n"
    astr+=str(trans[0])+","+str(trans[1])+","+str(trans[2])+"\n"
    astr+="scale\n"
    astr+=str(scale)+"\n"                                                         # pixels/Angstrom
    astr+="zrot\n"
    astr+="90.0\n"
    astr+="yrot\n"
    astr+="-180.0\n"
    astr+="xrot\n"
    astr+=str(rotation[0])+"\n"
    astr+="yrot\n"
    astr+=str(rotation[1])+"\n"
    astr+="zrot\n"
    astr+=str(rotation[2])+"\n"
    #astr+="xrot\n"
    #astr+=str(rotation[0])+"\n"
    astr+="wor\n"
    astr+="0.99607843137,0.99607843137,0.99607843137,1.,1.,1.,1.,1.\n"
    astr+="%d,%f,%f,%f,%f\n" % ((1 if (ao) else 0),
                                            params_ao[0],
                                            params_ao[1],
                                            params_ao[2],
                                            params_ao[3])
    #astr+="%d,%f,%f," % ((1 if (shadow) else 0),params_shadow[0],params_shadow[1])# cast shadow parameters
    #fake ambient occlusion parameters
    astr+="-30,-30                                                      # image size in pixels, negative numbers pad the molecule by that amount\n"
    astr+="illustrate\n"
    astr+=",".join(contour_params[0])+"  # parameters for outlines, atomic\n"
    astr+=",".join(contour_params[1])+"  # subunits\n"
    astr+=",".join(contour_params[2])+"  # outlines defining regions of the chain\n"
    astr+="calculate\n"
    astr+=pdbId+".pnm\n\n"
    return astr

def queryForm(form, verbose = 0):
    id = 0
    idprovided = False
    if form.has_key("_id") and int(form["_id"].value) != -1:
        id = form["_id"].value
        idprovided = True
    else :
        id = mkRand()
    wrkDir = "/var/www/html/data/tmp/ILL/"+id
    curentD = os.path.abspath(os.curdir)
    if not os.path.isdir(wrkDir):
        os.mkdir(wrkDir)
    #print "<html>Hello World</html>"
    x = processObj(argsDict)
    x.formParse(form,argsDict, verbose)
    queryTXT=""
    fetch=False
    inpfile = ""#wrkDir+"/"+queryTXT+".inp"
    tmpPDBName = ""#wrkDir+"/"+queryTXT+".pdb"
    proj_name = "illustrated"
    #no more than 20character
    if form.has_key("name") :
        proj_name = form["name"].value
    if form.has_key("PDBID") :
        queryTXT = form["PDBID"].value
        fetch = True
        tmpPDBName = wrkDir+"/"+queryTXT+".pdb"
        if not form.has_key("name") :
            proj_name = queryTXT
    elif form.has_key("PDBtxt") :
        queryTXT = form["PDBtxt"].value
        tmpPDBName = wrkDir+"/"+proj_name+".pdb"
        f = open(tmpPDBName, "w")
        f.write(queryTXT)
        f.close()
        queryTXT = proj_name
    elif form.has_key("PDBfile") :
        queryTXT = form["PDBfile"].file.read()#readlines()
        tmpPDBName = wrkDir+"/"+proj_name+".pdb"
        f = open(tmpPDBName, "w")
        f.write(queryTXT)
        f.close()
        queryTXT = proj_name
    #prepare input
    redirectURL = "https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/illustrator.html"
    #print "<html>Hello World</html>"

    #did the user send in the input file?
    inpfile = wrkDir+"/"+proj_name+".inp"
    if form.has_key("input_file"):
        filename = cgi.escape(form["input_file"].filename)
        inpstring = form["input_file"].file.read()
    elif form.has_key("input_txt"):
        inpstring = form["input_txt"].value
    else :
        inpstring = prepareInput(queryTXT,form)
    f = open(inpfile, "w")
    f.write(inpstring)
    f.close()
    cmd = "cd "+wrkDir+";"
    if fetch and not os.path.isfile(tmpPDBName):
        cmd+= "wget https://files.rcsb.org/download/"+queryTXT+".pdb >/dev/null;"
    cmd+= curentD+"/illustrator < "+queryTXT+".inp>/dev/null;"
    cmd+="/bin/convert "+queryTXT+".pnm -transparent \"rgb(254,254,254)\" "+queryTXT+".png>/dev/null;"
    os.system(cmd)

    httpfile="https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/"+queryTXT+".pdb"
    httpimg="https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/"+queryTXT+".png"

    print "Access-Control-Allow-Origin: *"
    print 'Content-type: application/json\n'
    print
    print "{\"image\":\""+httpimg+"\",\"url\":\""+redirectURL+"\",\"id\":\""+str(id)+"\"}"
    #displayResult(tmpPDBName,httpfile,httpimg,queryTXT)
    cleanup(wrkDir, "5 days")
    return

#https://files.rcsb.org/download/1crn.pdb
def processForm(form, returnpage=True, verbose = 0):
    if not form:
        displayForm()
        return

    #print "<html>Hello World</html>"
    x = processObj(argsDict)
    x.formParse(form,argsDict, verbose)
    queryTXT = string.upper(x.data["PDBID"])
    id = 0
    idprovided = False
    if form.has_key("_id") and int(form["_id"].value) != -1:
        id = form["_id"].value
        idprovided = True
    else :
        id = mkRand()
    #prepare input
    redirectURL = "https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/illustrator.html"
    wrkDir = "/var/www/html/data/tmp/ILL/"+id
    #print "<html>Hello World</html>"
    curentD = os.path.abspath(os.curdir)
    if not os.path.isdir(wrkDir):
        os.mkdir(wrkDir)
    if form.has_key("input_file"):
        filename = cgi.escape(form["input_file"].filename)
        inpstring = form["input_file"].file.readlines()
    elif form.has_key("input_txt"):
        inpstring = form["input_txt"].value
    else :
        inpstring = prepareInput(queryTXT,form)
    inpfile = wrkDir+"/"+queryTXT+".inp"
    f = open(inpfile, "w")
    f.write(inpstring)
    f.close()

    tmpPDBName = wrkDir+"/"+queryTXT+".pdb"
    cmd = "cd "+wrkDir+";"
    if not os.path.isfile(tmpPDBName):
        cmd+= "wget https://files.rcsb.org/download/"+queryTXT+".pdb >/dev/null;"
    cmd+= curentD+"/illustrator < "+queryTXT+".inp>/dev/null;"
    cmd+="/bin/convert "+queryTXT+".pnm -transparent \"rgb(254,254,254)\" "+queryTXT+".png>/dev/null;"
    os.system(cmd)

    httpfile="https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/"+queryTXT+".pdb"
    httpimg="https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/"+queryTXT+".png"

    aStr = displayResult(queryTXT,httpfile,httpimg,queryTXT,id=id)
    #print aStr
    f = open(wrkDir+"/illustrator.html","w")
    f.write("%s" % aStr)
    f.close()
    #sys.stdout.write("%s" % htmlRedirectToPage("https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/illustrator.html"))
    #sys.stdout.flush()
    if (returnpage and not idprovided) :
        print "Content-type: text/html"
        print
        #print 'Content-Type: text/html\r\n'
        print ''# HTTP says you have to have a blank line between headers and content
        print '<html>\r\n'
        print '  <head>\r\n'
        print '    <meta http-equiv="refresh" content="0;url=%s" />\r\n' % redirectURL
        print '    <title>You are going to be redirected</title>\r\n'
        print '  </head>\r\n'
        print '  <body>\r\n'
        print '    Redirecting... <a href="%s">Click here if you are not redirected</a>\r\n' % redirectURL
        print '  </body>\r\n'
        print '</html>\r\n'
    else :
        print "Access-Control-Allow-Origin: *"
        print 'Content-type: application/json\n'
        print "{\"image\":\""+httpimg+"\",\"url\":\""+redirectURL+"\",\"id\":\""+str(id)+"\"}"
    #displayResult(tmpPDBName,httpfile,httpimg,queryTXT)
    cleanup(wrkDir, "5 days")
    return

def displayResult(queryTXT,httpn,htti,valStr,id=-1):
    style = "<style>\n"
    style +="""
.loader {
  border: 16px solid #f3f3f3; /* Light grey */
  border-top: 16px solid #3498db; /* Blue */
  border-radius: 50%;
  width: 120px;
  height: 120px;
  animation: spin 2s linear infinite;
  display: none;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
"""
    aStr = ""
    aStr += htmlHeader("Illustrator",httpHead = 0,other = "<META NAME=\"keywords\" content=\"\">\n"+style)
    #aStr += "<div align=\"center\"><img src=\"http://bioserv.rpbs.jussieu.fr/~autin/help/ABCgen/ABCgen.png\" width=\"800\" height=\"89\"></a></div>\n"
    aStr += htmlRule()
    aStr += htmlH4Msg("Query text :"+valStr)
    aStr +="""
<div>
    <input type="checkbox" id="advanced" name="advanced" > Advanced Options<br>
    <input type="checkbox" id="shadow" name="shadow" > Shadows<br>
    <input type="checkbox" id="ao" name="ao" checked> Ambient Occlusion<br>
    <input type=number id="scale" step=1 value=12 /> Pixel per Angstrom <br />
</div>
"""
    aStr += htmlMsg("<button onclick='onClick()'>Update</button>")
    #need input for all options + selection + advText for david
    aStr +="<div></div>\n"
    aStr +="<div id=\"loader\" class=\"loader\"></div> \n"
    aStr +="<div><a href=\""+htti+"\" target=\"blanck\"><img id=\"result\" src=\""+htti+"\"></img></a></div>\n"
    aStr +="<div id=\"viewport\" style=\"width:300; height:300;\"></div>\n"
    aStr +="<script src=\"https://cdn.rawgit.com/arose/ngl/v2.0.0-dev.24/dist/ngl.js\"></script>\n"
    aStr +="<script>\n"
    aStr +="var _id = "+str(id)+";\n"
    aStr +="var PDBID = \""+queryTXT+"\";\n"
    aStr +="var img_source = \""+htti+"\";\n"
    aStr +="""
// Create NGL Stage object
var i=0;
var shadow = document.getElementById("shadow");
var ao = document.getElementById("ao");
var advanced = document.getElementById("advanced");
var an_img = new Image();
var scale = document.getElementById("scale");
// When it is loaded...
an_img.addEventListener("load", function() {
    // Set the on-screen image to the same source. This should be instant because
    // it is already loaded.
    document.getElementById("result").src = an_img.src;
    // Schedule loading the next frame.
    setTimeout(function() {
        an_img.src = img_source+"#" + (new Date).getTime();
    }, 1000/15); // 15 FPS (more or less)
})

// Start the loading process.
an_img.src = img_source+"#" + (new Date).getTime();
var img = document.getElementById("result");
var stage = new NGL.Stage( "viewport" );
stage.setParameters({cameraType: "orthographic"})
// Handle window resizing
window.addEventListener( "resize", function( event ){
    stage.handleResize();
}, false );

stage.setParameters({
  backgroundColor: "white"
})
    """
    aStr+="stage.loadFile('rcsb://"+queryTXT+"',{ defaultRepresentation: true }).then(function (o) {\n"
    aStr+="""
    o.addRepresentation("spacefill", {
        sele: "polymer",
        name: "polymer",
        //assembly: "AU"
        });
    });
"""
    #aStr+="stage.autoView(200);\n"
    aStr+="""
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

function onClick(){
    document.getElementById("loader").style.display = "block";
    clearTimeout();
    var q = stage.animationControls.controls.rotation;
    var rotation = new NGL.Euler().setFromQuaternion( q);
    var formData = new FormData();
    formData.append("key", "processpreview");//array of x,y,z
    formData.append("PDBID", PDBID);
    formData.append("position", JSON.stringify(new NGL.Vector3(0,0,0)));
    formData.append("rotation", JSON.stringify(rotation));
    formData.append("scale", parseFloat(scale.value));
    formData.append("_id", _id);
    formData.append("shadow", shadow.checked);
    formData.append("ao", ao.checked);
    //show progress bar
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://mesoscope.scripps.edu/beta/cgi-bin/illustrator.py');
    xhr.onload = function () {
      // do something to response
      console.log(this.responseText);
      var data = JSON.parse(this.responseText)
      an_img.src = data.image+"#"+i;
      i=i+1;
      //hide progress bar
       document.getElementById("loader").style.display = "none";
    };
    xhr.send(formData);
}
"""
    aStr+="</script>\n"
    aStr += htmlTailer()
    return aStr

def printDebug(form):
    print "Content-type:text/html\r\n\r\n"
    print '<html>'
    print '<head>'
    print '<title>Hello Word - First CGI Program</title>'
    print '</head>'
    print '<body>'
    print form
    #print form["PDBfile"]
    #print form["PDBfile"].filename
    #print form["PDBfile"].file.readlines()
    print '</body>'
    print '</html>'
### ===========================================================
### Begin actual script
### ===========================================================
if __name__=='__main__':
### evaluate CGI request
    if len(sys.argv) > 1 :
        if sys.argv[1].split(".")[1] == "inp" :
            #execute directly
            cmd=("./illustrator-2016 < " +sys.argv[1])
            os.system(cmd)
    else :
        form = cgi.FieldStorage()
        ## "key" is a hidden form element with an
        ## action command such as "process"
        try:
            statuskey = form["key"].value
        except:
            statuskey = None

        if statuskey == "process":
            if (form.has_key("preview")):displayFormPreview(form["PDBID"].value)
            else : processForm(form,True)
        elif statuskey == "processpreview":
            if (form.has_key("preview")):displayFormPreview(form["PDBID"].value)
            else :
                #printDebug(form)
                #print True if form["shadow"].value == 'true' else False
                processForm(form,False)
        elif statuskey == "query":
            #printDebug(form)
            queryForm(form)
        else:
            displayForm()
