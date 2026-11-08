import adsk.core, adsk.fusion

app = adsk.core.Application.get()
design = adsk.fusion.Design.cast(app.activeProduct)
root = design.rootComponent
if not app.activeDocument.name.startswith('FrameCue FLUX'):
    raise RuntimeError('Open the FrameCue Fusion assembly first.')
P = adsk.core.Point3D.create
V = adsk.core.ValueInput.createByReal
appearance = None
for i in range(root.occurrences.count):
    occ = root.occurrences.item(i)
    if occ.component.name == 'Left_Side_Rail':
        appearance = occ.component.bRepBodies.item(0).appearance

def plate(comp, name, x0, x1, y, width0, width1, z, thickness):
    x0 = 15.85 + (x0 - 15.85) * 1.35
    x1 = 15.85 + (x1 - 15.85) * 1.35
    width0 *= 1.1
    width1 *= 1.1
    planes = comp.constructionPlanes
    plane_input = planes.createInput()
    plane_input.setByOffset(comp.xYConstructionPlane, V(z))
    plane = planes.add(plane_input)
    sketch = comp.sketches.add(plane)
    sketch.name = name + '_profile'
    bevel = min(0.28, (x1-x0)*0.19)
    points = [(x0,y-width0*0.28),(x0+bevel,y-width0/2),
              (x1-bevel,y-width1/2),(x1,y-width1*0.22),
              (x1,y+width1*0.22),(x1-bevel,y+width1/2),
              (x0+bevel,y+width0/2),(x0,y+width0*0.28)]
    lines = sketch.sketchCurves.sketchLines
    for i, a in enumerate(points):
        b = points[(i+1) % len(points)]
        lines.addByTwoPoints(P(a[0], a[1], 0), P(b[0], b[1], 0))
    extrudes = comp.features.extrudeFeatures
    inp = extrudes.createInput(sketch.profiles.item(0), adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
    inp.setDistanceExtent(False, V(thickness))
    feat = extrudes.add(inp)
    feat.name = name
    body = feat.bodies.item(0)
    body.name = name
    if appearance:
        body.appearance = appearance
    sketch.isLightBulbOn = False
    plane.isLightBulbOn = False

for label, y in [('Left', -2.7), ('Center', 0.0), ('Right', 2.7)]:
    name = 'FLUX_ArmorV2_' + label
    if any(root.occurrences.item(i).component.name == name for i in range(root.occurrences.count)):
        raise RuntimeError(name + ' already exists')
    comp = root.occurrences.addNewComponent(adsk.core.Matrix3D.create()).component
    comp.name = name
    segments = [(15.85,17.65,1.70,1.55,7.05), (17.77,19.55,1.55,1.30,6.84), (19.67,21.38,1.30,0.62,6.63)]
    for index, (x0,x1,w0,w1,z) in enumerate(segments, 1):
        namepart = 'Claw_' + label + '_Finger_' + str(index)
        plate(comp, namepart, x0,x1,y,w0,w1,z,0.24)
        plate(comp, namepart + '_Ridge', x0+0.20,x1-0.17,y,w0*0.48,w1*0.48,z+0.24,0.12)
    mgr = adsk.fusion.TemporaryBRepManager.get()
    base = comp.features.baseFeatures.add()
    base.startEdit()
    try:
        for index, x in enumerate((17.70,19.60), 1):
            x = 15.85 + (x - 15.85) * 1.35
            z = 7.00 if index == 1 else 6.79
            axle = mgr.createCylinderOrCone(P(x,y-0.85,z), 0.19, P(x,y+0.85,z), 0.19)
            body = comp.bRepBodies.add(axle, base)
            body.name = 'Claw_' + label + '_Joint_' + str(index)
    finally:
        base.finishEdit()
    print('Created segmented claw ' + label)

for i in range(root.occurrences.count):
    occ = root.occurrences.item(i)
    if occ.component.name.startswith(('FLUX_Claw_', 'FLUX_Segmented_Claw_', 'Cue_Module_')):
        occ.isLightBulbOn = False
app.activeViewport.refresh()
print('Segmented claw assembly complete')
