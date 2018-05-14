#!python2.7
#!/usr/bin/env /usr/local/www/projects/mgltools2/bin/pythonsh

import os
import time
import cgi
import numpy as np
import json
from copy import deepcopy

def dist(a, b, ax=1):
    # Euclidean Distance Caculator
    return np.linalg.norm(a - b, axis=ax)

def initializeCentroids(dataset, k):
    """Generate random centroids """
    #print "randomCentroid"
    centroids = []
    import random
    inds = []
    maxId = len(dataset) -1
    for i in range(k):
        centroid = None
        while centroid is None:
            # random index
            ind = int(round(random.random() * maxId))
            if ind not in inds:
                centroid = dataset[ind]
                centroids.append(centroid)
                inds.append(ind)
    return centroids

def randomCentroid(dataset, k, centroids=[]):
    """Generate random centroid"""
    #print "randomCentroid"
    import random
    maxId = len(dataset) -1
    for i in range(k):
        centroid = None
        while centroid is None:
            # random index
            ind = int(round(random.random() * maxId))
            _centroid = dataset[ind]
            inarr = False
            # find if _centroid is in the centroids list (select it if it is not found)
            for cc in centroids:
                if np.allclose(cc, _centroid):
                    inarr = True
                    break
            if not inarr:
                centroid = _centroid
        centroids.append(centroid)
    return centroids

def cluster(data, k=3):
    #k -  Number of clusters
    # data -  coordinates of random centroids
    C = np.array(initializeCentroids(data, k), dtype=np.float32)
    #print("Initial Centroids")
    #print(C)

    # To store the value of centroids when it updates
    C_old = np.zeros(C.shape)
    # Cluster Lables(0, 1, 2)
    clusters = np.zeros(len(data))
    # Error func. - Distance between new centroids and old centroids
    error = dist(C, C_old, None)
    # Loop will run till the error becomes zero
    count = 0
    while error != 0:
        count += 1
        # Assigning each value to its closest cluster
        for i in range(len(data)):
            distances = dist(data[i], C)
            cluster = np.argmin(distances)
            clusters[i] = cluster
        # Storing the old centroid values
        C_old = deepcopy(C)
        # Finding the new centroids by taking the average value

        for i in range(k):
            points = [data[j] for j in range(len(data)) if clusters[j] == i]
            #print "points" , len(points)
            if len(points):
                C[i] = np.mean(points, axis=0)
            else:
                # no points for the centroid: get new random one:
                C[i] = np.array(randomCentroid(data,1, C), dtype=np.float32)
        error = dist(C, C_old, None)
    cpoints = []
    for i in range(k):
        cpoints.append(np.array([data[j] for j in range(len(data)) if clusters[j] == i]))
    return  C, cpoints #points, clusters

def getClusterRad(clusters, centroids):
    radii = []
    for i, center in enumerate(centroids):
        pointset = clusters[i]
        dd = dist(center, pointset)
        maxval = np.max(dd)
        radii.append(maxval)
    return radii

def getBeads(mol, nbeads, selstr=None):
    if selstr is not None :
        molSel = mol.selectMolKit(selstr)
    else:
        selstr = ""
        molSel = mol.select()
    if not molSel:
        return {"centers": [], "radii":[]}
    #print "MOL SELECTION in BEADS:", selstr, molSel
    data = molSel.getCoords()
    centers, clusters = cluster(data, nbeads)
    if len(centers):
        radii = getClusterRad(clusters, centers)
        nc = len(centers)
        cc = np.sum(centers, axis=0)/nc
        centers = centers - cc
        geomDict = {"centers": centers.flatten().tolist(), "radii":radii}
    else:
        geomDict = {"centers": [], "radii":[]}
    return geomDict


from PmvApp.Pmv import MolApp
def fetchMol(app, pdbId, model=None, pdbFolder=None):
    """fetch a pdb file from web """
    app.lazyLoad('fileCmds', commands=['readMolecules', 'fetch'], package='PmvApp')
    app.lazyLoad("coarseMolecularSurfaceCmds", commands=["computeCoarseMolecularSurface"], package="PmvApp")
    res = app.fetchFile(pdbId, "pdb", model=model, pdbFolder=pdbFolder, addToRecent=False)
    assert len(res)
    mol = res[0]
    return mol

