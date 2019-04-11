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

def prepareInput(pdbId,scale=12.0,center=True,trans=[0,0,0],rotation=[0,0,0]):
    astr="read\n"
    astr+=pdbId+".pdb\n"
    astr+="""
1.6,1.5,1.6,1.5,1.6,1.8,1.9,1.5       #radii for atom types 1-16
1.5,1.5,1.6,1.5,1.5,1.5,1.6,1.5
HETATM-----HOH-- 0,9999,0,0           #selection strings, dash is wildcard
ATOM  -H-------- 0,9999,0,0           # first two numbers, residue range
ATOM  H--------- 0,9999,0,0           # third number, atom type
ATOM  -C-------A 0,9999,1,1           # final number defines subunits for outlines
ATOM  ---------A 0,9999,2,1           # selection starts at first record, and stop when it finds something that matches
ATOM  -C-------C 0,9999,1,2
ATOM  ---------C 0,9999,2,2
ATOM  -C-------B 0,9999,3,3
ATOM  ---------B 0,9999,4,3
ATOM  -C-------D 0,9999,3,4
ATOM  ---------D 0,9999,4,4
HETATM-C---HEM-- 0,9999,5,5
HETATMFE---HEM-- 0,9999,7,5
HETATM-----HEM-- 0,9999,6,5
HETATM---------- 0,9999,0,0
ATOM  HCCC-RES-A 0,9999,1,1
END
"""
    if (center):
        astr+="center\n"
        astr+="auto\n"
    astr+="trans\n"
    astr+=str(trans[0])+","+str(trans[1])+","+str(trans[2])+"\n"
    astr+="scale\n"
    astr+=str(scale)+"\n"                                                         # pixels/Angstrom
    astr+="zrot\n"
    astr+="-90.0\n"
    astr+="xrot\n"
    astr+="180.0\n"
    astr+="zrot\n"
    astr+=str(-rotation[2])+"\n"
    astr+="yrot\n"
    astr+=str(rotation[1])+"\n"
    astr+="xrot\n"
    astr+=str(-rotation[0])+"\n"
    #astr+="xrot\n"
    #astr+=str(rotation[0])+"\n"
    astr+="""wor
-0.5,-0.2,1.2                                                #vector pointing at light source
0.0,0.00,0,0.99, 0.0,0.00,0,0.69, 0.0,0.00,0,0.69            #phong shading parameters for each atom type
0.0,0.00,0,0.99, 0.0,0.00,0,0.59, 0.0,0.00,0,0.59            #final numbers are flat colors, rgb
0.0,0.00,0,0.99, 0.0,0.00,0,0.89, 0.0,0.00,0,0.69
0.0,0.00,0,0.99, 0.0,0.00,0,0.79, 0.0,0.00,0,0.59
0.0,0.00,0,0.99, 0.0,0.00,0,0.39, 0.0,0.00,0,0.39
0.0,0.00,0,0.99, 0.0,0.00,0,0.29, 0.0,0.00,0,0.29
0.0,0.00,0,0.99, 0.0,0.00,0,0.00, 0.0,0.00,0,0.00
0.0,0.00,0,0.19, 0.0,0.00,0,0.75, 0.0,0.00,0,0.99
0.0,0.00,0,0.99, 0.0,0.00,0,0.19, 0.0,0.00,0,0.19
0.0,0.00,0,0.29, 0.0,0.00,0,0.99, 0.0,0.00,0,0.29
0.0,0.00,0,0.79, 0.0,0.00,0,0.79, 0.0,0.00,0,0.99
0.0,0.00,0,0.79, 0.0,0.00,0,0.79, 0.0,0.00,0,0.99
0.0,0.00,0,0.49, 0.0,0.00,0,0.89, 0.0,0.00,0,0.99
0.0,0.00,0,0.39, 0.0,0.00,0,0.79, 0.0,0.00,0,0.99
0.0,0.00,0,0.99, 0.0,0.00,0,0.29, 0.0,0.00,0,0.99
0.0,0.00,0,0.99, 0.0,0.00,0,0.49, 0.0,0.00,0,0.49
.2,.2,.2,.2,.2,.0,.0,.0                                      #colors for clipped atoms (rarely used)
.2,.2,.2,.2,.2,.0,.0,.0
.2,.2,.2,.2,.2,.0,.0,.0
.2,.2,.2,.2,.2,.0,.0,.0
.2,.2,.2,.2,.2,.9,.9,.0
.2,.2,.2,.2,.2,.0,.0,.0
255,255,255,255,255,255,1.,1.0                               # background rgb (0-255), fog rgb, fraction fog front and back
0,0.7,1.1                                                    # cast shadow parameters
1,0.0023,2.0,1.                                              # fake ambient occlusion parameters
0.,0                                                         # rotation for stereo pairs
-30,-30                                                      # image size in pixels, negative numbers pad the molecule by that amount
illustrate
3.,10.,3.,8.,4,0.,5.                                         # parameters for outlines, atomic
3.,10.                                                       # subunits
3.,8.,6.                                                     # outlines defining regions of the chain
calculate
1,0                                                          # first "1" specifies pnm outpu
"""
    astr+=pdbId+".pnm\n"
    return astr

