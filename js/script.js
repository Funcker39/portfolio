const degToRad = 0.0174533;
const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const getRandomInt = (max) => Math.floor(Math.random() * max);

let zoom = 1;

class Tree {
    constructor(basePoint, maxBranches = 50, maxSteps = 40, angleDeviation = 30, maxHeight = 400, branchChance = .8, leafDensity = 1, leafRadius = 4) {
        this.basePoint = basePoint;
        this.maxBranches = maxBranches;
        this.currentStep = 1;
        this.maxSteps = maxSteps;
        this.angleDeviation = angleDeviation;
        this.heightStep = (maxHeight / maxSteps) * (canvas.height / 1000);
        this.branchChance = clamp(branchChance, 0, 1);
        this.leafDensity = leafDensity;
        this.leafRadius = leafRadius;

        basePoint.setWidth = basePoint.width * (canvas.width / 1000);
    }

    set progression(value) {
        value = clamp(value, 0, 1);
        let stepOffset = Math.round(value * this.maxSteps) - this.currentStep;
        console.log(stepOffset)
        
        if (stepOffset == 0) return;

        if (stepOffset > 0) {
            if (tree.currentStep >= tree.maxSteps) return;
            this.grow(stepOffset);
        } else {
            if (tree.currentStep <= 1) return;
            this.rewind(-stepOffset);
        }
        
        tree.draw()
    }

    grow (iterations) {
        for (let i = 0; i < iterations; i++) {
            if (this.currentStep >= this.maxSteps) return;

            this.currentStep++;
            this.basePoint.setWidth = this.basePoint.width + 2;
            let endPoints = [];
            this.basePoint.pushEndPoints(endPoints);
            
            for (const point of endPoints) {
                let divisions = Math.random() < this.branchChance ? 2 : 1;
                if (point.branches >= this.maxBranches) divisions = 1;
                if (point.branches < 2) {
                    if (this.currentStep > this.maxSteps / 5) divisions = 2;
                } 

                for (let i = 0; i < divisions; i++) {
                    let subPointAngle = point.angle + (Math.random() * 2 - 1) * this.angleDeviation;
                    if (point.branches <= 2) {
                        subPointAngle = clamp(subPointAngle, -20, 20);
                    }

                    let subPointPos = new Vector2D(
                        point.position.x + this.heightStep * Math.sin(subPointAngle * degToRad), 
                        point.position.y - this.heightStep * Math.cos(subPointAngle * degToRad)
                        );
                    let subPointDir = new Vector2D(subPointPos.x - point.position.x, subPointPos.y - point.position.y);
                    let distance = Math.sqrt(Math.pow(subPointDir.x, 2) +  Math.pow(subPointDir.y, 2));
                    subPointDir.x /= distance;
                    subPointDir.y /= distance;
    
                    point.subPoints.push(new Point(
                        point,
                        subPointPos,
                        point.width * 0.9,
                        subPointDir,
                        subPointAngle,
                        [],
                        point.branches + divisions - 1,
                        this.leafDensity,
                        this.leafRadius
                    ));
                } 
            }
        }
    }

    rewind (iterations) {
        for (let i = 0; i < iterations; i++) {
            if (this.basePoint.subPoints[0].isEndpoint || this.currentStep <= 1) return;
            this.currentStep--;

            this.basePoint.setWidth = this.basePoint.width - 2;
            let endPoints = [];
            this.basePoint.pushEndPoints(endPoints);
            
            for (const point of endPoints) {
                point.parent.subPoints = [];
                point.parent.update();
            }
        }
    }

    draw() {

        //TEST ZOOM
        // ctx.translate(canvas.width / 2, canvas.height - 10);
        // ctx.scale(zoom, zoom);
        // ctx.translate(0, 0);

        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.lineWidth = 0;

        let leafColorTime = clamp((this.currentStep - 1) / (this.maxSteps * .8), 0, 1);
        let woodColorTime = clamp((this.currentStep - 1) / (this.maxSteps * .2), 0, 1);
        this.basePoint.drawPolygon(
            ctx,
            [
                `rgb(${lerp(102, 243, leafColorTime)}, ${lerp(255, 122, leafColorTime)}, ${lerp(102, 255, leafColorTime)}`,
                `rgb(${lerp(51, 240, leafColorTime)}, ${lerp(204, 77, leafColorTime)}, ${lerp(51, 255, leafColorTime)}`,
                `rgb(${lerp(102, 255, leafColorTime)}, ${lerp(255, 128, leafColorTime)}, ${lerp(102, 230, leafColorTime)}`
            ],
            `rgb(${lerp(51, 77, woodColorTime)}, ${lerp(204, 38, woodColorTime)}, ${lerp(51, 0, woodColorTime)}`
            );   

        ctx.fillStyle = 'black';
        // ctx.fillRect(0, canvas.height - 120, canvas.width, canvas.height);
        ctx.beginPath()
        ctx.arc(canvas.width / 2, canvas.height + 1870, 2000, 0, 360);
        ctx.closePath();
        ctx.fill();
    }
}

class Point {

    constructor(parent, position, width, dir = new Vector2D(0, -1), angle = 0, subPoints = [], branches = 1, leafDensity = 1, leafRadius = 4) {
        this.position = position;
        this.width = width;
        this.subPoints = subPoints;
        this.dir = dir;
        this.angle = angle;
        this.branches = branches;
        this.leaves = [];
        this.parent = parent;
        this.leafDensity = leafDensity;
        this.leafRadius = leafRadius;
        
        this.update();
    }

