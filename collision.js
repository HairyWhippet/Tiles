/** Copyright 2019 by Thomas Friedrichsmeier.
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.
    You should have received a copy of the GNU Lesser General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>. */

/** C'tor. Create a CollisionMask object from ImageData */
function CollisionMask(data) {
  this.w = data.width;
  this.h = data.height;
  this.mask = [];
  for (var y = 0; y < this.h; ++y) {
    this.mask[y] = new Uint32Array(Math.ceil(this.w / 32));
    for (var x = 0; x < this.w; x += 32) {
      var bits = 0;
      for (var bit = 0; bit < 32; ++bit) {
        bits = bits << 1;
        if (x + bit < this.w) {
          let ave = data.data[(y*data.width + x + bit) * 4 + 0] +
                    data.data[(y*data.width + x + bit) * 4 + 1] +
                    data.data[(y*data.width + x + bit) * 4 + 2];
          if((ave / 3) > 128) {
            bits += 1;
          }
        }
      }
      this.mask[y][Math.floor(x / 32)] = bits;
    }
  }
}

/** Test if this CollisionMask-objects collides with the given other collision mask object. dx and dy specify the
screen coordinates of the other object, relative to this one. Note that this function performs rectangle intersection
check before going into the more expensive pixel-based collision detection, so there is no need to do this, yourself. */
CollisionMask.prototype.collidesWith = function(other, dx, dy) {
  // make sure, this object is the left one of the two
  if (dx < 0) {
    // console.log("swapping");
    return other.collidesWith(this, -dx, -dy);
  }

  // determine collision rectangle (if any) in terms of coordinates of this
  if (dx > this.w) return false;
  var y1, y2;
  if (dy < 0) {  // other is above
    if (other.h < -dy) return false;
    y1 = 0; y2 = Math.min(other.h + dy, this.h);
  } else {       // other is below
    if (this.h < dy) return false;
    y1 = dy; y2 = Math.min(other.h + dy, this.h);
  }

  var x1 = dx; var x2 = Math.min(this.w, other.w + dx);
  //console.log("recthit " + x1 + "," + y1 + " - " + x2 + "," + y2);

  const lshift = dx % 32;
  const rshift = 32 - lshift;
  const x1scaled = Math.floor(x1/32);
  const x2scaled = Math.ceil(x2/32);
  for (var y = y1; y < y2; ++y) {
    const trow = this.mask[y];
    const orow = other.mask[y-dy];
    for (var x = x1scaled; x < x2scaled; ++x) {
      var bits = trow[x] << lshift;
      bits |= (trow[x + 1] >>> rshift);  // Note: zero-fill rshift

      // since other is known to be to the right of this, its mask is always left-aligned.
      if (orow[x-x1scaled] & bits) {
        //console.log("collision at line " + y + "!");
      	return true;
      }
    }
  }
}

//// NOTE: Everything below this line is just a usage demonstration. You'll only want to use the code, above. /////
function collisionDemo() {
var dummycanvas = document.getElementById("dummy");
var dummyctx = dummycanvas.getContext("2d");
dummyctx.strokeStyle = "green";
dummyctx.lineWidth = 4;
dummyctx.beginPath();
dummyctx.arc(22, 22, 20, 0.25*Math.PI, 1.75*Math.PI);
dummyctx.stroke();
var arcMask = new CollisionMask(dummyctx.getImageData(0,0,44,44));

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
ctx.fillStyle = "red";
ctx.fillRect(50,98,100,4);
ctx.fillRect(98,50,4,100);
var crossImg = ctx.getImageData(50,50,100,100);
var crossMask = new CollisionMask(crossImg);

canvas.addEventListener('mousemove', e => {
  ctx.clearRect(0,0,200,200);
  ctx.putImageData(crossImg, 50, 50);
  ctx.drawImage(dummycanvas, e.offsetX, e.offsetY);
  //arcMask.collidesWith(crossMask, 50 - e.offsetX, 50 - e.offsetY);
  var x = e.offsetX - 50; var y = e.offsetY - 50;  // remove surprsingly large amount of noise from timing
  var t1 = performance.now() + 50;
  var num = 0;
  while (performance.now() < t1) {
    var collision = crossMask.collidesWith(arcMask, x, y);
    ++num;
  }
  document.getElementById("result").innerHTML = collision ? "Collsion!" : "No collision";
  document.getElementById("timing").innerHTML = "Performed " + num + " collision tests within 50 milliseconds.";
});
}
