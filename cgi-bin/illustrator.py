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
    aStr += htmlHeader("ABCgen",other = "<META NAME=\"keywords\" content=\"3D ABC ABCgen alphabet structure structurale alphabet\">")
    aStr += "<div align=\"center\"><img src=\"http://bioserv.rpbs.jussieu.fr/~autin/help/ABCgen/ABCgen.png\" width=\"800\" height=\"89\"></a></div>\n"
    aStr += htmlRule()
    aStr += htmlMsg("<form method=\"POST\" action=\"http://http://mgldev.scripps.edu/cgi-bin/ABCgen2\" enctype=\"multipart/form-data\"> <INPUT TYPE=HIDDEN NAME=\"key\" VALUE=\"process\">")
    aStr += "<table><tr><td>\n"
    aStr += htmlH4Msg("This facility is to generate sentence using structural alphabet. ")
    aStr += "<H4><font color=Blue>Enter a text&nbsp;</font><input type=\"text\"name=\"TXT\"value=\"ABC_GEN\" size=50><br><small>limited to 156 character</H4>\n"
    aStr += "Example of uppercase Text: \"A B C_GENERATOR!\" (underscore means a new line)<br>Special characters available : . , ; : ? ! ' + - = <> () [] \\/ | <br>see the help <a href=\"http://bioserv.rpbs.jussieu.fr/~autin/help/ABCgen/help.html\" target=\"blanck\">here</a>\n"
    aStr += htmlMsg("<p> <input type=submit value=\"Process\"><input type=reset value=\"Clear\"> ")
    aStr += "</td><td align=\"center\"><a href=\"http://bioserv.rpbs.jussieu.fr/~autin/help/ABCgen/alpha_02.png\" target=\"blanck\"><img src=\"http://bioserv.rpbs.jussieu.fr/~autin/help/ABCgen/alpha_02.png\" width=\"500\" height=\"500\"></a></div></td></tr></table>\n"
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

def processForm(form, verbose = 0):
    if not form:
        displayForm()
        return
    x = processObj(argsDict)
    x.formParse(form,argsDict, verbose)
    id=mkRand()
    param="/home/bioserv/autin/public_html/cgi-bin/param.pmg"
    wrkDir = "/data/www/htdocs/tmp/PMG/"+id
    os.mkdir(wrkDir)
    tmpPDBName = wrkDir+"/ABCgen_0.pdb"
    httpfile="http://bioserv.rpbs.jussieu.fr/tmp/PMG/"+id+"/ABCgen_0.pdb"
    httpimg="http://bioserv.rpbs.jussieu.fr/tmp/PMG/"+id+"/PMG_0.png"
    queryTXT = string.upper(x.data["TXT"])
    pdbout=word(queryTXT)
    PDBout(pdbout,tmpPDBName)
    #aStr = waitingPage()
    #print aStr
    cmd=("/home/bioserv/autin/public_html/cgi-bin/PMG "+param+" "+wrkDir+" "+tmpPDBName+"\n")
    os.system(cmd)
    aStr = displayResult(tmpPDBName,httpfile,httpimg,queryTXT)
    f = open(wrkDir+"/ABCgen.html","w")
    f.write("%s" % aStr)
    f.close()
    sys.stdout.write("%s" % htmlRedirectToPage("http://bioserv.rpbs.jussieu.fr/tmp/PMG/"+id+"/ABCgen.html"))
    sys.stdout.flush()
    #displayResult(tmpPDBName,httpfile,httpimg,queryTXT)
    cleanup(wrkDir, "5 days")
    return

def displayResult(fName,httpn,htti,valStr):
    suffix="0"
    jSize="500"

    aStr=""
    aStr += """
    <html>
    <head>
    <title>ABCgen - Results</title>
    <meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />
    <link type=\"text/css\" rel=\"StyleSheet\" href=\"http://bioserv.rpbs.jussieu.fr/tools/slider/css/luna2/luna.css\" />
    <script src=\"http://bioserv.rpbs.jussieu.fr/tools/jmol-11.0.RC3/Jmol.js\"></script>  <!-- REQUIRED -->
    </head>
    """

    aStr += "<body bgcolor=\"white\">\n"
    aStr += "<div align=\"center\">\n"
    #aStr += jmolInit()
    aStr +="<script>\njmolInitialize(\"../../../tools/jmol-11.0.RC3/\");\n"
    aStr +="jmolSetAppletColor(\"black\"); // if you don't want black change it \n</script>\n"

    aStr += "<div align=\"center\"><img src=\"http://bioserv.rpbs.jussieu.fr/~autin/help/ABCgen/ABCgen.png\" width=\"800\" height=\"89\"></a></div>\n"
    #aStr += htmlH4Msg("Alphabet structure generator")
    aStr += htmlH4Msg("Query text :"+valStr)
    aStr += "Download the PDB coordinate file <a href=\""+httpn+"\">HERE</a><br>\n"
    #aStr += "Once you have downloaded the PDB file, feel free to render it using our <a href=\"http://bioserv.rpbs.jussieu.fr/~autin/cgi-bin/PMG\" target=\"blanck\">Protein Movie Generator web service</a><br>\n"
    aStr += "Made with JMol and PMG  <a href=\"http://bioserv.rpbs.jussieu.fr/~autin/cgi-bin/PMG\" target=\"blanck\">Protein Movie Generator web service</a><br>\n"
    aStr += "<table><tr>\n"
    aStr += "<td>\n"
    aStr += "<script>\n"
    aStr +="jmolApplet(%d, \"load %s; cartoon off;wireframe off; cpk on;rotate x 0; rotate y 0; rotate z 0\", %s);\n" % (int(jSize),httpn, suffix)
    aStr +="</script>\n"
    aStr +="</td><td>\n"
    aStr +="<a href=\""+htti+"\" target=\"blanck\"><img src=\""+htti+"\" width="+jSize+" height="+jSize+"></a>\n"
    aStr +="</td></tr></table>\n"
    aStr +="</div>\n"
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
