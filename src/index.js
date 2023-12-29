import Phaser from 'phaser';
import spriteImg from './assets/sprite.png'; // 16 x 16
import characterImg from './assets/character.png'; // 12 x 12
import mapJson from './assets/map.json';

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
        for (let y = 0; y < tilemap.height; y++) {
            for (let x = 0; x < tilemap.width; x++) {
                const tile = tilemap.getTileAt(x, y, true, 'foreground');
                if (tile && !tile.collides) {
                    const node = new GraphNode(x, y);
                    this.nodes.set(this.getNodeId(x, y), node);

                    // Add neighbors (up, down, left, and right)
                    this.addNeighbors(node, tilemap);
                } else {
                    //console.log('collides', x, y)
                }
            }
        }
    }

    addNeighbors(node, tilemap) {
        const directions = [
            { x: -1, y: 0 }, // left
            { x: 1, y: 0 },  // right
            { x: 0, y: -1 }, // up
            { x: 0, y: 1 },  // down,
            { x: -1, y: -1 }, // up-left
            { x: 1, y: -1 },  // up-right
            { x: -1, y: 1 }, // down-left
            { x: 1, y: 1 }   // down-right
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
    }

    preload() {
        this.load.image('sprite', spriteImg);
        this.load.spritesheet('character', characterImg, { frameWidth: 12, frameHeight: 12 });
        this.load.tilemapTiledJSON('map', mapJson);

        this.targetZoom = 3; // Target zoom level, greater than 1 for zoom-in
        this.zoomSpeed = 0.001; // Initial speed of zoom
        this.zoomIncrease = 1.001;
    }

    create() {
        const map = this.make.tilemap({ key: 'map' });

        map.setCollisionByProperty({ collides: true });
        const tiles = map.addTilesetImage('bomber-man-sprite', 'sprite');
        const layer = map.createLayer('foreground', tiles, 0, 0);
        const hatsLayer = map.createLayer('hats', tiles, 0, 0);
        layer.setCollision([3]);

        const centerXInPixels = map.widthInPixels / 2;
        const centerYInPixels = map.heightInPixels / 2;

        this.character = this.physics.add.sprite(
            centerXInPixels,
            centerYInPixels,
            'character'
        );
        //this.initCharacterAnimations();

        //this.physics.add.collider(this.character, layer);

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setZoom(1);
        this.cameras.main.startFollow(this.character, true, 0.1, 0.1);

        // Assuming the character starts at the center of the map
        const mapGraph = new GameMapGraph(map);
        this.dfsPath = [];
        let startNode = mapGraph.nodes.get(mapGraph.getNodeId(
            Math.floor(map.width / 2),
            Math.floor(map.height / 2)
        ));
        mapGraph.dfs(startNode, node => this.dfsPath.push(node));
        this.currentPathIndex = 0; // Initialize the path index
        this.nextNode = this.dfsPath[this.currentPathIndex]; // Next node to move to
    }

    moveToNextNode() {
        // Current position
        let charX = this.character.x;
        let charY = this.character.y;

        // Destination position
        let destX = this.nextNode.x * 12; // assuming you have tileWidth defined
        let destY = this.nextNode.y * 12; // assuming you have tileHeight 


        // Check if character has reached the next node
        if (Phaser.Math.Fuzzy.Equal(charX, destX, 1.7) && Phaser.Math.Fuzzy.Equal(charY, destY, 1.7)) {
            this.currentPathIndex++; // Move to the next node in the path
            if (this.currentPathIndex < this.dfsPath.length) {
                this.nextNode = this.dfsPath[this.currentPathIndex];
            }
            return; // Skip further movement for this frame
        }

        // Calculate direction and set velocity
        let angle = Phaser.Math.Angle.Between(charX, charY, destX, destY);
        this.character.setVelocityX(Math.cos(angle) * 200); // adjust speed as necessary
        this.character.setVelocityY(Math.sin(angle) * 200);

        // Update animation based on direction
        //this.updateCharacterAnimation(angle);
    }

    update() {
        if (this.currentPathIndex < this.dfsPath.length) {
            this.moveToNextNode();
        } else {
            //console.log('END', this.currentPathIndex, this.dfsPath.length)
        }

        if (this.cameras.main.zoom < this.targetZoom) {
            // Increase the zoom speed over time (if desired)
            this.zoomSpeed *= this.zoomIncrease;

            // Adjust the camera's zoom level
            this.cameras.main.zoom += this.zoomSpeed;

            // Ensure it doesn't go above the target zoom
            if (this.cameras.main.zoom > this.targetZoom) {
                this.cameras.main.zoom = this.targetZoom;
            }
        }

        console.log(this.character.x, this.character.y);
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
}

const config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    backgroundColor: 'black',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 600
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true,
        }
    },
    scene: MyGame
};

const game = new Phaser.Game(config);