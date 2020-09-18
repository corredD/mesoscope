#!/bin/python3
##!/usr/bin/env python
##!python3
import os
import json
import cgi
import math
import atomium
import random
g = random
import numpy as np
from numpy import array
from numpy import asarray
from numpy import argmax
from numpy import argmin
from numpy import amax
from numpy import amin
from numpy import dot
# from numpy import ptp
from numpy import sum

from scipy.spatial import ConvexHull
from scipy.linalg import solve

global atomic_outlines_params
global subunit_outlines_params
global chain_outlines_params
global ao_params
atomic_outlines_params=["3.0","10.0","4","0.0","5.0"]
subunit_outlines_params=["3.0","10.0"]
chain_outlines_params=["3.0","10.0","6.0"]
ao_params=["0.0023","2.0","1.0","0.7"]

argsDict = {#"TXTFile":    ["", "upload", None,      "No data specified (PDBFile)", "notMandatory", "TXT"],
            "pdbid":      ["", "value", None,       "No data specified (TXT)",   "notMandatory", "TXT"]
           }


def normalize_vector(v):
    return v / np.sqrt(np.sum(v**2))

# this function will not always work
# it is also a duplicate of stuff found in matrices and frame
def local_axes(a, b, c):
    u = b - a
    v = c - a
    w = np.cross(u, v)
    v = np.cross(w, u)
    return normalize_vector(u), normalize_vector(v), normalize_vector(w)

def world_to_local_coordinates_numpy(frame, xyz):
    """Convert global coordinates to local coordinates.
    Parameters
    ----------
    frame : :class:`Frame` or [point, xaxis, yaxis]
        The local coordinate system.
    xyz : array-like
        The global coordinates of the points to convert.
    Returns
    -------
    array
        The coordinates of the given points in the local coordinate system.
    Examples
    --------
    >>> import numpy as np
    >>> frame = Frame([0, 1, 0], [3, 4, 1], [1, 5, 9])
    >>> xyz = [Point(2, 3, 5)]
    >>> rst = world_to_local_coordinates_numpy(frame, xyz)
    >>> np.allclose(rst, [[3.726, 4.088, 1.550]], rtol=1e-3)
    True
    """
    origin = frame[0]
    uvw = [frame[1], frame[2], cross_vectors(frame[1], frame[2])]
    uvw = asarray(uvw).T
    xyz = asarray(xyz).T - asarray(origin).reshape((-1, 1))
    rst = solve(uvw, xyz)
    return rst.T

def local_to_world_coordinates_numpy(frame, rst):
    """Convert local coordinates to global (world) coordinates.
    Parameters
    ----------
    frame : :class:`Frame` or [point, xaxis, yaxis]
        The local coordinate system.
    rst : array-like
        The coordinates of the points wrt the local coordinate system.
    Returns
    -------
    array
        The world coordinates of the given points.
    Notes
    -----
    ``origin`` and ``uvw`` together form the frame of local coordinates.
    Examples
    --------
    >>> frame = Frame([0, 1, 0], [3, 4, 1], [1, 5, 9])
    >>> rst = [Point(3.726, 4.088, 1.550)]
    >>> xyz = local_to_world_coordinates_numpy(frame, rst)
    >>> numpy.allclose(xyz, [[2.000, 3.000, 5.000]], rtol=1e-3)
    True
    """
    origin = frame[0]
    uvw = [frame[1], frame[2], cross_vectors(frame[1], frame[2])]

    uvw = asarray(uvw).T
    rst = asarray(rst).T
    xyz = uvw.dot(rst) + asarray(origin).reshape((-1, 1))
    return xyz.T

#from https://compas.dev/compas/_modules/compas/geometry/bbox/bbox_numpy.html
def oriented_bounding_box_numpy(points):
    points = asarray(points)
    n, dim = points.shape
    assert 2 < dim, "The point coordinates should be at least 3D: %i" % dim
    points = points[:, :3]
    hull = ConvexHull(points)

    volume = None
    bbox = []

    # this can be vectorised!
    for simplex in hull.simplices:
        a, b, c = points[simplex]
        uvw = local_axes(a, b, c)
        xyz = points[hull.vertices]
        frame = [a, uvw[0], uvw[1]]
        rst = world_to_local_coordinates_numpy(frame, xyz)
        rmin, smin, tmin = amin(rst, axis=0)
        rmax, smax, tmax = amax(rst, axis=0)
        dr = rmax - rmin
        ds = smax - smin
        dt = tmax - tmin
        v = dr * ds * dt

        if volume is None or v < volume:
            bbox = [
                [rmin, smin, tmin],
                [rmax, smin, tmin],
                [rmax, smax, tmin],
                [rmin, smax, tmin],
                [rmin, smin, tmax],
                [rmax, smin, tmax],
                [rmax, smax, tmax],
                [rmin, smax, tmax],
            ]
            bbox = local_to_world_coordinates_numpy(frame, bbox)
            volume = v

    return bbox


