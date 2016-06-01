
/* render() */
/* addObject() */
/* advanceSimulationTo() */
/* Objet definition and label - label allows easy referencing from outside */
/* addTexture({label: ...}) 
/* addObject({shape:'cuboid', 'texture': ..., ...})
Some things will want relative times, others will want absolute
prep()
*/

/* TODO */
/*
Framework:
    Shapes other than cubes
    Pointer ray
    Refactor & "friendly"fy
    Attach & detach behaviour
    Controller battery level?
    Multitexturing
    Anims not stop sudden like
    Approach() interaction
    Virtual keyboard(s)
    Text editor
    Attachable objects
    Get content arrangers to offer hints with which idx to select on left/up/down/right

Application:
    *Elevator on trigger+trackpad
    *Load images from page url
    *Load more content on teleport as well as elevate
    *Tumblr info thing not working
    *
    *Website - Meta4.codex.cx & virtualrealist.nz
    ORBIMG
    Tweening teleport?
    Loading message on tracker?
    Menu on alternate controller
    Return to origin point
    Make enter / exit into interactions on a board rather than arbitraries
    World sphere or skybox
    Board groups
    Pie chart loading progress tracker? :)

Bugs:
    It doesn't handle 404s well
    Added things don't pop onto content stack (??)
    Free up textures no longer needed (maybe fixed?)
    selecteNearest filter excludes textboards
    Race condition on useContent / addContent
    ERR_CONTENT_LENGTH_MISMATCH?
    spatialState breaks if only one controller is active
    If tumblr content gives back more items than posts (eg multiphoto posts) then they stack up
    Select nearest doesn't work if no selection?

Maybe:
    Placeholders for content as it loads

Crazy ideas:
    Apps eg. Clock, SSH client, text editor, meta for wordpress / ghost

Done:
    Factor as much as poss out of the scene
    Arranger functions
    Text rendering is squashed
    Make green tracker stay green
    Text render w/ color background
    Better controllers
    Roll content off the bottom
    Can't set feed as initial content
    Pagination
    Progressive load
    Connect to tumblr
    'Pagination' - sort of
    Deferred texture loading to fix canvas overload
    Scene.prepare() is a drag
    Move to full encapsulation of drawables
    Load shaders from files
    Left eye / right eye
    *Texture specific faces of object
    


External:
    Content prep scripts & auto dir makerator
    More content!! 
    Orbimg content
*/


