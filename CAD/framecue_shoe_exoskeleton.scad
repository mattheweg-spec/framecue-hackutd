/*
  FrameCue over-shoe wearable | configurable concept model
  Units: millimeters. This is a visual fit/layout model, not a validated device.

  Open in OpenSCAD. Edit the values in the USER FIT SETTINGS section.
  Set show_shoe = false before exporting the wearable parts for printing.
  The frame is deliberately open: nothing sits under the sole or covers the toe.
*/

$fn = 28;

// USER FIT SETTINGS ---------------------------------------------------------
shoe_length = 270;       // approximate heel-to-toe shoe length
shoe_width = 100;        // approximate widest shoe width
shoe_top_height = 78;    // approximate top of shoe from floor
rear_strap_x = 0.38 * shoe_length;
front_strap_x = 0.70 * shoe_length;
show_shoe = true;        // context only; set false before STL export
show_adjustment_marks = true;

// DESIGN SETTINGS -----------------------------------------------------------
rail_thickness = 4;
side_clearance = 7;
strap_width = 20;
strap_thickness = 7;
rail_y = shoe_width / 2 + side_clearance;
rail_outer_y = rail_y + rail_thickness / 2;
high_vis = [0.78, 0.96, 0.04];
frame_color = [0.16, 0.23, 0.26];
strap_color = [0.08, 0.11, 0.13];

// Generic low-detail shoe last for fit context only.
module shoe_proxy() {
    color([0.55, 0.59, 0.60, 0.32]) {
        // Sole / lower shoe silhouette
        hull() {
            translate([18, 0, 13]) scale([1.15, shoe_width / 28, 0.55]) sphere(r=14);
            translate([shoe_length - 22, 0, 13]) scale([1.55, shoe_width / 30, 0.55]) sphere(r=14);
        }
        // Upper: wider forefoot, narrower heel, rounded top
        hull() {
            translate([34, 0, 36]) scale([1.15, shoe_width / 34, 1.45]) sphere(r=15);
            translate([shoe_length * 0.48, 0, shoe_top_height * 0.45]) scale([1.65, shoe_width / 31, 1.55]) sphere(r=15);
            translate([shoe_length - 46, 0, 32]) scale([1.65, shoe_width / 32, 1.20]) sphere(r=15);
        }
    }
}

// Polygonal side rails stay outside the shoe and above the sole.
module side_rail(side=1) {
    y = side * rail_y;
    points = [
        [16, 19], [16, 45], [35, 58],
        [shoe_length * 0.28, 55], [shoe_length * 0.65, 52],
        [shoe_length - 16, 31], [shoe_length - 16, 18]
    ];

    color(frame_color)
    difference() {
        if (side < 0)
            translate([0, y + rail_thickness / 2, 0])
                rotate([90, 0, 0]) linear_extrude(height=rail_thickness) polygon(points);
        else
            translate([0, y - rail_thickness / 2, 0])
                rotate([-90, 0, 0]) linear_extrude(height=rail_thickness) polygon(points);

        // Repeated fitting holes let a strap slider be moved to a new position.
        if (show_adjustment_marks)
            for (x = [34 : 18 : shoe_length - 30])
                translate([x, y, 48]) rotate([90, 0, 0]) cylinder(d=5, h=rail_thickness + 2, center=true);
    }
}

// Curved textile strap placeholder over the vamp. Replace with webbing in a build.
module over_shoe_strap(x) {
    arch_half_width = shoe_width / 2 + side_clearance + 4;
    color(strap_color)
    hull() {
        for (i = [0 : 12]) {
            y = -arch_half_width + (2 * arch_half_width * i / 12);
            z = shoe_top_height - 15 * pow(y / arch_half_width, 2) + 4;
            translate([x, y, z]) scale([strap_width / strap_thickness, 1, 1]) sphere(d=strap_thickness);
        }
    }
}

