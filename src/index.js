import Phaser from 'phaser';
import spriteImg from './assets/sprite.png'; // 16 x 16
import characterImg from './assets/character.png'; // 12 x 12
import mapJson from './assets/map.json';

class MyGame extends Phaser.Scene {
    constructor() {
        super();
    } 

    preload() {
        this.load.image('sprite', spriteImg);
        this.load.spritesheet('character', characterImg, { frameWidth: 12, frameHeight: 12 });
        this.load.tilemapTiledJSON('map', mapJson);
    }

    create() {
        const map = this.make.tilemap({ key: 'map' });

        map.setCollisionByProperty({ collides: true });
        const tiles = map.addTilesetImage('bomber-man-sprite', 'sprite');
        const layer = map.createLayer('foreground', tiles, 0, 0);
        const blocks = map.createLayer('blocks', tiles, 0, 0);
        layer.setCollision([3]);
        blocks.setCollision([1]);

        this.character = this.physics.add.sprite(
            map.widthInPixels / 2,
            map.heightInPixels / 2,
            'character'
        );
        this.initCharacterAnimations();
        this.physics.add.collider(this.character, layer);
        this.physics.add.collider(this.character, blocks);

        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setZoom(2);
        this.cameras.main.startFollow(this.character, true, 0.1, 0.1);
    }

    update() {
        let cursors = this.input.keyboard.createCursorKeys();
        let speed = 100;

        this.character.setVelocity(0);
        let moving = false;

        if (cursors.left.isDown) {
            this.character.setVelocityX(-speed);
            this.character.anims.play('walk-left', true);
            moving = true;
        } else if (cursors.right.isDown) {
            this.character.setVelocityX(speed);
            this.character.anims.play('walk-right', true);
            moving = true;
        }

        if (cursors.up.isDown) {
            this.character.setVelocityY(-speed);
            this.character.anims.play('walk-up', true);
            moving = true;
        } else if (cursors.down.isDown) {
            this.character.setVelocityY(speed);
            this.character.anims.play('walk-down', true);
            moving = true;
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