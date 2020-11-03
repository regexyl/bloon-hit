// Phaser + Matter.js
const gameState = {score: 0, highscore: 0, hasEnded: false, balloonGenSpeed: 0, slower: false, faster: false, presentPoints: 0, balloonGenSpeedLog: 0};
const startGameBtn = document.querySelector('#startGameBtn');
const modalEl = document.querySelector('#modalEl');
const scoreModalEl = document.querySelector('#scoreModalEl');
const highScoreModalEl = document.querySelector('#highScoreModalEl');
const scoreDisplayEl = document.querySelector('#scoreDisplayEl');
const instructionsEl = document.querySelector('#instructionsEl');
const scoreModalDisplayEl = document.querySelector('#scoreModalDisplayEl');
const congratsEl = document.querySelector('#congratsEl');
const powerTextEl = document.querySelector('#powerTextEl');
const countdownEl = document.querySelector('#countdownEl');
const maxShooterAngle = 65;
const heartPositions = [{x: 32, y: innerHeight - 26}, {x: 67, y: innerHeight - 26}, {x: 102, y:innerHeight - 26}];
const balloonColors = ['aqua', 'blue', 'orange', 'pink', 'purple', 'red', 'yellow'];
const powers = ['faster', 'slower', 'present'];
let balloonGenSpeed = 3000;
let notFirstGame = false;
let shooter;
let floorCount = 0;
let confetti = {sprite: '', shape: '', scale: 0, density: 0, restitution: 0};
let balloonsInAir = 0;
let balloonScale = 0.35;
let color;

function preload() {
    this.load.atlas("sheet", "../assets/images/bloon_hit/sprites.png", "../assets/images/bloon_hit/sprites.json");
    this.load.json('sprites', '../assets/images/bloon_hit/spritesPhysics.json');
    this.load.image('circle', '../assets/images/bloon_hit/circle-outline.png');
    this.load.image('red-heart', '../assets/images/bloon_hit/red-heart.png');
    this.load.image('white-heart', '../assets/images/bloon_hit/white-heart.png');
}

