import Phaser from 'phaser';
import spriteImg from './assets/sprite-export.png';
import characterImg from './assets/skeleton.png';
//import duckImg from './assets/duck.png';
import mapJson from './assets/map.json';
import testMapJson from './assets/testMap32.json';

const playerSize = 32;
const tileSize = 32;
const playerOffset = playerSize/2;

class GraphNode {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.neighbors = [];
    }
}

class GameMapGraph {
    constructor(tilemap) {
        this.nodes = new Map(); // Key: tile coordinate, Value: GraphNode
        this.buildGraph(tilemap);
    }

    getNodeId(x, y) {
        return `${x}-${y}`; // A unique identifier for each node
    }

    buildGraph(tilemap) {
        // First we are going to build all the nodes in our graph
        for (let y = 0; y < tilemap.height; y++) {
            for (let x = 0; x < tilemap.width; x++) {
                const tile = tilemap.getTileAt(x, y, true, 'foreground');
                if (tile && !tile.collides) {
                    const node = new GraphNode(x, y);
                    this.nodes.set(this.getNodeId(x, y), node);
                } else {
                    //console.log('collides', x, y)
                }
            }
        }

        this.nodes.forEach((node, key) => {
            const tile = tilemap.getTileAt(node.x, node.y, true, 'foreground');
            if (tile && !tile.collides) {
                this.addNeighbors(node, tilemap);
            }
        });
    }

    addNeighbors(node, tilemap) {
        const directions = [
            { x: -1, y: 0 }, // left
            { x: 1, y: 0 },  // right
            { x: 0, y: -1 }, // up
            { x: 0, y: 1 },  // down,
            // { x: -1, y: -1 }, // up-left
            // { x: 1, y: -1 },  // up-right
            // { x: -1, y: 1 }, // down-left
            // { x: 1, y: 1 }   // down-right
        ];

        directions.forEach(dir => {
            const neighborX = node.x + dir.x;
            const neighborY = node.y + dir.y;
            const neighborTile = tilemap.getTileAt(neighborX, neighborY, true, 'foreground');
            if (neighborTile && !neighborTile.collides) {
                const neighborId = this.getNodeId(neighborX, neighborY);
                const neighborNode = this.nodes.get(neighborId);
                if (neighborNode) {
                    node.neighbors.push(neighborNode);
                }
            }
        });
    }

    dfs(startNode, visitCallback) {
        let visited = new Set();
        let stack = [startNode];

        while (stack.length > 0) {
            let node = stack.pop();

            if (!visited.has(node)) {
                visited.add(node);
                visitCallback(node);

                node.neighbors.forEach(neighbor => {
                    if (!visited.has(neighbor)) {
                        stack.push(neighbor);
                    }
                });
            }
        }
    }
}

class MyGame extends Phaser.Scene {
    constructor() {
        super();
        this.playerSpeed = 100;
    }

    preload() {
        this.load.image('sprite', spriteImg);
        this.load.spritesheet('character', characterImg, { frameWidth: 32, frameHeight: 32 });
        this.load.tilemapTiledJSON('map', mapJson);
        this.load.tilemapTiledJSON('testMap', testMapJson);
    }

    create() {
        const map = this.make.tilemap({ key: 'testMap' });
        const tiles = map.addTilesetImage('sprite-export', 'sprite');
        const layer = map.createLayer('foreground', tiles, 0, 0);
        layer.setCollision([3]);

        this.character = this.physics.add.sprite(
            0 * playerSize + playerOffset,
            0 * playerSize + playerOffset,
            'character'
        );
        this.initDuckAnimations();

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setZoom(1);
        this.cameras.main.startFollow(this.character, true, 0.1, 0.1);

        // Where the player starts
        const mapGraph = new GameMapGraph(map);
        this.dfsPath = [];
        let startNode = mapGraph.nodes.get(mapGraph.getNodeId(
            0,
            0
        ));
        mapGraph.dfs(startNode, node => this.dfsPath.push(node));
        this.currentPathIndex = 0; // Initialize the path index
        this.nextNode = this.dfsPath[this.currentPathIndex]; // Next node to move to

        this.physics.add.collider(this.character, layer, (player, tile) => {
            // Set velocity to 0
            player.setVelocityX(0);
            player.setVelocityY(0);
        
            // Log collision info
            
            // Create a red rectangle overlay
            const graphics = this.add.graphics();
            graphics.fillStyle(0xff0000, 1); // Red color
            graphics.fillRect(tile.x * tileSize, tile.y * tileSize, tileSize, tileSize);

            // get current nodes x
            console.log(this.dfsPath, this.currentPathIndex);
            
            // pause the game
            player.x = this.dfsPath[this.currentPathIndex].x * tileSize + playerOffset;
            player.y = this.dfsPath[this.currentPathIndex].y * tileSize + playerOffset;
            console.log(this.currentPathIndex);
            //this.physics.pause();
        });
    }
    

