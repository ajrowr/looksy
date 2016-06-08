
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
        
        this.contentWrangler = new FCFeedTools.ContentWrangler(this);
        
        /* You have to be a bit careful with these since they actually get called in the context of the wrangler, like a mixin */
        this.contentWrangler.contentPostProcessor = this.assignObjectSelector;
        this.contentWrangler.sceneUpdateCallback = this.updateScene;
        
        this.origin = {x:0, y:0, z:0};
        this.cursorOrigin = {x:0, z:0, y:0.5};
        
        this.modelSources = {};
        
        this.isRendering = false; /* This will be set true by the engine once rendering commences */
        this.isReady = false; /* This is set by the scene itself. All scene updates should be delayed until isRendering && isReady */
        
        FCScene.call(this);
    }
    // var TheScene = {};
    TheScene.prototype = Object.create(FCScene.prototype);
    
    TheScene.prototype.getArranger = function () {
        return this.contentWrangler.contentParams.arranger;
    }
    
    TheScene.prototype.loadModelSource = function (srcUrl, label) {
        var scene = this;
        return new Promise(function (resolve, reject) {
            FCShapes.loadSourceFromURL(srcUrl)
            .then(function (src) {
                scene.modelSources[label] = src;
                resolve();
            });
        });
    }
    
    TheScene.prototype.setupPrereqs = function () {
        var scene = this;
        var reqPromises = [];
        return new Promise(function (resolve, reject) {
            scene.addTextureFromColor({r:0.1, g:0.2, b:0.6, a:1.0}, 'royalblue');
            scene.addTextureFromColor({r:0.1, g:0.6, b:0.2, a:1.0}, 'green');
            scene.addTextureFromColor({r:0.1, g:0.1, b:0.1, a:1.0}, 'deepgray');
            scene.addTextureFromColor({r:0.7, g:0.2, b:0.2, a:1.0}, 'terracotta');
            scene.addTextureFromColor({hex:'#d8bfd8'}, 'thistle');
            scene.addTextureFromColor({hex:'#191970'}, 'midnightblue');
            scene.addTextureFromColor({hex:'#080815'}, 'darkmidnightblue');
            scene.addTextureFromColor({r:1, g:1, b:1, a:1.0}, 'white');
            scene.addTextureFromColor({hex:'#c0c0c0'}, 'silver');
            scene.addTextureFromColor({hex:'#ffd700'}, 'gold');
            
            /* Currently only some shaders support textures, in time all will. But the renderer skips things that don't have */
            /* a texture assigned. So null is a placeholder which means "this texture will be ignored". */
            scene.addTextureFromColor({hex:'#000000'}, 'null');
            
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
            reqPromises.push(scene.addTextureFromImage('textures/opengameart-org/461223101.jpg', 'desert01'));
            reqPromises.push(scene.addTextureFromImage('textures/opengameart-org/461223120.jpg', 'leafish01'));
            reqPromises.push(scene.addTextureFromImage('textures/opengameart-org/461223132.jpg', 'marble01'));
            reqPromises.push(scene.addTextureFromImage('textures/grassygrass01.jpg', 'grass01'));
            reqPromises.push(scene.addTextureFromImage('textures/concrete01.jpg', 'concrete01'));
            reqPromises.push(scene.addTextureFromImage('textures/pano01d.jpg', 'parkpano01'));
            reqPromises.push(scene.addTextureFromImage('textures/savannahpano01.jpg', 'panosavannah01'));
            reqPromises.push(scene.addTextureFromImage('textures/astro02.jpg', 'pano_astro02'));
            reqPromises.push(scene.addTextureFromImage('textures/pano03b.jpg', 'citypano01'));
            reqPromises.push(scene.addTextureFromImage('textures/sky01.jpg', 'sky01'));
            reqPromises.push(scene.loadModelSource('models/controlleresque.stl', 'controlleresque'));
            reqPromises.push(scene.loadModelSource('models/meta4.stl', 'logotype'));
            
            Promise.all(reqPromises).then(function () {
                resolve();
            });
        });
        
    }
    
    /* Remember, $this != scene */
    TheScene.prototype.assignObjectSelector = function (obj, scene) {
        function mkSelecter(myScene) {
            var selecter = function (obj, params) {
                var cursor = myScene.getObjectByLabel('cursor');
                cursor.animateToPosition({x:obj.pos.x * 0.8, z:obj.pos.z * 0.8, y:obj.pos.y+0.3}, 700);
                if (obj.metadata.dest) {
                    cursor.baseColor = {r:0.8, g:0.7, b: 0.1};
                    cursor.shaderLabel = 'diffuse';
                }
                else {
                    cursor.baseColor = {r:0.8, g:0.8, b:0.8};
                    cursor.shaderLabel = 'diffuse';
                }
        
            }
            return selecter
        };
        obj.interactions['select'] = mkSelecter(scene);
        
    }
    
    /* Remember, $this != scene */
    TheScene.prototype.updateScene = function (params, scene) {
        console.log(params);
        var wrangler = this;
        
        console.log('Callback was called back with params', params);
        
        /* Update the wrangler immediately since it's needed immediately */
        var sceneParams = params || {}
        wrangler.contentParams.arranger = new FCFeedTools.CylinderArranger({
            boardHeight: sceneParams.boardHeight || 5.0,
            rowHeight: sceneParams.rowHeight || 6.0,
            boardDistance: sceneParams.boardDistance || 7.0,
            baseOffset: sceneParams.baseOffset || 0.0,
            perRow: sceneParams.perRow || 7
        });
    
        /* Everything else can be queued if necessary */
        var updateClosure = function () {
            console.log('Updating scene with params', params);
            var sceneParams = params || {};
            
            var skySpindleParams = sceneParams.skySpindle || {};
            var spindle = scene.getObjectByLabel('world');
            spindle.textureLabel = skySpindleParams.textureLabel || 'citypano01';
            spindle.shaderLabel = skySpindleParams.shaderLabel || 'basic';
            spindle.radius = skySpindleParams.radius || 20;
            spindle.segmentCount = skySpindleParams.segmentCount || 100;
            spindle.height = skySpindleParams.height || 60;
            spindle.pos.y = skySpindleParams.verticalOffset || -20.1;
            
            var floorParams = sceneParams.floor || {};
            console.log('Floor params', floorParams);
            var floor = scene.getObjectByLabel('floor');
            floor.textureLabel = floorParams.textureLabel || 'concrete01';
            floor.shaderLabel = floorParams.shaderLabel || 'basic';
            
            var raftParams = sceneParams.raft || {}; /* TODO raft should not have 6 faces, that's silly */
            var raft = scene.getObjectByLabel('raft');
            raft.faces.top.textureLabel = raftParams.textureLabel || 'grass01';
            raft.faces.top.shaderLabel = raftParams.shaderLabel || 'basic';
            
            var skyParams = sceneParams.sky || {};
            var sky = scene.getObjectByLabel('sky');
            sky.textureLabel = skyParams.textureLabel || 'sky01';
            sky.shaderLabel = skyParams.shaderLabel || 'basic';
            sky.pos.y = skyParams.height || 50;
            
            /* If there's a logo, position it just behind the final board position in the first row. */
            /* So if the row is incomplete, the logo is visible. */
            var logoParams = sceneParams.logoType || {};
            var logo = scene.getObjectByLabel('logotype');
            if (logo) {
                var a = wrangler.contentParams.arranger;
                var q = a.arrange(0, a.perRow)[a.perRow-1];
                logo.pos = q.pos;
                logo.orientation = q.ori;

                logo.textureLabel = logoParams.textureLabel || 'null';
                logo.shaderLabel = logoParams.shaderLabel || 'diffuse';
                logo.baseColor = logoParams.baseColor || {r:0.7, g:0.7, b:0.8};
            }
            
            /* Flush any geometry changes */
            scene.prepareScene();
        }
        
        if (scene.isRendering && scene.isReady) {
            console.log('Executing scene update')
            updateClosure();
        }
        else {
            console.log('Queueing scene update');
            var intervalHandle = {};
            var mkIntervalHandler = function(myScene, updater, iH) {
                return function () {
                    if (myScene.isRendering && myScene.isReady) {
                        window.clearInterval(iH.intervalId);
                        console.log('Executing queued scene update');
                        updater();
                    }                    
                }
            }
            intervalHandle.intervalId = window.setInterval(mkIntervalHandler(scene, updateClosure, intervalHandle), 100);
        }
        
    }
    
    TheScene.prototype.setupScene = function () {
        console.log('Using scene setup from MyScene')
        
        var scene = this;
        var wrangler = scene.contentWrangler;
        var DEG=360/(2*Math.PI);
        var _hidden_beneath_floor = {x:0, y:-3.5, z:0};
                
        var mkSel = function (deltaC, deltaR) {
            var fn = function () {
                var boards = scene.sceneBoards;
                var perRow = scene.getArranger().perRow;
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
            var raft = scene.getObjectByLabel('raft');
            var selection = scene.sceneBoards[scene.selectedBoardIdx];
            var pos = {x:selection.pos.x * 0.5, z:selection.pos.z * 0.5, y:selection.pos.y+0.3}
            scene.setPlayerLocation(pos);
            raft.relocateTo(pos);
            
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
            scene.moveRaftAndPlayerTo(scene.origin);
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
            scene.moveRaftAndPlayerTo({x:loc.x, y:loc.y+factor, z:loc.z});
            
        }
        
        /* Elevator is stopped, so figure out what we're closest to and select it */
        var elevatorStopped = function () {
            selectNearestToController(1);
            
            /* If player's new position brings them within 10 meters of the uppermost board,
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
        
        /* Set everything up by default with ugly-ass clashing colours and then update them to nicer things in the scene update callback */
        
        /* Raft */
        scene.addObject(new FCShapes.GroundedCuboid(
            {x: 0, z: 0, y: 0},
            {w: scene.stageParams.sizeX, d: scene.stageParams.sizeZ, h: 0.01},
            null,
            {label: 'raft', textureLabel: 'silver', shaderLabel: 'basic'}
        ));
        
        /* Floor */
        scene.addObject(new FCShapes.WallShape(
            {x: 0, z: 0, y: -0.02},
            {minX: -120, maxX: 120, minY: -120, maxY: 120},
            {x:270/DEG, y:0/DEG, z:0/DEG},
            {label: 'floor', textureLabel: 'thistle', shaderLabel: 'basic', segmentsX: 50, segmentsY: 50}
        ));
        
        /* Worldbox */
        var worldbox = new FCShapes.CylinderShape(
            // {radius: 50, height: 70},
            // {x:0, y:-3.5, z:0}, //parkpano01
            // {radius: 20, height: 20}, //parkpano01
            {x:0, y:-19.5, z:0}, //citypano01
            {radius: 20, height: 60}, //citypano01
            null,
            {label: 'world', textureLabel: 'green', shaderLabel: 'basic', segmentCount: 100, segmentsFaceInwards: true}
        );
        scene.addObject(worldbox);
        
        /* Skyplane */
        scene.addObject(new FCShapes.WallShape(
            {x:0, y:50, z:0},
            {minX: -120, maxX: 120, minY: -120, maxY: 120},
            {x:90/DEG, y:0, z:0},
            {label: 'sky', textureLabel: 'royalblue', shaderLabel: 'basic', segmentsX: 1, segmentsY: 1}
        ));
        
        /* Logotype */
        var _ltscalefactor = 1/6.5;
        var logotype = new FCShapes.LoaderShape(
            scene.modelSources.logotype,
            _hidden_beneath_floor,
            // {x:5, y:0, z:-5},
            {scale: 1.0*_ltscalefactor},
            null,
            {textureLabel: 'null', shaderLabel: 'diffuse', baseColor: {r:0.2, g:0.9, b:0.5}, label: 'logotype'}
        );
        logotype.translation = {x:-16.0*_ltscalefactor, y:0, z:-3}; /* Scale-adjusted modelspace translate */
        scene.addObject(logotype);
        
        /* Cursor */
        var cursor = new FCShapes.GroundedCuboid(
            scene.cursorOrigin,
            {w: 0.3, h:0.3, d:0.3},
            null,
            {label: 'cursor', textureLabel: 'null', shaderLabel: 'diffuse', baseColor: {r:0.8, g:0.8, b: 0.8}}
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
        
        var _controlleresque = {
            src: scene.modelSources.controlleresque,
            translate: {x:0.00, y:-0.016, z:0.15},
            scale: {scale:0.01},
            rotate: {x:0/DEG, y:180/DEG, z:90/DEG}, 
            greenColor: {r:0.2, g:0.9, b:0.6},
            blueColor: {r:0.2, g:0.6, b:0.9}
        };
        /* After a bit more refinement, these controlleresques will probably replace the controller models altogether. */
        /* But for now they're a bit too experimental. */
        /* And besides I kind of like the way they look. */
        var c1 = new FCShapes.LoaderShape(
            _controlleresque.src, 
            _hidden_beneath_floor, 
            _controlleresque.scale, 
            _controlleresque.rotate, 
            {textureLabel:'null', shaderLabel:'diffuse', baseColor: _controlleresque.blueColor}
        );
        c1.translation = _controlleresque.translate;
        c1.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, null));
        scene.addObject(c1);
        
        var c2 = new FCShapes.LoaderShape(
            _controlleresque.src, 
            _hidden_beneath_floor, 
            _controlleresque.scale, 
            _controlleresque.rotate, 
            {textureLabel:'null', shaderLabel:'diffuse', baseColor: _controlleresque.greenColor}
        );
        c2.translation = _controlleresque.translate;
        c2.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, null));
        scene.addObject(c2);
                
        var tracker1 = new FCShapes.ControllerShape(
            _hidden_beneath_floor, /* Hide under floor until needed */
            {w: 0.1, h: 0.03, d: 0.3},
            null,
            {label: 'gpTracker1', textureLabel: 'null', shaderLabel: 'diffuse', groupLabel: 'gpTrackers',
            baseColor: {r:0.1, g:0.2, b:0.6, a:1.0}} /* Blue */
        );
        tracker1.behaviours.push(FCUtil.makeGamepadTracker(scene, 0, buttonHandler));

        var tracker2 = new FCShapes.ControllerShape(
            _hidden_beneath_floor, /* Hide under floor until needed */
            {w: 0.1, h: 0.03, d: 0.3},
            null,
            {label: 'gpTracker2', textureLabel: 'null', shaderLabel: 'diffuse', groupLabel: 'gpTrackers',
            baseColor: {r:0.1, g:0.6, b:0.2, a:1.0}} /* Green */
        );
        tracker2.behaviours.push(FCUtil.makeGamepadTracker(scene, 1, buttonHandler));
        
        scene.addObject(tracker1);
        scene.addObject(tracker2);
        
        var infoDisplay = new FCShapes.GroundedCuboid(
            {x: 0, z: 0, y: -0.5}, /* Hide under floor until needed */
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
                        var dBlocks = [];
                        if (bmeta.descriptionBlocks && bmeta.descriptionBlocks.length > 0) {
                            if (scratch.lastDescBZero !== bmeta.descriptionBlocks[0]) {
                                redraw = true;
                                scratch.lastDescBZero = bmeta.descriptionBlocks[0];
                                dBlocks = bmeta.descriptionBlocks;
                            }
                        }
                        else if (bmeta.description) {
                            // console.log('hmm');
                            if (scratch.lastDescBZero !== bmeta.description) {
                                redraw = true;
                                scratch.lastDescBZero = bmeta.description;
                                dBlocks.push({t:bmeta.description, size: '50', color:'black'});
                            }
                        }
                        
                        var textScale = 3300; /* Bigger the scale, smaller the text */
                        var cW = Math.round(drawable.size.w*textScale), cH = Math.round(drawable.size.d*textScale);
                        if (redraw) {
                            drawable.faces.top.texture = FCUtil.renderTextToTexture(scene.gl, dBlocks, {
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
        
        /* Mark the scene as ready in order for content updates to happen. */
        scene.isReady = true;
        
    };
    
    return TheScene;
})();