function create() {
    const thisMatter = this.matter;
    window.sprites = this.cache.json.get('sprites'); // Retrieve balloon data from loader cache
    this.matter.world.setBounds();
    this.cameras.main.setBackgroundColor('rgba(135, 245, 236, 0.7)');

    // Create floor
    const floor = this.matter.add.sprite(0, 0, 'sheet', 'floor', {label: 'floor'}).setStatic(true).setPosition(innerWidth / 2, innerHeight).setScale(1.5);
    floor.label = 'floor';

    // Create shooter semicircle
    const semicircleShooter = this.matter.add.sprite(innerWidth / 2, innerHeight - 10, 'sheet', 'semicircleShooter', {
        shape: sprites.semicircleShooter
    }).setStatic(true).setDepth(1);
    gameState.semicircleShooter = semicircleShooter;

    // Create hearts (for lives)
    heartPositions.forEach (heart => this.matter.add.sprite(heart.x, heart.y, 'red-heart').setScale(0.6).setStatic(true));

    function restartGame() {
        generateBalloonCallback = () => {
            setTimeout(() => {
                generateBalloon();
                if (!gameState.hasEnded) {
                    generateBalloonCallback();
                }
            }, balloonGenSpeed);
        }

        // Countdown timer display + Introduce balloons after 3s
        setTimeout(() => {
            countdownEl.style.display = 'block';
            generateBalloonCallback();
        }, 1000)

        var count = 3;
        const countdownInterval = setInterval(() => {
            let countFontSize = 10;
            countdownEl.innerHTML = count;
            countdownEl.style.fontSize = `${countFontSize}rem`;
            const decreaseSizeInterval = setInterval(() => {
                countFontSize -= 0.1;
                if (countFontSize > 0) {
                    countdownEl.style.fontSize = `${countFontSize}rem`;
                } else {clearInterval(decreaseSizeInterval);}
            }, 10)
            count--;
        }, 1000)

        setTimeout(() => {
            clearInterval(countdownInterval);
            countdownEl.style.display = 'none';
        }, 4000)

        // // Introduce balloons after 3s
        // setTimeout(() => {
        //     generateBalloonCallback();
        // }, 1000)

        // Start increasing speed of balloon generation every 5s after 10s into the game
        setTimeout(() => {
            window.changeBalloonGenSpeed = setInterval(() => {
                if (!gameState.hasEnded) {
                    if (balloonGenSpeed > 500) {
                        balloonGenSpeed -= 50;
                    } else {
                        clearInterval(changeBalloonGenSpeed);
                    }
                } else {
                    clearInterval(changeBalloonGenSpeed);
                }
            }, 5000)
        }, 10000)
        // Start generating power sprites (faster, slower, present to add points) every 8s after 15s into the game
        const generatePowersTimeout = setTimeout(() => {
            window.generatePowers = setInterval(() => {
                if (!gameState.hasEnded) {
                    let power = powers[Math.floor(Math.random() * 3)];
                    let xPower = Math.floor(Math.random() * (innerWidth * 0.8) + innerWidth / 2 - innerWidth * 0.4);
                    const powerSprite = thisMatter.add.sprite(xPower, Math.random() * (innerHeight / 8) + innerHeight / 10, 'sheet', power, {
                        shape: sprites[power],
                        collisionFilter:{'group': -1},
                        density: 2,
                        restitution: 1,
                        force: {x: 0.03, y: 0.03}
                    }).setScale(0.4);
                    powerSprite.body.gameObject.name = power;
                    setTimeout(() => {
                        if (powerSprite != null) {
                            let powerFade = setInterval(() => {
                                if (powerSprite.alpha > 0) {
                                    powerSprite.alpha -= 0.05;
                                } else {clearInterval(powerFade);}
                            }, 100)
                        }
                    }, 5000)
                } else {
                    clearInterval(generatePowers);
                }
            }, 20000)
        }, 15000)
        modalEl.style.display = 'none';
        gameState.score = 0;
        gameState.hasEnded = false;
        scoreDisplayEl.innerHTML = gameState.score;
        floorCount = 0;
        balloonGenSpeed = 3000;
        notFirstGame = true;
    }

    function generateColor() {
        return balloonColors[Math.floor(Math.random() * balloonColors.length)];
    }

    // Generates balloons based on random x, y-coordinates and color
    function generateBalloon() {
        const xCoordinate = Math.random() * (innerWidth - 10);
        const yCoordinate = Math.random() * (innerHeight / 5) + innerHeight / 8;

        const circle = thisMatter.add.sprite(xCoordinate, yCoordinate + 10, 'sheet', 'circle-outline', {
            shape: sprites['circle-outline'],
            collisionFilter: {'group': -1}
        }).setStatic(true);

        // Create animation for circle
        let scale = 0.9;
        const scaleCircle = setInterval(() => {
            scale -= 0.01;
            circle.setScale(scale);
            if (scale < 0) {
                clearInterval(scaleCircle);
            }
        }, 10)

        // Generate balloon
        setTimeout(() => {
            color = generateColor();
            const balloon = thisMatter.add.sprite(xCoordinate, yCoordinate, 'sheet', color, {
                shape: sprites[color], 
                restitution: 1,
                mass: 1,
                gravityScale: {x: 0.1, y: 0.9},
                collisionFilter: {'group': -1},
                floor: false
            }).setScale(balloonScale);
            balloonsInAir += 1;
            balloon.body.gameObject.hasCollided = false;
            balloon.body.gameObject.name = "balloon";
        }, 1000)
    }

    function generateConfetti(projectileBody, sprite, shape, scale) {
        for (let i = 0; i < 10; i++) {
            xConfetti = Math.floor(Math.random() * 100 + projectileBody.x - 50);
            yConfetti = Math.floor(Math.random() * 100 + projectileBody.y - 50);
            let confettiParticle = thisMatter.add.sprite(xConfetti, yConfetti, 'sheet', sprite, {
                shape: shape,
                collisionFilter:{'group': -1},
                density: Math.random() * 1,
                restitution: Math.random() * 1,
                force: {x: 0.03, y: 0.03}
            }).setScale(scale);
            setTimeout(() => {
                let confettiFade = setInterval(() => {
                    if (confettiParticle.alpha > 0) {
                        confettiParticle.alpha -= 0.05;
                    } else {clearInterval(confettiFade);}
                }, 100)
            }, 5000)
        }
    }

    function zoomout(body) {
        const zoomoutInterval = setInterval(() => {
            body.scale -= 0.01;
            if (body.scale < 0.1) {
                clearInterval(zoomoutInterval);
                body.destroy();
            };
        }, 10)
    }

    startGameBtn.addEventListener('click', () => {
        if (notFirstGame) {
            congratsEl.style.display = 'none';
            this.scene.restart();
        } 
        else {
            restartGame.call(this);
            instructionsEl.style.display = 'none';
            scoreModalDisplayEl.style.display = 'block';
        }
    })
    if (notFirstGame) {
        restartGame.call(this);
    }

    // If collision between bodies occur
    this.matter.world.on("collisionstart", function (event, bodyA, bodyB) {
        // Stop the game when 3 balloons hit the floor
        if (bodyA.label === 'floor' && bodyB.gameObject.name === 'balloon') {
            if (!bodyB.gameObject.hasCollided) {
                if (floorCount < 3) {
                    bodyB.gameObject.floor = true;
                    thisMatter.add.sprite(heartPositions[floorCount].x, heartPositions[floorCount].y, 'white-heart').setScale(0.5).setStatic(true);
                    floorCount += 1;
                    bodyB.gameObject.hasCollided = true;
                    if (floorCount === 3) {
                        gameState.hasEnded = true;
                        scoreModalEl.innerHTML = gameState.score;
                        powerTextEl.innerHTML = '';
                        if (gameState.score > gameState.highscore) {
                            gameState.highscore = gameState.score;
                            highScoreModalEl.innerHTML = gameState.highscore;
                            congratsEl.style.display = 'block';
                        }
                        modalEl.style.display = 'block';
                    }
                }
            }
        } else if (bodyA.gameObject !== null && bodyB.gameObject !== null) {
            if (bodyA.gameObject.name === 'balloon' && bodyB.gameObject.name === 'projectile') {
                // Change score displayed
                gameState.score += 20;
                if (!gameState.hasEnded) {
                    scoreDisplayEl.innerHTML = gameState.score;
                }
                // Remove balloon and projectile that collided
                bodyA.gameObject.setStatic(true);
                bodyB.gameObject.destroy();
                zoomout(bodyA.gameObject);
                if (bodyA.gameObject.floor) {
                    generateConfetti(bodyA.position, 'skull', sprites.skull, 0.04);
                } else {
                    color = generateColor();
                    generateConfetti(bodyA.position, color, sprites[color], 0.08);
                }
            } else if(bodyA.gameObject.name === 'present' && bodyB.gameObject.name === 'projectile') {
                generateConfetti(bodyA.position, 'star', sprites.star, 0.6);
                zoomout(bodyA.gameObject);
                gameState.presentPoints = Math.floor(Math.random() * 10) * 10;
                gameState.score += gameState.presentPoints;
                scoreDisplayEl.innerHTML = gameState.score;
                powerTextEl.innerHTML = `+${gameState.presentPoints}`;
                setTimeout(() => {
                    if (powerTextEl.innerHTML == `+${gameState.presentPoints}`) {
                        powerTextEl.innerHTML = '';
                    }
                }, 5000)
            } else if(bodyA.gameObject.name === 'faster' && bodyB.gameObject.name === 'projectile') {
                generateConfetti(bodyA.position, 'star', sprites.star, 0.6);
                zoomout(bodyA.gameObject);
                gameState.faster = true;
                gameState.balloonGenSpeedLog = balloonGenSpeed;
                clearInterval(changeBalloonGenSpeed);
                clearInterval(generatePowers);
                if (balloonGenSpeed >= 2000) {
                    balloonGenSpeed -= 1000;
                    powerTextEl.innerHTML = 'FASTER';
                    setTimeout(() => {
                        if (powerTextEl.innerHTML == 'FASTER') {
                            powerTextEl.innerHTML = '';
                            gameState.faster = false;
                            balloonGenSpeed = gameState.balloonGenSpeedLog;
                            changeBalloonGenSpeed();
                            generatePowers();
                        }
                    }, 12000);
                }
            } else if(bodyA.gameObject.name === 'slower' && bodyB.gameObject.name === 'projectile') {
                generateConfetti(bodyA.position, 'star', sprites.star, 0.6);
                zoomout(bodyA.gameObject);
                gameState.slower = true;
                gameState.balloonGenSpeedLog = balloonGenSpeed;
                clearInterval(changeBalloonGenSpeed);
                clearInterval(generatePowers);
                balloonGenSpeed += 1000;
                powerTextEl.innerHTML = 'SLOWER';
                setTimeout(() => {
                    if (powerTextEl.innerHTML == 'SLOWER') {
                        powerTextEl.innerHTML = '';
                        gameState.slower = false;
                        balloonGenSpeed = gameState.balloonGenSpeedLog;
                        changeBalloonGenSpeed();
                        generatePowers();
                    }
                }, 12000);
            }
        }
    });
}