def readMolStr(app, lines, filename, model=None, chain=None,subset=None, altloc='A', format="PDB", header=False, secondary=None):
    """create a MolKit2(prody) molecule object from pdb string (lines) """
    from prody.proteins.header import getHeaderDict
    from prody.proteins.pdbfile import _parsePDBLines
    from prody.atomic import AtomGroup
    from MolKit2.molecule import Molecule
    import os
    title_suffix = ''
    title, ext = os.path.splitext(os.path.split(filename)[1])
    ag = AtomGroup(title + title_suffix)
    n_csets = 0
    hd, split = getHeaderDict(lines)
    _parsePDBLines(ag, lines, split, model, chain, subset, altloc,
                       format=format)
    ##if ag is not None and isinstance(hd, dict):
        ## if secondary:
        ##     if auto_secondary:
        ##         try:
        ##             ag = assignSecstr(hd, ag)
        ##         except ValueError:
        ##             pass
        ##     else:
        ##         ag = assignSecstr(hd, ag)
        ## if biomol:
        ##     ag = buildBiomolecules(hd, ag)

        ##     if isinstance(ag, list):
        ##         LOGGER.info('Biomolecular transformations were applied, {0} '
        ##                     'biomolecule(s) are returned.'.format(len(ag)))
        ##     else:
        ##         LOGGER.info('Biomolecular transformations were applied to the '
        ##                     'coordinate data.')

    mol = Molecule(title, ag, filename=filename)
    mol.buildBondsByDistance()
    mol.defaultRadii()
    app.addMolecule(mol, group=None, filename=title)
    return mol

def getBiologicalUnit(app,mol,selstr,bu):
    #bioMolNames = mol.pdbHeader['biomoltrans'].keys()
    # molsel = mol.selectMolKit(selstr)
    #bioMolNames = if (str(bu) in bioMolNames) [str(bu)] else bioMolNames[0]
    biomt = []
    chCount = 65 # 'A' ascii code
    if not hasattr(mol, 'pdbHeader'):
        import prody
        mol.pdbHeader = prody.parsePDB(mol.filename, model=0, header=True)
    print ("bu header biomt")
    #print mol.pdbHeader['biomoltrans'].keys()
    biotrans = mol.pdbHeader['biomoltrans'][str(bu)][0]
    #print len(biotrans),biotrans
    selStr = "chain "+' '.join(biotrans[0])
    # select the atom set to which to apply the transformation
    nbTrans = (len(biotrans)-1)/3
    nmol = None
    print ("found ",nbTrans)
    for i in range(nbTrans):
        mat = np.identity(4)
        mat[:3,:] = [ [float(x) for x in biotrans[i*3+1].split()],
                      [float(x) for x in biotrans[i*3+2].split()],
                      [float(x) for x in biotrans[i*3+3].split()]]
        biomt.append(mat.tolist())
    return [biomt,selStr]

def getCoarseMolSurf(app, mol, selstr, bu="", surfName='coarseMolSurf', perMol=True,
             gridSize=32, padding=0., resolution=-0.3, isovalue='fast approximation'):
    """Compute coarse molecular surface """
    if selstr is not None :
        molSel = mol.selectMolKit(selstr)
    else:
        selstr = ""
        molSel = mol.select()
    app.lazyLoad("coarseMolecularSurfaceCmds", commands=["computeCoarseMolecularSurface"], package="PmvApp")
    #before computing check for the biomt
    biomt=[]
    if bu is not None and bu!="":
        biomt,selStr = getBiologicalUnit(app,mol,selstr,bu)
        molSel = mol.select(selStr)
    #print mol,biomt,molSel,surfName
    app.computeCoarseMolecularSurface(molSel, surfName= surfName, gridSize=gridSize, padding=padding, resolution=resolution, bind_surface_to_molecule=False, isovalue=isovalue)
    #mol = molSel.getAtomGroup().getMolecule()
    geom = mol.geomContainer.geoms[surfName]
    verts = geom.getVertices()
    faces = geom.getFaces()
    vnorms = geom.getVNormals()
    fnorms = geom.getFNormals()
    v=[]
    f=[]
    n=[]
    offset = len(verts)
    if bu is not None and bu!="":
        #transform the verts with biomt and accumulate faces and normal_src
        for i in range(len(biomt)) :
            #apply the transformation for all vertices
            vtmp = np.ones( (len(verts), 4), 'f')
            vtmp[:, :3] = verts
            mat = np.array(biomt[i])
            ncoords = np.dot(vtmp, np.transpose(mat))
            v.extend(ncoords[:, :3].flatten().tolist())
            f.extend( (faces + (offset*i) ).flatten().tolist() )
            n.extend(vnorms.flatten().tolist())
            #center ?
        if len(v):
            geomDict = {"verts": v, "faces":f, "normals": n}
        else:
            geomDict = {"verts":[], "faces":[], "normals":[]}
    else :
        coords = molSel.getCoords()
        ncoords = len(coords)
        center = np.sum(coords, axis=0)/ncoords
        verts = verts - center

        if len(verts):
            geomDict = {"verts": verts.flatten().tolist(), "faces":faces.flatten().tolist(), "normals": vnorms.flatten().tolist()}
        else:
            geomDict = {"verts":[], "faces":[], "normals":[]}

    return geomDict

