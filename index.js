const config = {
  type: Phaser.AUTO,
  width: 512,
  height: 512,
  backgroundColor: "#222222",
  parent: "game-container",
  scene: {
    preload: preload,
    create: create,
    update: update
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }
    }
  }
};


const game = new Phaser.Game(config);
let cursors;
let dkey;
let player;
let text;
let toys;
let music;

let hit = 0;
let sleepiness = 0; //0 is awake, 255 is asleep
let sleepDisplay;   //rectangle that changes from white (awake) to black (asleep)
const sleepDisplaySize = 8;
const sleepDisplayOffsetX = 10;
const sleepDisplayOffsetY = 15;
const winMessage = "Your Baby fell asleep."
const hitFrames = 5;
const camerazoom = 1.2;

function showDebugGraphics(game, layer) {
  // Turn on physics debugging to show player's hitbox
  game.physics.world.createDebugGraphic();

  // Create worldLayer collision graphic above the player, but below the help text
  const graphics = game.add
    .graphics()
    .setAlpha(0.75)
    .setDepth(20);
  layer.renderDebug(graphics, {
    tileColor: null, // Color of non-colliding tiles
    collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
    faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
  });
}

function ouch(player, object) {
  if(hit != 5){
    hit = 5;
  }
  console.debug("ouch, ", object)
}

function setSleepDisplay() {

  sleepDisplay.x = !player.flipX ? player.x-sleepDisplayOffsetX : player.x+sleepDisplayOffsetX
  sleepDisplay.y = player.y-sleepDisplayOffsetY

  let color
  if(hit == 0){
    color = new Phaser.Display.Color(255 - sleepiness, 255 - sleepiness, 255 - sleepiness , 255)
  }
  else {
    color = new Phaser.Display.Color(255,0,0,255)
  }

  sleepDisplay.setFillStyle(color.color, 0.75)

}

function preload() {
  // "this" === Phaser.Scene
  this.load.image("tiles", "../assets/images/open_tileset.png");
  this.load.tilemapTiledJSON("map", "../assets/phaser/gamejam_aug_map.json")
  this.load.spritesheet("player", "../assets/images/player_sprite_sheet.png", {frameWidth:32, frameHeight:32})
  this.load.image("toy", "../assets/images/toy.png")

  this.load.audio("toy1", "../assets/sound/toy_1.wav")
  this.load.audio("toy2", "../assets/sound/toy_2.wav")
  this.load.audio("music", "../assets/sound/music.wav")
}