let spaceDown;
let shooterRadius = 160;
    
function update() {

    this.cursors = this.input.keyboard.createCursorKeys();

    // Rotate shooter with left and right arrow keys
    if (this.cursors.left.isDown) {
        if (gameState.semicircleShooter.angle >= -maxShooterAngle) {
            gameState.semicircleShooter.angle -= 3.5;
        };
    } else if (this.cursors.right.isDown) {
        if (gameState.semicircleShooter.angle <= maxShooterAngle) {
            gameState.semicircleShooter.angle += 3.5;
        };
    }

    // Shoot balloons by pressing spacebar
    if (this.cursors.space.isDown) {
        if (spaceDown) {
            let angleX = Math.PI / 180 * (90 - gameState.semicircleShooter.angle); // Convert from degree to radians
            let angleY = Math.PI / 180 * (90 - gameState.semicircleShooter.angle); // Convert from degree to radians
        
            let xCircleCoordinate = ( shooterRadius * Math.cos(angleX) + innerWidth / 2 ) / 2 + innerWidth / 4;
            let yCircleCoordinate = ( shooterRadius * Math.sin(angleY + Math.PI) + innerHeight - 10 ) / 2 + innerHeight / 2.1;
        
            let projectile = this.matter.add.sprite(xCircleCoordinate, yCircleCoordinate, 'sheet', 'circle', {
                shape: sprites.circle
            }).setStatic(true).setScale(0.7);
            projectile.body.gameObject.name = "projectile";
        
            const shoot = setInterval(() => {
                if (projectile.body != undefined) {
                    shooterRadius += 20;
                    projectile.x = ( shooterRadius * Math.cos(angleX) + innerWidth / 2 ) / 2 + innerWidth / 4;
                    projectile.y = ( shooterRadius * Math.sin(angleY + Math.PI) + innerHeight - 10 ) / 2 + innerHeight / 2.1;
                    if (projectile.x < 0 || projectile.x > innerWidth || projectile.y < 0 || projectile.y > innerHeight) {
                        projectile.destroy();
                        clearInterval(shoot);
                    }
                } else {
                    clearInterval(shoot);
                }
            }, 10);
            spaceDown = false;
            shooterRadius = 160;
        }
    } else if (this.cursors.space.isUp) {
        spaceDown = true;
    }
}

const config = {
    type: Phaser.AUTO,
    width: innerWidth,
    height: innerHeight,
    physics: {
        default: 'matter',
        matter: {
            gravity: {y: 0.75},
            enableSleep: true,
            }
        },
    scene: {
        create,
        preload,
        update
    }
}

const game = new Phaser.Game(config);
var gameScene = new Phaser.Scene('game');
// 820 x 750
function resize() {
    var canvas = document.querySelector("canvas");
    var gameRatio = 820 / 750
    if (innerWidth <= innerHeight) {
        canvas.style.height = innerWidth / gameRatio;
    } else {
        canvas.style.width = innerHeight * gameRatio;
    }
    // if(windowRatio < gameRatio){
    //     canvas.style.width = windowWidth + "px";
    //     canvas.style.height = (windowWidth / gameRatio) + "px";
    // }
    // else{
    //     canvas.style.width = (windowHeight * gameRatio) + "px";
    //     canvas.style.height = windowHeight + "px";
    // }
}


window.addEventListener('resize', resize);