#iso = 1.0
#res = -0.1
#gsize = 16
def computeCoarseMolSurf(coords, radii, XYZd =[16,16,16], isovalue=1.0,resolution=-0.1,padding=0.0,
                         name='CoarseMolSurface',geom=None):
    from UTpackages.UTblur import blur
    #overwrite the radii
    radii = np.ascontiguousarray(np.ones(len(coords))*2.6).tolist()
    volarr, origin, span = blur.generateBlurmap(np.ascontiguousarray(coords).tolist(), radii, XYZd,resolution, padding = 0.0)
    volarr.shape = (XYZd[0],XYZd[1],XYZd[2])
    volarr = np.ascontiguousarray(np.transpose(volarr), 'f')
    #weights =  np.ones(len(radii), typecode = "f")
    h = {}
    from Volume.Grid3D import Grid3DF
    maskGrid = Grid3DF( volarr, origin, span , h)
    h['amin'], h['amax'],h['amean'],h['arms']= maskGrid.stats()
    #(self, grid3D, isovalue=None, calculatesignatures=None, verbosity=None)
    from UTpackages.UTisocontour import isocontour
    isocontour.setVerboseLevel(0)
    data = maskGrid.data
    origin = np.array(maskGrid.origin).astype('f')
    stepsize = np.array(maskGrid.stepSize).astype('f')
    # add 1 dimension for time steps amd 1 for multiple variables
    if data.dtype.char!=np.float32:
        data = data.astype('f')#Numeric.Float32)
    newgrid3D = np.ascontiguousarray(np.reshape( np.transpose(data),
                                          (1, 1)+tuple(data.shape) ), data.dtype.char)
    ndata = isocontour.newDatasetRegFloat3D(newgrid3D, origin, stepsize)
    isoc = isocontour.getContour3d(ndata, 0, 0, isovalue,
                                       isocontour.NO_COLOR_VARIABLE)
    vert = np.zeros((isoc.nvert,3)).astype('f')
    norm = np.zeros((isoc.nvert,3)).astype('f')
    col = np.zeros((isoc.nvert)).astype('f')
    tri = np.zeros((isoc.ntri,3)).astype('i')
    isocontour.getContour3dData(isoc, vert, norm, col, tri, 0)
    if maskGrid.crystal:
        vert = maskGrid.crystal.toCartesian(vert)
    geomDict = {"verts": vert.flatten().tolist(), "faces":tri.flatten().tolist(), "normals": norm.flatten().tolist()}
    return geomDict