def ill_prepareWildCard():
    global chain_outlines_params
    astr=""
    astr+="HETATM-H-------- 0,9999, 1.1,1.1,1.1, 0.0\n\
HETATMH--------- 0,9999, 1.1,1.1,1.1, 0.0\n\
ATOM  -H-------- 0,9999, 1.1,1.1,1.1, 0.0\n\
ATOM  H--------- 0,9999, 1.1,1.1,1.1, 0.0\n\
"
    astr+="ATOM  -P---  --- 0,9999 1.00, 1.0, 1.0, 5.0\n\
ATOM  -C5--  --- 0,9999 1.0,1.0,1.0, 5.0\n\
ATOM  -P--- D--- 0,9999 1.0,1.0,1.0, 5.0\n\
ATOM  -C5-- D--- 0,9999 1.0,1.0,1.0, 5.0\n\
ATOM  -CA------- 0,9999 1.0,1.0,1.0, 5.0\n\
HETATM-C-------- 0,9999 1.0,1.0,1.0, 1.6\n\
HETATM---------- 0,9999 1.0,1.0,1.0, 1.5\n";
    chain_outlines_params[2] = "6000.0";
    astr+="END\n"
    return astr

def ill_prepareInput(nameinput,form,scale=6,center=True,trans=[0,0,0],rotation=[0,0,0]):
    global atomic_outlines_params
    global subunit_outlines_params
    global chain_outlines_params
    global ao_params
    if ("rotation" in form) :
        rotobj = json.loads(form["rotation"].value)
        rotation = [math.degrees(rotobj['_x']),math.degrees(rotobj['_y']),math.degrees(rotobj['_z'])]
    if ("position" in form) :
        transobj = json.loads(form["position"].value)
        trans= [transobj['x'],transobj['y'],transobj['z']]
    if ("scale" in form) :
        scale = form["scale"].value    
    #var q = stage.animationControls.controls.rotation;
    #var rotation = new NGL.Euler().setFromQuaternion( q);
    #var position = new NGL.Vector3(0,0,0);
    sao = True;
    astr="read\n"
    astr+=nameinput+".pdb\n"
    astr+=ill_prepareWildCard();
    astr+="center\n"
    astr+="auto\n"
    astr+="trans\n"
    #astr+= position.x.toString()+","+position.y.toString()+","+position.z.toString()+"\n"
    astr+=str(trans[0])+","+str(trans[1])+","+str(trans[2])+"\n"
    astr+="scale\n"
    astr+=str(scale)+"\n"
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
    astr+="wor\n"
    astr+="0.,0.,0.,0.,0.,0.,1.,1.\n"
    astr+=("1" if (sao) else "0")+","+ ",".join(ao_params)+"\n";
    astr+="-30,-30                                                      # image size in pixels, negative numbers pad the molecule by that amount\n"
    astr+="illustrate\n"
    astr+=",".join(atomic_outlines_params)+"  # parameters for outlines, atomic\n"
    astr+=",".join(subunit_outlines_params)+"  # subunits\n"
    astr+=",".join(chain_outlines_params)+"  # outlines defining regions of the chain\n" 
    astr+="calculate\n"
    astr+=nameinput+".pnm\n"
    return astr;


def DefaultValue(avalue,defaultValue):
    if avalue != None :
        return avalue
    else :
        return defaultValue