function create() {
  const map = this.make.tilemap({ key: "map" });
  this.sound.add("toy1")
  this.sound.add("toy2")
  music = this.sound.add('music')
  music.play({
    volume: .5,
    loop: true
  });
  // Parameters are the name you gave the tileset in Tiled and then the key of the tileset image in
  // Phaser's cache (i.e. the name you used in preload)
  const tileset = map.addTilesetImage("gamejam_aug", "tiles");
  
  // Parameters: layer name (or index) from Tiled, tileset, x, y
  const belowLayer = map.createStaticLayer("Ground", tileset, 0, 0);
  const worldLayer = map.createStaticLayer("Walls", tileset, 0, 0);
  const objectLayer = map.createStaticLayer("Furniture", tileset, 0, 0);
  const spawnPoints = map.objects[0].objects.filter(obj => obj.name === "toy")

  toys = spawnPoints.map(sp => {
    let toy = this.physics.add.sprite(sp.x, sp.y, "toy")
    toy.body.bounce.set(0.6)
    toy.body.drag.set(1)
    toy.body.setCircle(13)
    return toy
  });
  
  //add collision
  worldLayer.setCollisionByProperty({collides: true}, true)
  objectLayer.setCollisionByProperty({collides: true}, true)
  
  player = this.physics.add.sprite(200, 300, "player")
  .setSize(21,27)
  .setOffset(8,3)
  this.physics.add.collider(player, worldLayer);
  this.physics.add.collider(player, objectLayer);
  this.physics.add.collider(toys, worldLayer);
  this.physics.add.collider(toys, objectLayer);
  this.physics.add.collider(toys, toys);
  this.physics.add.collider(player, toys);
  this.physics.add.overlap(player, toys, ouch, null, this)
  console.debug("collision set for worldLayer and objectLayer")

  // Phaser supports multiple cameras, but you can access the default camera like this:
  const camera = this.cameras.main;
  camera.zoom = camerazoom;
  camera.startFollow(player);
  camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  cursors = this.input.keyboard.createCursorKeys();
  dkey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
  // Help text that has a "fixed" position on the screen
  text = this.add
    .text(130, 190, winMessage, {
      font: "18px monospace",
      fill: "#ffffff",
      padding: { x: 20, y: 10 },
      backgroundColor: "#000000"
    })
    .setScrollFactor(0);
  
  text.visible = false;

  this.input.keyboard.once("keydown_D", event => showDebugGraphics(this, worldLayer));

  //init sleepdisplay
  sleepDisplay = this.add.rectangle(player.x-sleepDisplayOffsetX, player.y-sleepDisplayOffsetY, sleepDisplaySize, sleepDisplaySize);


  const anims = this.anims;
  anims.create({
    key: "up",
    frames: this.anims.generateFrameNumbers('player',{
      start:1,
      end:1
    }),
    frameRate: 1,
    repeat: -1
  });
  anims.create({
    key: "down",
    frames: this.anims.generateFrameNumbers('player',{
      start: 2,
      end: 2
    }),
    frameRate: 1,
    repeat: -1    
  });
  anims.create({
    key: "leftright",
    frames: this.anims.generateFrameNumbers('player',{
      start: 0,
      end: 0
    }),
    frameRate: 1,
    repeat: -1  
  });
}

function update(time, delta) {
  const speed = 175;
  const prevVelocity = player.body.velocity.clone();

  player.body.setVelocity(0);

  // Horizontal movement
  if (cursors.left.isDown) {
    player.body.setVelocityX(-speed);
    player.flipX = true;
  } else if (cursors.right.isDown) {
    player.body.setVelocityX(speed);
    player.flipX = false;
  }

  // Vertical movement
  if (cursors.up.isDown) {
    player.body.setVelocityY(-speed);
  } else if (cursors.down.isDown) {
    player.body.setVelocityY(speed);
  }
  //console.debug("playerX: " + player.body.position.x + " , playerY: " + player.body.position.y)

  player.body.velocity.normalize().scale(speed);

  /*
    // Update the animation last and give left/right animations precedence over up/down animations
    if (cursors.left.isDown) {
      player.anims.play("down", true);
    } else if (cursors.right.isDown) {
      player.anims.play("leftright", true);
    } else if (cursors.up.isDown) {
      player.anims.play("up", true);
    } else if (cursors.down.isDown) {
      player.anims.play("leftright", true);
    } else {
      player.anims.stop();
  
      // If we were moving, pick and idle frame to use
      if (prevVelocity.x < 0) player.setTexture("atlas", "misa-left");
      else if (prevVelocity.x > 0) player.setTexture("atlas", "misa-right");
      else if (prevVelocity.y < 0) player.setTexture("atlas", "misa-back");
      else if (prevVelocity.y > 0) player.setTexture("atlas", "misa-front");
    }
*/
  if(hit == 5){
    let soundname = "toy" + Phaser.Math.Between(1,2)
    this.sound.play(soundname);
  }
  if(hit > 0){
    hit -= 1
    sleepiness -= 2
  }
  if(player.body.velocity.length() != 0){
    sleepiness += 0.2;
  }
  else {
    if(sleepiness > 0)
    sleepiness -= 0.1;
  }

  if(sleepiness >= 255){
    music.stop()
    text.visible = true;
  }

  //console.debug("velocity: ", player.body.velocity.length())
  console.debug("sleepiness: ", sleepiness)
  setSleepDisplay()
  
}  