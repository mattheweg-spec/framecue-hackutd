import adsk.core, adsk.fusion

app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
if not app.activeDocument.name.startswith('FrameCue FLUX'):
    raise RuntimeError('Open the FrameCue Fusion assembly first.')

mgr = adsk.fusion.TemporaryBRepManager.get()
P = adsk.core.Point3D.create
for label, center_y in [('Left', -2.7), ('Center', 0.0), ('Right', 2.7)]:
    name = 'FLUX_Claw_' + label
    if any(root.occurrences.item(i).component.name == name for i in range(root.occurrences.count)):
        print(name + ' already exists; skipped')
        continue
    occurrence = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
    comp = occurrence.component
    comp.name = name
    base = comp.features.baseFeatures.add()
    base.startEdit()
    try:
        for index, offset in enumerate([-0.65, 0, 0.65], 1):
            y = center_y + offset
            start, end = P(17.2, y, 7.42), P(19.35, y, 6.63)
            rod = mgr.createCylinderOrCone(start, 0.19, end, 0.28)
            cap = mgr.createSphere(end, 0.28)
            if not rod or not cap or not mgr.booleanOperation(rod, cap, adsk.fusion.BooleanTypes.UnionBooleanType):
                raise RuntimeError('Could not create rounded pusher')
            body = comp.bRepBodies.add(rod, base)
            body.name = 'Claw_' + label + '_Finger_' + str(index)
        axle = mgr.createCylinderOrCone(P(17.2, center_y-1.03, 7.42), 0.25, P(17.2, center_y+1.03, 7.42), 0.25)
        body = comp.bRepBodies.add(axle, base)
        body.name = 'Claw_' + label + '_Hinge_Axle'
    finally:
        base.finishEdit()
    print('Created ' + name)
for i in range(root.occurrences.count):
    occurrence = root.occurrences.item(i)
    if occurrence.component.name.startswith('Cue_Module_'):
        for j in range(occurrence.component.bRepBodies.count):
            body = occurrence.component.bRepBodies.item(j)
            if 'soft bladder' in body.name.lower():
                body.isLightBulbOn = False
app.activeViewport.refresh()
print('Claw revision created in active Fusion assembly')