window.MyScene = (function () {
    "use strict";
    
    function TheScene() {
        console.log("Setting up MyScene");
        
        this.sceneBoards = [];
        this.selectedBoardIdx = null;
        
        this.contentArranger = new FCFeedTools.CylinderArranger({
            boardHeight: 5.0,
            rowHeight: 30.0,
            // boardDistance: 7.0,
            perRow: 7
        });
        this.contentWrangler = new FCFeedTools.ContentWrangler(this, {arranger:this.contentArranger});
        
        this.origin = {x:0, y:0, z:0};
        this.cursorOrigin = {x:0, z:0, y:0.5};
        
        this.isRendering = false; /* This will be set true by the engine once rendering commences */
        
        FCScene.call(this);
    }
    // var TheScene = {};
    TheScene.prototype = Object.create(FCScene.prototype);
        
    TheScene.prototype.setupPrereqs = function () {
        var scene = this;
        var reqPromises = [];
        return new Promise(function (resolve, reject) {
            scene.addTextureFromColor({r:0.1, g:0.2, b:0.6, a:1.0}, 'royalblue');
            scene.addTextureFromColor({r:0.1, g:0.6, b:0.2, a:1.0}, 'green');
            scene.addTextureFromColor({r:0.7, g:0.2, b:0.2, a:1.0}, 'terracotta');
            scene.addTextureFromColor({hex:'#d8bfd8'}, 'thistle');
            scene.addTextureFromColor({r:1, g:1, b:1, a:1.0}, 'white');
            scene.addTextureFromColor({hex:'#c0c0c0'}, 'silver');
            
            reqPromises.push(scene.addShaderFromUrlPair(
                'shaders/basic.vs', 'shaders/basic.fs', 'basic', {
                    position: 0,
                    texCoord: 1,
                    vertexNormal: 2                
                }
            ));
            reqPromises.push(scene.addShaderFromUrlPair(
                'shaders/diffuse1.vs', 'shaders/diffuse1.fs', 'diffuse', {
                    position: 0,
                    texCoord: 1,
                    vertexNormal: 2                
                }
            ));
            reqPromises.push(scene.addTextureFromImage('textures/leaves01_1024.png', 'leaves01'));
            Promise.all(reqPromises).then(function () {
                resolve();
            });
        });
        
    }
    
    TheScene.prototype.setupScene = function () {
        console.log('Using scene setup from MyScene')
        
        var scene = this;
        var wrangler = scene.contentWrangler;        
                
        var mkSel = function (deltaC, deltaR) {
            var fn = function () {
                var boards = scene.sceneBoards;
                var perRow = scene.contentArranger.perRow;
                var idx = scene.selectedBoardIdx;
                var newIdx;
                
                if (scene.selectedBoardIdx === null) {
                    newIdx = 0;
                }
                else {
                    var c = idx % perRow;
                    var r = (idx - c)/perRow;
                    if (deltaR) r += deltaR;
                    if (deltaC) c += deltaC;
                    c %= perRow;
                    if (c<0) c = perRow-1;
                    
                    newIdx = ((r*perRow) + c);
                    if (newIdx >= boards.length && deltaC < 0) newIdx = boards.length - 1;
                    else if (newIdx >= boards.length && deltaC > 0) newIdx = r*perRow;
                }
                
                if (newIdx != scene.selectedBoardIdx && newIdx >= 0 && newIdx < boards.length) {
                    scene.selectedBoardIdx = newIdx;
                    boards[newIdx].interact('select');
                }
                console.debug('Selecting board idx', newIdx);
            }
            return fn;
        }
        var selectLeft = mkSel(-1, 0);
        var selectRight = mkSel(1, 0);
        var selectUp = mkSel(0, 1);
        var selectDown = mkSel(0, -1);
                
        var teleportToSelection = function () {
            var idx = scene.selectedBoardIdx;
            console.log('Teleporting to', idx);
            if (idx === null) return;
            var floor = scene.getObjectByLabel('floor');
            var selection = scene.sceneBoards[scene.selectedBoardIdx];
            var pos = {x:selection.pos.x * 0.5, z:selection.pos.z * 0.5, y:selection.pos.y+0.3}
            scene.setPlayerLocation(pos);
            floor.relocateTo(pos);
            
        }
        
        var enter = function () {
            var boardsGroup = scene.sceneBoards;
            /* If no selection, then we're going up a level */
            if (scene.selectedBoardIdx == null) {
                wrangler.closeContent();
            }
            var thisBoard = boardsGroup[scene.selectedBoardIdx];
            console.debug(thisBoard.metadata);
            if (thisBoard && thisBoard.metadata) {
                if (thisBoard.metadata.dest) {
                    wrangler.openContent(thisBoard.metadata.dest);
                }
                /* If there's nowhere to go, go up */
                else {
                    wrangler.closeContent();
                }
            }
            scene.getObjectByLabel('cursor').relocateTo(scene.cursorOrigin);
            scene.moveFloorAndPlayerTo(scene.origin);
        }
        
        var elevator = function (cmd, pressure) {
            var direction = null;
            switch (cmd) {
            case 'up':
                direction = 1;
                break;
            case 'down':
                direction = -1;
                break;
            }
            var loc = scene.playerLocation;
            var factor = direction * 0.1 * pressure;
            scene.moveFloorAndPlayerTo({x:loc.x, y:loc.y+factor, z:loc.z});
            
        }
        
        /* Elevator is stopped, so figure out what we're closest to and select it */
        var elevatorStopped = function () {
            selectNearestToController(1);
            
            /* If player's new position brings them within 15 meters of the uppermost board,
               display more content if available */
            var maxBoard = scene.sceneBoards.slice(-1)[0];
            console.log('contentData length', wrangler.contentData.length, 'sceneBoards length', scene.sceneBoards.length);
            if ((wrangler.contentData.length > scene.sceneBoards.length) || wrangler.contentFeeder) {
                var dists = scene.getObjectDistancesFrom(scene.playerSpatialState.hands[0].pos, 
                    function (obj) {return obj==maxBoard;});
                if (dists[0].distanceToPos < 10) {
                    wrangler.expandContentVisibleRange();
                }
                
            }
            
        }
        
        var selectNearestToController = function (gpIdx) {
            var gpLoc = scene.playerSpatialState.hands[gpIdx].pos; /* TODO this -1 sucks */
            
            var leastDist = null;
            var leastIdx = null;
            var dists = scene.getObjectDistancesFrom(gpLoc, function (obj) {
                return obj.groupLabel == 'contentboards'
            });
            var leastDistItem = null;
            for (var i=0; i<dists.length; i++) {
                if (!leastDistItem || (dists[i].distanceToPos < leastDistItem.distanceToPos)) {
                    leastDistItem = dists[i];
                }
            }
            
            /* Relate the object to a sceneBoard idx since the comparison was vs all objs */
            for (var i=0; i<scene.sceneBoards.length; i++) {
                if (scene.sceneBoards[i] === leastDistItem.obj) {
                    scene.selectedBoardIdx = i;
                    scene.sceneBoards[i].interact('select');
                    break;
                }
            }
                        
        }
        
        // VRSamplesUtil.addButton("Select next", "S", null, selectNext);
        // VRSamplesUtil.addButton("Select prev", "A", null, selectPrev);
        // VRSamplesUtil.addButton("Teleport to cursor", "T", null, teleportToSelection);
        // VRSamplesUtil.addButton("Enter", "N", null, enter);
        
        /* Floor */
        scene.addObject(new FCShapes.GroundedCuboid(
            {x: 0, z: 0, y: 0},
            {w: scene.stageParams.sizeX, d: scene.stageParams.sizeZ, h: 0.01},
            null,
            {label: 'floor', textureLabel: 'leaves01', shaderLabel: 'basic'}
        ));
        
        /* Cursor */
        var cursor = new FCShapes.GroundedCuboid(
            scene.cursorOrigin,
            {w: 0.3, h:0.3, d:0.3},
            null,
            {label: 'cursor', textureLabel: 'royalblue', shaderLabel: 'diffuse'}
        );
        cursor.behaviours.push(function (drawable, timePoint) {
            drawable.currentOrientation = {x:0.0, y:Math.PI*2*(timePoint/7000), z:0.0};
        });
        scene.addObject(cursor);
        
        
        var buttonHandler = function (gpIdx, btnIdx, buttonStatus, tpSector, buttonRaw, extra) {
            if (btnIdx == 0 && buttonStatus == 'released' && tpSector == 'w') {
                selectLeft();
            }
            else if (btnIdx == 0 && buttonStatus == 'released' && tpSector == 'e') {
                selectRight();
            }
            else if (btnIdx == 0 && buttonStatus == 'released' && tpSector == 'n') {
                selectUp();
            }
            else if (btnIdx == 0 && buttonStatus == 'released' && tpSector == 's') {
                selectDown();
            }
            else if (btnIdx == 0 && buttonStatus == 'released' && tpSector == 'center') {
                selectNearestToController(1);
            }
            // else if (gpIdx == 0 && btnIdx == 0 && buttonStatus == 'released') {
            //     selectPrev();
            // }
            // else if (gpIdx == 1 && btnIdx == 0 && buttonStatus == 'released') {
            //     selectNext();
            // }
            else if (btnIdx == 2 && buttonStatus == 'released') {
                teleportToSelection();
            }
            else if (btnIdx == 1 && buttonStatus == 'held') {
                // console.debug(gpMat);
                if (gpIdx == 1) elevator('up', buttonRaw.value);
                else if (gpIdx == 0) elevator('down', buttonRaw.value);
                // console.debug(extra);
            }
            else if (btnIdx == 1 && buttonStatus == 'released') {
                elevatorStopped();
                // selectNearestToController(1);
            }
            else if (btnIdx == 3 && buttonStatus == 'pressed') {
                enter();
            }
            
        }
        
        
        var tracker1 = new FCShapes.ControllerShape(
            {x: 0, z:0, y: -0.5},
            {w: 0.1, h: 0.03, d: 0.3},
            null,
            {label: 'gpTracker1', textureLabel: 'royalblue', shaderLabel: 'diffuse', groupLabel: 'gpTrackers',
            baseColor: {r:0.1, g:0.2, b:0.6, a:1.0}}
        );
        // tracker1.behaviours.push(mkTracker(0));
        tracker1.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, buttonHandler));

        var tracker2 = new FCShapes.ControllerShape(
            {x: 0, z:0, y: -0.5},
            {w: 0.1, h: 0.03, d: 0.3},
            null,
            {label: 'gpTracker2', textureLabel: 'green', shaderLabel: 'diffuse', groupLabel: 'gpTrackers',
            baseColor: {r:0.1, g:0.6, b:0.2, a:1.0}}
        );
        tracker2.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, buttonHandler));
        
        scene.addObject(tracker1);
        scene.addObject(tracker2);
        
        var infoDisplay = new FCShapes.GroundedCuboid(
            null,
            {w: 0.15, h:0.01, d:0.05}, /* In this case h and d are reversed */
            null,
            {
                label: 'infoDisplay',
                textureLabel: 'white',
                shaderLabel: 'basic'
            }
        );
        infoDisplay.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, null));
        infoDisplay.behaviours.push(function (drawable, timePoint) {
            /* Check for updates every 300-ish milliseconds */
            var lastUpdate = drawable.scratchPad.lastTxUpdate || 0;
            if (timePoint - lastUpdate > 300) {
                if (scene.selectedBoardIdx !== null) {
                    var board = scene.sceneBoards[scene.selectedBoardIdx];
                    if (board && board.metadata) {
                        var redraw = false;
                        var bmeta = board.metadata;
                        var scratch = drawable.scratchPad;
                        
                        /* Boardslist loader should have set up nice descriptions for us to use. */
                        /* But first check whether we've already drawn this one */
                        if (bmeta.descriptionBlocks && bmeta.descriptionBlocks.length > 0) {
                            if (scratch.lastDescBZero !== bmeta.descriptionBlocks[0]) {
                                redraw = true;
                                scratch.lastDescBZero = bmeta.descriptionBlocks[0];
                            }
                        }
                        
                        var textScale = 3300; /* Bigger the scale, smaller the text */
                        var cW = Math.round(drawable.size.w*textScale), cH = Math.round(drawable.size.d*textScale);
                        if (redraw) {
                            drawable.faces.top.texture = FCUtil.renderTextToTexture(scene.gl, bmeta.descriptionBlocks, {
                                canvasWidth:cW, canvasHeight:cH, canvasColor: 'white'
                            });
                            drawable.shaderLabel = 'basic'; /* Diffuse doesn't support textures yet */
                        }
    
                    } 
                }
                drawable.scratchPad.lastTxUpdate = timePoint;
                
            }
        });
        
        
        scene.addObject(infoDisplay);
        
        
        var makeOrbimgAnaglyph = function (urlBase, frameCount, params) {
            return new Promise(function (resolve, reject) {
                params = params || {};
                var anaTextures = [];
                var anaTexUrls = [];
                for (var i=0; i<frameCount; i++) {
                    anaTexUrls.push(urlBase.replace('@@', i));
                }
                FCUtil.loadImagesAsTextures(anaTexUrls, scene)
                .then(function (textures) {
                    anaTextures = textures;
                    var pos = params.pos || {x: -1, z: -1, y: 0};
                    var ori = params.ori || null;
                    var boardH = 2.0;
                    var im = anaTextures[0].img;
                    var imgW = im.width;
                    var imgH = im.height;
                    var scaleFactor = boardH/imgH;
                    var nymph = new FCShapes.BoardCuboid(
                        pos,
                        {w: imgW*scaleFactor, h: imgH*scaleFactor, d:0.2},
                        ori,
                        {
                            shaderLabel: 'basic',
                            textureLabel: 'green'
                        }
                    );
                    nymph.faces.front.leftEyeTexture = anaTextures[0].texture;
                    nymph.faces.front.rightEyeTexture = anaTextures[1].texture;
                    
                    var ctr = 0;
                    var count = anaTextures.length;
                    var rotateLeft = function () {
                        var idxL = ctr%count;
                        var idxR = (ctr+1)%count;
                        nymph.faces.front.leftEyeTexture = anaTextures[idxL].texture;
                        nymph.faces.front.rightEyeTexture = anaTextures[idxR].texture;
                        ctr++;
                    
                    }
                    var rotateRight = function () {
                        nymph.faces.front.leftEyeTexture = anaTextures[ctr%count].texture;
                        nymph.faces.front.rightEyeTexture = anaTextures[(ctr+1)%count].texture;
                        ctr--;
                        if (ctr<0) {
                            ctr = anaTextures.length - (ctr+1);
                        }
                    
                    }
                    resolve({
                        obj: nymph,
                        rotateLeft: rotateLeft,
                        rotateRight: rotateRight
                    });
                    
                });
            })
        }
        
        if (false) {
            makeOrbimgAnaglyph('http://lifemodel360.net/model/nymph/pose/22/125/frame/@@/', 72)
            .then(function (ana) {
                window.nymph = ana;
                scene.addObject(ana.obj);
                console.log('Nymph in the house!');
                window.setInterval(function () {
                    ana.rotateLeft();
                }, 30);
            });
        }
        
        if (false) {
            makeOrbimgAnaglyph('http://lifemodel360.net/model/alana/pose/1/42/frame/@@/', 72, {
                ori: {x:0, y:Math.PI, z:0},
                pos: {x:1, y:0, z:1},
            })
            .then(function (ana) {
                window.alana = ana;
                scene.addObject(ana.obj);
                console.log('Alana in the house!');
                window.setInterval(function () {
                    ana.rotateLeft();
                }, 30);
            });
        }
        
        
    };
    
    return TheScene;
})();
