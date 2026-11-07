/*
  FrameCue FLUX over-shoe concept | units: mm
  Wearable concept only. Geometry is for visualization and fit discussion,
  not validated for walking, impact, pressure, or manufacture.
*/
$fn = 32;
shoe_length = 270;
shoe_width = 102;
shoe_height = 76;
show_shoe = true;
fit_length_adjust = 0; // adjust shoe_length by -15..+15 mm for concept sizing
fit_width_adjust = 0;  // adjust shoe_width by -12..+12 mm for concept sizing
L = shoe_length + fit_length_adjust;
W = shoe_width + fit_width_adjust;
railY = W/2 + 8;

module shoe_proxy(){
  color([0.43,0.51,0.54,0.32]) {
    hull(){ translate([18,0,11]) scale([1.18,W/31,.55]) sphere(r=14);
           translate([L-20,0,11]) scale([1.48,W/34,.55]) sphere(r=14); }
    hull(){ translate([29,0,29]) scale([1.05,W/34,1.18]) sphere(r=15);
           translate([L*.48,0,47]) scale([1.62,W/34,1.45]) sphere(r=15);
           translate([L-45,0,27]) scale([1.42,W/33,1.2]) sphere(r=15); }
  }
}

module side_shell(s=1){
  pts=[[9,18],[9,38],[29,55],[54,58],[91,55],[133,53],[177,48],[218,39],[L-12,27],[L-12,17],[218,22],[177,31],[132,35],[90,37],[53,38],[29,31]];
  color([0.09,0.15,0.18])
    translate([0,s*(railY-2),0]) rotate([90,0,0]) linear_extrude(height=4) polygon(pts);
  // Raised, segmented armor ribs with clean negative space between panels.
  for (x=[42,84,128,174,215]) {
    z= x<90 ? 49 : (x<175 ? 43 : 34);
    color([0.15,0.25,0.28])
      translate([x,s*(railY+1),z]) rotate([0,0,x>180?-18:12]) cube([27,5,5],center=true);
  }
  // Narrow high-visibility sweep on both flanks.
  color([0.68,0.92,0.28])
    translate([L*.49,s*(railY+1.2),43]) rotate([0,0,-5]) cube([104,1.3,2.2],center=true);
  // Adjustment track: discreet slots and low-profile locking sliders.
  color([0.29,0.43,0.45])
    translate([L*.50,s*(railY+2),25]) cube([L*.72,3,5],center=true);
}

module heel_collar(){
  // Two slender heel wings cradle the rear quarter without covering the shoe.
  for(s=[-1,1]){
    color([0.10,0.17,0.19]) hull(){
      translate([19,s*(W/2+4),20]) sphere(d=8);
      translate([20,s*(W/2+4),47]) sphere(d=8);
      translate([48,s*(W/2+4),53]) sphere(d=7);
    }
  }
  color([0.10,0.17,0.19]) hull(){
    translate([18,-W/2-4,20]) sphere(d=7);
    translate([18,W/2+4,20]) sphere(d=7);
  }
}

module bridge(x,z,width=7,thick=5){
  // Crossmember for behind the heel only; never place a rigid member underfoot.
  color([0.13,0.21,0.23]) translate([x,0,z]) cube([thick,W+20,width],center=true);
}

module dorsal_arch(x){
  // Narrow bowed crossbrace sits above the shoe upper and ties the side frames.
  color([0.13,0.21,0.23])
    for(i=[0:15]){
      y1=-W/2-5 + i*(W+10)/16;
      y2=-W/2-5 + (i+1)*(W+10)/16;
      z1=shoe_height-7 - 15*pow(y1/(W/2+5),2);
      z2=shoe_height-7 - 15*pow(y2/(W/2+5),2);
      hull(){ translate([x,y1,z1]) sphere(d=4); translate([x,y2,z2]) sphere(d=4); }
    }
}

module instep_rib(yoff=0){
  // Low dorsal arch rails follow the upper contour; they leave the toe open.
  color([0.11,0.19,0.21]) hull(){
    translate([72,yoff,52]) sphere(d=6);
    translate([116,yoff,67]) sphere(d=6);
    translate([161,yoff,66]) sphere(d=6);
    translate([198,yoff,43]) sphere(d=6);
  }
}

module adjustment_band(x){
  // Thin, recessed 12 mm webbing with a compact side cam; not a wide strap.
  color([0.08,0.11,0.13])
    for(i=[0:15]){
      y1=-W/2-1 + i*(W+2)/16;
      y2=-W/2-1 + (i+1)*(W+2)/16;
      z1=shoe_height-16 - 12*pow(y1/(W/2+1),2);
      z2=shoe_height-16 - 12*pow(y2/(W/2+1),2);
      hull(){
        translate([x,y1,z1]) scale([1,.20,.13]) sphere(d=12);
        translate([x,y2,z2]) scale([1,.20,.13]) sphere(d=12);
      }
    }
  for(s=[-1,1]){
    color([0.25,0.39,0.41]) translate([x,s*(railY+1),28]) cube([17,5,9],center=true);
    color([0.68,0.92,0.28]) translate([x,s*(railY+3.6),28]) cube([8,1,2],center=true);
  }
}

module controller(){
  color([0.09,0.15,0.18]) translate([L*.36,0,shoe_height+7])
    minkowski(){ cube([44,27,12],center=true); sphere(r=2); }
  color([0.68,0.92,0.28]) translate([L*.36,0,shoe_height+14]) cube([24,2,1.4],center=true);
}

module haptic_pod(x,y,c=[0.15,0.72,0.79]){
  color([0.07,0.12,0.14]) translate([x,y,shoe_height+2]) scale([1.15,1,.62]) sphere(d=17);
  color(c) translate([x,y,shoe_height+8]) scale([1,1,.42]) sphere(d=10);
  color([0.73,0.94,0.32]) translate([x,y,shoe_height+11]) cylinder(d=3,h=1.3);
}

if(show_shoe) shoe_proxy();
side_shell(-1); side_shell(1); heel_collar();
bridge(8,23,7,5);
// The two dorsal arches keep the side rails tied together without crossing
// the outsole or toe underside.
dorsal_arch(L*.34); dorsal_arch(L*.66);
instep_rib(-11); instep_rib(11);
adjustment_band(L*.34); adjustment_band(L*.66);
controller();
// Distinct left / center / right cue actuator seats across the instep.
haptic_pod(L*.58,-25,[0.18,0.77,0.83]);
haptic_pod(L*.58,0,[0.91,0.68,0.28]);
haptic_pod(L*.58,25,[0.94,0.36,0.33]);
