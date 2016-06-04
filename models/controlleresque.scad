//rotate([0,0,90]) {

$fn=30;


union() {
    /* Shaft */
    intersection() {
        intersection() {
            cylinder(h=15, r1=2.228, r2=2.62);
            translate([-4.1,0,0]) {
                cylinder(h=15, r1=5.57, r2=5.57);
            }
        }
    }
    
    /* Shaft tip */
    intersection() {
        translate([-4.1,0,-5]) {
            cylinder(h=15, r1=5.57, r2=5.57);
        }
        translate([0,0,-0.16]) {
            scale([1,1,0.6]) {
                sphere(2.24);
            }
        }
    }

    /* Donut */
    translate([-3.9,0,14.27]) {
        rotate([0,29,0]) {
            difference() {
                cylinder(h=3.2, r=4.5);
                translate([0,0,-0.1]) {
                    cylinder(h=1.9, r1=3.2, r2=1.7);
                }
                translate([0, 0, 1.6]) {
                    cylinder(h=1.9, r1=1.7, r2=3.2);
                }
            }
        }
    }


}

//}
//translate(
//sphere(3);