//=============================================================================
// Game Map Main Game - Main Game Core Engine
// Game_CoreSystem.js
//=============================================================================

var Imported = Imported || {};
Imported.Game_CoreSystem = true;
var Game_CoreSystem = Game_CoreSystem || {};
Game_CoreSystem.Core = Game_CoreSystem.Core || {};
//=============================================================================
// Core Game Global Constants
//=============================================================================

//=============================================================================
//DataManager
//=============================================================================
var $dataObjectTiles        = null;
DataManager._databaseFiles.push({ name: '$dataObjectTiles', src: 'Game_ObjectTilesets.json' });



//=============================================================================
// Game_Object
//=============================================================================
function Game_Object() {
    this.initialize.apply(this, arguments);
}
Game_Object.prototype.initialize = function(objectId,x,y) {
    var data = $dataObjectTiles[objectId];
    this._characterName = data.characterName;
    this._characterIndex = data.index;
    
    this._centerX = data.centerX; // the x from upper-left conor to the center x
    this._centerY = data.centerY; 
    this._x = x - this._centerX;
    this._y = y - this._centerY;
    this._characterRect = new Rectangle(this._x,this._y,data.width,data.height);
    this._evenWidth = data.width%2===0;

    this._passableGrids = data.passableGrids; //the size of this array should be width*height (in 32)
                              //and it should store data like 0101, 1111, 1010 binary numbers
    this._blendMode = 0;
    this._through = false;
};
Game_Object.prototype.needAdjustEvenWidth = function() {
    return this._evenWidth;
};
Game_Object.prototype.characterName = function() {
    return this._characterName;
};
Game_Object.prototype.characterIndex = function() {
    return this._characterIndex;
};
Game_Object.prototype.xyToIndex = function(x, y){
    return (x-this._x) + (y-this._y)*(this._characterRect.width);
};
Game_Object.prototype.pos = function(x, y) {
    return this._characterRect.contains(x,y)
};
Game_Object.prototype.posNt = function(x, y) {
    // No through
    return this.pos(x, y) && this._passableGrids[this.xyToIndex(x,y)]!=0;
};
Game_Object.prototype.screenX = function() {
    var tw = $gameMap.tileWidth();
    return Math.round(this.scrolledX() * tw + tw / 2);
};

Game_Object.prototype.screenY = function() {
    var th = $gameMap.tileHeight();
    return Math.round(this.scrolledY() * th + th);
};

Game_Object.prototype.screenZ = function() {
    //return this._priorityType * 2 + 1;
    return 3;
};
Game_Object.prototype.scrolledX = function() {
    var shift = this._evenWidth ? 0.5 : 0;
    return $gameMap.adjustX(this._x + this._centerX - shift + 1);
};

Game_Object.prototype.scrolledY = function() {
    return $gameMap.adjustY(this._y + this._centerY + 1);
};

//=============================================================================
// Game_Map
//=============================================================================
Game_CoreSystem.Core.Game_Map_initialize = Game_Map.prototype.initialize;
Game_Map.prototype.initialize = function() {
    this._objects = [];
    Game_CoreSystem.Core.Game_Map_initialize.call(this);
    
}    
Game_CoreSystem.Core.Game_Map_setup = Game_Map.prototype.setup;
Game_Map.prototype.setup = function(mapId) {
    Game_CoreSystem.Core.Game_Map_setup.call(this,mapId);
    this.setupObjects();
};
Game_Map.prototype.objects = function() {
    return this._objects.filter(function(obj) {
        return !!obj;
    });
};
Game_Map.prototype.setupObjects = function() {
    this._objects = [];
    var self = this;
    this.events().forEach(function(event) {
        event.refresh();
        if (!event.page()) {
            return;
        }
        if (event.list()[0].code !== 108) {
            return;
        } 
        if (event.list()[0].parameters[0] === "Tree") {
            self._objects.push(new Game_Object(1,event.x,event.y));
            event.erase();
        };
        
    });
};
Game_Map.prototype.objectsXy = function(x, y) {
    return this.objects().filter(function(object) {
        return object.pos(x, y);
    });
};
Game_CoreSystem.Core.Game_Map_isPassable = Game_Map.prototype.isPassable;
Game_Map.prototype.isPassable = function(x, y, d) {
    var objects = $gameMap.objectsXy(x, y);
    if (objects.length > 0) { // there is an object contain this xy
        return objects.every(function(obj) {
            return obj.posNt(x, y);
        });
    }else{
        return Game_CoreSystem.Core.Game_Map_isPassable.call(this,x, y, d);
    }
};