    update() {
        let perpendicular = new Vector2D(this.dir.y, -this.dir.x)
        this.leftCornerPosition = new Vector2D(
            this.position.x + this.width / 2 * perpendicular.x, 
            this.position.y + this.width / 2 * perpendicular.y
            );
        this.rightCornerPosition = new Vector2D(
            this.position.x - this.width / 2 * perpendicular.x, 
            this.position.y - this.width / 2 * perpendicular.y
            );

        if (!this.isEndpoint) {
            if (this.branches > 3) {
                this.generateLeaves(0, 2);
            }
            else {
                this.leaves = [];
            }
        } else {
            this.generateLeaves(1, 3);
        }

    }

    generateLeaves(min = 0, max = 1) {
        this.leaves = [];
        let amount = Math.floor(Math.random() * (max - min) * this.leafDensity) + min;
        for (let i = 0; i < amount; i++) {
            let leaf = {};
            leaf.radius = (this.leafRadius * (1 + Math.random() * .5));
            leaf.offset = new Vector2D(
                (Math.random() * 2 - 1) * ((this.width / 2) + leaf.radius),
                (Math.random() * 2 - 1) * ((this.width / 2) + leaf.radius)
                );
            this.leaves.push(leaf);
        }
    }

    /**
     * @param {number} width
     */
    set setWidth(width) { 
        
        let factor = width / this.width;
        this.width = width;
        for (const subPoint of this.subPoints) {
            subPoint.setWidth = subPoint.width * factor;
        }

        this.update();
    }

    pushEndPoints(endPoints) {
        if (this.isEndpoint) {
            endPoints.push(this);
            return;
        }
        for (const subPoint of this.subPoints){
            subPoint.pushEndPoints(endPoints);
        }
    }

    get isEndpoint() {
        return this.subPoints.length == 0;
    }

    drawPolygon(ctx, leafColors, woodColor, drawChildren = true) {
        if (!this.isEndpoint) 
        {
            for (const subPoint of this.subPoints) {
                ctx.shadowBlur = 0;

                let color = 'black'
                ctx.fillStyle = color;
                ctx.strokeStyle = color;

                ctx.beginPath();
                ctx.moveTo(this.leftCornerPosition.x, this.leftCornerPosition.y);
                ctx.lineTo(this.rightCornerPosition.x, this.rightCornerPosition.y);
                ctx.lineTo(subPoint.rightCornerPosition.x, subPoint.rightCornerPosition.y);
                ctx.lineTo(subPoint.leftCornerPosition.x, subPoint.leftCornerPosition.y);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();

                if (drawChildren) {
                    subPoint.drawPolygon(ctx, leafColors, woodColor, true);
                }
            }
        } 
        
        for (const leaf of this.leaves) {

            /*ctx.shadowBlur = 3;
            ctx.shadowColor = 'black';*/

            // let color = leafColors[getRandomInt(leafColors.length)];
            // let color = 'rgba(255,255,255,.3)'
            let color = 'rgba(0,0,0,0.2)'
            ctx.fillStyle = color;
            ctx.strokeStyle = color;

            ctx.beginPath();
            ctx.arc(
                this.position.x + leaf.offset.x,
                this.position.y + leaf.offset.y, 
                leaf.radius,
                0,
                360
                );
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
        }
    }
}

class Vector2D {
    constructor(x,y) {
        this.x = x;
        this.y = y;
    }
}


var canvas = document.getElementById('background');
var ctx = canvas.getContext('2d');
document.body.onscroll = scroll;
document.body.onclick = click;


canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var docHeight = (document.height !== undefined) ? document.height : document.body.offsetHeight;

var tree = new Tree(new Point(
    null,
    new Vector2D(canvas.width / 2 - 8, canvas.height - 120),
    8,
    new Vector2D(0,-1),
    0,
    [],
    1
    ),
    maxBranches = 5,
    maxSteps = 40,
    angleDeviation = 30,
    maxHeight = 500,
    branchChance = .15,
    leafDensity = 1,
    leafRadius = 4
    );
tree.basePoint.subPoints = [new Point(tree.basePoint, new Vector2D(tree.basePoint.position.x, tree.basePoint.position.y - 30), tree.basePoint.width * .7)];
tree.basePoint.update();
tree.draw();

function scroll(event) {
    let pageProgression = clamp(window.scrollY / (docHeight - window.innerHeight), 0,1)

    tree.progression = pageProgression;

    canvas.style.top = (1 - pageProgression) * 100 + 'px';
}

function click(event) {
    if (tree.currentStep == 1) {
        tree.grow(tree.maxSteps);
    } else {
        tree.rewind(tree.maxSteps);
    }
    tree.draw();
}



// EXPERIMENTAL TOUCH

// document.body.addEventListener("touchstart", handleStart, false);
// document.body.addEventListener("touchmove", handleMove, false);

// let lastTouchY = 0;
// let move = 0;

// function handleStart(evt) {
//     lastTouchY = evt.changedTouches[0].pageY;
//     move = 0;
// }

// function handleMove(evt) {
//     move += evt.changedTouches[0].pageY - lastTouchY;
//     lastTouchY = evt.changedTouches[0].pageY;

//     if (Math.abs(move) > 10) {
//         treeGrowth(move)
//         move = 0;
//     }
// }