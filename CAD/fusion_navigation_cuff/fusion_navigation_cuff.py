"""Build a split, quick-release FrameCue ankle cuff and crampon-style rail bindings."""
import adsk.core
import adsk.fusion
import traceback


def run(context):
    app = adsk.core.Application.get()
    ui = app.userInterface
    try:
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            raise RuntimeError('Open the FrameCue Fusion design first.')
        root = design.rootComponent
        if not app.activeDocument.name.startswith('FrameCue FLUX'):
            raise RuntimeError('Open the FrameCue FLUX assembly first.')

        # Replace only the previous ankle-cuff add-on; the shoe frame and instep claws stay intact.
        replace_names = {
            'Navigation_Ankle_Cuff', 'Navigation_Cuff_Assembly',
            'Cuff_Release_Gate', 'Cuff_Release_Lever',
            'Crampon_Rail_Binding_Left', 'Crampon_Rail_Binding_Right',
        }
        for index in range(root.occurrences.count - 1, -1, -1):
            occurrence = root.occurrences.item(index)
            name = occurrence.component.name
            if name in replace_names or name.startswith('Navigation_Motor_'):
                occurrence.deleteMe()

        manager = adsk.fusion.TemporaryBRepManager.get()
        point = adsk.core.Point3D.create
        vector = adsk.core.Vector3D.create
        center = 4.2
        radius = 4.05
        rear_x = center - radius

        def cylinder_between(name, start, end, thickness):
            return (name, manager.createCylinderOrCone(point(*start), thickness,
                                                       point(*end), thickness))

        def box_body(name, location, dimensions):
            bounds = adsk.core.OrientedBoundingBox3D.create(
                point(*location), vector(1, 0, 0), vector(0, 1, 0),
                dimensions[0], dimensions[1], dimensions[2])
            return (name, manager.createBox(bounds))

        def add_component(name, bodies):
            if any(body is None for _, body in bodies):
                raise RuntimeError('Fusion could not construct all parts for ' + name + '.')
            occurrence = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
            component = occurrence.component
            component.name = name
            base = component.features.baseFeatures.add()
            base.startEdit()
            try:
                for body_name, brep in bodies:
                    body = component.bRepBodies.add(brep, base)
                    body.name = body_name
            finally:
                base.finishEdit()
            return occurrence

        # Open-backed hoops: a small rear cut creates a gap behind a hinged release gate.
        cuff_bodies = []
        for z, label in ((8.25, 'Lower'), (10.75, 'Upper')):
            hoop = manager.createTorus(point(center, 0, z), vector(0, 0, 1), radius, 0.18)
            cutter = manager.createCylinderOrCone(point(rear_x, -1.2, z), 0.42,
                                                  point(rear_x, 1.2, z), 0.42)
            if hoop is None or cutter is None or not manager.booleanOperation(
                    hoop, cutter, adsk.fusion.BooleanTypes.DifferenceBooleanType):
                raise RuntimeError('Fusion could not open the rear of the ankle cuff.')
            cuff_bodies.append((label + '_Split_Cuff_Rail', hoop))

        # Front and lateral uprights keep the split cuff aligned; the rear stays clear for the gate.
        for label, x, y in (('Front', center + radius, 0),
                            ('Left', center, -radius), ('Right', center, radius)):
            cuff_bodies.append(cylinder_between('Cuff_Rib_' + label,
                                                (x, y, 8.25), (x, y, 10.75), 0.16))
        add_component('Navigation_Cuff_Assembly', cuff_bodies)

        # Hinged gate and over-center lever span the split rear. Releasing the lever opens the cuff.
        gate_bodies = [
            box_body('Rear_Gate_Bridge', (rear_x, 0, 9.5), (0.55, 1.9, 2.35)),
            cylinder_between('Rear_Gate_Hinge_Pin', (rear_x - 0.36, -0.95, 8.2),
                             (rear_x - 0.36, -0.95, 10.8), 0.15),
            cylinder_between('Latch_Cross_Pin', (rear_x, -0.85, 9.5),
                             (rear_x, 0.85, 9.5), 0.12),
            box_body('Over_Center_Lever_Handle', (rear_x + 0.28, 0.6, 9.62),
                     (0.35, 1.25, 0.18)),
            box_body('Lever_Release_Tab', (rear_x + 0.5, 1.05, 9.62),
                     (0.55, 0.38, 0.28)),
        ]
        add_component('Cuff_Release_Gate', gate_bodies)

        # Paired side links meet actual exoskeleton rails. Captive cross-pins make the
        # cuff module removable without taking the instep claw chassis off the shoe.
        for side, label in ((-1, 'Left'), (1, 'Right')):
            rail_y = side * 5.15
            bindings = []
            stations = [
                ((3.25, side * 3.4, 8.25), (3.8, rail_y, 4.55), 'Heel'),
                ((6.15, side * 2.85, 8.25), (6.9, rail_y, 5.65), 'Fore'),
            ]
            for upper, lower, station in stations:
                # Show a telescoping strut: an outer sleeve on the shoe rail and a
                # narrower indexed blade extending up to the ankle cuff.
                sleeve_end = tuple(a + (b - a) * 0.64 for a, b in zip(lower, upper))
                inner_start = tuple(a + (b - a) * 0.46 for a, b in zip(lower, upper))
                bindings.append(cylinder_between('Adjustable_Link_Sleeve_' + station,
                                                 lower, sleeve_end, 0.31))
                bindings.append(cylinder_between('Indexed_Sliding_Link_' + station,
                                                 inner_start, upper, 0.17))
                x, y, z = lower
                bindings.extend([
                    box_body('Crampon_Rail_Receiver_' + station,
                             (x, y, z), (1.55, 1.0, 0.82)),
                    box_body('Receiver_Overhang_' + station,
                             (x, y + side * 0.44, z + 0.48), (1.18, 0.16, 0.22)),
                    cylinder_between('Captive_Release_Pin_' + station,
                                     (x, y - side * 0.55, z),
                                     (x, y + side * 0.78, z), 0.13),
                    ('Captive_Pull_Ring_' + station,
                     manager.createTorus(point(x, y + side * 0.88, z),
                                         vector(0, 1, 0), 0.23, 0.055)),
                ])
                # Three visible index marks run along the exposed sliding blade.
                for mark, t in enumerate((0.58, 0.70, 0.82), 1):
                    mark_point = tuple(a + (b - a) * t for a, b in zip(lower, upper))
                    bindings.append(('Link_Index_' + station + '_' + str(mark),
                                     manager.createSphere(point(mark_point[0], mark_point[1] + side * 0.18,
                                                                mark_point[2]), 0.065)))
            add_component('Crampon_Rail_Binding_' + label, bindings)

        # Route haptic motors remain on the cuff, physically separate from the instep claws.
        motors = {
            'Left': ((4.2, -4.22, 9.5), (0, -1, 0)),
            'Forward': ((7.52, 0, 9.5), (1, 0, 0)),
            'Right': ((4.2, 4.22, 9.5), (0, 1, 0)),
        }
        for direction, (motor_center, normal) in motors.items():
            carrier = manager.createCylinderOrCone(
                point(*motor_center), 0.58,
                point(motor_center[0] + normal[0] * 0.36,
                      motor_center[1] + normal[1] * 0.36,
                      motor_center[2] + normal[2] * 0.36), 0.58)
            cap = manager.createSphere(
                point(motor_center[0] + normal[0] * 0.45,
                      motor_center[1] + normal[1] * 0.45,
                      motor_center[2] + normal[2] * 0.45), 0.34)
            if carrier is None or cap is None:
                raise RuntimeError('Fusion could not construct the ' + direction + ' navigation motor.')
            if manager.booleanOperation(carrier, cap,
                                        adsk.fusion.BooleanTypes.UnionBooleanType):
                motor_parts = [('Rounded_Haptic_Motor_' + direction, carrier)]
            else:
                motor_parts = [('Motor_Carrier_' + direction, carrier),
                               ('Rounded_Haptic_Cap_' + direction, cap)]
            add_component('Navigation_Motor_' + direction, motor_parts)

        app.activeViewport.refresh()
        ui.messageBox('Updated only the ankle module: open rear cam cuff, hinged gate, two rail bindings and captive pull pins. The exoskeleton frame and instep claws are unchanged.')
    except:
        ui.messageBox('The FrameCue ankle binding update failed:\n' + traceback.format_exc())