// Short strap tails join the arched webbing to its movable rail sliders.
module strap_tail(x, side) {
    arch_half_width = shoe_width / 2 + side_clearance + 4;
    edge_y = side * arch_half_width;
    edge_z = shoe_top_height - 11;
    anchor_y = side * rail_outer_y;
    anchor_z = 53;
    color(strap_color)
    hull() {
        translate([x, edge_y, edge_z]) scale([strap_width / strap_thickness, 1, 1]) sphere(d=strap_thickness);
        translate([x, anchor_y, anchor_z]) scale([strap_width / strap_thickness, 1, 1]) sphere(d=strap_thickness);
    }
}

// Small blocks indicate strap sliders attached through the adjustment holes.
module strap_slider(x, side) {
    y = side * rail_outer_y;
    color([0.18, 0.66, 0.72])
    translate([x, y, 49]) cube([22, 7, 12], center=true);
    color([0.82, 0.87, 0.86])
    translate([x, side * rail_y, 49]) rotate([90, 0, 0]) cylinder(d=4.5, h=14, center=true);
}

// Replaceable EVA pads spread contact between the rails and shoe upper.
module shoe_contact_pad(x, side) {
    y = side * (shoe_width / 2 + 2.5);
    color([0.30, 0.36, 0.36])
        translate([x, y, 33]) cube([32, 5, 16], center=true);
}

// Bright outside plaques provide a high-visibility, recognizable visual cue.
module visibility_badge(side) {
    y = side * (rail_outer_y + 4);
    color(high_vis)
    translate([shoe_length * 0.42, y, 41]) cube([70, 5, 20], center=true);
    // A raised reflective bar is represented by the pale inset strip.
    color([0.93, 0.97, 0.88])
    translate([shoe_length * 0.42, y + side * 2.8, 35]) cube([58, 1, 3], center=true);
    // Raised lettering makes the high-visibility part read as an assistive aid.
    color(frame_color)
    translate([shoe_length * 0.42, side * (rail_outer_y + 6.5), 44])
        rotate([side < 0 ? 90 : -90, 0, 0])
            linear_extrude(height=0.8) text("ASSISTIVE AID", size=5.2, halign="center", valign="center");
}

// The colored bumps are visual stand-ins for simulated left / center / right cues.
module cue_zone(x, y, zone_color) {
    color(zone_color)
    translate([x, y, shoe_top_height + 3.5]) scale([1.25, 1, 0.65]) sphere(d=17);
}

// A lightweight dorsal enclosure placeholder for the phone link / controller.
module controller_pod() {
    color([0.19, 0.28, 0.31])
    translate([shoe_length * 0.30, 0, shoe_top_height + 8])
        minkowski() {
            cube([38, 32, 10], center=true);
            sphere(r=2);
        }
    color(high_vis)
    translate([shoe_length * 0.30, 0, shoe_top_height + 15]) cube([24, 2, 1.5], center=true);
}

// ASSEMBLY ------------------------------------------------------------------
if (show_shoe) shoe_proxy();

side_rail(-1);
side_rail(1);

over_shoe_strap(rear_strap_x);
over_shoe_strap(front_strap_x);

for (side = [-1, 1]) {
    strap_tail(rear_strap_x, side);
    strap_tail(front_strap_x, side);
    strap_slider(rear_strap_x, side);
    strap_slider(front_strap_x, side);
    visibility_badge(side);
    for (x = [shoe_length * 0.20, shoe_length * 0.50, shoe_length * 0.78])
        shoe_contact_pad(x, side);
}

controller_pod();

// Across-shoe zones: left flank, centered top, and right flank.
cue_zone(shoe_length * 0.57, -shoe_width * 0.28, [0.20, 0.77, 0.92]);
cue_zone(shoe_length * 0.57, 0, [1.00, 0.68, 0.16]);
cue_zone(shoe_length * 0.57, shoe_width * 0.28, [0.92, 0.28, 0.25]);