def queryForm(form):
    id = int(form["id"].value)
    #print "<html>Hello World</html>"
    x = processObj(argsDict)
    x.formParse(form,argsDict, verbose)
    queryTXT = string.upper(form["PDBID"].value)
    #prepare input
    redirectURL = "https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/illustrator.html"
    wrkDir = "/var/www/html/data/tmp/ILL/"+id
    print "Access-Control-Allow-Origin: *"
    print 'Content-type: application/json\n'
    print
    #print "<html>Hello World</html>"
    curentD = os.path.abspath(os.curdir)
    if not os.path.isdir(curentD):
        os.mkdir(wrkDir)
    inpstring = prepareInput(queryTXT)
    inpfile = wrkDir+"/"+queryTXT+".inp"
    f = open(inpfile, "w")
    f.write(inpstring)
    f.close()
    tmpPDBName = wrkDir+"/"+queryTXT+".pdb"
    cmd = "cd "+wrkDir+";"
    cmd+= "wget https://files.rcsb.org/download/"+queryTXT+".pdb >/dev/null;"
    cmd+= curentD+"/illustrator-2016 < "+queryTXT+".inp>/dev/null;"
    cmd+="/bin/convert "+queryTXT+".pnm -transparent \"rgb(254,254,254)\" "+queryTXT+".png>/dev/null;"
    os.system(cmd)

    #httpfile="https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/"+queryTXT+".pdb"
    httpimg="https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/"+queryTXT+".png"
    print "{'image':'"+httpimg+"'} "
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
    scale=12.0
    center=True
    trans=[0,0,0]
    rotation=[0,0,0]
    if (form.has_key("rotation")) :
        rotobj = json.loads(form["rotation"].value)
        rotation = [math.degrees(rotobj['_x']),math.degrees(rotobj['_y']),math.degrees(rotobj['_z'])]
    if (form.has_key("position")) :
        transobj = json.loads(form["position"].value)
        trans= [transobj['x'],transobj['y'],transobj['z']]
    if (form.has_key("scale")) :
        scale = form["scale"].value
    inpstring = prepareInput(queryTXT,scale,center,trans,rotation)
    inpfile = wrkDir+"/"+queryTXT+".inp"
    f = open(inpfile, "w")
    f.write(inpstring)
    f.close()

    tmpPDBName = wrkDir+"/"+queryTXT+".pdb"
    cmd = "cd "+wrkDir+";"
    cmd+= "wget https://files.rcsb.org/download/"+queryTXT+".pdb >/dev/null;"
    cmd+= curentD+"/illustrator-2016 < "+queryTXT+".inp>/dev/null;"
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
    aStr = ""
    aStr += htmlHeader("Illustrator",httpHead = 0,other = "<META NAME=\"keywords\" content=\"\">")
    #aStr += "<div align=\"center\"><img src=\"http://bioserv.rpbs.jussieu.fr/~autin/help/ABCgen/ABCgen.png\" width=\"800\" height=\"89\"></a></div>\n"
    aStr += htmlRule()
    aStr += htmlH4Msg("Query text :"+valStr)
    aStr += htmlMsg("<button onclick='onClick()'>Update</button>")
    aStr +="<a href=\""+htti+"\" target=\"blanck\"><img id=\"result\" src=\""+htti+"\"></a>\n"
    aStr +="<div id=\"viewport\" style=\"width:300; height:300;\"></div>\n"
    aStr += "<script src=\"https://cdn.rawgit.com/arose/ngl/v2.0.0-dev.24/dist/ngl.js\"></script>\n"
    aStr +="<script>\n"
    aStr +="var _id = "+str(id)+";\n"
    aStr +="var PDBID = \""+queryTXT+"\";\n"
    aStr +="""
// Create NGL Stage object
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
function onClick(){
    var q = stage.animationControls.controls.rotation;
    var rotation = new NGL.Euler().setFromQuaternion( q);
    var formData = new FormData();
    formData.append("key", "processpreview");//array of x,y,z
    formData.append("PDBID", PDBID);
    formData.append("position", JSON.stringify(new NGL.Vector3(0,0,0)));
    formData.append("rotation", JSON.stringify(rotation));
    formData.append("scale", 12.0);
    formData.append("_id", _id);
    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://mesoscope.scripps.edu/beta/cgi-bin/illustrator.py');
    xhr.onload = function () {
      // do something to response
      console.log(this.responseText);
      var data = JSON.parse(this.responseText)
      img.src = data.image;
    };
    xhr.send(formData);
}
"""
    aStr+="</script>\n"
    aStr += htmlTailer()
    return aStr

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
            else : processForm(form,False)
        elif statuskey == "query":
            queryForm(form)
        else:
            displayForm()