def getPDBString(p,selection,bu,model):
    AFormat = 'ATOM  {:5d} {:4s} {:3s}{:2s}{:4d}    {:8.3f}{:8.3f}{:8.3f}{:6.2f}{:6.2f}      {:4s}{:2s}';#//'ATOM  %5d :-4s %3s %1s%4d    %8.3f%8.3f%8.3f%6.2f%6.2f      %4s%2s';
    BiomtFormat = 'REMARK 350   BIOMT{:1d} {:3d}{:10.6f}{:10.6f}{:10.6f}{:15.5f}';
    writeBU = True;
    ia = 1;
    im = 1;
    ir = 1;
    renumberSerial = True;
    _records=""
    #(.CA or .P or .C5)
    if (bu!=-1) :
        chains = p.assemblies[bu]["transformations"][0]["chains"]
        _records+="REMARK 350 BIOMOLECULE: 1\n";
        _records+="REMARK 350 APPLY THE FOLLOWING TO CHAINS: "+', '.join(chains)+"\n";
        for k,t in enumerate(p.assemblies[bu]["transformations"]) :
            m = t["matrix"]
            p = t["vector"]
            _records+=BiomtFormat.format(1,k+1,m[0][0],m[0][1],m[0][2],p[0])+"\n";
            _records+=BiomtFormat.format(2,k+1,m[1][0],m[1][1],m[1][2],p[1])+"\n";
            _records+=BiomtFormat.format(3,k+1,m[2][0],m[2][1],m[2][2],p[2])+"\n";
        _records+="REMARK 350END\n";
        #loop over the atoms of the given chain selection
        for r in p.models[model].residues() :
            at = r.atom(name='CA')
            serial = ia;
            if (serial > 99999): serial = 99999;
            if (at == None): at = r.atom(name='P')
            if (at == None): at = r.atom(name='C5')
            if (at == None): continue
            if (r.chain.internal_id in chains):
                _records+=AFormat.format(serial,at.name,r.name,r.chain.internal_id,ir,
                    at.location[0], at.location[1], at.location[2], 1.0,0.0,'','')+"\n";
                ir = ir + 1
                ia = ia + 1
    else :
        for r in p.models[model].residues() :
            at = r.atom(name='CA')
            serial = ia;
            if (serial > 99999): serial = 99999;
            if (at == None): at = r.atom(name='P')
            if (at == None): at = r.atom(name='C5')
            if (at == None): continue
            _records+=AFormat.format(serial,at.name,r.name,' ',ir,
                    at.location[0], at.location[1], at.location[2], 1.0,0.0,'','')+"\n";
            ir = ir + 1
            ia = ia + 1        
    return _records

def FetchProtein(pdb_id,bu,selection,model):
    if model == None or model == "":
        model = 0
    lchains_id = []
    sel_chains = []
    p = atomium.fetch(pdb_id)
    if bu != "AU" and bu != "" :
        bu = int(bu[1:])-1
    else : bu = -1
    asele = [""]
    if selection != None and selection != "" :
        asele = selection
        sel_chains = asele.split(",")
    pdb_txt = getPDBString(p,sel_chains,bu,model)
    return pdb_txt

def printDebug(data):
    print("Content-type: text/html")
    print("")
    print ('<html>')
    print ('<head>')
    print ('<title>Hello Word - First CGI Program</title>')
    print ('</head>')
    print ('<body>')
    print (data)
    #print form["PDBfile"]
    #print form["PDBfile"].filename
    #print form["PDBfile"].file.readlines()
    print ('</body>')
    print ('</html>')

def mkRand():
    tmp= str(int(g.random()*1000000000))
    return tmp

