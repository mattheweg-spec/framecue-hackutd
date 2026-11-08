"""Build the separate FrameCue ankle navigation motors in the active Fusion design."""
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
        if any(root.occurrences.item(i).component.name == 'Navigation_Ankle_Cuff'
               for i in range(root.occurrences.count)):
            raise RuntimeError('Navigation_Ankle_Cuff already exists; remove it before rerunning.')

        manager = adsk.fusion.TemporaryBRepManager.get()
        point = adsk.core.Point3D.create
        vector = adsk.core.Vector3D.create

        def add_component(name, bodies):
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

        def cylinder_between(label, start, end, radius):
            return (label, manager.createCylinderOrCone(point(*start), radius,
                                                        point(*end), radius))

        # Fusion's internal lengths are centimeters. The two cuff hoops, ribs,
        # and heel forks distinguish route guidance from the instep obstacle claws.
        cuff_bodies = [
            ('Lower_Ankle_Hoop', manager.createTorus(point(4.2, 0, 8.25),
                                                    vector(0, 0, 1), 4.05, 0.13)),
            ('Upper_Ankle_Hoop', manager.createTorus(point(4.2, 0, 10.75),
                                                    vector(0, 0, 1), 4.05, 0.13)),
        ]
        for index, (x, y) in enumerate(((8.25, 0), (0.15, 0), (4.2, 4.05), (4.2, -4.05)), 1):
            cuff_bodies.append(cylinder_between('Cuff_Rib_' + str(index),
                                                (x, y, 8.25), (x, y, 10.75), 0.12))
        cuff_bodies.extend([
            cylinder_between('Heel_Support_Left', (2.6, -5.7, 6.45),
                             (2.6, -3.4, 8.25), 0.18),
            cylinder_between('Heel_Support_Right', (2.6, 5.7, 6.45),
                             (2.6, 3.4, 8.25), 0.18),
        ])
        if any(brep is None for _, brep in cuff_bodies):
            raise RuntimeError('Fusion could not construct the ankle cuff geometry.')
        add_component('Navigation_Ankle_Cuff', cuff_bodies)

        # Rounded, separate pods represent left / forward / right route motors.
        motors = {
            'Left': ((4.2, -4.35, 9.5), (0, -1, 0)),
            'Forward': ((7.7, 0, 9.5), (1, 0, 0)),
            'Right': ((4.2, 4.35, 9.5), (0, 1, 0)),
        }
        for direction, (center, normal) in motors.items():
            carrier = manager.createCylinderOrCone(
                point(*center), 0.58,
                point(center[0] + normal[0] * 0.36,
                      center[1] + normal[1] * 0.36,
                      center[2] + normal[2] * 0.36), 0.58)
            cap = manager.createSphere(
                point(center[0] + normal[0] * 0.45,
                      center[1] + normal[1] * 0.45,
                      center[2] + normal[2] * 0.45), 0.34)
            if carrier is None or cap is None:
                raise RuntimeError('Fusion could not construct the ' + direction + ' navigation motor.')
            if manager.booleanOperation(carrier, cap,
                                        adsk.fusion.BooleanTypes.UnionBooleanType):
                motor_bodies = [('Rounded_Haptic_Motor_' + direction, carrier)]
            else:
                motor_bodies = [
                    ('Motor_Carrier_' + direction, carrier),
                    ('Rounded_Haptic_Cap_' + direction, cap),
                ]
            add_component('Navigation_Motor_' + direction, motor_bodies)

        app.activeViewport.refresh()
        ui.messageBox('Added separate left / forward / right route haptics to the ankle cuff.')
    except:
        ui.messageBox('FrameCue ankle cuff was not added:\n' + traceback.format_exc())
