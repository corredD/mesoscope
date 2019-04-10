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
g = random
sys.path.append('../python/')
from HTMLTools import *

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
    aStr += "<H4><font color=Blue>Enter a PDBid&nbsp;</font><input type=\"text\"name=\"TXT\"value=\"2hbb\" size=50><br><small>limited to 156 character</H4>\n"
    aStr += htmlMsg("<p> <input type=submit value=\"Process\"><input type=reset value=\"Clear\"> ")
    aStr += "</td><td align=\"center\"></div></td></tr></table>\n"
    aStr += htmlRule()
    aStr += htmlMsg("</form>")
    aStr += htmlTailer()
    print aStr

argsDict = {#"TXTFile":    ["", "upload", None,      "No data specified (PDBFile)", "notMandatory", "TXT"],
            "TXT":      ["", "value", None,       "No data specified (TXT)",   "notMandatory", "TXT"]
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
                    if aKey == "TXT":
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

def prepareInput(pdbId):
    astr="read\n"    
    astr+=pdbId+".pdb\n"
    astr+="""
1.6,1.5,1.6,1.5,1.6,1.8,1.9,1.5       #radii for atom types 1-16
1.5,1.5,1.6,1.5,1.5,1.5,1.6,1.5
HETATM-----HOH-- 0,9999,0,0           #selection strings, dash is wildcard
ATOM  -H-------- 0,9999,0,0           # first two numbers, residue range
ATOM  H--------- 0,9999,0,0           #third number, atom type
ATOM  -C-------A 5,9999,1,1           # final number defines subunits for outlines
ATOM  ---------A 5,9999,2,1           # selection starts at first record, and stop when it finds something that matches
ATOM  -C-------C 5,9999,1,2
ATOM  ---------C 5,9999,2,2
ATOM  -C-------B 5,9999,3,3
ATOM  ---------B 5,9999,4,3
ATOM  -C-------D 5,9999,3,4
ATOM  ---------D 5,9999,4,4
HETATM-C---HEM-- 0,9999,5,5
HETATMFE---HEM-- 0,9999,7,5
HETATM-----HEM-- 0,9999,6,5
HETATM---------- 0,9999,0,0
ATOM  HCCC-RES-A 0,9999,1,1
END
center 
auto
trans
0.,0.,0.
scale
12.0                                                         # pixels/Angstrom
zrot
-90.
xrot
180.
zrot
0.
yrot
0.
xrot
0.
wor
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

#https://files.rcsb.org/download/1crn.pdb
def processForm(form, verbose = 0):
    if not form:
        displayForm()
        return

    #print "<html>Hello World</html>"
    x = processObj(argsDict)
    x.formParse(form,argsDict, verbose)
    queryTXT = string.upper(x.data["TXT"])
    id=mkRand()
    #prepare input
    redirectURL = "https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/illustrator.html"
    wrkDir = "/var/www/html/data/tmp/ILL/"+id
    print "Content-type: text/html"
    print
    #print "<html>Hello World</html>"
    curentD = os.path.abspath(os.curdir)
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
    
    httpfile="https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/"+queryTXT+".pdb"
    httpimg="https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/"+queryTXT+".png"
    
    aStr = displayResult(tmpPDBName,httpfile,httpimg,queryTXT)
    #print aStr
    f = open(wrkDir+"/illustrator.html","w")
    f.write("%s" % aStr)
    f.close()
    #sys.stdout.write("%s" % htmlRedirectToPage("https://mesoscope.scripps.edu/data/tmp/ILL/"+id+"/illustrator.html"))
    #sys.stdout.flush()

    
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

  
    #displayResult(tmpPDBName,httpfile,httpimg,queryTXT)
    cleanup(wrkDir, "5 days")
    return

def displayResult(fName,httpn,htti,valStr):
    suffix="0"
    jSize="500"
    aStr = ""
    aStr += htmlHeader("Illustrator",httpHead = 0,other = "<META NAME=\"keywords\" content=\"\">")
    #aStr += "<div align=\"center\"><img src=\"http://bioserv.rpbs.jussieu.fr/~autin/help/ABCgen/ABCgen.png\" width=\"800\" height=\"89\"></a></div>\n"
    aStr += htmlRule()
    aStr += htmlH4Msg("Query text :"+valStr)
    aStr += "Download the PDB coordinate file <a href=\""+httpn+"\">HERE</a><br>\n"
    aStr +="<a href=\""+htti+"\" target=\"blanck\"><img src=\""+htti+"\" width="+jSize+" height="+jSize+"></a>\n"
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
            processForm(form)
        else:
            displayForm()