def queryForm(form, verbose = 0):
    qid = 0
    idprovided = False
    if "qid" in form  and int(form["qid"].value) != -1:
        qid = form["qid"].value
        idprovided = True
    else :
        qid = mkRand()
    pdbid = "1crn"
    bu = ""
    selection = ""
    model = 0
    proj_name = "illustrated"
    wrkDir = "/var/www/html/data/tmp/ILL/"+qid
    illdir = "/var/www/html/beta/cgi-bin/illustrator"
    curentD = os.path.abspath(os.curdir)
    #wrkDir = curentD+"/../tmp/"+qid
    #print (wrkDir+"<br><br><br>"+curentD)
    #printDebug(wrkDir+"<br><br><br>"+curentD);
    if not os.path.isdir(wrkDir):
        os.mkdir(wrkDir)
    #printDebug ("test testestest <br>")
    #return        
    #print "<html>Hello World</html>"
    #print (wrkDir+"<br>")
    queryTXT=pdbid
    fetch=True
    inpfile = ""
    tmpPDBName = ""
    #no more than 20character
    force_pdb = True
    if "force_pdb" in form:
        force_pdb = form["force_pdb"].value
    if "name" in form :
        proj_name = form["name"].value
    
    if "selection" in form :
        selection = form["selection"].value
    if "bu" in form :
        bu = form["bu"].value
    if "model" in form :
        model = form["model"].value

    if "pdbid" in form :
        queryTXT = form["pdbid"].value
        fetch = True
        tmpPDBName = wrkDir+"/"+proj_name+".pdb"
        if not form.has_key("name") :
            proj_name = queryTXT
    elif "PDBtxt" in form  :
        queryTXT = form["PDBtxt"].value
        tmpPDBName = wrkDir+"/"+proj_name+".pdb"
        if not os.path.isfile(tmpPDBName) or force_pdb:
            f = open(tmpPDBName, "w")
            f.write(queryTXT)
            f.close()
        queryTXT = proj_name
    elif "PDBfile" in form  :
        #queryTXT = form["PDBfile"].file.read()#readlines()
        tmpPDBName = wrkDir+"/"+proj_name+".pdb"
        if not os.path.isfile(tmpPDBName) or force_pdb:
            f = open(tmpPDBName, 'wb', 10000)
            # Read the file in chunks
            for chunk in fbuffer(form["PDBfile"].file):
                f.write(chunk)
            f.close()
            #f = open(tmpPDBName, "w")
            #f.write(queryTXT)
            #f.close()
        queryTXT = proj_name
    #prepare input
    redirectURL = "https://mesoscope.scripps.edu/data/tmp/ILL/"+qid+"/illustrator.html"
    #print "<html>Hello World</html>"
    #did the user send in the input file?
    inpfile = wrkDir+"/"+proj_name+".inp"
    if "input_file" in form:
        filename = cgi.escape(form["input_file"].filename)
        inpstring = form["input_file"].file.read()
    elif "input_txt" in form:
        inpstring = form["input_txt"].value
    else :
        inpstring = ill_prepareInput(proj_name,form)
    print (inpstring+"<br>")
    f = open(inpfile, "w")
    f.write(inpstring)
    f.close()
    cmd = "cd "+wrkDir+";"
    if fetch and (not os.path.isfile(tmpPDBName) or force_pdb):
        tmpPDBName = wrkDir+"/"+proj_name+".pdb"
        pdb_txt = FetchProtein(queryTXT,bu,selection,model)
        f = open(tmpPDBName, "w")
        f.write(pdb_txt)
        f.close()
        #cmd+= "wget https://files.rcsb.org/download/"+queryTXT+".pdb >/dev/null;"
        #cmd+= "mv "+queryTXT+".pdb "+tmpPDBName+";"
        print (pdb_txt+"<br>")
        #printDebug(pdb_txt+"<br><br>"+inpstring)
        #return
    cmd+= illdir+" < "+proj_name+".inp>/dev/null;"
    #cmd+="/bin/convert "+proj_name+".pnm -transparent \"rgb(254,254,254)\" "+proj_name+".png>/dev/null;"
    #composite with ngl_geom_opacit
    cmd+="/bin/composite -compose copy_opacity opacity.pnm "+proj_name+".pnm "+proj_name+".png;"
    os.system(cmd)

    httpfile="https://mesoscope.scripps.edu/data/tmp/ILL/"+qid+"/"+proj_name+".pdb"
    httpimg="https://mesoscope.scripps.edu/data/tmp/ILL/"+qid+"/"+proj_name+".png"

    print ("Access-Control-Allow-Origin: *")
    print ('Content-type: application/json\n')
    print ()
    print ("{\"image\":\""+httpimg+"\",\"url\":\""+redirectURL+"\",\"id\":\""+str(qid)+"\"}")
    #displayResult(tmpPDBName,httpfile,httpimg,queryTXT)
    #cleanup(wrkDir, "1 days")
    return

def TestCGI():
    localvars_table = '<table>'
    for x in dir():
        localvars_table += '<tr><td>%s</td></tr>' % x
        localvars_table += '</table>'
    print("Content-type: text/html")
    print("")
    print("""<html><body>
    <p>Hello World! Your custom CGI script is working. Here are your current Python local variables.</p>
    %s
    <p>NOTE: If you want to write useful CGI script, try the Python 'cgi' module. See cgitest.py script.</p>
    </body></html>""" % (localvars_table))

if __name__=='__main__':
    form = cgi.FieldStorage()
    try:
        statuskey = form["pdbid"].value
    except:
        statuskey = None
    if statuskey != None and statuskey != "":
        #p = FetchProtein(statuskey)
        #printDebug(p.model.chains())
        queryForm(form)
    else :
        #queryForm(form)
        TestCGI()
