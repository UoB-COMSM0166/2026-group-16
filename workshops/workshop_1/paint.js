function setup() {
  createCanvas(400,400);
  background(220);
}

function draw() {

  // FACE
  //ckground(235,210,200);

  let x = 200;
  let y = 150;

  noStroke();
  fill(240,180,120);
  ellipse(x,y,120,100);

  fill(230,160,100);
  triangle(x-40,y-40,x-15,y-80,x-5,y-40);
  triangle(x+40,y-40,x+15,y-80,x+5,y-40);

  fill(60,160,90);
  ellipse(x-30,y-10,10,10);
  ellipse(x+30,y-10,10,10);

  fill(240,120,130);
  triangle(x, y+5, x-6, y+15, x+6, y+15);

  stroke(120);
  fill(180,80,90);
  ellipse(x, y+27, 10, 14);
}


function mousePressed(){
  let shapeType = floor(random(3));
  fill(random(255),random(255),random(255));
  noStroke();
  if(shapeType === 0){
    let size = random(30,80);
    rect(mouseX,mouseY,size,size);
  }else if(shapeType === 1){
    let w = random(40,100);
    let h = random(20,60);
    rect(mouseX,mouseY,w,h);
  }else{
    let x1 = mouseX;
    let y1 = mouseY;
    let x2 = mouseX + random(-40,40);
    let y2 = mouseY + random(-40,40);
    let x3 = mouseX + random(-40,40);
    let y3 = mouseY + random(-40,40);
    triangle(x1,y1,x2,y2,x3,y3);
  }
}