def main():
    #can be used directly as http://mgldev.scripps.edu/cgi-bin/get_geom_dev.py?pdbId=1crn&selection=A
    # or use formData POST query
    form = cgi.FieldStorage()
    print '{"log":"'
    print form
    # A nested FieldStorage instance holds the file
    app = MolApp()
    # get selection from the form
    selstr = None
    if form.has_key("selection"):
        selstr = form.getvalue("selection")
    # get selection from the form
    bu = None
    if form.has_key("bu"):
        bu = form.getvalue("bu")# get AU,BUi,SUPERCELL,UNITCELL
        if (bu[:2].lower() == "bu" or bu[:2].lower() == "ba") : bu = bu[2:]
        if (bu == "UNITCELL" or bu == "SUPERCELL"): bu = None
        if (bu == "AU"): bu=None
    #get model from the form
    model = None
    if form.has_key("model"):
        model = int(form.getvalue("model"))
    mol = None
    print selstr,bu,model
    if form.has_key('inputfile'):
        fileitem = form['inputfile']
        if fileitem.filename != "":
            # Test if the file was uploaded

            print fileitem.filename
            print "<br>"
            print "<br>"
            ## # print fileitem.file # the file objects
            molstr = fileitem.file.read()  # the content of the file
            lines = molstr.split('\n')
            print "number of lines in file", len(lines)
            print "<br>"
            mol = readMolStr(app, lines, fileitem.filename, model=model)
    elif form.has_key("atomsCoords"):
        #directly use the coordinates as a numpy array
        #print form["atomCoords"]+'"'
        results = []
        iso = 1.0
        res = -0.1
        gsize = 16
        if form.has_key("iso"):
            iso = float(form["iso"])
        if form.has_key("res"):
            res = float(form["res"])
        if form.has_key("gsize"):
            gsize = int(form["gsize"])
        geomDict = computeCoarseMolSurf(form["atomCoords"], None,
          XYZd =[gsize,gsize,gsize], isovalue=iso,resolution=res,padding=0.0)
        jsonstr = json.dumps(geomDict)
        #print "<br> <br> <br>"
        print "SURFACE COMPUTED !!!", "&nbsp; Num faces: %d"%len(geomDict['faces']), "&nbsp; Num verts: %d <br>" % len(geomDict['verts'])
        results.append(jsonstr)
        print '", "results":'         # this closes "log" and starts "results"
        for st in results:
            print st
        mol = None
    elif form.has_key("pdbId"):
        pdbId = form.getvalue("pdbId")
        if pdbId and len(pdbId)==4:
            # check cache , and shold check https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/other/
            mol = fetchMol(app, pdbId, model=model)
        else :
            #download in cache ? read
            filename = "/usr/local/www/projects/autoPACK/data/cellPACK_data/cellPACK_database_1.1.0/other/"+pdbId
            if not os.path.exists(filename) :
                #download
                url = "https://cdn.rawgit.com/mesoscope/cellPACK_data/master/cellPACK_database_1.1.0/other/"+pdbId
                os.system('wget --no-check-certificate '+url+' -O '+filename)
            app.lazyLoad('fileCmds', commands=['readMolecules'], package='PmvApp')
            mol = app.readMolecule(filename,addToRecent=False)

    if mol:
        results = []
        if form.has_key("cms"): # coarse mol surface
            # resolution and isovalue need to be change in case of alpha-carbon structure only.
            default_iso = 'fast approximation'
            default_res = -0.3 #-0.1 for Calpah
            iso = 1.0
            res = -0.1
            gsize = 16
            if form.has_key("iso"):
                iso = float(form["iso"])
            if form.has_key("res"):
                res = float(form["res"])
            if form.has_key("gsize"):
                gsize = int(form["gsize"])
            # compute the surface and print the json string with faces and verts:
            geomDict = getCoarseMolSurf(app, mol, selstr, bu = bu, surfName="coarseSurf_1", gridSize=gsize,
            padding=0., resolution=res, isovalue=iso)

            jsonstr = json.dumps(geomDict)
            #print "<br> <br> <br>"
            print "SURFACE COMPUTED !!!", "&nbsp; Num faces: %d"%len(geomDict['faces']), "&nbsp; Num verts: %d <br>" % len(geomDict['verts'])
            results.append(jsonstr)

        if form.has_key("beads"): # clustering
            nbeads = 3
            if form.has_key("nbeads"):
                nbeads = int(form.getvalue("nbeads"))
            geomDict = getBeads(mol, nbeads, selstr)
            import json
            jsonstr = json.dumps(geomDict)
            results.append(jsonstr)

        print '", "results":'         # this closes "log" and starts "results"

        for st in results:
            print st
    print ',"inputs":{'#<br> <br>"
    astr=''
    for k in form :
        if k == "inputfile": continue
        if k == "atomCoords": continue
        val = form.getvalue(k)
        if val == "":
            val = "not specified"
        astr += '"'+k+'":"'+ val+'",'
        #print astr
        #print "<br>"
    print astr[:-1]+'}}'

try:
    print "Access-Control-Allow-Origin: *"
    print 'Content-type: text/html\n'
    #print "Hello"
    main()
except:
    cgi.print_exception()