    moveToNextNode() {
        // Current position
        let charX = this.character.x;
        let charY = this.character.y;

        // Destination position
        let destX = (this.nextNode.x * tileSize) + playerOffset; // assuming you have tileWidth defined
        let destY = (this.nextNode.y * tileSize) + playerOffset; // assuming you have tileHeight

        // Epilipson with playerSpeed 
        const fuzzyXEpilipson = this.playerSpeed * 0.009;

        // Check if character has reached the next node
        if (Phaser.Math.Fuzzy.Equal(charX, destX, fuzzyXEpilipson) && Phaser.Math.Fuzzy.Equal(charY, destY, fuzzyXEpilipson)) {
            this.currentPathIndex++; // Move to the next node in the path
            if (this.currentPathIndex < this.dfsPath.length) {
                this.nextNode = this.dfsPath[this.currentPathIndex];
            }
            return; // Skip further movement for this frame
        }

        // Calculate direction and set velocity

        let angle = Phaser.Math.Angle.Between(charX, charY, destX, destY);

        this.character.setVelocityX(Math.cos(angle) * this.playerSpeed); // adjust speed as necessary
        this.character.setVelocityY(Math.sin(angle) * this.playerSpeed);

        // Update animation based on direction
        //this.updateCharacterAnimation(angle);
    }

    update() {
        if (this.currentPathIndex < this.dfsPath.length) {
            this.moveToNextNode();

            // Flip if moving left
            if (this.character.body.velocity.x < 0) {
                this.character.flipX = true;
            } else {
                this.character.flipX = false;
            }

            // Change animation based on velocity. Check both x and y velocity
            if (this.character.body.velocity.x > 90) {
                this.character.play('walk-right', true);
            } else if (this.character.body.velocity.x < -90) {
                this.character.play('walk-right', true);
            } else if (this.character.body.velocity.y > 90) {
                this.character.play('walk-down', true);
            } else if (this.character.body.velocity.y < -90) {
                this.character.play('walk-up', true);
                console.log('walk up');
            }
            console.log('velocity', this.character.body.velocity.x, this.character.body.velocity.y);
        } else {
            this.character.setVelocityX(0);
            this.character.setVelocityY(0);
            console.log('END', this.currentPathIndex, this.dfsPath.length)
        }
    }

    initCharacterAnimations() {
        this.anims.create({
            key: 'walk-right',
            frames: [
                { key: 'character', frame: 0 },
                { key: 'character', frame: 4 },
                { key: 'character', frame: 8 },
                { key: 'character', frame: 12 },
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-left',
            frames: [
                { key: 'character', frame: 1 },
                { key: 'character', frame: 5 },
                { key: 'character', frame: 9 },
                { key: 'character', frame: 13 },
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-down',
            frames: [
                { key: 'character', frame: 2 },
                { key: 'character', frame: 6 },
                { key: 'character', frame: 10 },
                { key: 'character', frame: 14 },
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-up',
            frames: [
                { key: 'character', frame: 3 },
                { key: 'character', frame: 7 },
                { key: 'character', frame: 11 },
                { key: 'character', frame: 15 },
            ],
            frameRate: 10,
            repeat: -1
        });

        this.character.play('walk-right', true);
    }

    initDuckAnimations() {
        this.anims.create({
            key: 'walk-down',
            frames: [
                // 0 - 4 
                { key: 'character', frame: 12 },
                { key: 'character', frame: 13 },
                { key: 'character', frame: 14 },
                { key: 'character', frame: 15 },
                
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-up',
            frames: [
                // 0 - 4 
                { key: 'character', frame: 20 },
                { key: 'character', frame: 21 },
                { key: 'character', frame: 22 },
                { key: 'character', frame: 23 },
                
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'walk-right',
            frames: [
                // 0 - 4 
                { key: 'character', frame: 16 },
                { key: 'character', frame: 17 },
                { key: 'character', frame: 18 },
                { key: 'character', frame: 19 },
                
            ],
            frameRate: 10,
            repeat: -1
        });

        this.character.play('walk-up', true);
    
    }
}

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    backgroundColor: 'black',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 320,
        height: 480
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        }
    },
    scene: MyGame
};

const game = new Phaser.Game(config);