//-----------------------------------------------------------------------------
// Sprite_Object
//---------------------------------------------------------------------------- 

function Sprite_Object() {
    this.initialize.apply(this, arguments);
}

Sprite_Object.prototype = Object.create(Sprite_Base.prototype);
Sprite_Object.prototype.constructor = Sprite_Object;

Sprite_Object.prototype.initialize = function(object) {
    Sprite_Base.prototype.initialize.call(this);
    this.initMembers();
    this.setObject(object);
};

Sprite_Object.prototype.initMembers = function() {
    this.anchor.x = 0.5;
    this.anchor.y = 1;
    this._object = null;


};

Sprite_Object.prototype.setObject = function(object) {
    this._object = object;
};

Sprite_Object.prototype.update = function() {
    Sprite_Base.prototype.update.call(this);
    this.updateBitmap();
    this.updateFrame();
    this.updatePosition();
    this.updateOther();
    
};
Sprite_Object.prototype.updateBitmap = function() {
    if (this.isImageChanged()) {
        this._characterName = this._object.characterName();
        this._characterIndex = this._object.characterIndex();
        this.setCharacterBitmap();
    }
};
Sprite_Object.prototype.isImageChanged = function() {
    return ( this._characterName !== this._object.characterName() ||
             this._characterIndex !== this._object.characterIndex());
};
Sprite_Object.prototype.setCharacterBitmap = function() {
    this.bitmap = ImageManager.loadCharacter(this._characterName);
};
Sprite_Object.prototype.updateFrame = function() {
    this.updateCharacterFrame();
};
Sprite_Object.prototype.updateCharacterFrame = function() {
    var pw = this.patternWidth();
    var ph = this.patternHeight();
    var sx = (this._characterIndex % 12) * pw;
    var sy = Math.floor(this._characterIndex / 8) * ph;
    this.setFrame(sx, sy, pw, ph);
};
Sprite_Object.prototype.patternWidth = function() {
    return this.bitmap.width / 12;
};
Sprite_Object.prototype.patternHeight = function() {
    return this.bitmap.height / 8;
};
Sprite_Object.prototype.updatePosition = function() {
    this.x = this._object.screenX();
    this.y = this._object.screenY();
    this.z = this._object.screenZ();
};
Sprite_Object.prototype.updateOther = function() {
    // this.opacity = this._object.opacity();
    // this.blendMode = this._object.blendMode();
    // this._bushDepth = this._object.bushDepth();
};

//=============================================================================
// Spriteset_Map
//=============================================================================
Game_CoreSystem.Core.Spriteset_Map_createLowerLayer = Spriteset_Map.prototype.createLowerLayer;
Spriteset_Map.prototype.createLowerLayer = function(){
    Game_CoreSystem.Core.Spriteset_Map_createLowerLayer.call(this);
    this.createObjects();
};
Spriteset_Map.prototype.createObjects = function() {
    this._objectSprites = [];
    $gameMap.objects().forEach(function(obj) {
        this._objectSprites.push(new Sprite_Object(obj));
    }, this);
    for (var i = 0; i < this._objectSprites.length; i++) {
        this._tilemap.addChild(this._objectSprites[i]);
    }
};

//=============================================================================
// End of File
//=============================================================================