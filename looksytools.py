"""
Looksy todo:
- Floor
- Backdrops
- Website
- Content
- Caption doodads (attachments? Special face?)
- Content display hints in metafile - count, arranger, bg, floor color...
- Origin capture
"""

"""
Each set has the same metadata whether you're above it (at its parent index) or inside it.
Meta consists of:
 title           The title
 caption         
 rootrel         Root-relative relation (ie. absolute URL)
 rel             Relation relative to current
 cover           Picture used to represent the 
 meta

The following containers are allowed at all levels:
groups
sets
     rootrel
     base
     cover
     rel
pics
     src
     th
     rel

Different between sets and groups? Not sure there is one. I think it exists to allow for Elastic. 
Perhaps, semantically, groups can contain sets and pics but sets can only contain pics.
"""

"""
Stores files like so - 
filename = original_filename__MD5SUM__.fileext
metafile = ._MD5SUM.meta

Metafiles are yaml.

Uses this to generate modia-form images.
For clustered images, eg frames of an orb, first file is filename___MD5SUM[00]___.jpg
If there are a bunch of disparate filenames involved then give them all the same hash (from the first item) and number them.
remaining frames use the md5sum of the first image?
Hashes can be stored anywhere since they are relatable regardless of their location.

A single file is an ITEM.
A set of files that share one metafile (via [xx] mechanism) is called a CLUSTER, and clusterfiles have their origin's hash embedded rather than their own.
A directory containing files is called a GROUP.
"""
import os, yaml, hashlib, re

## Prep a filename for addition of a hash
mkc = lambda fnam: fnam.replace('.'+fnam.split('.')[-1], '___@@___.'+fnam.split('.')[-1])

## Bring a file into the targetfolder, adding 
metafile_template = dict(
    title=None, 
    caption=None,
    author=None,
    date=None
)

def incorporate(filepath, targetfolder, metaloc='.', metadata=metafile_template):
    
    with open(filepath, 'r') as F:
        fhash = hashlib.md5(F.read()).hexdigest()
        
    newnam = mkc(os.path.split(filepath)[-1]).replace('@@', fhash)
    metanam = '.___{}___.meta'.format(fhash)
    
    ## Make metafile
    with open(os.path.join(targetfolder, metanam), 'w') as metafile:
        metafile.write(yaml.dump(metadata, default_flow_style=False))
        print "Created metafile {}".format(os.path.join(targetfolder, metanam))

    ## Move file to targetfolder
    print "Moving {} to {}".format(filepath, os.path.join(targetfolder, newnam))
    os.rename(filepath, os.path.join(targetfolder, newnam))
    
joiner = lambda fp: [os.path.join(fp, f) for f in os.listdir(fp)]

_hashcache = {}
_hashre = re.compile('___(?P<hash>[a-f0-9]{32})(\[(?P<idx>\d+)\])?___')
_metare = re.compile('^\.___(?P<hash>[0-9a-f]{32})___\.meta$')

_metasearchpath = '/home/alan/projects/Meta4/meta4site/static/looksy/content' ## TODO NOT COOL

def findmetafile(filepath, searchpath=_metasearchpath):
    try:
        hashkey = _hashre.search(filepath).group('hash')
    except AttributeError:
        raise Exception('File has not been hashed, are you sure you incorporate()d it?')
    if hashkey in _hashcache:
        return _hashcache[hashkey]
    for p,dirlist,filelist in os.walk(searchpath):
        # print '\n\n## .__{}__.meta ##'.format(hashkey)
        found = False
        for f in filelist:
            mf = _metare.match(f)
            if mf:
                myhash = mf.group('hash')
                _hashcache[myhash] = os.path.join(p, f)
            # if myhash == hashkey:
            #     found = True
                
            # m = '.___{}___.meta'.format(hashkey)
            # print "{} / {} ?? {}".format(p, f, m)
    return _hashcache[hashkey]

def openmetafile(path, mode='r', metaloc='@'):
    # try:
    #     mf = findmetafile(filepath)
    # except KeyError:
    #     ## Not found, so create one
    #     fparts = os.path.split(filepath)
    #     metapath = metaloc=='@' and fparts[0] or metaloc
    #     metafnam = '.___{}___.meta'.format(fhash)
        
    # if not os.path.isfile(mf):
    if os.path.isfile(path):
        mf = findmetafile(path)
    elif os.path.isdir(path):
        mf = os.path.join(path, '.___HERE___.meta')
    return open(mf, mode)


def initdir(path, dat=metafile_template):
    yamlstr = yaml.dump(dat, default_flow_style=False)
    with open(os.path.join(path, '.___HERE___.meta'), 'w') as metafile:
        metafile.write(yamlstr)
    


def loadmeta(filepath):
    return yaml.load(openmetafile(filepath, 'r').read())

def writemeta(filepath, dat):
    yamlstr = yaml.dump(dat, default_flow_style=False)
    with openmetafile(filepath, 'w') as metafile:
        metafile.write(yamlstr)
        

pic = lambda u: dict(url=u, rel=u.split('/')[-1])
mountainpics = [
    pic('http://meta4.io.codex.cx/looksy/content/mountains/Mountain__by_xx01.jpg'),
    pic('http://meta4.io.codex.cx/looksy/content/mountains/Mountain__by_xx02.jpg'),
    pic('http://meta4.io.codex.cx/looksy/content/mountains/Mountain__by_xx03.jpg'),
    pic('http://meta4.io.codex.cx/looksy/content/mountains/Mountain__by_xx04.jpg'),
    pic('http://meta4.io.codex.cx/looksy/content/mountains/Mountain__by_xx05.jpg'),
    pic('http://meta4.io.codex.cx/looksy/content/mountains/Mountain__by_xx06.jpg'),
    pic('http://meta4.io.codex.cx/looksy/content/mountains/Mountain__by_xx07.jpg'),
    pic('http://meta4.io.codex.cx/looksy/content/mountains/Mountain__by_xx08.jpg'),
    pic('http://meta4.io.codex.cx/looksy/content/mountains/Mountain__by_xx09.jpg'),
    pic('http://meta4.io.codex.cx/looksy/content/mountains/Mountain__by_xx10.jpg'),
]
mountains = dict(
    title = 'Mountains',
    rootrel = 'http://meta4.io.codex.cx/looksy/content/mountains/',
    rel = 'mountains',
    meta = {},
    cover = mountainpics[0]['url'],
    pics = mountainpics
)
root = dict(
    groups = [
        mountains,
        # sealife,
        # forests,
        # plants,
        # animals,
        # people1,
        # cities,
        # milfordsound,
        # space,
        #
    ]

)

dict(
    groups=[],
    title='Mountains',
    rootrel='mountains',
    cover=None,
    cover_th=None,
    meta=None
)
